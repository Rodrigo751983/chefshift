'use client'

import { useEffect, useState } from 'react'
import { useT } from '@/lib/i18n'
import { heureHHMM } from '@/lib/time'
import { statutShift, TOON_STIJLEN } from '@/lib/statut'

// Photo libre de droits (Unsplash, licence gratuite)
const PHOTO = 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=300&q=70'
import { Ico, IcoStar } from './Icons'

const FONT = '"Sora","Inter","Helvetica Neue",Arial,sans-serif'

export type ShiftData = {
  id: string
  title: string
  function?: string | null
  date: string
  startTime: string
  endTime: string
  locationCity?: string | null
  hourlyRate: number
  totalAmount?: number | null
  isUrgent: boolean
  spoedtoeslagPct?: number
  status: string
  chosenKokId?: string | null
  invoice?: { status: string } | null
  eind?: { reportedEnd: string; confirmedAt: string | null } | null
  _count?: { applications: number }
  horeca?: { horecaProfile?: {
    companyName?: string | null
    averageScore?: number | null
    reviewCount?: number | null
  } | null }
}

export default function ShiftCard({
  shift,
  showApply,
  detailHref,
  perspectief,
}: {
  shift: ShiftData
  showApply?: boolean
  detailHref?: string
  perspectief?: 'horeca' | 'kok'
}) {
  const { t, lang } = useT()
  const locale = lang === 'en' ? 'en-GB' : 'nl-NL'
  const parHeure = lang === 'en' ? '/hr' : '/u'
  const [etat, setEtat] = useState<'idle' | 'envoi' | 'ok' | 'erreur'>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!showApply) return
    fetch('/api/applications/mine')
      .then((r) => r.json())
      .then((d) => {
        if (d?.shiftIds && d.shiftIds.indexOf(shift.id) >= 0) {
          setEtat('ok')
        }
      })
      .catch(() => {})
  }, [shift.id, showApply])

  async function postuler() {
    setEtat('envoi')
    try {
      const res = await fetch(`/api/shifts/${shift.id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.status === 201) {
        setEtat('ok')
      } else {
        const data = await res.json()
        setMessage(data.error === 'Already applied' ? t('apply_already') : t('apply_fail'))
        setEtat(data.error === 'Already applied' ? 'ok' : 'erreur')
      }
    } catch {
      setMessage(t('apply_fail'))
      setEtat('erreur')
    }
  }

  const dateStr = new Date(shift.date).toLocaleDateString(locale, {
    weekday: 'short', day: 'numeric', month: 'short',
  })
  const start = heureHHMM(shift.startTime, locale)
  const end = heureHHMM(shift.endTime, locale)
  const estPaye = shift.invoice?.status === 'PAID'
  const statut = perspectief ? statutShift(shift, perspectief) : null

  const meta: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
    fontSize: 13.5, color: 'hsl(var(--muted-foreground))', fontWeight: 500,
  }

  const contenu = (
    <>
      {/* Miniature photo (libre de droits) */}
      <img
        src={PHOTO}
        alt=""
        loading="lazy"
        className="cs-hide-mob"
        style={{ width: 74, height: 74, borderRadius: 16, objectFit: 'cover', flexShrink: 0, alignSelf: 'center' }}
      />
      <div style={{ flex: 1, minWidth: 170 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.3 }}>{shift.title}</h3>
          {shift.function && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
              background: '#23281f', color: '#dfe7d1', fontSize: 11.5, fontWeight: 700,
              padding: '4px 11px', borderRadius: 999,
            }}>
              <Ico n="utensils" s={12} /> {shift.function}
            </span>
          )}
          {shift.isUrgent && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
              background: '#fee2e2', color: '#b91c1c', fontSize: 11.5, fontWeight: 800,
              padding: '4px 11px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: 0.5,
            }}>
              <Ico n="flame" s={12} /> {t('urgent')}{(shift.spoedtoeslagPct ?? 0) > 0 ? ` +${shift.spoedtoeslagPct}%` : ''}
            </span>
          )}
        </div>
        <p style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginTop: 7 }}>
          <span style={meta}><Ico n="cal" s={14} c="#8a9a7b" /> {dateStr}</span>
          <span style={meta}><Ico n="clock" s={14} c="#8a9a7b" /> {start} – {end}</span>
          {shift.locationCity && <span style={meta}><Ico n="pin" s={14} c="#8a9a7b" /> {shift.locationCity}</span>}
          {shift.horeca?.horecaProfile?.companyName && (
            <span style={{ ...meta, fontWeight: 700, color: 'hsl(var(--foreground))' }}>
              {shift.horeca.horecaProfile.companyName}
            </span>
          )}
          {/* Note du restaurant : visible cote chef, la ou se prend la decision
              de postuler. Masquee sous 1 avis : une moyenne sur un seul avis
              est plus trompeuse qu'utile. */}
          {perspectief === 'kok' && (shift.horeca?.horecaProfile?.reviewCount ?? 0) > 0 && (
            <span
              style={{ ...meta, fontWeight: 700, color: '#8a6d1f', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              title={`${(shift.horeca!.horecaProfile!.averageScore ?? 0).toFixed(1)} / 5 · ${shift.horeca!.horecaProfile!.reviewCount} ${t('reviews')}`}
            >
              <IcoStar s={13} plein />
              {(shift.horeca!.horecaProfile!.averageScore ?? 0).toFixed(1)}
              <span style={{ fontWeight: 600, opacity: 0.75 }}>({shift.horeca!.horecaProfile!.reviewCount})</span>
            </span>
          )}
        </p>
      </div>
      {/* Colonne droite bornee : un badge long ("Open, wachten op koks")
          poussait la colonne au-dela de la place disponible et repliait
          toute la carte, d'ou une mise en page differente selon le statut. */}
      <div className="cs-end" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 7, flexShrink: 0, maxWidth: 190, textAlign: 'right' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#4c5e42', letterSpacing: -0.5 }}>€{shift.hourlyRate / 100}{parHeure}</div>
          {shift.totalAmount != null && (
            <div style={{ fontSize: 12.5, color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}>
              {t('total')} : €{Math.round(shift.totalAmount / 100)}
            </div>
          )}
        </div>
        {/* Badge de statut clair, adapté au point de vue */}
        {statut && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
            background: TOON_STIJLEN[statut.toon].bg, color: TOON_STIJLEN[statut.toon].color,
            fontSize: 12, fontWeight: 800, padding: '5px 13px', borderRadius: 999,
            lineHeight: 1.35, textAlign: 'right',
          }}>
            <Ico n={statut.icone} s={13} /> {t(statut.cle)}
          </span>
        )}
        {/* Mention payé : visible des deux côtés (affichage sans point de vue) */}
        {!statut && estPaye && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
            background: '#dcfce7', color: '#15803d', fontSize: 12, fontWeight: 800,
            padding: '5px 13px', borderRadius: 999,
          }}>
            <Ico n="card" s={13} /> {t('pay_paid_badge')}
          </span>
        )}
        {!statut && !estPaye && (shift.status === 'CONFIRMED' || shift.status === 'COMPLETED') && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
            background: '#f0f4ea', color: '#4c5e42', fontSize: 12, fontWeight: 700,
            padding: '5px 13px', borderRadius: 999,
          }}>
            <Ico n="check" s={13} /> {t('status_confirmed')}
          </span>
        )}
        {shift._count && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', fontSize: 12.5, color: 'hsl(var(--muted-foreground))' }}>
            <Ico n="users" s={13} /> {shift._count.applications} {t('applications')}
          </div>
        )}
        {showApply && (
          <div>
            {etat === 'ok' ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#4c5e42', fontWeight: 700, fontSize: 13.5 }}>
                <Ico n="check" s={15} /> {t('applied')}
              </span>
            ) : (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); postuler() }}
                disabled={etat === 'envoi'}
                className="cs-btn"
                style={{
                  background: 'linear-gradient(135deg,#647a55,#46553c)', color: '#fff', border: 'none',
                  borderRadius: 999, padding: '10px 22px', fontWeight: 700, fontSize: 13.5,
                  cursor: etat === 'envoi' ? 'wait' : 'pointer', fontFamily: FONT,
                  opacity: etat === 'envoi' ? 0.7 : 1,
                }}
              >
                {etat === 'envoi' ? t('apply_sending') : t('apply_btn')}
              </button>
            )}
            {etat === 'erreur' && <div style={{ color: '#b91c1c', fontSize: 12, marginTop: 5, fontWeight: 600 }}>{message}</div>}
          </div>
        )}
        {detailHref && (() => {
          const libelle = showApply
            ? t('details')
            /* Rien a choisir sur une shift expiree ou annulee : le libelle
               "Kiezen" promettrait une action qui n'existe plus. */
            : shift.status === 'EXPIRED' || shift.status === 'CANCELLED'
            ? t('details')
            : shift.status === 'CONFIRMED'
            ? t('status_confirmed')
            : t('choose')
          const stijl: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', color: '#5f7052', fontWeight: 700, fontSize: 13 }
          // Quand le bouton "Postuler" est présent, la carte entière n'est
          // plus le lien (voir plus bas) : ce libellé devient le vrai lien,
          // pour ne jamais imbriquer un <button> dans un <a>.
          return showApply ? (
            <a href={detailHref} style={{ ...stijl, textDecoration: 'none' }}>
              {libelle} <Ico n="arrow" s={13} />
            </a>
          ) : (
            <div style={stijl}>
              {libelle} <Ico n="arrow" s={13} />
            </div>
          )
        })()}
      </div>
    </>
  )

  const styleCarte: React.CSSProperties = {
    background: 'hsl(var(--card))', borderRadius: 20, border: '1px solid #eceee3',
    boxShadow: '0 3px 12px rgba(46,52,43,0.05)', padding: 24,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: 18, flexWrap: 'wrap',
  }

  // Carte entièrement cliquable si un lien de détail est fourni — sauf
  // quand elle contient aussi le bouton "Postuler" : un <a> ne doit jamais
  // envelopper un <button> (HTML invalide, focus clavier ambigu). Dans ce
  // cas le lien se limite au libellé "Details" (voir plus haut).
  if (detailHref && !showApply) {
    return (
      <a href={detailHref} className="cs-card" style={{ ...styleCarte, textDecoration: 'none', color: 'inherit', display: 'flex' }}>
        {contenu}
      </a>
    )
  }

  return (
    <div className="cs-card" style={styleCarte}>
      {contenu}
    </div>
  )
}
