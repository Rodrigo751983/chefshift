import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

// Table auto-créée : lien entre chef et compte Stripe Connect
async function ensureStripeTable() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS kok_stripe (
      kok_id TEXT PRIMARY KEY,
      stripe_account_id TEXT,
      onboarded BOOLEAN DEFAULT FALSE,
      updated_at TIMESTAMP DEFAULT now()
    )
  `
}

// POST : un admin génère un lien d'onboarding Stripe pour un chef donné.
// Cas d'usage : le lien du chef a expiré (les account links Stripe ont une durée
// de validité limitée) et il faut lui en envoyer un nouveau par email/WhatsApp.
// body : { kokId: string } → { url: string }
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })

    const body = await req.json().catch(() => ({}))
    const kokId = typeof body?.kokId === 'string' ? body.kokId : ''
    if (!kokId) return NextResponse.json({ error: 'kokId required' }, { status: 400 })

    const kok = await prisma.user.findUnique({ where: { id: kokId } })
    if (!kok || kok.role !== 'KOK') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const stripe = new Stripe(key.trim())
    await ensureStripeTable()
    const rows: { stripe_account_id: string }[] = await prisma.$queryRaw`
      SELECT stripe_account_id FROM kok_stripe WHERE kok_id = ${kok.id}
    `
    let accountId = rows[0]?.stripe_account_id

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'NL',
        email: kok.email || undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      })
      accountId = account.id
      await prisma.$executeRaw`
        INSERT INTO kok_stripe (kok_id, stripe_account_id, onboarded, updated_at)
        VALUES (${kok.id}, ${accountId}, false, now())
        ON CONFLICT (kok_id) DO UPDATE SET stripe_account_id = ${accountId}, updated_at = now()
      `
    }

    const origin = req.nextUrl.origin
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/profiel?connect=retry`,
      return_url: `${origin}/profiel?connect=ok`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: link.url })
  } catch (error) {
    console.error('[admin/connect]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
