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

function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  return new Stripe(key.trim())
}

// POST : démarrer la connexion Stripe du chef (compte Express + lien d'onboarding)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'KOK') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const stripe = stripeClient()
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    await ensureStripeTable()
    const rows: { stripe_account_id: string }[] = await prisma.$queryRaw`
      SELECT stripe_account_id FROM kok_stripe WHERE kok_id = ${session.user.id}
    `
    let accountId = rows[0]?.stripe_account_id

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'NL',
        email: session.user.email || undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      })
      accountId = account.id
      await prisma.$executeRaw`
        INSERT INTO kok_stripe (kok_id, stripe_account_id, onboarded, updated_at)
        VALUES (${session.user.id}, ${accountId}, false, now())
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
    console.error('[connect]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET : vérifier si le compte du chef est prêt à recevoir des paiements
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const stripe = stripeClient()
    if (!stripe) return NextResponse.json({ onboarded: false })

    await ensureStripeTable()
    const rows: { stripe_account_id: string; onboarded: boolean }[] = await prisma.$queryRaw`
      SELECT stripe_account_id, onboarded FROM kok_stripe WHERE kok_id = ${session.user.id}
    `
    const row = rows[0]
    if (!row) return NextResponse.json({ onboarded: false, hasAccount: false })

    const account = await stripe.accounts.retrieve(row.stripe_account_id)
    const ready = !!(account.charges_enabled && account.payouts_enabled)
    if (ready !== row.onboarded) {
      await prisma.$executeRaw`
        UPDATE kok_stripe SET onboarded = ${ready}, updated_at = now() WHERE kok_id = ${session.user.id}
      `
    }
    return NextResponse.json({ onboarded: ready, hasAccount: true })
  } catch {
    return NextResponse.json({ onboarded: false })
  }
}
