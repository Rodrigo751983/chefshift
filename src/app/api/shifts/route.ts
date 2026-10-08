import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { euroNaarCenten, afrondenHalfUp, berekenUrenMinuten, minutenVanTijd } from '@/lib/factuur'
import { MIN_HOURLY_RATE, STANDAARD_PAUZE_MIN } from '@/lib/constants'
import { emailShiftVoorWhatsApp, emailShiftVoorFavoriet } from '@/lib/email'
import { verstuurPush } from '@/lib/push'

const INCLUSIONS = {
  horeca: { include: { horecaProfile: true } },
  chosenKok: { include: { kokProfile: true } },
  invoice: { select: { status: true } },
  _count: { select: { applications: true } },
} as const

// Ajoute l'eindtijd (table shift_end, sans relation dans le schéma) à chaque shift
async function avecEind<T extends { id: string }>(shifts: T[]) {
  const ids = shifts.map((s) => s.id)
  const fins = ids.length > 0
    ? await prisma.shiftEnd.findMany({ where: { shiftId: { in: ids } } })
    : []
  const parId = new Map(fins.map((f) => [f.shiftId, f]))
  return shifts.map((s) => {
    const f = parId.get(s.id)
    return { ...s, eind: f ? { reportedEnd: f.reportedEnd, confirmedAt: f.confirmedAt } : null }
  })
}

