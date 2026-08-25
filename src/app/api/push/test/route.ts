import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import webpush from 'web-push'

type Sub = { endpoint: string; p256dh: string; auth: string }

// POST : envoie immédiatement une notification test à l'utilisateur connecté
export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const pub = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '').trim().replace(/=+$/, '')
    const priv = (process.env.VAPID_PRIVATE_KEY || '').trim().replace(/=+$/, '')
    if (!pub || !priv) {
      return NextResponse.json({ ok: false, error: 'VAPID keys not configured' })
    }
    webpush.setVapidDetails('mailto:info@chefshift.nl', pub, priv)

    const subs: Sub[] = await prisma.$queryRaw`
      SELECT endpoint, p256dh, auth FROM kok_push WHERE user_id = ${session.user.id}
    `
    if (subs.length === 0) {
      return NextResponse.json({ ok: false, code: 'no_subscription' })
    }

    let envoyes = 0
    let perimes = 0
    for (const s of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({
            title: 'ChefShift',
            body: 'Testmelding: je ontvangt nu herinneringen voor je shifts.',
            url: '/dashboard',
          })
        )
        envoyes++
      } catch (e: any) {
        // 404 / 410 = abonnement périmé côté service push : on le retire de la base
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          perimes++
          await prisma.$executeRaw`DELETE FROM kok_push WHERE endpoint = ${s.endpoint}`
        }
      }
    }

    if (envoyes > 0) {
      return NextResponse.json({ ok: true, code: 'ok', envoyes })
    }
    // Tous les abonnements de cet appareil ont expiré → le client doit se réabonner
    const code = perimes > 0 ? 'stale' : 'error'
    return NextResponse.json({ ok: false, code })
  } catch (error) {
    console.error('[push/test]', error)
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
