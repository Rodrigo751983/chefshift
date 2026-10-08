'use client'

import { useEffect, useState } from 'react'
import { useT, LangToggle } from '@/lib/i18n'
import AnimStyles from '@/components/AnimStyles'
import ThemeToggle from '@/components/ThemeToggle'
import { Ico, IcoTile } from '@/components/Icons'

const FONT = '"Sora","Inter","Helvetica Neue",Arial,sans-serif'

type AdminShift = {
  id: string
  title: string
  date: string
  status: string
  hourlyRate: number
  horeca?: { horecaProfile?: { companyName?: string | null } | null } | null
  chosenKok?: { name?: string | null; kokProfile?: { firstName?: string | null; lastName?: string | null } | null } | null
  _count?: { applications: number }
}

type AdminData = {
  stats: {
    totalUsers: number
    totalHoreca: number
    totalKoks: number
    totalShifts: number
    totalInvoices: number
    totalRevenue: number
  }
  recentShifts: AdminShift[]
}

const STATUT: Record<string, { bg: string; fg: string }> = {
  OPEN: { bg: '#eef2e6', fg: '#4c5e42' },
  CONFIRMED: { bg: '#dcfce7', fg: '#15803d' },
  COMPLETED: { bg: '#e0e7ff', fg: '#3730a3' },
  CANCELLED: { bg: '#fee2e2', fg: '#b91c1c' },
  EXPIRED: { bg: '#fdf0dc', fg: '#8a5b1e' },
  CLOSED: { bg: '#f1f0eb', fg: '#8a8676' },
}

