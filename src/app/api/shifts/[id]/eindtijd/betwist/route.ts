import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { verstuurPush } from '@/lib/push'
import { emailEindtijdBetwist, emailEindtijdBetwistGeweigerd } from '@/lib/email'

// Convertit "HH:MM" en instant UTC sur la date du shift (+1 jour si nuit)
function versInstant(dateShift: Date, startTime: Date, hhmm: string): Date {
  const dateStr = new Date(dateShift).toISOString().slice(0, 10)
  const st = new Date(startTime)
  const startMin = st.getUTCHours() * 60 + st.getUTCMinutes()
  const [h, m] = hhmm.split(':').map(Number)
  let fin = new Date(`${dateStr}T${hhmm}:00.000Z`)
  if (h * 60 + m < startMin) fin = new Date(fin.getTime() + 86400000)
  return fin
}

function hhmm(d: Date): string {
  return new Date(d).toLocaleTimeString('nl-NL', {
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  })
}

// POST : l'horeca propose une autre heure de fin que celle declaree par le chef.
// body { endTime: "HH:MM", reason: string, breakMinutes?: number }
//
// Le motif est obligatoire : sans explication, le chef n'a aucun moyen de juger
// si la correction est fondee, et le litige devient insoluble.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'HORECA') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const shift = await prisma.shift.findUnique({ where: { id: params.id } })
    if (!shift || shift.horecaId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (!shift.chosenKokId) {
      return NextResponse.json({ error: 'No chef chosen' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const endTime = String(body?.endTime || '')
    const reason = String(body?.reason || '').trim()

    if (!/^\d{2}:\d{2}$/.test(endTime)) {
      return NextResponse.json({ error: 'Invalid time' }, { status: 400 })
    }
    if (reason.length < 10) {
      return NextResponse.json({ error: 'Reason required (min 10 chars)' }, { status: 400 })
    }
    if (reason.length > 500) {
      return NextResponse.json({ error: 'Reason too long' }, { status: 400 })
    }

    let pauze: number | null = null
    if (body?.breakMinutes != null) {
      const b = Number(body.breakMinutes)
      if (!Number.isInteger(b) || b < 0 || b > 480) {
        return NextResponse.json({ error: 'Invalid break' }, { status: 400 })
      }
      pauze = b
    }

    const eind = await prisma.shiftEnd.findUnique({ where: { shiftId: shift.id } })
    if (!eind) {
      return NextResponse.json({ error: 'No end time reported yet' }, { status: 400 })
    }
    if (eind.confirmedAt) {
      return NextResponse.json({ error: 'Already confirmed' }, { status: 400 })
    }

    const propose = versInstant(shift.date, shift.startTime, endTime)

    await prisma.shiftEnd.update({
      where: { shiftId: shift.id },
      data: {
        disputedEnd: propose,
        disputedBreak: pauze,
        disputeReason: reason,
        disputedAt: new Date(),
        refusedAt: null,
      },
    })

    const kok = await prisma.user.findUnique({ where: { id: shift.chosenKokId } })
    if (kok?.email) {
      await emailEindtijdBetwist(kok.email, shift.id, shift.title, hhmm(eind.reportedEnd), endTime, reason)
    }
    await verstuurPush(
      shift.chosenKokId,
      'ChefShift',
      `De zaak stelt een andere eindtijd voor bij "${shift.title}": ${endTime}. Bekijk en reageer.`,
      `/shifts/${shift.id}`
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[shifts/[id]/eindtijd/betwist]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH : le chef repond a la contre-proposition. body { accepteer: boolean }
//
// Accepte  -> l'heure proposee devient l'heure confirmee, la facturation suit.
// Refuse   -> le litige passe en arbitrage admin ; rien n'est facture entre-temps.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'KOK') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const shift = await prisma.shift.findUnique({ where: { id: params.id } })
    if (!shift || shift.chosenKokId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const eind = await prisma.shiftEnd.findUnique({ where: { shiftId: shift.id } })
    if (!eind?.disputedEnd) {
      return NextResponse.json({ error: 'No dispute pending' }, { status: 400 })
    }
    if (eind.confirmedAt) {
      return NextResponse.json({ error: 'Already confirmed' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const accepteer = body?.accepteer === true

    if (accepteer) {
      await prisma.shiftEnd.update({
        where: { shiftId: shift.id },
        data: {
          reportedEnd: eind.disputedEnd,
          breakMinuten: eind.disputedBreak ?? eind.breakMinuten,
          confirmedAt: new Date(),
          disputedEnd: null,
          disputedBreak: null,
          disputeReason: null,
          disputedAt: null,
          refusedAt: null,
        },
      })
      await verstuurPush(
        shift.horecaId,
        'ChefShift',
        `De kok accepteerde je eindtijd voor "${shift.title}". Je kunt nu betalen.`,
        `/shifts/${shift.id}`
      )
      return NextResponse.json({ ok: true, geaccepteerd: true })
    }

    // Refus : arbitrage admin. Rien n'est facture tant que ce n'est pas tranche.
    await prisma.shiftEnd.update({
      where: { shiftId: shift.id },
      data: { refusedAt: new Date() },
    })

    const horeca = await prisma.user.findUnique({ where: { id: shift.horecaId } })
    if (horeca?.email) {
      await emailEindtijdBetwistGeweigerd(horeca.email, shift.id, shift.title, hhmm(eind.reportedEnd))
    }
    await verstuurPush(
      shift.horecaId,
      'ChefShift',
      `De kok weigerde je voorstel voor "${shift.title}". ChefShift bekijkt het dossier.`,
      `/shifts/${shift.id}`
    )

    return NextResponse.json({ ok: true, geaccepteerd: false })
  } catch (error) {
    console.error('[shifts/[id]/eindtijd/betwist]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
