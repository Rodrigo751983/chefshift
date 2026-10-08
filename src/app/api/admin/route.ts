import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vue = new URL(req.url).searchParams.get('vue')

    // Vues détaillées pour les pages dédiées de l'admin
    if (vue === 'users') {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 300,
        select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      })
      return NextResponse.json({ users })
    }

    if (vue === 'businesses') {
      const businesses = await prisma.user.findMany({
        where: { role: 'HORECA' },
        orderBy: { createdAt: 'desc' },
        take: 300,
        select: {
          id: true, email: true, createdAt: true,
          horecaProfile: { select: { companyName: true, kvkNumber: true, city: true, contactName: true, horecaType: true } },
        },
      })
      return NextResponse.json({ businesses })
    }

    if (vue === 'chefs') {
      const chefs = await prisma.user.findMany({
        where: { role: 'KOK' },
        orderBy: { createdAt: 'desc' },
        take: 300,
        select: {
          id: true, email: true, createdAt: true,
          kokProfile: { select: { firstName: true, lastName: true, kvkNumber: true, city: true, yearsExperience: true, averageScore: true, reviewCount: true } },
        },
      })
      return NextResponse.json({ chefs })
    }

    if (vue === 'shifts') {
      const shiftsBruts = await prisma.shift.findMany({
        take: 300,
        orderBy: [{ date: 'desc' }],
        include: {
          horeca: { include: { horecaProfile: true } },
          chosenKok: { include: { kokProfile: true } },
          _count: { select: { applications: true } },
        },
      })
      // Statut virtuel, identique à /api/shifts : un shift OPEN, date passée,
      // sans chef choisi = EXPIRED. Rien n'est écrit en base : si la date est
      // prolongée, le shift redevient OPEN automatiquement.
      const aujourdhui = new Date(new Date().toDateString())
      const shifts = shiftsBruts.map((s) =>
        s.status === 'OPEN' && !s.chosenKokId && new Date(s.date) < aujourdhui ? { ...s, status: 'EXPIRED' as const } : s
      )
      return NextResponse.json({ shifts })
    }

    if (vue === 'invoices') {
      const invoices = await prisma.invoice.findMany({
        orderBy: { createdAt: 'desc' },
        take: 300,
        include: { shift: { select: { title: true } } },
      })
      return NextResponse.json({ invoices })
    }

    if (vue === 'revenue') {
      const [paid, totaux] = await Promise.all([
        prisma.invoice.findMany({
          where: { status: 'PAID' },
          orderBy: { paidAt: 'desc' },
          take: 300,
          include: { shift: { select: { title: true } } },
        }),
        prisma.invoice.aggregate({
          where: { status: 'PAID' },
          _sum: { amountInclVat: true, platformFee: true, kokPayout: true },
        }),
      ])
      return NextResponse.json({
        invoices: paid,
        totaux: {
          facture: (totaux._sum.amountInclVat || 0) / 100,
          commission: (totaux._sum.platformFee || 0) / 100,
          reverse: (totaux._sum.kokPayout || 0) / 100,
        },
      })
    }

    const [totalUsers, totalHoreca, totalKoks, totalShifts, totalInvoices, revenue] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'HORECA' } }),
      prisma.user.count({ where: { role: 'KOK' } }),
      prisma.shift.count(),
      prisma.invoice.count(),
      prisma.invoice.aggregate({ where: { status: 'PAID' }, _sum: { amountInclVat: true } }),
    ])

    const recentShiftsBruts = await prisma.shift.findMany({
      take: 60,
      orderBy: [{ date: 'desc' }],
      include: {
        horeca: { include: { horecaProfile: true } },
        chosenKok: { include: { kokProfile: true } },
        _count: { select: { applications: true } },
      },
    })

    // Statut virtuel, identique à /api/shifts : OPEN + date passée + sans
    // chef choisi = EXPIRED (rien d'écrit en base).
    const aujourdhui = new Date(new Date().toDateString())
    const recentShifts = recentShiftsBruts.map((s) =>
      s.status === 'OPEN' && !s.chosenKokId && new Date(s.date) < aujourdhui ? { ...s, status: 'EXPIRED' as const } : s
    )

    return NextResponse.json({
      stats: { totalUsers, totalHoreca, totalKoks, totalShifts, totalInvoices, totalRevenue: (revenue._sum.amountInclVat || 0) / 100 },
      recentShifts,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
