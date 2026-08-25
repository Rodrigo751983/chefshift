import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  CHEF_VAT_RATE,
  afrondenHalfUp,
  berekenUrenMinuten, berekenBedragen, minutenVanTijd,
} from '@/lib/factuur'
import Stripe from 'stripe'

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

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'HORECA') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }
    const stripe = new Stripe(key.trim())

    const shift = await prisma.shift.findUnique({
      where: { id: params.id },
      include: { invoice: true },
    })
    if (!shift || shift.horecaId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (shift.status !== 'CONFIRMED' && shift.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Shift not confirmed' }, { status: 400 })
    }
    if (shift.invoice?.status === 'PAID') {
      return NextResponse.json({ error: 'Already paid' }, { status: 400 })
    }

    // ===== L'heure de fin doit être confirmée avant le paiement =====
    // Table shift_end : gérée par les migrations Prisma (Phase 5)
    const conf: { confirmed_at: Date | null }[] = await prisma.$queryRaw`
      SELECT confirmed_at FROM shift_end WHERE shift_id = ${shift.id} LIMIT 1
    `
    if (!conf.length || !conf[0].confirmed_at) {
      return NextResponse.json({ error: 'End time not confirmed yet' }, { status: 400 })
    }

    // ===== Heures dérivées des horaires (wall-clock UTC), fin réelle confirmée =====
    const startMin = minutenVanTijd(shift.startTime)
    let endMin: number | null = null
    let finReelle = false
    // Pause déclarée par le chef (shift_end.break_minuten) ; NULL = pause par défaut du shift
    let pauzeGemeld: number | null = null
    try {
      const fins: { reported_end: Date; break_minuten: number | null }[] = await prisma.$queryRaw`
        SELECT reported_end, break_minuten FROM shift_end WHERE shift_id = ${shift.id} LIMIT 1
      `
      if (fins.length > 0) {
        endMin = minutenVanTijd(fins[0].reported_end)
        finReelle = true
        pauzeGemeld = fins[0].break_minuten
      }
    } catch {}
    if (endMin == null) {
      endMin = minutenVanTijd(shift.endTime)
    }

    // ===== Calcul en centimes entiers (TVA 21%, commission 15% du HT) =====
    const pauze = pauzeGemeld != null ? pauzeGemeld : shift.breakMinutes
    const urenMinuten = berekenUrenMinuten(startMin, endMin, pauze)
    const b = berekenBedragen(urenMinuten, shift.hourlyRate) // tarif déjà en centimes
    const heures = urenMinuten / 60

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

    // ===== Facture (une par shift) — le numéro est attribué au paiement (webhook) =====
    const invoice = await prisma.invoice.upsert({
      where: { shiftId: shift.id },
      create: {
        shiftId: shift.id,
        horecaId: session.user.id,
        amountExclVat: exclCenten,
        vatAmount: btwCenten,
        amountInclVat: inclCenten,
        platformFee: feeCenten,
        kokPayout: payoutCenten,
        status: 'PENDING',
        paymentProvider: 'stripe',
      },
      update: {
        amountExclVat: exclCenten,
        vatAmount: btwCenten,
        amountInclVat: inclCenten,
        platformFee: feeCenten,
        kokPayout: payoutCenten,
        paymentProvider: 'stripe',
      },
    })

    // ===== Compte Stripe Connect du chef (s'il existe) =====
    await ensureStripeTable()
    let destination: string | null = null
    if (shift.chosenKokId) {
      const rows: { stripe_account_id: string }[] = await prisma.$queryRaw`
        SELECT stripe_account_id FROM kok_stripe WHERE kok_id = ${shift.chosenKokId} AND onboarded = true
      `
      destination = rows[0]?.stripe_account_id || null
    }

    // ===== Session Stripe Checkout (iDEAL + carte) =====
    const origin = req.nextUrl.origin
    try {
      const checkout = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['ideal', 'card'],
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'eur',
              unit_amount: inclCenten,
              product_data: {
                name: `ChefShift: ${shift.title}`,
                description: `${heures.toFixed(1)}u × €${(shift.hourlyRate / 100).toFixed(2)} + ${CHEF_VAT_RATE}% btw${finReelle ? ' (werkelijke eindtijd)' : ''}${pct > 0 ? ` + spoedtoeslag ${pct}%` : ''}`,
              },
            },
          },
        ],
        // Si le chef est connecté : l'argent lui va directement, la commission reste sur la plateforme
        ...(destination
          ? {
              payment_intent_data: {
                application_fee_amount: b.commissieCenten,
                transfer_data: { destination },
              },
            }
          : {}),
        metadata: { shiftId: shift.id, invoiceId: invoice.id },
        success_url: `${origin}/shifts/${shift.id}?betaald=1`,
        cancel_url: `${origin}/shifts/${shift.id}`,
      })

      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { paymentId: checkout.id, paymentUrl: checkout.url || '' },
      })

      return NextResponse.json({ url: checkout.url })
    } catch (stripeError) {
      console.error('[shifts/pay] Stripe', stripeError)
      return NextResponse.json({ error: 'Payment provider error' }, { status: 500 })
    }
  } catch (error) {
    console.error('[shifts/pay]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
