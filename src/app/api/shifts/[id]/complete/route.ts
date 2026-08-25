import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  CHEF_VAT_RATE,
  afrondenHalfUp,
  berekenUrenMinuten, berekenBedragen, minutenVanTijd,
} from '@/lib/factuur'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Cloturer une shift declenche la facturation : seule la zaak qui l'a
    // publiee (ou un admin) peut le faire. Avant, la propriete n'etait
    // verifiee que pour le role HORECA, donc n'importe quel kok inscrit
    // pouvait cloturer la shift d'autrui et generer sa facture.
    const estAdmin = session.user.role === 'ADMIN'
    if (!estAdmin && session.user.role !== 'HORECA') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const shiftId = params.id
    const shift = await prisma.shift.findUnique({ where: { id: shiftId } })
    if (!shift) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (!estAdmin && shift.horecaId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const updated = await prisma.shift.update({
      where: { id: shiftId },
      data: { status: 'COMPLETED' }
    })

    // ===== Calcul en centimes entiers : heures dérivées des horaires (fin réelle si connue) =====
    const startMin = minutenVanTijd(shift.startTime)
    let endMin = minutenVanTijd(shift.endTime)
    try {
      const fins: { reported_end: Date }[] = await prisma.$queryRaw`
        SELECT reported_end FROM shift_end WHERE shift_id = ${shiftId} LIMIT 1
      `
      if (fins.length > 0) endMin = minutenVanTijd(fins[0].reported_end)
    } catch {}

    const urenMinuten = berekenUrenMinuten(startMin, endMin, shift.breakMinutes)
    const b = berekenBedragen(urenMinuten, shift.hourlyRate) // tarif déjà en centimes

    // ===== Spoedtoeslag : % du tarif de base, reversée à 100% au chef =====
    // La commission plateforme reste calculée sur le tarif de base (b.commissieCenten).
    const pct = shift.spoedtoeslagPct ?? 0
    const toeslagExcl = afrondenHalfUp((b.exclCenten * pct) / 100)
    const toeslagBtw = afrondenHalfUp((toeslagExcl * CHEF_VAT_RATE) / 100)
    const exclCenten = b.exclCenten + toeslagExcl
    const btwCenten = b.btwCenten + toeslagBtw
    const inclCenten = exclCenten + btwCenten
    const feeCenten = b.commissieCenten // commission sur le tarif de base uniquement
    const payoutCenten = inclCenten - feeCenten

    // Le numéro de facture n'est PAS attribué ici : il l'est au paiement (webhook Stripe),
    // de façon transactionnelle, sans trou dans la série.
    await prisma.invoice.upsert({
      where: { shiftId },
      create: {
        shiftId,
        horecaId: shift.horecaId,
        amountExclVat: exclCenten,
        vatAmount: btwCenten,
        amountInclVat: inclCenten,
        platformFee: feeCenten,
        kokPayout: payoutCenten,
        status: 'PENDING',
      },
      update: {
        amountExclVat: exclCenten,
        vatAmount: btwCenten,
        amountInclVat: inclCenten,
        platformFee: feeCenten,
        kokPayout: payoutCenten,
      },
    })

    if (shift.chosenKokId) {
      await prisma.notification.create({
        data: {
          userId: shift.chosenKokId,
          type: 'PAYMENT_RECEIVED',
          title: 'Shift voltooid',
          message: `Je shift "${shift.title}" is voltooid. Betaling volgt binnen 48 uur.`,
          shiftId,
        }
      })
    }

    return NextResponse.json({ shift: updated })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
