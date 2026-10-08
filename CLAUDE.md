# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Next.js dev server (localhost:3000)
npm run build             # prisma generate && next build
npm run lint               # next lint
npm test                    # tsx --test tests/*.test.ts (node:test, no jest)
tsx --test tests/factuur.test.ts   # run a single test file

npm run db:generate      # prisma generate
npm run db:migrate        # prisma migrate dev
npm run db:studio          # Prisma Studio
npm run db:seed            # tsx prisma/seed.ts — refuses to run unless NODE_ENV=development
npm run db:reset            # prisma migrate reset --force && db:seed
```

There is no component/route test suite — `tests/*.test.ts` only covers the money math in `src/lib/factuur.ts`.

### Local database

`docker-compose.yml` expects Docker (Postgres 16 + Redis), user `chefshift` / password `chefshift_password` / db `chefshift`. If Docker isn't available, `brew install postgresql@16 redis` and pointing `DATABASE_URL` at `postgresql://chefshift:chefshift_password@localhost:5432/chefshift?schema=public` works fine as a substitute — the app only needs Postgres + Redis reachable, not the containers specifically.

**Check `DATABASE_URL` in `.env` before running migrate/seed/reset.** It is gitignored and not guaranteed to point at a local database — it has been found pointing at a remote Railway instance. Running destructive Prisma commands against a non-`localhost` `DATABASE_URL` risks touching real data; confirm with the user first if it doesn't look local.

## Architecture

Next.js 14 App Router + TypeScript + Prisma/Postgres + NextAuth (JWT sessions, credentials provider only — no OAuth). Everything lives under `src/app`, API routes under `src/app/api/**/route.ts`.

**No `middleware.ts`.** Every API route does its own `getServerSession(authOptions)` + `session.user.role` check (`HORECA` / `KOK` / `ADMIN`) at the top of the handler — follow this per-route pattern rather than introducing centralized auth middleware.

### Shift lifecycle

The core domain object is `Shift`, driven through a state machine that spans several models — read `src/lib/statut.ts` (`statutShift()`) to see the whole thing summarized, since it's the single place that maps state → human-facing status for both the horeca and kok perspective, and must stay in sync with any lifecycle change:

1. `OPEN` — horeca posted it, koks apply (`Application`, status `PENDING → VIEWED → ACCEPTED/REJECTED/WITHDRAWN`).
2. `CONFIRMED` — horeca picked a kok (`chosenKokId` set). If a shift stays `OPEN` more than 24h past its date with no kok chosen, the cron job flips it to `EXPIRED`.
3. After the shift date passes, end-time reporting kicks in via the `ShiftEnd` table (raw SQL, not a Prisma relation — see below): kok reports `reportedEnd`/`breakMinuten`, horeca confirms (`confirmedAt`) or disputes (`disputedEnd`/`disputedBreak`/`disputeReason`). Unanswered disputes auto-resolve in the **kok's** favor after 48h (cron) — this is a deliberate policy (the kok is the weaker party), not a bug.
4. Once end time is confirmed, horeca pays via Stripe Checkout (`/api/shifts/[id]/pay`, iDEAL + card) → `Invoice.status` PENDING → PAID (via `/api/stripe/webhook`).
5. `CANCELLED` is a separate terminal state from `EXPIRED` (nobody cancelled it, it just lapsed).

`/api/cron/reminders` is one endpoint hit externally every 15 min (cron-job.org, `CRON_SECRET` bearer/query auth) that does four unrelated jobs in sequence: shift-start push/email reminders (24h and 2h windows), "you forgot to report/confirm the end time" nudges, auto-expiring stale `OPEN` shifts, and auto-resolving 48h-old disputes. If you touch one job, check you're not breaking the others in the same file.

### Time handling — "wall-clock" convention

`Shift.startTime`/`endTime` are Postgres `@db.Time` columns holding only a clock time (Prisma reads them as `1970-01-01T{H}:{M}Z`). The whole codebase treats these as **wall-clock values with no timezone**: read/written via UTC *components* only (`getUTCHours()`/`getUTCMinutes()`), never converted for the viewer's timezone (`src/lib/time.ts`). When you need a real instant (e.g. "is the shift starting in 2 hours from now"), you must combine the wall-clock time with the `date` column yourself — see `instantDebut()` in `src/app/api/cron/reminders/route.ts` for the correct pattern. A previous bug compared the bare time value directly to a real timestamp and silently sent zero reminders; don't reintroduce that.

### Money

Always integer cents, half-up rounding — never floats. All calculation goes through `src/lib/factuur.ts`: `CHEF_VAT_RATE` (21%), `COMMISSION_RATE` (15% of the excl-VAT amount, not of the total). Urgent-shift surcharge (`spoedtoeslagPct`) is paid 100% to the kok on top; platform commission is computed on the base rate only, never on the surcharge. Two independent, gapless invoice-numbering series exist: `factuurNummer()` (`CS-{year}-{kokId}-{seq}`, per-kok, counter in `KokFactuurSeq`) and `commissieNummer()` (`CM-{year}-{seq}`, platform-wide, counter in `PlatformFactuurSeq`) — assigned transactionally at payment time, not at shift creation.

### Service tables via raw SQL

`ShiftEnd`, `KokPush`, `KokReminder`, `FavoriteKok`, `UserSource`, `KokFactuurSeq`, `PlatformFactuurSeq`, `CommissieFactuur` are declared in `schema.prisma` and covered by migrations, but most call sites still use `prisma.$queryRaw`/`$executeRaw` against them instead of the generated Prisma Client relations (a holdover from when these tables were created ad hoc at runtime, before migrations existed). New code touching these tables can use the real Prisma Client — the raw-SQL pattern isn't required, just prevalent.

### Unused dependencies

`@mollie/api-client`, `bull`, `ioredis`, `socket.io`, `socket.io-client` are in `package.json` but not referenced anywhere in `src/`. Payments are Stripe-only. Don't assume a queue or websocket layer exists.

### i18n

`src/lib/i18n.tsx` is a hand-rolled client-side nl/en dictionary keyed off `localStorage`, not a library like `next-intl`.

### Misc

- `.bak` files scattered through `src/` (e.g. `route.ts.bak`, `page.tsx.bak`) are gitignored local backups, not part of the build — ignore them.
- `deploy.sh` runs `next build`, deletes `*.bak` files, and pushes to git directly — it's a manual deploy script, not CI.
