import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Table kok_push : gérée par les migrations Prisma (Phase 5)

// POST : enregistrer l'abonnement push de l'utilisateur connecté
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { subscription } = await req.json()
    const endpoint = subscription?.endpoint
    const p256dh = subscription?.keys?.p256dh
    const auth = subscription?.keys?.auth
    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }

    await prisma.$executeRaw`
      INSERT INTO kok_push (endpoint, user_id, p256dh, auth, created_at)
      VALUES (${endpoint}, ${session.user.id}, ${p256dh}, ${auth}, now())
      ON CONFLICT (endpoint) DO UPDATE SET user_id = ${session.user.id}, p256dh = ${p256dh}, auth = ${auth}
    `
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[push/subscribe]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE : désactiver les notifications sur cet appareil
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { endpoint } = await req.json()
    if (!endpoint) {
      return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 })
    }

    await prisma.$executeRaw`
      DELETE FROM kok_push WHERE endpoint = ${endpoint} AND user_id = ${session.user.id}
    `
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[push/subscribe]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
