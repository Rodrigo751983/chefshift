import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST : laisser un avis sur l'autre partie du shift (horeca -> kok ou kok -> horeca)
// body: { score: 1..5, text?: string }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const score = Number(body.score)
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      return NextResponse.json({ error: 'Invalid score' }, { status: 400 })
    }
    const text = typeof body.text === 'string' ? body.text.trim().slice(0, 1000) : ''

    const shift = await prisma.shift.findUnique({ where: { id: params.id } })
    if (!shift || !shift.chosenKokId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (shift.status !== 'CONFIRMED' && shift.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Shift not finished' }, { status: 400 })
    }

    // Qui note qui ?
    let toUserId: string
    let flag: 'horecaReviewed' | 'kokReviewed'
    if (shift.horecaId === session.user.id) {
      toUserId = shift.chosenKokId
      flag = 'horecaReviewed'
    } else if (shift.chosenKokId === session.user.id) {
      toUserId = shift.horecaId
      flag = 'kokReviewed'
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.review.upsert({
      where: { shiftId_fromUserId: { shiftId: shift.id, fromUserId: session.user.id } },
      create: {
        shiftId: shift.id,
        fromUserId: session.user.id,
        toUserId,
        overallScore: score,
        reviewText: text || null,
        isPublic: true,
      },
      update: {
        overallScore: score,
        reviewText: text || null,
      },
    })

    await prisma.shift.update({ where: { id: shift.id }, data: { [flag]: true } })

    // Recalcul de la moyenne du profil noté (best-effort)
    try {
      const recus = await prisma.review.findMany({ where: { toUserId }, select: { overallScore: true } })
      const count = recus.length
      const avg = count > 0 ? recus.reduce((s, r) => s + r.overallScore, 0) / count : 0
      const cible = await prisma.user.findUnique({
        where: { id: toUserId },
        include: { kokProfile: true, horecaProfile: true },
      })
      if (cible?.kokProfile) {
        await prisma.kokProfile.update({
          where: { userId: toUserId },
          data: { averageScore: avg, reviewCount: count },
        })
      } else if (cible?.horecaProfile) {
        await prisma.horecaProfile.update({
          where: { userId: toUserId },
          data: { averageScore: avg, reviewCount: count },
        })
      }
    } catch {}

    // Notification à la personne notée (best-effort)
    try {
      await prisma.notification.create({
        data: {
          userId: toUserId,
          type: 'REVIEW_REQUESTED',
          title: 'Nieuwe beoordeling',
          message: `Je hebt een beoordeling ontvangen voor: ${shift.title}`,
          shiftId: shift.id,
        },
      })
    } catch {}

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[shifts/review]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
