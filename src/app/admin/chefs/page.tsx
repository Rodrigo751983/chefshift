'use client'

import { useEffect, useState } from 'react'
import { useT } from '@/lib/i18n'
import AdminShell, { ADMIN_CARTE } from '@/components/AdminShell'
import { IcoTile } from '@/components/Icons'

type C = {
  id: string
  email: string
  createdAt: string
  kokProfile?: {
    firstName?: string | null
    lastName?: string | null
    kvkNumber?: string | null
    city?: string | null
    yearsExperience?: number | null
    averageScore?: number | null
    reviewCount?: number | null
  } | null
}

export default function AdminChefsPage() {
  const { t, lang } = useT()
  const [items, setItems] = useState<C[] | null>(null)
  const [q, setQ] = useState('')
  // Liens de payout générés à la demande (lien Stripe expiré chez le chef, etc.)
  const [liens, setLiens] = useState<Record<string, string>>({})
  const [lienEnvoi, setLienEnvoi] = useState('')
  const [copie, setCopie] = useState('')

  async function genererLienPayout(kokId: string) {
    setLienEnvoi(kokId)
    try {
      const res = await fetch('/api/admin/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kokId }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.url) setLiens((l) => ({ ...l, [kokId]: data.url }))
    } catch {}
    setLienEnvoi('')
  }

  function copierLien(kokId: string) {
    const url = liens[kokId]
    if (!url) return
    navigator.clipboard.writeText(url).then(() => {
      setCopie(kokId)
      setTimeout(() => setCopie(''), 2000)
    }).catch(() => {})
  }

  useEffect(() => {
    fetch('/api/admin?vue=chefs')
      .then((r) => r.json())
      .then((d) => setItems(d.chefs || []))
      .catch(() => setItems([]))
  }, [])

  const locale = lang === 'en' ? 'en-GB' : 'nl-NL'
  const nom = (c: C) => {
    const p = c.kokProfile
    return [p?.firstName, p?.lastName].filter(Boolean).join(' ') || c.email
  }
  const liste = (items || []).filter((c) => {
    const p = c.kokProfile
    const hay = `${nom(c)} ${p?.city || ''} ${p?.kvkNumber || ''} ${c.email}`.toLowerCase()
    return hay.includes(q.trim().toLowerCase())
  })

  return (
    <AdminShell titre={t('admin_koks')} sousTitre={`${items?.length ?? 0} ${t('admin_koks').toLowerCase()}`}>
      <div className="cs-fade cs-d1" style={{ marginBottom: 14, display: 'flex', justifyContent: 'flex-end' }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('admin_search_chefs')}
          style={{ width: '100%', maxWidth: 320, padding: 12, border: '1.5px solid #e2e6d7', borderRadius: 12, fontSize: 15, outline: 'none', boxSizing: 'border-box', background: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}
        />
      </div>
      <div className="cs-fade cs-d2" style={{ display: 'grid', gap: 12 }}>
        {items === null ? (
          <p style={{ color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}>{t('dash_loading')}</p>
        ) : liste.length === 0 ? (
          <div className="cs-card" style={{ ...ADMIN_CARTE, textAlign: 'center', padding: 36 }}>
            <p style={{ color: 'hsl(var(--muted-foreground))', fontWeight: 600, margin: 0 }}>{t('admin_no_results')}</p>
          </div>
        ) : (
          liste.map((c) => {
            const p = c.kokProfile
            return (
              <div key={c.id} className="cs-card" style={{ ...ADMIN_CARTE, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 220 }}>
                  <IcoTile n="chef" s={18} taille={40} />
                  <div>
                    <div style={{ fontSize: 15.5, fontWeight: 800, letterSpacing: -0.3 }}>{nom(c)}</div>
                    <div style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', fontWeight: 600, marginTop: 2 }}>
                      {[p?.city, p?.yearsExperience != null ? `${p.yearsExperience} ${t('admin_years')}` : null].filter(Boolean).join(' · ') || c.email}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {(p?.reviewCount ?? 0) > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 11px', borderRadius: 999, background: '#fef9c3', color: '#a16207', letterSpacing: 0.6 }}>
                      ★ {(p?.averageScore ?? 0).toFixed(1)} ({p?.reviewCount})
                    </span>
                  )}
                  {p?.kvkNumber && (
                    <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 11px', borderRadius: 999, background: '#eef2e6', color: '#4c5e42', letterSpacing: 0.6 }}>KVK {p.kvkNumber}</span>
                  )}
                  <span style={{ fontSize: 12.5, color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}>
                    {t('admin_since')} {new Date(c.createdAt).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <button
                    type="button"
                    onClick={() => genererLienPayout(c.id)}
                    disabled={lienEnvoi === c.id}
                    className="cs-btn"
                    style={{
                      background: 'linear-gradient(135deg,#647a55,#46553c)', color: '#fff', border: 'none',
                      borderRadius: 10, padding: '8px 14px', fontWeight: 700, fontSize: 12.5,
                      cursor: lienEnvoi === c.id ? 'wait' : 'pointer', opacity: lienEnvoi === c.id ? 0.7 : 1,
                    }}
                  >
                    {lienEnvoi === c.id ? t('form_loading') : t('admin_payout_btn')}
                  </button>
                </div>
                {liens[c.id] && (
                  <div style={{ flexBasis: '100%', display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                    <input
                      readOnly
                      value={liens[c.id]}
                      onFocus={(e) => e.target.select()}
                      style={{ flex: 1, minWidth: 0, padding: 9, border: '1.5px solid #e2e6d7', borderRadius: 10, fontSize: 12.5, background: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}
                    />
                    <button
                      type="button"
                      onClick={() => copierLien(c.id)}
                      className="cs-btn"
                      style={{ background: 'none', border: '1.5px solid #dfe4d4', borderRadius: 10, padding: '8px 14px', fontWeight: 700, fontSize: 12.5, color: 'hsl(var(--foreground))', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      {copie === c.id ? t('admin_payout_copied') : t('admin_payout_copy')}
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </AdminShell>
  )
}
