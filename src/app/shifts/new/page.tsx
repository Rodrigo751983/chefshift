'use client'

import { useEffect, useState } from 'react'
import { useT, LangToggle } from '@/lib/i18n'
import ThemeToggle from '@/components/ThemeToggle'
import AnimStyles from '@/components/AnimStyles'
import { Ico } from '@/components/Icons'
import RateStepper from '@/components/RateStepper'
import { MIN_HOURLY_RATE } from '@/lib/constants'

const FONT = '"Sora","Inter","Helvetica Neue",Arial,sans-serif'

// Catégories prêtes à cliquer pour remplir rapidement titre & fonction (NL / EN)
type Cat = { nl: string; en: string }
const TITRES: Cat[] = [
  { nl: 'Ontbijtdienst', en: 'Breakfast' },
  { nl: 'Lunchdienst', en: 'Lunch shift' },
  { nl: 'Dinerdienst', en: 'Dinner shift' },
  { nl: 'Avonddienst', en: 'Evening shift' },
  { nl: 'Weekenddienst', en: 'Weekend shift' },
  { nl: 'Banqueting', en: 'Banqueting' },
  { nl: 'Evenement', en: 'Event' },
]
const FONCTIES: Cat[] = [
  { nl: 'Chef de partie', en: 'Chef de partie' },
  { nl: 'Sous-chef', en: 'Sous-chef' },
  { nl: 'Zelfstandig werkend kok', en: 'Self-employed chef' },
  { nl: 'Mise en place', en: 'Mise en place' },
  { nl: 'Commis', en: 'Commis' },
  { nl: 'Keukenhulp', en: 'Kitchen assistant' },
  { nl: 'Afwas', en: 'Dishwashing' },
  { nl: 'Garde-manger', en: 'Garde-manger' },
  { nl: 'Saucier', en: 'Saucier' },
  { nl: 'Pâtisserie', en: 'Pastry' },
  { nl: 'Grillkok', en: 'Grill cook' },
]

