'use client'

import { useEffect, useState } from 'react'
import { useT } from '@/lib/i18n'
import AdminShell, { ADMIN_CARTE } from '@/components/AdminShell'
import { Ico } from '@/components/Icons'

type AdminShift = {
  id: string
  title: string
  date: string
  status: string
  horeca?: { horecaProfile?: { companyName?: string | null } | null } | null
  chosenKok?: { name?: string | null; kokProfile?: { firstName?: string | null; lastName?: string | null } | null } | null
  _count?: { applications: number }
}

const STATUT: Record<string, { bg: string; fg: string }> = {
  OPEN: { bg: '#eef2e6', fg: '#4c5e42' },
  CONFIRMED: { bg: '#dcfce7', fg: '#15803d' },
  COMPLETED: { bg: '#e0e7ff', fg: '#3730a3' },
  CANCELLED: { bg: '#fee2e2', fg: '#b91c1c' },
  EXPIRED: { bg: '#fdf0dc', fg: '#8a5b1e' },
  CLOSED: { bg: '#f1f0eb', fg: '#8a8676' },
}

export default function AdminShiftsPage() {
  const { t, lang } = useT()
  const [shifts, setShifts] = useState<AdminShift[] | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    fetch('/api/admin?vue=shifts')
      .then((r) => r.json())
      .then((d) => setShifts(d.shifts || []))
      .catch(() => setShifts([]))
  }, [])

  const locale = lang === 'en' ? 'en-GB' : 'nl-NL'
  const nomKok = (sh: AdminShift) => {
    const p = sh.chosenKok?.kokProfile
    const n = [p?.firstName, p?.lastName].filter(Boolean).join(' ')
    return n || sh.chosenKok?.name || ''
  }
  const liste = (shifts || []).filter((sh) => {
    const hay = `${sh.title} ${sh.horeca?.horecaProfile?.companyName || ''} ${sh.status}`.toLowerCase()
    return hay.includes(q.trim().toLowerCase())
  })

  return (
    <AdminShell titre={t('admin_all_shifts')} sousTitre={`${shifts?.length ?? 0} ${t('admin_shifts_stat').toLowerCase()}`}>
      <div className="cs-fade cs-d1" style={{ marginBottom: 14, display: 'flex', justifyContent: 'flex-end' }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('admin_search')}
          style={{ width: '100%', maxWidth: 320, padding: 12, border: '1.5px solid #e2e6d7', borderRadius: 12, fontSize: 15, outline: 'none', boxSizing: 'border-box', background: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}
        />
      </div>
      <div className="cs-fade cs-d2" style={{ display: 'grid', gap: 12 }}>
        {shifts === null ? (
          <p style={{ color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}>{t('dash_loading')}</p>
        ) : liste.length === 0 ? (
          <div className="cs-card" style={{ ...ADMIN_CARTE, textAlign: 'center', padding: 36 }}>
            <p style={{ color: 'hsl(var(--muted-foreground))', fontWeight: 600, margin: 0 }}>{t('admin_no_shifts')}</p>
          </div>
        ) : (
          liste.map((sh) => {
            const st = STATUT[sh.status] || STATUT.CLOSED
            const kok = nomKok(sh)
            return (
              <a
                key={sh.id}
                href={`/shifts/${sh.id}`}
                className="cs-card"
                style={{ ...ADMIN_CARTE, textDecoration: 'none', color: 'inherit', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}
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
    </AdminShell>
  )
}
