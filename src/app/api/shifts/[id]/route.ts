import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { euroNaarCenten, afrondenHalfUp, berekenUrenMinuten, minutenVanTijd } from '@/lib/factuur'
import { MIN_HOURLY_RATE, STANDAARD_PAUZE_MIN } from '@/lib/constants'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const shift = await prisma.shift.findUnique({
      where: { id: params.id },
      include: {
        horeca: { include: { horecaProfile: true } },
        chosenKok: { include: { kokProfile: true } },
        invoice: true,
        applications: {
          include: {
            kok: {
              include: {
                kokProfile: {
                  include: {
                    workExperience: { orderBy: { fromDate: 'desc' } },
                  },
                },
              },
            },
          },
          orderBy: { submittedAt: 'desc' },
        },
      },
    })

    if (!shift) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // ===== Contrôle d'accès =====
    // Avant : la propriété n'était vérifiée que pour le rôle HORECA, si bien
    // qu'un compte KOK pouvait lire n'importe quelle shift par son id — et avec
    // elle le profil complet (adresse, date de naissance, btw-id) de TOUS les
    // candidats. Règle réelle : l'admin et la zaak propriétaire voient tout ;
    // un kok ne voit une shift que si elle est ouverte, s'il y a candidaté ou
    // s'il est le kok choisi — et jamais les candidatures des autres.
    const estAdmin = session.user.role === 'ADMIN'
    const estProprietaire = shift.horecaId === session.user.id
    const estKok = session.user.role === 'KOK'
    const aCandidate = shift.applications.some((a) => a.kokId === session.user.id)
    const estKokChoisi = shift.chosenKokId === session.user.id

    if (!estAdmin && !estProprietaire) {
      const kokAutorise = estKok && (shift.status === 'OPEN' || aCandidate || estKokChoisi)
      if (!kokAutorise) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
    }

    // Un kok ne reçoit que sa propre candidature, jamais celles des concurrents
    const applicationsVisibles =
      estAdmin || estProprietaire
        ? shift.applications
        : shift.applications.filter((a) => a.kokId === session.user.id)

    // Heure de fin déclarée / confirmée (table créée à la première déclaration)
    let eind = null
    try {
      const lignes: {
        reported_end: Date; confirmed_at: Date | null; break_minuten: number | null
        disputed_end: Date | null; disputed_break: number | null
        dispute_reason: string | null; disputed_at: Date | null; refused_at: Date | null
      }[] = await prisma.$queryRaw`
        SELECT reported_end, confirmed_at, break_minuten,
               disputed_end, disputed_break, dispute_reason, disputed_at, refused_at
        FROM shift_end WHERE shift_id = ${params.id} LIMIT 1
      `
      if (lignes.length > 0) {
        eind = {
          reportedEnd: lignes[0].reported_end,
          confirmedAt: lignes[0].confirmed_at,
          breakMinuten: lignes[0].break_minuten,
          disputedEnd: lignes[0].disputed_end,
          disputedBreak: lignes[0].disputed_break,
          disputeReason: lignes[0].dispute_reason,
          disputedAt: lignes[0].disputed_at,
          refusedAt: lignes[0].refused_at,
        }
      }
    } catch {}

    // Chefs favoris de l'horeca connectée (étoiles sur les candidatures)
    let favoriKokIds: string[] = []
    if (session.user.role === 'HORECA') {
      const favs = await prisma.favoriteKok.findMany({
        where: { horecaId: session.user.id },
        select: { kokId: true },
      })
      favoriKokIds = favs.map((f) => f.kokId)
    }

    return NextResponse.json({
      shift: { ...shift, applications: applicationsVisibles, eind },
      favoriKokIds,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT : modifier un shift (uniquement si ouvert et aucun chef choisi)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'HORECA') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const shift = await prisma.shift.findUnique({ where: { id: params.id } })
    if (!shift || shift.horecaId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (shift.status !== 'OPEN' || shift.chosenKokId) {
      return NextResponse.json({ error: 'Shift can no longer be edited' }, { status: 400 })
    }

    const body = await req.json()
    const { title, function: func, date, startTime, endTime, hourlyRate, locationStreet, locationPostal, locationCity, isUrgent, spoedtoeslagPct, breakMinutes } = body

    // Supplément d'urgence : uniquement 0, 10, 15 ou 20 (% du tarif de base)
    const pct = [0, 10, 15, 20].includes(Number(spoedtoeslagPct)) ? Number(spoedtoeslagPct) : 0

    const rateEuro = Number(hourlyRate)
    if (!(rateEuro >= MIN_HOURLY_RATE)) {
      return NextResponse.json({ error: 'RATE_TOO_LOW', min: MIN_HOURLY_RATE }, { status: 400 })
    }

    // Heures "wall-clock" : stockées en composantes UTC, sans conversion de fuseau
    const start = new Date(`1970-01-01T${startTime}:00.000Z`)
    const end = new Date(`1970-01-01T${endTime}:00.000Z`)
    const startMin = minutenVanTijd(start)
    const endMin = minutenVanTijd(end)
    // Pause : reprise du corps de requête si fournie, sinon le défaut métier.
    // Elle est persistée pour que la facture se base sur la même valeur.
    const pauzeMin = breakMinutes != null
      ? Math.max(0, Math.min(480, Math.round(Number(breakMinutes))))
      : STANDAARD_PAUZE_MIN
    // Même fonction que la facturation : minimum d'une heure inclus.
    // Un calcul inline divergent affichait 0,5 h sur un shift d'une heure.
    const hours = berekenUrenMinuten(startMin, endMin, pauzeMin) / 60
    const rate = euroNaarCenten(rateEuro) // stockage en centimes
    const totalAmount = afrondenHalfUp(hours * rate)

    const updated = await prisma.shift.update({
      where: { id: params.id },
      data: {
        title,
        function: func || title,
        date: new Date(date),
        startTime: start,
        endTime: end,
        locationStreet: locationStreet || null,
        locationPostal: locationPostal || null,
        locationCity,
        hourlyRate: rate,
        totalAmount,
        breakMinutes: pauzeMin,
        isUrgent: !!isUrgent || pct > 0,
        spoedtoeslagPct: pct,
      },
    })

    return NextResponse.json({ shift: updated })
  } catch (error) {
    console.error('PUT /api/shifts/[id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