export default function AdminPage() {
  const { t, lang } = useT()
  const [data, setData] = useState<AdminData | null>(null)
  const [chargement, setChargement] = useState(true)
  const [refus, setRefus] = useState(false)
  const [q, setQ] = useState('')

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((s) => {
        if (!s?.user) {
          window.location.href = '/login'
          return
        }
        if (s.user.role !== 'ADMIN') {
          setRefus(true)
          setChargement(false)
          return
        }
        fetch('/api/admin')
          .then((r) => r.json())
          .then((d) => {
            setData(d)
            setChargement(false)
          })
          .catch(() => setChargement(false))
      })
  }, [])

  const locale = lang === 'en' ? 'en-GB' : 'nl-NL'

  const carte: React.CSSProperties = {
    background: 'hsl(var(--card))', borderRadius: 20, border: '1px solid #eceee3',
    boxShadow: '0 3px 12px rgba(46,52,43,0.05)', padding: 18,
  }
  const champ: React.CSSProperties = {
    width: '100%', padding: 12, border: '1.5px solid #e2e6d7', borderRadius: 12,
    fontSize: 15, outline: 'none', boxSizing: 'border-box', background: 'hsl(var(--card))', fontFamily: FONT,
    color: 'hsl(var(--foreground))',
  }

  if (chargement) {
    return (
      <main style={{ fontFamily: FONT, background: 'hsl(var(--background))', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}>{t('dash_loading')}</p>
      </main>
    )
  }

  if (refus) {
    return (
      <main style={{ fontFamily: FONT, background: 'hsl(var(--background))', color: 'hsl(var(--foreground))', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
        <p style={{ fontWeight: 700 }}>{t('admin_denied')}</p>
        <a href="/dashboard" style={{ color: '#5f7052', fontWeight: 700, textDecoration: 'none' }}>{t('back_dashboard')}</a>
      </main>
    )
  }

  const s = data?.stats
  const shifts = (data?.recentShifts || []).filter((sh) => {
    const hay = `${sh.title} ${sh.horeca?.horecaProfile?.companyName || ''}`.toLowerCase()
    return hay.includes(q.trim().toLowerCase())
  })

  const cartesStats = [
    { c: String(s?.totalUsers ?? 0), l: t('admin_users'), icone: 'users', lien: '/admin/users' },
    { c: String(s?.totalHoreca ?? 0), l: t('admin_horeca'), icone: 'brief', lien: '/admin/businesses' },
    { c: String(s?.totalKoks ?? 0), l: t('admin_koks'), icone: 'chef', lien: '/admin/chefs' },
    { c: String(s?.totalShifts ?? 0), l: t('admin_shifts_stat'), icone: 'cal', lien: '/admin/shifts' },
    { c: String(s?.totalInvoices ?? 0), l: t('admin_invoices'), icone: 'card', lien: '/admin/invoices' },
    { c: `€${Math.round(s?.totalRevenue ?? 0)}`, l: t('admin_revenue'), icone: 'bank', lien: '/admin/revenue' },
  ]

  const nomKok = (sh: AdminShift) => {
    const p = sh.chosenKok?.kokProfile
    const n = [p?.firstName, p?.lastName].filter(Boolean).join(' ')
    return n || sh.chosenKok?.name || ''
  }

  return (
    <main style={{ fontFamily: FONT, background: 'hsl(var(--background))', color: 'hsl(var(--foreground))', minHeight: '100vh' }}>
      <AnimStyles />
      <nav className="cs-nav" style={{
        background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #e8ebe0',
        padding: '13px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <a href="/dashboard" style={{ fontWeight: 800, fontSize: 20, color: 'hsl(var(--foreground))', textDecoration: 'none', letterSpacing: -0.5 }}>
          Chef<span style={{ color: '#5f7052' }}>Shift</span>
          <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 999, background: '#23281f', color: '#dfe7d1', letterSpacing: 1, verticalAlign: 'middle' }}>ADMIN</span>
        </a>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <LangToggle />
          <ThemeToggle />
          <a href="/dashboard" style={{ color: '#5f7052', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>{t('back_dashboard')}</a>
        </div>
      </nav>

      <div className="cs-wrap" style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 56px' }}>
        <h1 className="cs-fade" style={{ fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 800, letterSpacing: -1.2, marginBottom: 6 }}>{t('admin_title')}</h1>
        <p className="cs-fade cs-d1" style={{ color: 'hsl(var(--muted-foreground))', fontSize: 14.5, marginTop: 0, marginBottom: 28 }}>{t('admin_sub')}</p>

        {/* Statistiques */}
        <div className="cs-fade cs-d1 cs-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 34 }}>
          {cartesStats.map((st) => (
            <a key={st.l} href={st.lien} className="cs-card cs-stat" style={{ ...carte, display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', color: 'inherit' }}>
              <IcoTile n={st.icone} s={19} taille={42} />
              <div>
                <div className="cs-stat-n" style={{ fontSize: 24, fontWeight: 800, color: 'hsl(var(--foreground))', letterSpacing: -0.8 }}>{st.c}</div>
                <div className="cs-stat-l" style={{ fontSize: 12.5, color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}>{st.l}</div>
              </div>
            </a>
          ))}
        </div>

        {/* Recherche + liste des shifts */}
        <div className="cs-fade cs-d2" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5, margin: 0 }}>{t('admin_shifts_title')}</h2>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('admin_search')} style={{ ...champ, maxWidth: 320 }} />
        </div>

        <div className="cs-fade cs-d2" style={{ display: 'grid', gap: 12 }}>
          {shifts.length === 0 ? (
            <div className="cs-card" style={{ ...carte, textAlign: 'center', padding: 36 }}>
              <p style={{ color: 'hsl(var(--muted-foreground))', fontWeight: 600, margin: 0 }}>{t('admin_no_shifts')}</p>
            </div>
          ) : (
            shifts.map((sh) => {
              const st = STATUT[sh.status] || STATUT.CLOSED
              const kok = nomKok(sh)
              return (
                <a
                  key={sh.id}
                  href={`/shifts/${sh.id}`}
                  className="cs-card"
                  style={{ ...carte, textDecoration: 'none', color: 'inherit', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}
                >
                  <div style={{ minWidth: 200 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.3 }}>{sh.title}</div>
                    <div style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', fontWeight: 600, marginTop: 3 }}>
                      {sh.horeca?.horecaProfile?.companyName || '—'} · {new Date(sh.date).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 11px', borderRadius: 999, background: st.bg, color: st.fg, textTransform: 'uppercase', letterSpacing: 0.6 }}>{sh.status}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'hsl(var(--muted-foreground))' }}>
                      <Ico n="users" s={13} /> {sh._count?.applications ?? 0}
                    </span>
                    <span style={{ fontSize: 12.5, color: 'hsl(var(--muted-foreground))', minWidth: 90 }}>
                      {kok ? <><Ico n="chef" s={13} /> {kok}</> : <span style={{ fontStyle: 'italic' }}>{t('admin_no_kok')}</span>}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#5f7052', fontWeight: 700, fontSize: 13 }}>
                      {t('admin_manage')} <Ico n="arrow" s={13} />
                    </span>
                  </div>
                </a>
              )
            })
          )}
        </div>
      </div>
    </main>
  )
}
