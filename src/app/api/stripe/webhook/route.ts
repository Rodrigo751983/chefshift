import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { emailBetalingOntvangen } from '@/lib/email'
import { factuurNummer, commissieNummer, minutenVanTijd, berekenUrenMinuten } from '@/lib/factuur'
import Stripe from 'stripe'

// Stripe appelle cette route après un paiement réussi
export async function POST(req: NextRequest) {
  const key = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!key || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  const stripe = new Stripe(key)
  const signature = req.headers.get('stripe-signature') || ''
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const s = event.data.object as Stripe.Checkout.Session
    const invoiceId = s.metadata?.invoiceId
    if (invoiceId) {
      try {
        // Tables de numérotation gérées par les migrations Prisma (séries gapless préservées)
        const jaar = new Date().getFullYear()

        // Transaction : passage en PAID + attribution des deux numéros de façon atomique
        const invoice = await prisma.$transaction(async (tx) => {
          const inv = await tx.invoice.update({
            where: { id: invoiceId },
            data: { status: 'PAID', paidAt: new Date() },
            include: { shift: true },
          })

          // Instantané figé : une facture payée est un document légal.
          // Écrit une seule fois — Stripe rejoue les webhooks, d'où la garde sur null.
          // Heure de fin : celle confirmée (shift_end) si elle existe, sinon le planning.
          if (inv.billedMinutes == null) {
            const shiftEnd = await tx.shiftEnd.findUnique({ where: { shiftId: inv.shiftId } })
            const startMin = minutenVanTijd(inv.shift.startTime)
            const endMin = shiftEnd ? minutenVanTijd(shiftEnd.reportedEnd) : minutenVanTijd(inv.shift.endTime)
            const pauze = shiftEnd?.breakMinuten ?? inv.shift.breakMinutes
            await tx.invoice.update({
              where: { id: inv.id },
              data: {
                billedMinutes: berekenUrenMinuten(startMin, endMin, pauze),
                breakMinutes: pauze,
                startMinutes: startMin,
                endMinutes: endMin,
                vatRateUsed: Math.round(inv.shift.vatRate),
              },
            })
          }

          // Document A : série continue PAR CHEF, sans trou (CS-{année}-{chefId}-{seq:04d})
          if (!inv.invoiceNumber && inv.shift.chosenKokId) {
            const kokId = inv.shift.chosenKokId
            const rows: { laatste_seq: number }[] = await tx.$queryRaw`
              INSERT INTO kok_factuur_seq (kok_id, jaar, laatste_seq)
              VALUES (${kokId}, ${jaar}, 1)
              ON CONFLICT (kok_id, jaar)
              DO UPDATE SET laatste_seq = kok_factuur_seq.laatste_seq + 1
              RETURNING laatste_seq`
            const nummer = factuurNummer(jaar, kokId, rows[0].laatste_seq)
            await tx.invoice.update({ where: { id: inv.id }, data: { invoiceNumber: nummer } })
            inv.invoiceNumber = nummer
          }

          // Document B : série plateforme distincte (CM-{année}-{seq:04d})
          const bestaandB: { nummer: string }[] = await tx.$queryRaw`
            SELECT nummer FROM commissie_factuur WHERE invoice_id = ${inv.id} LIMIT 1`
          if (bestaandB.length === 0) {
            const rowsB: { laatste_seq: number }[] = await tx.$queryRaw`
              INSERT INTO platform_factuur_seq (jaar, laatste_seq)
              VALUES (${jaar}, 1)
              ON CONFLICT (jaar)
              DO UPDATE SET laatste_seq = platform_factuur_seq.laatste_seq + 1
              RETURNING laatste_seq`
            await tx.$executeRaw`
              INSERT INTO commissie_factuur (invoice_id, nummer, jaar, seq)
              VALUES (${inv.id}, ${commissieNummer(jaar, rowsB[0].laatste_seq)}, ${jaar}, ${rowsB[0].laatste_seq})
              ON CONFLICT (invoice_id) DO NOTHING`
          }

          return inv
        })

        if (invoice.shift.chosenKokId) {
          await prisma.notification.create({
            data: {
              userId: invoice.shift.chosenKokId,
              type: 'PAYMENT_RECEIVED',
              title: 'Betaling ontvangen',
              message: `De horeca heeft betaald voor: ${invoice.shift.title}`,
              shiftId: invoice.shiftId,
            },
          })

          // Email au chef : paiement reçu
          const kok = await prisma.user.findUnique({ where: { id: invoice.shift.chosenKokId } })
          if (kok?.email) {
            await emailBetalingOntvangen(kok.email, invoice.shift.title, invoice.kokPayout / 100)
          }
        }
      } catch (error) {
        // Ne JAMAIS avaler l'erreur ici. Avant, un `catch {}` suivi d'un 200
        // faisait croire a Stripe que l'evenement etait traite : la facture
        // restait PENDING alors que le restaurant avait deja paye, le kok
        // n'etait ni notifie ni paye, et rien n'apparaissait nulle part.
        // Un 500 declenche le rejeu automatique de Stripe.
        console.error('[stripe:webhook] echec du traitement', {
          eventId: event.id,
          type: event.type,
          invoiceId,
          error,
        })
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ received: true })
}
