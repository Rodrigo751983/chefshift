import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { estAutorise } from '@/lib/ratelimit'
import { emailBienvenueChef, emailBienvenueHoreca } from '@/lib/email'
import { registerSchema, codesErreur } from '@/lib/validation'
import { verifierTurnstile } from '@/lib/turnstile'
import { verifierKvkExistence } from '@/lib/kvk'

export async function POST(req: NextRequest) {
  try {
    // ===== 1. Limiteur de débit (première ligne, la moins coûteuse) =====
    // En mémoire, donc par instance sur Vercel : il freine, il ne bloque pas.
    // C'est le captcha qui bloque réellement — les deux sont complémentaires.
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'inconnu'
    if (!estAutorise(`register:${ip}`, 10, 3600_000)) {
      return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
    }

    const brut = await req.json().catch(() => null)
    if (!brut || typeof brut !== 'object') {
      return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 })
    }

    // ===== 2. Validation (locale, gratuite, faite avant tout appel réseau) =====
    const parsed = registerSchema.safeParse(brut)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', champs: codesErreur(parsed.error) },
        { status: 400 }
      )
    }
    const d = parsed.data

    // ===== 3. Captcha — avant toute écriture en base =====
    const captcha = await verifierTurnstile(d.turnstileToken, ip)
    if (!captcha.ok) {
      return NextResponse.json(
        { error: 'VALIDATION_FAILED', champs: { turnstileToken: captcha.code } },
        { status: 400 }
      )
    }

    // ===== 4. Unicité de l'e-mail =====
    const existing = await prisma.user.findUnique({ where: { email: d.email } })
    if (existing) {
      return NextResponse.json({ error: 'EMAIL_ALREADY_REGISTERED' }, { status: 400 })
    }

    // ===== 5. Création =====
    const hashed = await bcrypt.hash(d.password, 12)
    const user = await prisma.user.create({
      data: {
        email: d.email,
        password: hashed,
        role: d.role,
        name: d.name,
        ...(d.role === 'HORECA'
          ? {
              horecaProfile: {
                create: {
                  companyName: d.companyName || d.name,
                  kvkNumber: d.kvkNumber,
                  city: '',
                  postalCode: '',
                },
              },
            }
          : {
              kokProfile: {
                create: {
                  firstName: d.firstName || d.name,
                  lastName: d.lastName || '',
                  kvkNumber: d.kvkNumber,
                  city: '',
                },
              },
            }),
      },
    })

    // ===== 6. Existence réelle du KvK (best-effort, ne bloque jamais) =====
    // Tant que KVK_API_KEY n'est pas configurée, statut = 'non_verifie'.
    // Journalisé uniquement : refuser une inscription sur la foi d'un registre
    // externe qui peut être indisponible ferait plus de dégâts que de bien.
    try {
      const kvk = await verifierKvkExistence(d.kvkNumber)
      if (kvk.statut === 'introuvable') {
        console.warn('[register] KvK introuvable au Handelsregister', {
          userId: user.id,
          kvkNumber: d.kvkNumber,
        })
      }
    } catch {}

    // Canal d'acquisition (comment l'utilisateur a connu ChefShift)
    if (d.source) {
      try {
        await prisma.$executeRaw`
          INSERT INTO user_source (user_id, source, created_at)
          VALUES (${user.id}, ${String(d.source)}, now())
          ON CONFLICT (user_id) DO UPDATE SET source = ${String(d.source)}
        `
      } catch {}
    }

    // E-mail de bienvenue adapté au rôle (sans bloquer la réponse)
    try {
      if (d.role === 'HORECA') {
        await emailBienvenueHoreca(d.email)
      } else {
        await emailBienvenueChef(d.email)
      }
    } catch {}

    return NextResponse.json({ message: 'User created', userId: user.id }, { status: 201 })
  } catch (error) {
    console.error('[register]', error)
    return NextResponse.json({ error: 'UNKNOWN' }, { status: 500 })
  }
}