// Statut virtuel : un shift OPEN, date passée, sans chef choisi = EXPIRED.
// Rien n'est écrit en base : si l'horeca prolonge la date, il redevient OPEN.
function marqueVerlopen<T extends { status: string; date: Date | string; chosenKokId?: string | null }>(shifts: T[]): T[] {
  const aujourdhui = new Date(new Date().toDateString())
  return shifts.map((s) =>
    s.status === 'OPEN' && !s.chosenKokId && new Date(s.date) < aujourdhui ? { ...s, status: 'EXPIRED' } : s
  )
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const where: any = {}

    // ?passe=1 : shifts terminés (date passée) qui concernent l'utilisateur
    if (searchParams.get('passe') === '1') {
      const aujourdhui = new Date(new Date().toDateString())
      where.date = { lt: aujourdhui }
      if (session.user.role === 'HORECA') where.horecaId = session.user.id
      if (session.user.role === 'KOK') where.chosenKokId = session.user.id
      const shifts = await prisma.shift.findMany({
        where,
        include: INCLUSIONS,
        orderBy: [{ date: 'desc' }],
      })
      return NextResponse.json({ shifts: await avecEind(marqueVerlopen(shifts)) })
    }

    // Vues dédiées du chef : ses shifts à venir, ses candidatures, ses shifts acceptés
    if (session.user.role === 'KOK') {
      const vue = searchParams.get('vue')
      const aujourdhui = new Date(new Date().toDateString())
      if (vue === 'avenir' || vue === 'acceptees') {
        where.chosenKokId = session.user.id
        if (vue === 'avenir') where.date = { gte: aujourdhui }
        const shifts = await prisma.shift.findMany({
          where,
          include: INCLUSIONS,
          orderBy: [{ date: vue === 'avenir' ? 'asc' : 'desc' }],
        })
        return NextResponse.json({ shifts: await avecEind(marqueVerlopen(shifts)) })
      }
      if (vue === 'candidatures') {
        where.applications = { some: { kokId: session.user.id } }
        where.date = { gte: aujourdhui }
        const shifts = await prisma.shift.findMany({
          where,
          include: INCLUSIONS,
          orderBy: [{ date: 'asc' }],
        })
        return NextResponse.json({ shifts: await avecEind(marqueVerlopen(shifts)) })
      }
    }

    // Vues dédiées de la horeca : shifts avec candidatures reçues, chefs engagés
    if (session.user.role === 'HORECA') {
      const vue = searchParams.get('vue')
      if (vue === 'candidatures' || vue === 'acceptees') {
        where.horecaId = session.user.id
        if (vue === 'candidatures') where.applications = { some: {} }
        if (vue === 'acceptees') where.chosenKokId = { not: null }
        const shifts = await prisma.shift.findMany({
          where,
          include: INCLUSIONS,
          orderBy: [{ date: 'desc' }],
        })
        return NextResponse.json({ shifts: await avecEind(marqueVerlopen(shifts)) })
      }
    }

    if (session.user.role === 'HORECA') where.horecaId = session.user.id
    if (session.user.role === 'KOK') {
      // Shifts disponibles : ouverts ET dont la date n'est pas passée
      where.status = 'OPEN'
      where.date = { gte: new Date(new Date().toDateString()) }
    }
    if (searchParams.get('status')) where.status = searchParams.get('status')?.toUpperCase()

    const shifts = await prisma.shift.findMany({
      where,
      include: INCLUSIONS,
      orderBy: [{ isUrgent: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({ shifts: await avecEind(marqueVerlopen(shifts)) })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'HORECA') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { title, function: func, date, startTime, endTime, hourlyRate, locationStreet, locationPostal, locationCity, isUrgent, spoedtoeslagPct, breakMinutes, contactPhone, briefing } = body

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

    const shift = await prisma.shift.create({
      data: {
        horecaId: session.user.id,
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
        contactPhone: contactPhone ? String(contactPhone).trim().slice(0, 40) : null,
        briefing: briefing ? String(briefing).trim().slice(0, 1500) : null,
        isUrgent: !!isUrgent || pct > 0,
        spoedtoeslagPct: pct,
      },
    })

    // ===== Alerte aux koks =====
    // Sans cette etape, publier une shift ne prevenait personne : elle
    // apparaissait dans une liste que personne ne consulte, d'ou les
    // candidatures a zero. Les favoris de la zaak sont prevenus d'abord
    // et nommement, les autres koks recoivent une alerte generique.
    try {
      const profil = await prisma.horecaProfile.findUnique({ where: { userId: session.user.id } })
      const nomZaak = profil?.companyName || 'Een horecazaak'
      const datumNL = shift.date.toLocaleDateString('nl-NL', {
        weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
      })
      const uren = `${startTime} - ${endTime}`

      const favoris = await prisma.favoriteKok.findMany({
        where: { horecaId: session.user.id },
        select: { kokId: true },
      })
      const idsFavoris = favoris.map((f) => f.kokId)

      for (const kokId of idsFavoris) {
        const kok = await prisma.user.findUnique({ where: { id: kokId } })
        if (kok?.email) {
          await emailShiftVoorFavoriet(kok.email, shift.id, shift.title, nomZaak, datumNL, uren, rateEuro)
        }
        await verstuurPush(
          kokId,
          nomZaak,
          `Nieuwe shift op ${datumNL}, \u20AC${rateEuro}/u. Je staat bij hun vaste koks.`,
          `/shifts/${shift.id}?src=favoriet`
        )
      }

      // Les autres koks : alerte plus courte, sans nom de zaak
      const autres = await prisma.user.findMany({
        where: { role: 'KOK', id: { notIn: idsFavoris.length ? idsFavoris : ['-'] } },
        select: { id: true },
        take: 500,
      })
      for (const u of autres) {
        await verstuurPush(
          u.id,
          'ChefShift',
          `${shift.title} in ${locationCity || 'Amsterdam'} \u00b7 ${datumNL} \u00b7 \u20AC${rateEuro}/u`,
          `/shifts/${shift.id}`
        )
      }
    } catch {}

    // E-mail au propriétaire avec le message WhatsApp prêt à copier-coller (ne bloque jamais la création)
    try {
      const horeca = await prisma.horecaProfile.findUnique({ where: { userId: session.user.id } })
      await emailShiftVoorWhatsApp({
        shiftId: shift.id,
        titel: shift.title,
        functie: shift.function,
        datum: shift.date.toISOString().slice(0, 10),
        start: startTime,
        eind: endTime,
        tarief: rateEuro,
        stad: locationCity || '',
        bedrijf: horeca?.companyName || '',
        urgent: !!isUrgent,
      })
    } catch {}

    return NextResponse.json({ shift }, { status: 201 })
  } catch (error) {
    console.error('POST shift error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
