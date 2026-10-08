'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useT } from '@/lib/i18n'
import { Ico, IcoStar } from '@/components/Icons'

const FONT = "'Sora', system-ui, sans-serif"

type Kok = {
  id: string
  name: string | null
  shiftsSamen: number
  kokProfile: {
    functions: string[]
    city: string | null
    averageScore: number
    reviewCount: number
    hourlyRateMin: number | null
    hourlyRateMax: number | null
  } | null
}

export default function MijnKoksPage() {
  const { t } = useT()
  const [koks, setKoks] = useState<Kok[] | null>(null)
  const [bezig, setBezig] = useState<string | null>(null)

  async function charger() {
    const res = await fetch('/api/favorieten?detail=1')
    if (!res.ok) {
      setKoks([])
      return
    }
    const d = await res.json()
    setKoks(d.koks ?? [])
  }

  useEffect(() => {
    charger()
  }, [])

  async function verwijder(kokId: string) {
    setBezig(kokId)
    // La route bascule l'etat : appeler avec un kok deja favori le retire.
    await fetch('/api/favorieten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kokId }),
    })
    await charger()
    setBezig(null)
  }

  return (
    <div className="cs-wrap" style={{ maxWidth: 860, margin: '0 auto', padding: '38px 24px 60px' }}>
      <Link
        href="/dashboard"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#5f7052', fontWeight: 700, fontSize: 13.5, textDecoration: 'none', marginBottom: 20 }}
      >
        <Ico n="arrow" s={13} /> Dashboard
      </Link>

      <h1 style={{ fontFamily: FONT, fontWeight: 800, fontSize: 27, letterSpacing: -0.8, margin: '0 0 6px' }}>
        {t('mk_title')}
      </h1>
      <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 14.5, fontWeight: 600, margin: '0 0 30px', lineHeight: 1.6 }}>
        {t('mk_sub')}
      </p>

      {koks === null ? (
        <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 14 }}>…</p>
      ) : koks.length === 0 ? (
        <div style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 16, padding: '26px 24px' }}>
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.7, color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}>
            {t('mk_leeg')}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {koks.map((k) => {
            const p = k.kokProfile
            const tarief =
              p?.hourlyRateMin != null
                ? p.hourlyRateMax != null && p.hourlyRateMax !== p.hourlyRateMin
                  ? `\u20AC${Math.round(p.hourlyRateMin)}\u2013${Math.round(p.hourlyRateMax)}/u`
                  : `\u20AC${Math.round(p.hourlyRateMin)}/u`
                : null
            const meta = [p?.functions?.slice(0, 2).join(', '), p?.city, tarief].filter(Boolean).join(' \u00b7 ')

            return (
              <div
                key={k.id}
                className="cs-card"
                style={{
                  display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap',
                  background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 16,
                  padding: '18px 20px', boxShadow: '0 3px 12px rgba(46,52,43,0.05)',
                }}
              >
                <div style={{ flex: 1, minWidth: 190 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: -0.3 }}>
                    {k.name || 'Kok'}
                  </div>
                  {meta && (
                    <div style={{ color: '#77806e', fontSize: 13, fontWeight: 600, marginTop: 4 }}>{meta}</div>
                  )}
                  {/* Le nombre de shifts ensemble justifie la presence dans
                      la liste bien mieux que la date d'ajout. */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: '#4c5e42', background: '#f4f7ee', padding: '4px 11px', borderRadius: 999 }}>
                      {k.shiftsSamen} {t('mk_shifts')}
                    </span>
                    {(p?.reviewCount ?? 0) > 0 && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 700, color: '#8a6d1f' }}>
                        <IcoStar s={12} plein />
                        {(p?.averageScore ?? 0).toFixed(1)}
                        <span style={{ fontWeight: 600, opacity: 0.75 }}>({p?.reviewCount})</span>
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => verwijder(k.id)}
                  disabled={bezig === k.id}
                  className="cs-btn"
                  style={{
                    background: 'none', border: '1.5px solid #dfe4d4', borderRadius: 10,
                    padding: '9px 16px', fontWeight: 700, fontSize: 13, fontFamily: FONT,
                    color: 'hsl(var(--muted-foreground))', cursor: bezig === k.id ? 'wait' : 'pointer',
                    opacity: bezig === k.id ? 0.6 : 1,
                  }}
                >
                  {t('mk_verwijder')}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
