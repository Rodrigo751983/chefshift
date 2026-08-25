import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  emailRappelShift,
  emailRappelEindtijdChef,
  emailRappelEindtijdHoreca,
  emailShiftVerlopenHoreca,
  emailShiftVerlopenKok,
  emailBetwistingVerlopen,
} from '@/lib/email'
import webpush from 'web-push'
import { timingSafeEqual } from 'crypto'

// Comparaison a temps constant (longueurs differentes = faux, sans fuite)
function comparaisonSure(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

// Tables kok_push / kok_reminder : gérées par les migrations Prisma (Phase 5)

type Sub = { endpoint: string; p256dh: string; auth: string }

// GET : appelé par un minuteur externe (cron-job.org) toutes les 15 minutes
// Clé acceptée UNIQUEMENT via header : Authorization: Bearer <CRON_SECRET>
export async function GET(req: NextRequest) {
  try {
    // Fermé par défaut : sans CRON_SECRET configuré, l'endpoint reste inaccessible.
    // Le secret n'est plus accepté en query string (?secret=) : une URL finit
    // dans les logs Vercel, l'historique du navigateur et l'en-tête Referer.
    // Comparaison à temps constant pour ne rien révéler par la durée.
    const secret = (process.env.CRON_SECRET || '').trim()
    const fourni = (req.headers.get('authorization') || '').replace(/^Bearer /, '')
    if (!secret || !comparaisonSure(fourni, secret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // trim + retrait du padding "=" éventuel (copier-coller)
    const pub = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '').trim().replace(/=+$/, '')
    const priv = (process.env.VAPID_PRIVATE_KEY || '').trim().replace(/=+$/, '')
    const vapidOk = !!(pub && priv)
    if (vapidOk) {
      webpush.setVapidDetails('mailto:info@chefshift.nl', pub, priv)
    }


    const maintenant = Date.now()
    const heure = 3600 * 1000
    const fenetres = [
      { kind: 'H24', min: maintenant + 23.75 * heure, max: maintenant + 24.25 * heure, delai: '24 uur' as const },
      { kind: 'H2', min: maintenant + 1.75 * heure, max: maintenant + 2.25 * heure, delai: '2 uur' as const },
    ]

    let envoyes = 0
    let emails = 0
    let shiftsTrouves = 0
    const erreurs: string[] = []

    // Instant reel de debut : `date` porte le jour, `startTime` est un @db.Time
    // qui ne contient que l'heure (Prisma le lit comme 1970-01-01T13:00Z).
    // Les comparer directement a un instant futur ne correspondait jamais :
    // aucun rappel ne partait.
    const instantDebut = (sh: { date: Date; startTime: Date }) => {
      const j = new Date(sh.date).toISOString().slice(0, 10)
      const t = new Date(sh.startTime)
      return new Date(
        `${j}T${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}:00.000Z`
      ).getTime()
    }

    // Presel'ection large sur la date, filtrage fin en memoire sur l'instant.
    const candidats = await prisma.shift.findMany({
      where: {
        status: 'CONFIRMED',
        chosenKokId: { not: null },
        date: {
          gte: new Date(maintenant - 2 * 24 * heure),
          lte: new Date(maintenant + 3 * 24 * heure),
        },
      },
    })

    for (const f of fenetres) {
      const shifts = candidats.filter((sh) => {
        const d = instantDebut(sh)
        return d >= f.min && d <= f.max
      })
      shiftsTrouves += shifts.length

      for (const shift of shifts) {
        const deja: { shift_id: string }[] = await prisma.$queryRaw`
          SELECT shift_id FROM kok_reminder WHERE shift_id = ${shift.id} AND kind = ${f.kind} LIMIT 1
        `
        if (deja.length > 0) continue

        const debut = new Date(instantDebut(shift)).toLocaleString('nl-NL', {
          weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
          timeZone: 'UTC',
        })

        // 1. Notifications push
        if (vapidOk) {
          const subs: Sub[] = await prisma.$queryRaw`
            SELECT endpoint, p256dh, auth FROM kok_push WHERE user_id = ${shift.chosenKokId}
          `
          for (const s of subs) {
            try {
              await webpush.sendNotification(
                { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                JSON.stringify({
                  title: 'ChefShift',
                  body: `Herinnering: je shift "${shift.title}" begint over ${f.delai}.`,
                  url: '/dashboard',
                })
              )
              envoyes++
            } catch (e: any) {
              erreurs.push(e?.message || 'push error')
              if (e?.statusCode === 404 || e?.statusCode === 410) {
                await prisma.$executeRaw`DELETE FROM kok_push WHERE endpoint = ${s.endpoint}`
              }
            }
          }
        }

        // 2. Email de rappel au chef
        const kok = await prisma.user.findUnique({ where: { id: shift.chosenKokId as string } })
        if (kok?.email) {
          // Details pratiques : sans eux le kok ne sait pas ou entrer,
          // quoi apporter ni qui appeler s'il a du retard.
          const zaak = await prisma.horecaProfile.findUnique({ where: { userId: shift.horecaId } })
          const hhmm = (d: Date) => new Date(d).toISOString().slice(11, 16)
          const startMin = new Date(shift.startTime).getUTCHours() * 60 + new Date(shift.startTime).getUTCMinutes()
          const meld = Math.max(0, startMin - (shift.meldMinuten ?? 15))
          const r = await emailRappelShift(kok.email, shift.id, shift.title, f.delai, debut, {
            functie: shift.function,
            bedrijf: zaak?.companyName,
            datum: new Date(shift.date).toLocaleDateString('nl-NL', {
              weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
            }),
            meldTijd: `${String(Math.floor(meld / 60)).padStart(2, '0')}:${String(meld % 60).padStart(2, '0')}`,
            start: hhmm(shift.startTime),
            eind: hhmm(shift.endTime),
            pauze: shift.breakMinutes,
            adres: [shift.locationStreet, shift.locationPostal, shift.locationCity].filter(Boolean).join(', ') || null,
            tarief: Math.round(shift.hourlyRate / 100),
            telefoon: shift.contactPhone || null,
            briefing: shift.briefing,
          })
          if (r.ok) emails++
        }

        await prisma.$executeRaw`
          INSERT INTO kok_reminder (shift_id, kind, sent_at)
          VALUES (${shift.id}, ${f.kind}, now())
          ON CONFLICT DO NOTHING
        `
      }
    }

    // ===== Rappel : heure de fin non confirmée après un shift terminé =====
    // Une partie a oublié -> on relance le chef (déclarer) et/ou l'horeca (confirmer).
    let rappelsFin = 0
    const ilYa3Jours = new Date(maintenant - 3 * 24 * heure)
    const shiftsFin = await prisma.shift.findMany({
      where: { status: 'CONFIRMED', chosenKokId: { not: null }, date: { gte: ilYa3Jours } },
    })
    for (const s of shiftsFin) {
      const dateStr = new Date(s.date).toISOString().slice(0, 10)
      const et = new Date(s.endTime)
      const st = new Date(s.startTime)
      const p2 = (n: number) => String(n).padStart(2, '0')
      const startUTC = new Date(`${dateStr}T${p2(st.getUTCHours())}:${p2(st.getUTCMinutes())}:00.000Z`).getTime()
      let finUTC = new Date(`${dateStr}T${p2(et.getUTCHours())}:${p2(et.getUTCMinutes())}:00.000Z`).getTime()
      if (finUTC <= startUTC) finUTC += 24 * heure
      // Le shift doit être terminé depuis au moins 1 h (marge)
      if (maintenant < finUTC + heure) continue

      const fins: { confirmed_at: Date | null }[] = await prisma.$queryRaw`
        SELECT confirmed_at FROM shift_end WHERE shift_id = ${s.id} LIMIT 1
      `
      if (fins.length > 0 && fins[0].confirmed_at) continue // déjà confirmé

      const deja: { shift_id: string }[] = await prisma.$queryRaw`
        SELECT shift_id FROM kok_reminder WHERE shift_id = ${s.id} AND kind = 'ENDCONF' LIMIT 1
      `
      if (deja.length > 0) continue

      const kok = s.chosenKokId ? await prisma.user.findUnique({ where: { id: s.chosenKokId } }) : null
      const horeca = await prisma.user.findUnique({ where: { id: s.horecaId } })
      // Chef : rappel s'il n'a pas encore déclaré son heure de fin
      if (fins.length === 0 && kok?.email) {
        const r = await emailRappelEindtijdChef(kok.email, s.id, s.title)
        if (r.ok) emails++
      }
      // Horeca : rappel pour confirmer
      if (horeca?.email) {
        const r = await emailRappelEindtijdHoreca(horeca.email, s.id, s.title)
        if (r.ok) emails++
      }
      await prisma.$executeRaw`
        INSERT INTO kok_reminder (shift_id, kind, sent_at)
        VALUES (${s.id}, 'ENDCONF', now()) ON CONFLICT DO NOTHING
      `
      rappelsFin++
    }

    // ===== Shifts expires =====
    // Annonce OPEN dont la date est passee depuis plus de 24 h sans kok
    // choisi. Le delai d'un jour est volontaire : un restaurant peut
    // trouver quelqu'un le matin meme.
    let verlopen = 0
    const hier = new Date(Date.now() - 24 * heure)
    const shiftsVerlopen = await prisma.shift.findMany({
      where: { status: 'OPEN', chosenKokId: null, date: { lt: hier } },
      include: { horeca: true, applications: { include: { kok: true } } },
      take: 200,
    })

    for (const sv of shiftsVerlopen) {
      try {
        await prisma.shift.update({ where: { id: sv.id }, data: { status: 'EXPIRED' } })
        verlopen++
        const datum = new Date(sv.date).toLocaleDateString('nl-NL', {
          day: 'numeric', month: 'long', timeZone: 'UTC',
        })
        if (sv.horeca?.email) {
          await emailShiftVerlopenHoreca(sv.horeca.email, sv.title, datum, sv.applications.length)
          emails++
        }
        // Les chefs qui ont postule meritent une reponse, pas un silence
        for (const cand of sv.applications) {
          if (cand.kok?.email) {
            await emailShiftVerlopenKok(cand.kok.email, sv.title, datum)
            emails++
          }
        }
      } catch (e: any) {
        erreurs.push(`verlopen ${sv.id}: ${e?.message || e}`)
      }
    }

    // ===== Contestations d'heure sans reponse depuis 48 h =====
    // Le silence ne doit pas bloquer un paiement indefiniment. Passe ce delai,
    // l'heure declaree par le chef fait foi : c'est lui qui a travaille, et
    // c'est la partie faible du rapport de force. Ecrit dans les CGU.
    let betwistingenVerlopen = 0
    const limite48 = new Date(Date.now() - 48 * heure)
    const betwist = await prisma.shiftEnd.findMany({
      where: {
        confirmedAt: null,
        refusedAt: null,
        disputedEnd: { not: null },
        disputedAt: { lt: limite48 },
      },
      take: 100,
    })

    for (const b of betwist) {
      try {
        await prisma.shiftEnd.update({
          where: { shiftId: b.shiftId },
          data: {
            confirmedAt: new Date(),
            disputedEnd: null,
            disputedBreak: null,
            disputeReason: null,
            disputedAt: null,
          },
        })
        betwistingenVerlopen++

        const sh = await prisma.shift.findUnique({
          where: { id: b.shiftId },
          include: { horeca: true },
        })
        if (sh?.horeca?.email) {
          const kokTijd = new Date(b.reportedEnd).toLocaleTimeString('nl-NL', {
            hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
          })
          await emailBetwistingVerlopen(sh.horeca.email, sh.id, sh.title, kokTijd)
          emails++
        }
      } catch (e: any) {
        erreurs.push(`betwisting ${b.shiftId}: ${e?.message || e}`)
      }
    }

    // Diagnostic : nombre total d'abonnements push en base
    const compte: { n: bigint }[] = await prisma.$queryRaw`SELECT COUNT(*)::int AS n FROM kok_push`
    const abonnements = Number(compte[0]?.n || 0)

    return NextResponse.json({ ok: true, envoyes, emails, rappelsFin, verlopen, betwistingenVerlopen, shiftsTrouves, abonnements, erreurs: erreurs.slice(0, 5) })
  } catch (error) {
    console.error('[cron/reminders]', error)
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
