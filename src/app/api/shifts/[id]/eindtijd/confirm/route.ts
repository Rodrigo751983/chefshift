import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { verstuurPush } from '@/lib/push'
import { emailEindtijdBevestigd } from '@/lib/email'

// Table shift_end : gérée par les migrations Prisma (Phase 5)

// POST : l'horeca (ou un admin) confirme l'heure de fin.
// body optionnel { endTime: "HH:MM" } : permet au restaurant de saisir/corriger l'heure
// même si le chef ne l'a pas déclarée. Une fois confirmée, seule un compte admin peut modifier.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const isAdmin = session?.user?.role === 'ADMIN'
    if (!session?.user || (session.user.role !== 'HORECA' && !isAdmin)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const shift = await prisma.shift.findUnique({ where: { id: params.id } })
    if (!shift || (!isAdmin && shift.horecaId !== session.user.id)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (!shift.chosenKokId) {
      return NextResponse.json({ error: 'No chef chosen' }, { status: 400 })
    }

    // La confirmation n'est possible qu'une fois le jour du shift arrivé (sauf admin)
    const aujourdhui = new Date(new Date().toDateString())
    if (!isAdmin && new Date(shift.date) > aujourdhui) {
      return NextResponse.json({ error: 'Shift not finished yet' }, { status: 400 })
    }


    const body = await req.json().catch(() => ({}))
    const endTime = typeof body?.endTime === 'string' ? body.endTime : ''

    const lignes: { reported_end: Date; confirmed_at: Date | null }[] = await prisma.$queryRaw`
      SELECT reported_end, confirmed_at FROM shift_end WHERE shift_id = ${shift.id} LIMIT 1
    `
    // Une fois confirmée, plus de modification sauf pour un admin
    if (lignes.length > 0 && lignes[0].confirmed_at && !isAdmin) {
      return NextResponse.json({ error: 'Already confirmed' }, { status: 400 })
    }

    // Heure de fin finale (wall-clock, composantes UTC).
    // IMPORTANT : si le chef a declare une heure, l'horeca ne peut plus la
    // remplacer ici — cela ecrasait sa declaration en silence tout en lui
    // notifiant "confirme". Pour proposer une autre heure, il passe par
    // POST /eindtijd/betwist, que le chef doit accepter.
    const dateStr = new Date(shift.date).toISOString().slice(0, 10)
    const st = new Date(shift.startTime)
    const startMin = st.getUTCHours() * 60 + st.getUTCMinutes()
    const chefADeclare = lignes.length > 0
    if (/^\d{2}:\d{2}$/.test(endTime) && chefADeclare && !isAdmin) {
      return NextResponse.json(
        { error: 'Chef reported an end time. Use /eindtijd/betwist to propose another.' },
        { status: 409 }
      )
    }
    let fin: Date
    if (/^\d{2}:\d{2}$/.test(endTime)) {
      const [h, m] = endTime.split(':').map(Number)
      fin = new Date(`${dateStr}T${endTime}:00.000Z`)
      if (h * 60 + m < startMin) fin = new Date(fin.getTime() + 86400000)
    } else if (lignes.length > 0) {
      fin = new Date(lignes[0].reported_end)
    } else {
      const et = new Date(shift.endTime)
      const eh = et.getUTCHours()
      const em = et.getUTCMinutes()
      fin = new Date(`${dateStr}T${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}:00.000Z`)
      if (eh * 60 + em <= startMin) fin = new Date(fin.getTime() + 86400000)
    }

    await prisma.$executeRaw`
      INSERT INTO shift_end (shift_id, reported_end, reported_at, confirmed_at)
      VALUES (${shift.id}, ${fin}, now(), now())
      ON CONFLICT (shift_id) DO UPDATE SET reported_end = ${fin}, confirmed_at = now(),
        disputed_end = NULL, disputed_break = NULL, dispute_reason = NULL,
        disputed_at = NULL, refused_at = NULL
    `

    const eindtijd = new Date(fin).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })

    // Email + push au chef
    const kok = await prisma.user.findUnique({ where: { id: shift.chosenKokId } })
    if (kok?.email) {
      await emailEindtijdBevestigd(kok.email, shift.id, shift.title, eindtijd)
    }
    await verstuurPush(
      shift.chosenKokId,
      'ChefShift',
      `Je eindtijd voor "${shift.title}" (${eindtijd}) is bevestigd.`,
      `/shifts/${shift.id}`
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[shifts/[id]/eindtijd/confirm]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
