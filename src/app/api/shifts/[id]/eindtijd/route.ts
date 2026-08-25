import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { verstuurPush } from '@/lib/push'
import { emailEindtijdGemeld } from '@/lib/email'

// Table shift_end : gérée par les migrations Prisma (Phase 5)

// POST : le chef déclare son heure de fin réelle { endTime: "HH:MM", breakMinutes?: number }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'KOK') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const shift = await prisma.shift.findUnique({ where: { id: params.id } })
    if (!shift || shift.chosenKokId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // ===== Le shift doit avoir commence =====
    // Sans cette garde, un kok pouvait declarer ses heures pour une shift a
    // venir et declencher la facturation d'un travail non effectue.
    // Reference : l'heure de DEBUT, pas de fin, pour qu'un kok qui termine
    // plus tot puisse quand meme declarer.
    const dateJour = new Date(shift.date).toISOString().slice(0, 10)
    const dep = new Date(shift.startTime)
    const debutReel = new Date(
      `${dateJour}T${String(dep.getUTCHours()).padStart(2, '0')}:${String(dep.getUTCMinutes()).padStart(2, '0')}:00.000Z`
    )
    if (Date.now() < debutReel.getTime()) {
      return NextResponse.json(
        { error: 'Shift has not started yet', startsAt: debutReel.toISOString() },
        { status: 409 }
      )
    }

    const body = await req.json()
    const endTime = String(body.endTime || '')
    if (!/^\d{2}:\d{2}$/.test(endTime)) {
      return NextResponse.json({ error: 'Invalid time' }, { status: 400 })
    }

    // Pause déclarée par le chef : 0 = pas de pause, entier 0..480, absent = pause par défaut du shift
    let pauze: number | null = null
    if (body.breakMinutes != null) {
      const b = Number(body.breakMinutes)
      if (!Number.isInteger(b) || b < 0 || b > 480) {
        return NextResponse.json({ error: 'Invalid break' }, { status: 400 })
      }
      pauze = b
    }

    // Heure "wall-clock" : instant UTC sur la date du shift (+1 jour si shift de nuit)
    const dateStr = new Date(shift.date).toISOString().slice(0, 10)
    const [h, m] = endTime.split(':').map(Number)
    const st = new Date(shift.startTime)
    const startMin = st.getUTCHours() * 60 + st.getUTCMinutes()
    let fin = new Date(`${dateStr}T${endTime}:00.000Z`)
    if (h * 60 + m < startMin) {
      fin = new Date(fin.getTime() + 86400000)
    }


    // Pas de modification après confirmation
    const existant: { confirmed_at: Date | null }[] = await prisma.$queryRaw`
      SELECT confirmed_at FROM shift_end WHERE shift_id = ${shift.id} LIMIT 1
    `
    if (existant.length > 0 && existant[0].confirmed_at) {
      return NextResponse.json({ error: 'Already confirmed' }, { status: 400 })
    }

    await prisma.$executeRaw`
      INSERT INTO shift_end (shift_id, reported_end, reported_at, confirmed_at, break_minuten)
      VALUES (${shift.id}, ${fin}, now(), NULL, ${pauze})
      ON CONFLICT (shift_id) DO UPDATE SET reported_end = ${fin}, reported_at = now(), confirmed_at = NULL, break_minuten = ${pauze}
    `

    // Email + push à l'horeca
    const horeca = await prisma.user.findUnique({ where: { id: shift.horecaId } })
    const kok = await prisma.user.findUnique({ where: { id: session.user.id }, include: { kokProfile: true } })
    const kokNaam = [kok?.kokProfile?.firstName, kok?.kokProfile?.lastName].filter(Boolean).join(' ') || kok?.name || 'De kok'
    if (horeca?.email) {
      await emailEindtijdGemeld(horeca.email, shift.id, shift.title, kokNaam, endTime)
    }
    await verstuurPush(
      shift.horecaId,
      'ChefShift',
      `Eindtijd doorgegeven voor "${shift.title}": ${endTime}. Bevestig in de app.`,
      `/shifts/${shift.id}`
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[shifts/[id]/eindtijd]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
