import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { emailShiftBevestigd } from '@/lib/email'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const isAdmin = session?.user?.role === 'ADMIN'
    if (!session || (session.user.role !== 'HORECA' && !isAdmin)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const shiftId = params.id
    const body = await req.json().catch(() => ({}))
    const kokId = typeof body?.kokId === 'string' ? body.kokId.trim() : ''
    if (!kokId) {
      return NextResponse.json({ error: 'kokId is required' }, { status: 400 })
    }

    const shift = await prisma.shift.findUnique({ where: { id: shiftId } })
    if (!shift || (!isAdmin && shift.horecaId !== session.user.id)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // ===== kokId : jamais accepte tel quel depuis le client =====
    // Avant, la valeur du corps de requete etait ecrite directement dans
    // chosenKokId : on pouvait designer n'importe quel utilisateur, y compris
    // un compte qui n'avait pas candidate — et c'est ce chosenKokId qui recoit
    // le payout Stripe. On exige desormais une candidature reelle sur CETTE
    // shift, faite par un compte de role KOK.
    const candidature = await prisma.application.findFirst({
      where: { shiftId, kokId, kok: { role: 'KOK' } },
      select: { id: true },
    })
    if (!candidature) {
      return NextResponse.json(
        { error: 'This chef has not applied to this shift' },
        { status: 400 }
      )
    }

    const updated = await prisma.shift.update({
      where: { id: shiftId },
      data: { status: 'CONFIRMED', chosenKokId: kokId, confirmedAt: new Date() }
    })

    await prisma.application.updateMany({
      where: { shiftId, kokId: { not: kokId } },
      data: { status: 'REJECTED' }
    })
    await prisma.application.updateMany({
      where: { shiftId, kokId },
      data: { status: 'ACCEPTED' }
    })

    await prisma.notification.create({
      data: {
        userId: kokId,
        type: 'SHIFT_CONFIRMED',
        title: 'Shift bevestigd!',
        message: `Je bent gekozen voor: ${shift.title}`,
        shiftId,
      }
    })

    // Email au chef : choisi pour le shift
    const kok = await prisma.user.findUnique({ where: { id: kokId } })
    if (kok?.email) {
      const datum = new Date(shift.date).toLocaleDateString('nl-NL', {
        weekday: 'long', day: 'numeric', month: 'long',
      })
      await emailShiftBevestigd(kok.email, shiftId, shift.title, datum)
    }

    return NextResponse.json({ shift: updated })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
