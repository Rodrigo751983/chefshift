import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET : renvoie les shiftIds auxquels l'utilisateur connecté a postulé
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const apps = await prisma.application.findMany({
      where: { kokId: session.user.id },
      select: { shiftId: true },
    })
    return NextResponse.json({ shiftIds: apps.map((a) => a.shiftId) })
  } catch (error) {
    console.error('[applications/mine]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