function Chips({ options, current, onPick, lang }: { options: Cat[]; current: string; onPick: (v: string) => void; lang: 'nl' | 'en' }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 8 }}>
      {options.map((o) => {
        const label = lang === 'en' ? o.en : o.nl
        const actif = current.trim().toLowerCase() === label.toLowerCase()
        return (
          <button
            key={o.nl}
            type="button"
            onClick={() => onPick(label)}
            style={{
              padding: '6px 13px', borderRadius: 999, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: FONT,
              border: actif ? '1.5px solid #5f7052' : '1.5px solid #e2e6d7',
              background: actif ? '#eef2e6' : 'hsl(var(--card))',
              color: actif ? '#3d5233' : 'hsl(var(--foreground))',
              transition: 'border-color .15s ease, background .15s ease',
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

export default function NewShiftPage() {
  const { t, lang } = useT()
  const [title, setTitle] = useState('')
  const [func, setFunc] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [locationStreet, setLocationStreet] = useState('')
  const [locationPostal, setLocationPostal] = useState('')
  const [locationCity, setLocationCity] = useState('')
  // Informations pratiques du jour J, reprises dans le mail de rappel
  const [contactPhone, setContactPhone] = useState('')
  const [briefing, setBriefing] = useState('')
  const [isUrgent, setIsUrgent] = useState(false)
  const [toeslag, setToeslag] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [autorise, setAutorise] = useState(false)
  // Nombre de koks favoris : affiche avant publication pour montrer que
  // la shift ne part pas dans le vide.
  const [nbFavoris, setNbFavoris] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/favorieten')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setNbFavoris(d?.kokIds?.length ?? 0))
      .catch(() => setNbFavoris(null))
  }, [])

  useEffect(() => {
    fetch('/api/auth/session').then((r) => r.json()).then((s) => {
      if (!s?.user) {
        window.location.href = '/login'
      } else if (s.user.role !== 'HORECA' && s.user.role !== 'ADMIN') {
        window.location.href = '/dashboard'
      } else {
        setAutorise(true)
      }
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!(parseFloat(hourlyRate) >= MIN_HOURLY_RATE)) {
      setError(`${t('rate_too_low')} €${MIN_HOURLY_RATE.toFixed(2)}`)
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          function: func || title,
          date,
          startTime,
          endTime,
          hourlyRate: parseFloat(hourlyRate),
          locationStreet,
          locationPostal,
          locationCity,
          contactPhone,
          briefing,
          isUrgent,
          spoedtoeslagPct: toeslag,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.error === 'RATE_TOO_LOW' ? `${t('rate_too_low')} €${(data.min ?? MIN_HOURLY_RATE).toFixed(2)}` : t('shift_fail'))
        setLoading(false)
        return
      }
      window.location.href = '/shifts'
    } catch {
      setError(t('shift_fail'))
      setLoading(false)
    }
  }

  const champ = {
    width: '100%', padding: 12, border: '1.5px solid #e2e6d7', borderRadius: 12,
    fontSize: 15, outline: 'none', boxSizing: 'border-box' as const, background: 'hsl(var(--card))', fontFamily: FONT,
  }
  const etiquette = { display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#3c4436' }

  if (!autorise) {
    return (
      <main style={{ fontFamily: FONT, background: 'hsl(var(--background))', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}>{t('dash_loading')}</p>
      </main>
    )
  }

  return (
    <main style={{ fontFamily: FONT, background: 'hsl(var(--background))', color: 'hsl(var(--foreground))', minHeight: '100vh' }}>
      <AnimStyles />
      <nav style={{
        background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #e8ebe0',
        padding: '13px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <a href="/dashboard" style={{ fontWeight: 800, fontSize: 20, color: 'hsl(var(--foreground))', textDecoration: 'none', letterSpacing: -0.5 }}>
          Chef<span style={{ color: '#5f7052' }}>Shift</span>
        </a>
        <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          <LangToggle />
          <ThemeToggle />
          <a href="/shifts" style={{ color: '#5f7052', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
            ← {t('list_other')}
          </a>
        </div>
      </nav>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '48px 24px' }}>
        <h1 className="cs-fade" style={{ fontSize: 'clamp(26px, 4vw, 34px)', fontWeight: 800, letterSpacing: -1.2, marginBottom: 8 }}>
          {t('shifts_new')}
        </h1>
        <p className="cs-fade cs-d1" style={{ color: 'hsl(var(--muted-foreground))', marginBottom: 32 }}>{t('shifts_new_sub')}</p>

        <form onSubmit={handleSubmit} className="cs-pop" style={{ background: 'hsl(var(--card))', borderRadius: 20, border: '1px solid #eceee3', boxShadow: '0 12px 34px -12px rgba(46,52,43,0.14)', padding: 32 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={etiquette}>{t('field_shift_title')}</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required
              placeholder={t('shift_title_ph')} style={champ} />
            <Chips options={TITRES} current={title} onPick={setTitle} lang={lang} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={etiquette}>{t('field_function')}</label>
            <input value={func} onChange={(e) => setFunc(e.target.value)}
              placeholder={t('shift_function_ph')} style={champ} />
            <Chips options={FONCTIES} current={func} onPick={setFunc} lang={lang} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={etiquette}>{t('field_date')}</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={champ} />
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={etiquette}>{t('field_start')}</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required style={champ} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={etiquette}>{t('field_end')}</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required style={champ} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={etiquette}>{t('field_rate')}</label>
              <RateStepper value={hourlyRate} onChange={setHourlyRate} min={MIN_HOURLY_RATE} inputStyle={champ} />
              <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', marginTop: 5, fontWeight: 600 }}>
                {t('rate_min_hint')} €{MIN_HOURLY_RATE.toFixed(2)}
              </div>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={etiquette}>{t('field_street')}</label>
            <input value={locationStreet} onChange={(e) => setLocationStreet(e.target.value)}
              placeholder="Herengracht 123" style={champ} />
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={etiquette}>{t('field_postal')}</label>
              <input value={locationPostal} onChange={(e) => setLocationPostal(e.target.value)}
                placeholder="1015 BG" style={champ} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={etiquette}>{t('field_city')}</label>
              <input value={locationCity} onChange={(e) => setLocationCity(e.target.value)} required
                placeholder="Amsterdam" style={champ} />
            </div>
          </div>
          {/* Informations pratiques : reprises telles quelles dans le mail de
              rappel envoye 24 h et 2 h avant. Un kok sans numero a appeler
              devient un no-show evitable. */}
          <div style={{ marginBottom: 20 }}>
            <label style={etiquette}>{t('field_phone')}</label>
            <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)}
              type="tel" placeholder="+31 20 123 4567" style={champ} />
            <div style={{ fontSize: 12.5, color: 'hsl(var(--muted-foreground))', fontWeight: 600, marginTop: 5 }}>
              {t('field_phone_hint')}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={etiquette}>{t('field_briefing')}</label>
            <textarea value={briefing} onChange={(e) => setBriefing(e.target.value)}
              rows={4} maxLength={1500} placeholder={t('field_briefing_ph')}
              style={{ ...champ, resize: 'vertical' }} />
            <div style={{ fontSize: 12.5, color: 'hsl(var(--muted-foreground))', fontWeight: 600, marginTop: 5 }}>
              {t('field_briefing_hint')}
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, cursor: 'pointer', fontSize: 14.5, fontWeight: 600 }}>
            <input type="checkbox" checked={isUrgent} onChange={(e) => setIsUrgent(e.target.checked)} style={{ width: 18, height: 18 }} />
            <Ico n="flame" s={15} c="#b91c1c" /> {t('field_urgent')}
          </label>
          {isUrgent && (
            <div style={{ marginBottom: 20 }}>
              <label style={etiquette}>{t('toeslag_label')}</label>
              <select value={toeslag} onChange={(e) => setToeslag(Number(e.target.value))} style={champ}>
                <option value={0}>{t('toeslag_none')}</option>
                <option value={10}>+10%</option>
                <option value={15}>+15%</option>
                <option value={20}>+20%</option>
              </select>
              <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', marginTop: 5, fontWeight: 600 }}>
                {t('toeslag_hint')}
              </div>
            </div>
          )}

          {error && (
            <p style={{ color: '#b91c1c', fontSize: 13.5, marginBottom: 16, background: '#fef2f2', padding: '10px 14px', borderRadius: 10, fontWeight: 600 }}>
              {error}
            </p>
          )}

          {/* Ce que la publication declenche vraiment. Sans cette ligne,
              l'horeca ne sait pas que les koks sont prevenus. */}
          {nbFavoris !== null && (
            <p style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              background: '#f4f7ee', border: '1px solid #e3ebd8', borderRadius: 12,
              padding: '12px 14px', margin: '0 0 16px',
              fontSize: 13.5, fontWeight: 600, color: '#4c5e42', lineHeight: 1.55,
            }}>
              <span style={{ flexShrink: 0, marginTop: 1 }}><Ico n="check" s={14} c="#4c5e42" /></span>
              {nbFavoris > 0
                ? t('pub_favs').replace('{n}', String(nbFavoris))
                : t('pub_nofavs')}
            </p>
          )}

          <button type="submit" disabled={loading} className="cs-btn" style={{
            width: '100%', padding: 14, background: 'linear-gradient(135deg,#647a55,#46553c)', color: '#fff',
            border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, fontFamily: FONT,
            cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
            boxShadow: '0 10px 22px -8px rgba(70,85,60,.5)',
          }}>
            {loading ? t('form_loading') : t('shift_submit')}
          </button>
        </form>
      </div>
    </main>
  )
}
