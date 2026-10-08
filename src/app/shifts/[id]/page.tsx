'use client'

import { useEffect, useState } from 'react'
import { useT, LangToggle, afficherPoste, afficherSpecialite } from '@/lib/i18n'
import AnimStyles from '@/components/AnimStyles'
import { Ico, IcoStar } from '@/components/Icons'
import { shiftWhatsAppTekst, whatsappDeelUrl } from '@/lib/whatsapp'
import RateStepper from '@/components/RateStepper'
import { MIN_HOURLY_RATE } from '@/lib/constants'
import { heureHHMM, versChamp, minutesUTC } from '@/lib/time'

const BANNIERE = 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1600&q=80'
const FONT = '"Sora","Inter","Helvetica Neue",Arial,sans-serif'

type Review = { id: string; rating: number; comment: string | null; isAnonymous: boolean }

type WorkExp = {
  id: string
  function: string
  companyName: string | null
  location: string | null
  fromDate: string
  toDate: string | null
  isCurrent: boolean
}

type Application = {
  id: string
  kokId: string
  status: string
  message: string | null
  proposedRate: number | null
  kok: {
    name: string | null
    kokProfile: {
      firstName: string | null
      lastName: string | null
      dateOfBirth: string | null
      city: string | null
      yearsExperience: number | null
      functions: string[]
      specialties: string[]
      haccpCertified: boolean
      svhCertified: boolean
      svhLevel: string | null
      hourlyRateMin: number | null
      hourlyRateMax: number | null
      description: string | null
      workExperience: WorkExp[]
      reviewsReceived: Review[]
      averageScore?: number | null
      reviewCount?: number | null
    } | null
  }
}

type Eind = {
  reportedEnd: string
  confirmedAt: string | null
  breakMinuten: number | null
  disputedEnd?: string | null
  disputedBreak?: number | null
  disputeReason?: string | null
  disputedAt?: string | null
  refusedAt?: string | null
}

type ShiftDetail = {
  id: string
  title: string
  function: string | null
  date: string
  startTime: string
  endTime: string
  hourlyRate: number
  locationStreet: string | null
  locationPostal: string | null
  locationCity: string | null
  status: string
  isUrgent: boolean
  spoedtoeslagPct: number
  breakMinutes: number
  chosenKokId: string | null
  horecaId: string
  horeca: { horecaProfile: {
    companyName: string | null
    kvkNumber: string | null
    averageScore?: number | null
    reviewCount?: number | null
  } | null }
  invoice: { id: string; status: string; amountInclVat: number } | null
  applications: Application[]
  eind: Eind | null
  horecaReviewed: boolean
  kokReviewed: boolean
}

function age(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / (365.25 * 24 * 3600 * 1000))
}

function moyenne(reviews: Review[]): number {
  if (reviews.length === 0) return 0
  return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
}

function Etoiles({ n, taille = 13 }: { n: number; taille?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <IcoStar key={i} s={taille} plein={i <= Math.round(n)} />
      ))}
    </span>
  )
}

export default function ShiftDetailPage({ params }: { params: { id: string } }) {
  const id = params.id
  const { t, lang } = useT()
  const [shift, setShift] = useState<ShiftDetail | null>(null)
  const [chargement, setChargement] = useState(true)
  const [role, setRole] = useState('')
  const [dejaPostule, setDejaPostule] = useState(false)
  const [postulation, setPostulation] = useState(false)
  const [choix, setChoix] = useState('')
  const [msgPay, setMsgPay] = useState('')
  const [paiement, setPaiement] = useState(false)
  const [modif, setModif] = useState(false)
  const [envoiModif, setEnvoiModif] = useState(false)
  const [msgModif, setMsgModif] = useState('')
  const [eTitle, setETitle] = useState('')
  const [eFunc, setEFunc] = useState('')
  const [eDate, setEDate] = useState('')
  const [eStart, setEStart] = useState('')
  const [eEnd, setEEnd] = useState('')
  const [eRate, setERate] = useState('')
  const [eStreet, setEStreet] = useState('')
  const [ePostal, setEPostal] = useState('')
  const [eCity, setECity] = useState('')
  const [eUrgent, setEUrgent] = useState(false)
  const [eToeslag, setEToeslag] = useState(0)
  const [favoris, setFavoris] = useState<string[]>([])
  const [seulementFav, setSeulementFav] = useState(false)
  const [favEnvoi, setFavEnvoi] = useState('')
  const [eindInvoer, setEindInvoer] = useState('')
  const [pauzeAan, setPauzeAan] = useState(true)
  const [pauzeMin, setPauzeMin] = useState('30')
  const [eindEnvoi, setEindEnvoi] = useState(false)
  const [bevestigEnvoi, setBevestigEnvoi] = useState(false)
  // Contestation de l'heure de fin
  const [betwistOuvert, setBetwistOuvert] = useState(false)
  const [betwistTijd, setBetwistTijd] = useState('')
  const [betwistReden, setBetwistReden] = useState('')
  const [betwistEnvoi, setBetwistEnvoi] = useState(false)
  const [betwistMsg, setBetwistMsg] = useState('')
  const [note, setNote] = useState(0)
  const [avis, setAvis] = useState('')
  const [avisEnvoi, setAvisEnvoi] = useState(false)
  const locale = lang === 'en' ? 'en-GB' : 'nl-NL'
  const parHeure = lang === 'en' ? '/hr' : '/u'

  async function charger() {
    const res = await fetch(`/api/shifts/${id}`)
    if (res.ok) {
      const data = await res.json()
      setShift(data.shift)
      if (data.favoriKokIds) setFavoris(data.favoriKokIds)
      // Préremplir le champ heure : heure déclarée par le chef si présente, sinon horaire prévu
      if (data.shift) {
        const source = data.shift.eind?.reportedEnd || data.shift.endTime
        if (source) setEindInvoer(versChamp(source))
        // Pause : valeur déclarée si présente, sinon pause par défaut du shift
        if (data.shift.eind?.breakMinuten != null) {
          setPauzeAan(data.shift.eind.breakMinuten > 0)
          setPauzeMin(String(data.shift.eind.breakMinuten))
        } else {
          setPauzeMin(String(data.shift.breakMinutes ?? 30))
        }
      }
    }
    setChargement(false)
  }

  useEffect(() => {
    fetch('/api/auth/session').then((r) => r.json()).then((s) => {
      if (!s?.user) {
        window.location.href = '/login'
        return
      }
      setRole(s.user.role || '')
      charger()
      if (s.user.role === 'KOK') {
        fetch('/api/applications/mine')
          .then((r) => r.json())
          .then((d) => {
            if (d?.shiftIds && d.shiftIds.indexOf(id) >= 0) setDejaPostule(true)
          })
          .catch(() => {})
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Bascule un chef en favori (horeca) — marque-page persistant
  async function toggleFavori(kokId: string) {
    if (!kokId || favEnvoi) return
    setFavEnvoi(kokId)
    try {
      const res = await fetch('/api/favorieten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kokId }),
      })
      if (res.ok) {
        const d = await res.json()
        setFavoris((f) => (d.favorite ? [...f, kokId] : f.filter((x) => x !== kokId)))
      }
    } catch {}
    setFavEnvoi('')
  }

  async function postuler() {
    setPostulation(true)
    try {
      const res = await fetch(`/api/shifts/${id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.status === 201 || res.status === 400) setDejaPostule(true)
    } catch {}
    setPostulation(false)
  }

  async function choisir(appId: string, kokId: string) {
    setChoix(appId)
    const res = await fetch(`/api/shifts/${id}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId: appId, kokId }),
    })
    if (res.ok) await charger()
    setChoix('')
  }

  async function deselect() {
    setChoix('deselect')
    const res = await fetch(`/api/shifts/${id}/unconfirm`, { method: 'POST' })
    if (res.ok) await charger()
    setChoix('')
  }

  async function payer() {
    setPaiement(true)
    setMsgPay('')
    const res = await fetch(`/api/shifts/${id}/pay`, { method: 'POST' })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      setMsgPay(data.error || t('pay_error'))
      setPaiement(false)
    }
  }

  async function rapporteerEind() {
    if (!eindInvoer || !shift) return
    setEindEnvoi(true)
    const res = await fetch(`/api/shifts/${id}/eindtijd`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endTime: eindInvoer, breakMinutes: pauzeAan ? Math.max(0, Math.min(480, parseInt(pauzeMin) || 0)) : 0 }),
    })
    if (res.ok) await charger()
    setEindEnvoi(false)
  }

  async function betwistEind() {
    if (!betwistTijd || betwistReden.trim().length < 10) return
    setBetwistEnvoi(true)
    setBetwistMsg('')
    const res = await fetch(`/api/shifts/${id}/eindtijd/betwist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endTime: betwistTijd, reason: betwistReden.trim() }),
    })
    if (res.ok) {
      setBetwistOuvert(false)
      setBetwistReden('')
      await charger()
    } else {
      const d = await res.json().catch(() => ({}))
      setBetwistMsg(d.error || 'Er ging iets mis')
    }
    setBetwistEnvoi(false)
  }

  async function reageerBetwisting(accepteer: boolean) {
    setBetwistEnvoi(true)
    const res = await fetch(`/api/shifts/${id}/eindtijd/betwist`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accepteer }),
    })
    if (res.ok) await charger()
    setBetwistEnvoi(false)
  }

  async function bevestigEind() {
    if (!shift) return
    setBevestigEnvoi(true)
    const res = await fetch(`/api/shifts/${id}/eindtijd/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endTime: eindInvoer }),
    })
    if (res.ok) await charger()
    setBevestigEnvoi(false)
  }

  async function envoyerAvis() {
    if (!note) return
    setAvisEnvoi(true)
    const res = await fetch(`/api/shifts/${id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score: note, text: avis }),
    })
    if (res.ok) await charger()
    setAvisEnvoi(false)
  }

  function demarrerModif() {
    if (!shift) return
    setETitle(shift.title)
    setEFunc(shift.function || '')
    setEDate(shift.date.slice(0, 10))
    setEStart(versChamp(shift.startTime))
    setEEnd(versChamp(shift.endTime))
    setERate(String(shift.hourlyRate / 100)) // stocké en centimes
    setEStreet(shift.locationStreet || '')
    setEPostal(shift.locationPostal || '')
    setECity(shift.locationCity || '')
    setEUrgent(shift.isUrgent)
    setEToeslag(shift.spoedtoeslagPct || 0)
    setModif(true)
  }

  async function sauvegarderModif(e: React.FormEvent) {
    e.preventDefault()
    setMsgModif('')
    if (!(parseFloat(eRate) >= MIN_HOURLY_RATE)) {
      setMsgModif(`${t('rate_too_low')} €${MIN_HOURLY_RATE.toFixed(2)}`)
      return
    }
    setEnvoiModif(true)
    const res = await fetch(`/api/shifts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: eTitle,
        function: eFunc || eTitle,
        date: eDate,
        startTime: eStart,
        endTime: eEnd,
        hourlyRate: parseFloat(eRate),
        locationStreet: eStreet,
        locationPostal: ePostal,
        locationCity: eCity,
        isUrgent: eUrgent,
        spoedtoeslagPct: eToeslag,
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setMsgModif(data?.error === 'RATE_TOO_LOW' ? `${t('rate_too_low')} €${(data.min ?? MIN_HOURLY_RATE).toFixed(2)}` : t('shift_fail'))
      setEnvoiModif(false)
      return
    }
    if (res.ok) {
      setModif(false)
      await charger()
    }
    setEnvoiModif(false)
  }

  const etiquette: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#3c4436' }
  const champ: React.CSSProperties = {
    width: '100%', padding: 11, border: '1.5px solid #e2e6d7', borderRadius: 12,
    fontSize: 14.5, outline: 'none', boxSizing: 'border-box', background: 'hsl(var(--card))', fontFamily: FONT,
  }
  const etiquetteSection: React.CSSProperties = {
    fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: '#8a9a7b', fontWeight: 800, marginBottom: 10,
  }
  const badgeSauge: React.CSSProperties = {
    background: '#f0f4ea', color: '#4c5e42', fontSize: 12, fontWeight: 700,
    padding: '5px 13px', borderRadius: 999,
  }

  if (chargement) {
    return (
      <main style={{ fontFamily: FONT, background: 'hsl(var(--background))', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}>{t('dash_loading')}</p>
      </main>
    )
  }

  if (!shift) {
    return (
      <main style={{ fontFamily: FONT, background: 'hsl(var(--background))', minHeight: '100vh', padding: 40 }}>
        <p>Shift niet gevonden.</p>
      </main>
    )
  }

  const dateStr = new Date(shift.date).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
  const start = heureHHMM(shift.startTime, locale)
  const end = heureHHMM(shift.endTime, locale)
  // Une shift a venir ne peut pas encore etre pointee : le formulaire de
  // declaration reste masque tant qu'elle n'a pas commence. Le serveur
  // refuse aussi (409), ceci n'est que le confort d'affichage.
  const startMoment = (() => {
    const j = new Date(shift.date).toISOString().slice(0, 10)
    const d = new Date(shift.startTime)
    return new Date(`${j}T${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}:00.000Z`)
  })()
  const shiftCommence = Date.now() >= startMoment.getTime()

  const estPaye = shift.invoice?.status === 'PAID'
  // OPEN : modifiable par l'horeca. EXPIRED : seul l'admin peut le réactiver (nouvelle date) ;
  // l'horeca doit reposter une annonce (c'est ce que dit l'e-mail de relance).
  const peutModifier = !shift.chosenKokId && (
    (role === 'HORECA' && shift.status === 'OPEN') ||
    (role === 'ADMIN' && (shift.status === 'OPEN' || shift.status === 'EXPIRED'))
  )
  const aujourdhui = new Date(new Date().toDateString())
  const fini = new Date(shift.date) < aujourdhui
  const adresse = [shift.locationStreet, shift.locationPostal, shift.locationCity].filter(Boolean).join(', ')

  // Le shift est-il réellement terminé (heure de fin réellement dépassée) ? On construit
  // l'instant réel à partir de la date + heure de fin dans le fuseau de l'appareil (proxy du
  // fuseau de l'établissement, NL). La confirmation n'est possible qu'après l'heure de fin.
  const jourStr = shift.date.slice(0, 10)
  const debutReel = new Date(`${jourStr}T${versChamp(shift.startTime)}:00`)
  let finReelle = new Date(`${jourStr}T${versChamp(shift.endTime)}:00`)
  if (finReelle.getTime() <= debutReel.getTime()) finReelle.setDate(finReelle.getDate() + 1)
  const shiftTermine = Date.now() >= finReelle.getTime()
  // On ne peut plus désélectionner le chef à moins de 24 h du début du shift
  const deselectBloque = Date.now() >= debutReel.getTime() - 24 * 3600 * 1000

  // Montant estimé affiché tant que la facture n'est pas créée :
  // heures réellement travaillées si l'heure de fin est déclarée, sinon horaire prévu, +21% btw.
  let dureeMin = (shift.eind ? minutesUTC(shift.eind.reportedEnd) : minutesUTC(shift.endTime)) - minutesUTC(shift.startTime)
  if (dureeMin <= 0) dureeMin += 1440
  const heuresEstimees = Math.max(1, dureeMin / 60 - 0.5)
  const montantEstime = (shift.hourlyRate / 100) * heuresEstimees * 1.21 // tarif en centimes
  const carte: React.CSSProperties = {
    background: 'hsl(var(--card))', borderRadius: 20, border: '1px solid #eceee3',
    boxShadow: '0 3px 12px rgba(46,52,43,0.05)', padding: 26,
  }

  const shiftActif = shift.status === 'CONFIRMED' || shift.status === 'COMPLETED'
  const eindGemeld = shift.eind ? heureHHMM(shift.eind.reportedEnd, locale) : ''
  const eindBevestigd = !!(shift.eind && shift.eind.confirmedAt)

  // ===== Notation reciproque =====
  // HORECA note le chef, KOK note le restaurant : meme formulaire, meme route
  // API, seuls le libelle et le drapeau consulte changent.
  // Extrait en variable pour rester disponible AVANT et APRES le paiement.
  const dejaNote = role === 'HORECA' ? shift.horecaReviewed : shift.kokReviewed
  const blocAvis = (role !== 'HORECA' && role !== 'KOK') ? null : dejaNote ? (
    <p style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#15803d', fontWeight: 700, fontSize: 13.5, marginTop: 16, marginBottom: 0 }}>
      <Ico n="check" s={15} /> {t('review_done')}
    </p>
  ) : (
    <div style={{ marginTop: 20, borderTop: '1px solid hsl(var(--border))', paddingTop: 18 }}>
      <div style={{ fontWeight: 800, fontSize: 15.5, letterSpacing: -0.3, marginBottom: 3 }}>
        {t(role === 'KOK' ? 'review_h_title' : 'review_title')}
      </div>
      <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 13.5, fontWeight: 600, marginTop: 0, marginBottom: 12 }}>
        {t(role === 'KOK' ? 'review_h_desc' : 'review_desc')}
      </p>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => setNote(i)}
            aria-label={`${i} / 5`}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, lineHeight: 0 }}
          >
            <IcoStar s={28} plein={i <= note} />
          </button>
        ))}
      </div>
      <textarea
        value={avis}
        onChange={(e) => setAvis(e.target.value)}
        placeholder={t(role === 'KOK' ? 'review_h_placeholder' : 'review_placeholder')}
        rows={3}
        style={{ ...champ, resize: 'vertical' }}
      />
      <div style={{ marginTop: 12 }}>
        <button
          onClick={envoyerAvis}
          disabled={avisEnvoi || !note}
          className="cs-btn"
          style={{
            background: 'linear-gradient(135deg,#647a55,#46553c)', color: '#fff', border: 'none',
            borderRadius: 12, padding: '11px 26px', fontWeight: 700, fontSize: 14, fontFamily: FONT,
            cursor: avisEnvoi || !note ? 'not-allowed' : 'pointer', opacity: avisEnvoi || !note ? 0.6 : 1,
            boxShadow: '0 8px 18px -8px rgba(70,85,60,.5)',
          }}
        >
          {avisEnvoi ? t('form_loading') : t('review_submit')}
        </button>
      </div>
    </div>
  )
  // Pause retenue pour la facturation : déclarée par le chef, sinon pause par défaut du shift
  const pauzeEffectief = shift.eind?.breakMinuten != null ? shift.eind.breakMinuten : shift.breakMinutes
  const pauzeTekst = pauzeEffectief > 0 ? `${t('end_break')} : ${pauzeEffectief} min` : t('end_break_none')
  const voirBlocEind = shiftActif && shift.chosenKokId

  return (
    <main style={{ fontFamily: FONT, background: 'hsl(var(--background))', color: 'hsl(var(--foreground))', minHeight: '100vh' }}>
      <AnimStyles />
      <nav className="cs-nav" style={{
        background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #e8ebe0',
        padding: '13px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <a href="/shifts" style={{ fontWeight: 800, fontSize: 20, color: 'hsl(var(--foreground))', textDecoration: 'none', letterSpacing: -0.5 }}>
          Chef<span style={{ color: '#5f7052' }}>Shift</span>
        </a>
        <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          <LangToggle />
          <a href="/shifts" style={{ color: '#5f7052', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
            {t('back_shifts')}
          </a>
        </div>
      </nav>


      {/* ===== Bannière photo (libre de droits) ===== */}
      <div className="cs-wrap" style={{ maxWidth: 860, margin: '0 auto', padding: '26px 24px 0' }}>
        <img
          src={BANNIERE}
          alt="Professionele keuken"
          className="cs-fade"
          style={{ width: '100%', height: 170, objectFit: 'cover', borderRadius: 20, border: '1px solid #eceee3', display: 'block' }}
          loading="lazy"
        />
      </div>

      <div className="cs-wrap" style={{ maxWidth: 860, margin: '0 auto', padding: '48px 24px' }}>
        {/* ===== Résumé du shift / Édition ===== */}
        {modif ? (
          <form onSubmit={sauvegarderModif} className="cs-pop" style={{ ...carte, marginBottom: 24 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.7, marginBottom: 20 }}>{t('edit_shift')}</h1>
            <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label style={etiquette}>{t('field_shift_title')}</label>
                <input value={eTitle} onChange={(e) => setETitle(e.target.value)} required style={champ} />
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label style={etiquette}>{t('field_function')}</label>
                <input value={eFunc} onChange={(e) => setEFunc(e.target.value)} style={champ} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 130 }}>
                <label style={etiquette}>{t('field_date')}</label>
                <input type="date" value={eDate} onChange={(e) => setEDate(e.target.value)} required style={champ} />
              </div>
              <div style={{ flex: 1, minWidth: 100 }}>
                <label style={etiquette}>{t('field_start')}</label>
                <input type="time" value={eStart} onChange={(e) => setEStart(e.target.value)} required style={champ} />
              </div>
              <div style={{ flex: 1, minWidth: 100 }}>
                <label style={etiquette}>{t('field_end')}</label>
                <input type="time" value={eEnd} onChange={(e) => setEEnd(e.target.value)} required style={champ} />
              </div>
              <div style={{ flex: 1, minWidth: 100 }}>
                <label style={etiquette}>{t('field_rate')}</label>
                <RateStepper value={eRate} onChange={setERate} min={MIN_HOURLY_RATE} inputStyle={champ} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
              <div style={{ flex: 2, minWidth: 180 }}>
                <label style={etiquette}>{t('field_street')}</label>
                <input value={eStreet} onChange={(e) => setEStreet(e.target.value)} style={champ} />
              </div>
              <div style={{ flex: 1, minWidth: 110 }}>
                <label style={etiquette}>{t('field_postal')}</label>
                <input value={ePostal} onChange={(e) => setEPostal(e.target.value)} style={champ} />
              </div>
              <div style={{ flex: 1, minWidth: 130 }}>
                <label style={etiquette}>{t('field_city')}</label>
                <input value={eCity} onChange={(e) => setECity(e.target.value)} required style={champ} />
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
              <input type="checkbox" checked={eUrgent} onChange={(e) => setEUrgent(e.target.checked)} style={{ width: 18, height: 18 }} />
              <Ico n="flame" s={15} c="#b91c1c" /> {t('field_urgent')}
            </label>
            {eUrgent && (
              <div style={{ marginBottom: 20 }}>
                <label style={etiquette}>{t('toeslag_label')}</label>
                <select value={eToeslag} onChange={(e) => setEToeslag(Number(e.target.value))} style={champ}>
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
            {msgModif && (
              <p style={{ color: '#b91c1c', fontSize: 13.5, marginTop: 0, marginBottom: 14, background: '#fef2f2', padding: '10px 14px', borderRadius: 10, fontWeight: 600 }}>{msgModif}</p>
            )}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="submit"
                disabled={envoiModif}
                className="cs-btn"
                style={{
                  flex: 1, padding: 13, background: 'linear-gradient(135deg,#647a55,#46553c)', color: '#fff',
                  border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14.5, fontFamily: FONT,
                  cursor: envoiModif ? 'wait' : 'pointer', opacity: envoiModif ? 0.7 : 1,
                }}
              >
                {envoiModif ? t('form_loading') : t('save_changes')}
              </button>
              <button
                type="button"
                onClick={() => setModif(false)}
                style={{
                  padding: '13px 24px', background: 'none', border: '1.5px solid #dfe4d4', borderRadius: 12,
                  fontWeight: 700, fontSize: 14.5, cursor: 'pointer', color: 'hsl(var(--foreground))', fontFamily: FONT,
                }}
              >
                {t('cancel')}
              </button>
            </div>
          </form>
        ) : (
          <div className="cs-fade" style={{ ...carte, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                  <h1 style={{ fontSize: 'clamp(22px, 3.5vw, 30px)', fontWeight: 800, letterSpacing: -1 }}>{shift.title}</h1>
                  {shift.function && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      background: '#23281f', color: '#dfe7d1', fontSize: 12, fontWeight: 700,
                      padding: '5px 13px', borderRadius: 999,
                    }}>
                      <Ico n="utensils" s={13} /> {shift.function}
                    </span>
                  )}
                  {shift.isUrgent && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fee2e2', color: '#b91c1c', fontSize: 12, fontWeight: 800, padding: '5px 13px', borderRadius: 999 }}>
                      <Ico n="flame" s={12} /> {t('urgent')}{shift.spoedtoeslagPct > 0 ? ` +${shift.spoedtoeslagPct}%` : ''}
                    </span>
                  )}
                </div>
                <p style={{ display: 'flex', gap: 16, flexWrap: 'wrap', margin: 0 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'hsl(var(--muted-foreground))', fontSize: 14.5 }}><Ico n="cal" s={15} c="#8a9a7b" /> {dateStr}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'hsl(var(--muted-foreground))', fontSize: 14.5 }}><Ico n="clock" s={15} c="#8a9a7b" /> {start} – {end}</span>
                  {shift.locationCity && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'hsl(var(--muted-foreground))', fontSize: 14.5 }}><Ico n="pin" s={15} c="#8a9a7b" /> {shift.locationCity}</span>}
                </p>
                {shift.horeca.horecaProfile?.companyName && (
                  <p style={{ marginTop: 10, fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {shift.horeca.horecaProfile.companyName}
                    {/* Note du restaurant, cote chef : elle eclaire la decision
                        de postuler. Sans avis, on n'affiche rien plutot qu'un zero. */}
                    {(shift.horeca.horecaProfile.reviewCount ?? 0) > 0 && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13.5, color: 'hsl(var(--muted-foreground))' }}>
                        <Etoiles n={shift.horeca.horecaProfile.averageScore ?? 0} />
                        {(shift.horeca.horecaProfile.averageScore ?? 0).toFixed(1)}
                        <span style={{ fontWeight: 600 }}>
                          ({shift.horeca.horecaProfile.reviewCount} {t('reviews')})
                        </span>
                      </span>
                    )}
                  </p>
                )}
              </div>
              <div className="cs-end" style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 27, fontWeight: 800, color: '#4c5e42', letterSpacing: -1 }}>€{shift.hourlyRate / 100}{parHeure}</div>
                {(shift.status === 'CONFIRMED' || shift.status === 'COMPLETED') && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, ...badgeSauge }}>
                    <Ico n="check" s={13} /> {t('shift_confirmed')}
                  </span>
                )}
                {estPaye && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#dcfce7', color: '#15803d', fontSize: 12, fontWeight: 800, padding: '5px 13px', borderRadius: 999, marginTop: 6 }}>
                    <Ico n="card" s={13} /> {t('pay_paid_badge')}
                  </span>
                )}
                {role === 'KOK' && shift.status === 'OPEN' && !fini && (
                  <div style={{ marginTop: 10 }}>
                    {dejaPostule ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#4c5e42', fontWeight: 700, fontSize: 13.5 }}>
                        <Ico n="check" s={15} /> {t('applied')}
                      </span>
                    ) : (
                      <button
                        onClick={postuler}
                        disabled={postulation}
                        className="cs-btn"
                        style={{
                          background: 'linear-gradient(135deg,#647a55,#46553c)', color: '#fff', border: 'none',
                          borderRadius: 999, padding: '11px 26px', fontWeight: 700, fontSize: 14,
                          cursor: postulation ? 'wait' : 'pointer', fontFamily: FONT,
                          opacity: postulation ? 0.7 : 1,
                          boxShadow: '0 8px 18px -8px rgba(70,85,60,.5)',
                        }}
                      >
                        {postulation ? t('apply_sending') : t('apply_btn')}
                      </button>
                    )}
                  </div>
                )}
                {role === 'KOK' && shift.status === 'OPEN' && fini && (
                  <div style={{ marginTop: 10, color: 'hsl(var(--muted-foreground))', fontWeight: 700, fontSize: 13.5 }}>
                    {t('shift_expired')}
                  </div>
                )}
                {/* Partage WhatsApp : ouvre l'app avec le message pre-rempli.
                    Le choix du groupe reste manuel — aucune API non officielle,
                    donc aucun risque de bannissement du numero. */}
                {(role === 'HORECA' || role === 'ADMIN') && shift.status === 'OPEN' && !fini && (
                  <div style={{ marginTop: 10 }}>
                    <a
                      href={whatsappDeelUrl(shiftWhatsAppTekst({
                        shiftId: shift.id,
                        titel: shift.title,
                        functie: shift.function,
                        datum: new Date(shift.date).toISOString().slice(0, 10),
                        start,
                        eind: end,
                        tarief: Math.round(shift.hourlyRate / 100),
                        stad: shift.locationCity,
                        bedrijf: shift.horeca.horecaProfile?.companyName,
                        urgent: shift.isUrgent,
                      }, typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'https://chefshift.nl')))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cs-btn"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        background: '#25D366', color: '#fff', border: 'none', borderRadius: 999,
                        padding: '10px 20px', fontWeight: 700, fontSize: 13, textDecoration: 'none',
                        fontFamily: FONT,
                      }}
                    >
                      {t('share_whatsapp')}
                    </a>
                  </div>
                )}
                {shift.status === 'EXPIRED' && (role === 'HORECA' || role === 'ADMIN') && (
                  <div style={{ marginTop: 14, background: '#f3f4f6', border: '1.5px solid #e5e7eb', borderRadius: 14, padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13.5, color: '#6b7280' }}>
                      <Ico n="clock" s={15} c="#6b7280" /> {t('shift_expired')}
                    </div>
                    <p style={{ margin: '5px 0 0', fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
                      {t(role === 'ADMIN' ? 'shift_expired_hint_admin' : 'shift_expired_hint')}
                    </p>
                  </div>
                )}
                {peutModifier && (
                  <div style={{ marginTop: 10 }}>
                    <button
                      onClick={demarrerModif}
                      className="cs-btn"
                      style={{
                        background: 'none', border: '1.5px solid #dfe4d4', borderRadius: 999,
                        padding: '9px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                        color: 'hsl(var(--foreground))', fontFamily: FONT,
                      }}
                    >
                      {t('edit_shift')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== Adresse + carte ===== */}
        {adresse && (
          <div className="cs-fade cs-d1" style={{ ...carte, padding: 0, overflow: 'hidden', marginBottom: 40 }}>
            <div style={{ padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Ico n="pin" s={16} c="#5f7052" />
              <span style={{ fontWeight: 700, fontSize: 14.5 }}>{adresse}</span>
            </div>
            <iframe
              title="Kaart"
              src={`https://www.google.com/maps?q=${encodeURIComponent(adresse)}&output=embed`}
              style={{ width: '100%', height: 220, border: 0, display: 'block' }}
              loading="lazy"
            />
          </div>
        )}

        {/* ===== Heure de fin : déclaration du chef + confirmation horeca ===== */}
        {voirBlocEind && (
          <div className="cs-fade cs-d1" style={{ ...carte, marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Ico n="clock" s={17} c="#5f7052" />
              <span style={{ fontWeight: 800, fontSize: 16.5, letterSpacing: -0.4 }}>
                {role === 'KOK' ? t('end_title') : t('end_confirm_title')}
              </span>
            </div>

            {estPaye ? (
              // Shift payé : plus rien à déclarer ni confirmer — la facture est disponible
              <>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#dcfce7', color: '#15803d', fontSize: 13.5, fontWeight: 800, padding: '8px 16px', borderRadius: 999 }}>
                  <Ico n="check" s={14} /> {t('end_confirmed')}{shift.eind ? ` · ${eindGemeld}` : ''} · {t('pay_paid_badge')}
                </span>
                {shift.invoice && (
                  <div style={{ marginTop: 14 }}>
                    <a
                      href={`/api/invoices/${shift.invoice.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="cs-btn"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none',
                        border: '1.5px solid #dfe4d4', borderRadius: 12, padding: '10px 20px',
                        fontWeight: 700, fontSize: 13.5, color: 'hsl(var(--foreground))', textDecoration: 'none',
                      }}
                    >
                      <Ico n="card" s={15} /> {t('invoice_view')}
                    </a>
                  </div>
                )}
                {/* L'avis reste accessible apres le paiement */}
                {blocAvis}
              </>
            ) : eindBevestigd ? (
              <>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#dcfce7', color: '#15803d', fontSize: 13.5, fontWeight: 800, padding: '8px 16px', borderRadius: 999 }}>
                  <Ico n="check" s={14} /> {t('end_confirmed')} · {eindGemeld}
                </span>

                {blocAvis}

                {/* Admin : peut corriger l'heure même après confirmation */}
                {role === 'ADMIN' && (
                  <div style={{ marginTop: 18, borderTop: '1px solid hsl(var(--border))', paddingTop: 16, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 130 }}>
                      <label style={etiquette}>{t('end_admin_edit')}</label>
                      <input type="time" value={eindInvoer} onChange={(e) => setEindInvoer(e.target.value)} style={champ} />
                    </div>
                    <button
                      onClick={bevestigEind}
                      disabled={bevestigEnvoi || !eindInvoer}
                      className="cs-btn"
                      style={{
                        background: 'none', border: '1.5px solid #dfe4d4', borderRadius: 12, padding: '11px 22px',
                        fontWeight: 700, fontSize: 13.5, color: 'hsl(var(--foreground))', fontFamily: FONT,
                        cursor: bevestigEnvoi || !eindInvoer ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {bevestigEnvoi ? t('form_loading') : t('end_confirm_btn')}
                    </button>
                  </div>
                )}
              </>
            ) : role === 'KOK' ? (
              // Contre-proposition en attente : le chef doit trancher
              shift.eind?.disputedEnd && !shift.eind.refusedAt ? (
                <div>
                  <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 14, padding: 16, marginBottom: 16 }}>
                    <div style={{ fontWeight: 800, fontSize: 14.5, color: '#9a3412', marginBottom: 8 }}>
                      {t('disp_kok_title')}
                    </div>
                    <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, color: '#a8a29e', fontWeight: 800 }}>{t('disp_yours')}</div>
                        <div style={{ fontSize: 19, fontWeight: 800, color: '#4c5e42' }}>{eindGemeld}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, color: '#a8a29e', fontWeight: 800 }}>{t('disp_proposed')}</div>
                        <div style={{ fontSize: 19, fontWeight: 800, color: '#c2410c' }}>{heureHHMM(shift.eind.disputedEnd, locale)}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 13.5, color: '#57534e', lineHeight: 1.6 }}>
                      <strong>{t('disp_reason')} :</strong> {shift.eind.disputeReason}
                    </div>
                    <p style={{ fontSize: 12.5, color: '#a8a29e', marginTop: 10, marginBottom: 0, fontWeight: 600 }}>
                      {t('disp_48h')}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => reageerBetwisting(true)}
                      disabled={betwistEnvoi}
                      className="cs-btn"
                      style={{
                        background: 'linear-gradient(135deg,#647a55,#46553c)', color: '#fff', border: 'none',
                        borderRadius: 12, padding: '12px 24px', fontWeight: 700, fontSize: 14, fontFamily: FONT,
                        cursor: betwistEnvoi ? 'wait' : 'pointer', opacity: betwistEnvoi ? 0.7 : 1,
                      }}
                    >
                      {t('disp_accept')}
                    </button>
                    <button
                      onClick={() => reageerBetwisting(false)}
                      disabled={betwistEnvoi}
                      className="cs-btn"
                      style={{
                        background: 'none', border: '1.5px solid #dfe4d4', borderRadius: 12, padding: '12px 24px',
                        fontWeight: 700, fontSize: 14, color: 'hsl(var(--foreground))', fontFamily: FONT,
                        cursor: betwistEnvoi ? 'wait' : 'pointer',
                      }}
                    >
                      {t('disp_refuse')}
                    </button>
                  </div>
                </div>
              ) : shift.eind?.refusedAt ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#fef3c7', color: '#92400e', fontSize: 13.5, fontWeight: 800, padding: '8px 16px', borderRadius: 999 }}>
                  <Ico n="clock" s={14} /> {t('disp_in_review')}
                </span>
              ) : shift.eind ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, ...badgeSauge, fontSize: 13.5, padding: '8px 16px' }}>
                    <Ico n="clock" s={14} /> {t('end_wait')} · {eindGemeld} · {pauzeTekst}
                  </span>
                </div>
              ) : !shiftCommence ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#f1f1ee', color: '#6b7268', fontSize: 13.5, fontWeight: 700, padding: '9px 16px', borderRadius: 999 }}>
                  <Ico n="clock" s={14} /> {t('end_notyet')}
                </span>
              ) : (
                <>
                  <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 14, fontWeight: 600, marginTop: 0, marginBottom: 16 }}>{t('end_desc')}</p>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 130 }}>
                      <label style={etiquette}>{t('field_end')}</label>
                      <input type="time" value={eindInvoer} onChange={(e) => setEindInvoer(e.target.value)} required style={champ} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44 }}>
                      <input
                        type="checkbox"
                        id="pauze"
                        checked={pauzeAan}
                        onChange={(e) => setPauzeAan(e.target.checked)}
                        style={{ width: 18, height: 18, accentColor: '#5f7052', cursor: 'pointer' }}
                      />
                      <label htmlFor="pauze" style={{ fontSize: 13.5, fontWeight: 700, color: '#3c4436', cursor: 'pointer' }}>
                        {t('end_break_label')}
                      </label>
                    </div>
                    {pauzeAan && (
                      <div style={{ minWidth: 110 }}>
                        <label style={etiquette}>{t('end_break')} (min)</label>
                        <input
                          type="number"
                          min="0"
                          max="480"
                          step="5"
                          value={pauzeMin}
                          onChange={(e) => setPauzeMin(e.target.value)}
                          style={champ}
                        />
                      </div>
                    )}
                    <button
                      onClick={rapporteerEind}
                      disabled={eindEnvoi || !eindInvoer}
                      className="cs-btn"
                      style={{
                        background: 'linear-gradient(135deg,#647a55,#46553c)', color: '#fff', border: 'none',
                        borderRadius: 12, padding: '12px 24px', fontWeight: 700, fontSize: 14,
                        cursor: eindEnvoi ? 'wait' : 'pointer', opacity: eindEnvoi ? 0.7 : 1, fontFamily: FONT,
                        boxShadow: '0 8px 18px -8px rgba(70,85,60,.5)',
                      }}
                    >
                      {eindEnvoi ? t('end_sending') : t('end_btn')}
                    </button>
                  </div>
                </>
              )
            ) : !shiftTermine && role !== 'ADMIN' ? (
              // La confirmation n'est possible qu'après l'heure de fin du shift
              <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 14, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Ico n="clock" s={15} /> {t('end_after_only')}
              </p>
            ) : (
              // Restaurant (ou admin) : confirmer l'heure de fin — fonctionne même si le chef
              // ne l'a pas déclarée (le restaurant la saisit / corrige lui-même).
              <>
                <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 14, fontWeight: 600, marginTop: 0, marginBottom: 16 }}>{t('end_confirm_self')}</p>
                <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: '#8a9a7b', fontWeight: 800, marginBottom: 4 }}>{t('end_planned')}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'hsl(var(--muted-foreground))' }}>{end}</div>
                  </div>
                  {shift.eind && (
                    <div>
                      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: '#8a9a7b', fontWeight: 800, marginBottom: 4 }}>{t('end_reported')}</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#4c5e42' }}>{eindGemeld}</div>
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: '#8a9a7b', fontWeight: 800, marginBottom: 4 }}>{t('end_break')}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'hsl(var(--muted-foreground))' }}>{pauzeEffectief > 0 ? `${pauzeEffectief} min` : t('end_break_none')}</div>
                  </div>
                  <div style={{ minWidth: 130 }}>
                    <label style={etiquette}>{t('end_final')}</label>
                    <input type="time" value={eindInvoer} onChange={(e) => setEindInvoer(e.target.value)} required style={champ} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    onClick={bevestigEind}
                    disabled={bevestigEnvoi || !eindInvoer}
                    className="cs-btn"
                    style={{
                      background: 'linear-gradient(135deg,#647a55,#46553c)', color: '#fff', border: 'none',
                      borderRadius: 12, padding: '12px 24px', fontWeight: 700, fontSize: 14,
                      cursor: bevestigEnvoi || !eindInvoer ? 'not-allowed' : 'pointer', opacity: bevestigEnvoi ? 0.7 : 1, fontFamily: FONT,
                      boxShadow: '0 8px 18px -8px rgba(70,85,60,.5)',
                    }}
                  >
                    {bevestigEnvoi ? t('form_loading') : t('end_confirm_btn')}
                  </button>
                  {/* Contester : seulement si le chef a declare une heure.
                      Sans declaration, le restaurant saisit directement. */}
                  {shift.eind && !shift.eind.disputedEnd && (
                    <button
                      onClick={() => { setBetwistOuvert(!betwistOuvert); setBetwistTijd(eindInvoer) }}
                      className="cs-btn"
                      style={{
                        background: 'none', border: '1.5px solid #dfe4d4', borderRadius: 12, padding: '12px 22px',
                        fontWeight: 700, fontSize: 13.5, color: 'hsl(var(--foreground))', fontFamily: FONT, cursor: 'pointer',
                      }}
                    >
                      {t('disp_open')}
                    </button>
                  )}
                </div>

                {/* Contre-proposition deja envoyee : en attente du chef */}
                {shift.eind?.disputedEnd && !shift.eind.refusedAt && (
                  <p style={{ marginTop: 14, marginBottom: 0, fontSize: 13.5, fontWeight: 700, color: '#92400e' }}>
                    {t('disp_sent')} · {heureHHMM(shift.eind.disputedEnd, locale)}
                  </p>
                )}
                {shift.eind?.refusedAt && (
                  <p style={{ marginTop: 14, marginBottom: 0, fontSize: 13.5, fontWeight: 700, color: '#92400e' }}>
                    {t('disp_in_review')}
                  </p>
                )}

                {/* Formulaire de contestation */}
                {betwistOuvert && (
                  <div style={{ marginTop: 18, borderTop: '1px solid hsl(var(--border))', paddingTop: 18 }}>
                    <div style={{ fontWeight: 800, fontSize: 14.5, marginBottom: 4 }}>{t('disp_title')}</div>
                    <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 13, fontWeight: 600, marginTop: 0, marginBottom: 14 }}>
                      {t('disp_desc')}
                    </p>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 12 }}>
                      <div style={{ minWidth: 130 }}>
                        <label style={etiquette}>{t('disp_proposed')}</label>
                        <input type="time" value={betwistTijd} onChange={(e) => setBetwistTijd(e.target.value)} style={champ} />
                      </div>
                    </div>
                    <label style={etiquette}>{t('disp_reason')}</label>
                    <textarea
                      value={betwistReden}
                      onChange={(e) => setBetwistReden(e.target.value)}
                      placeholder={t('disp_reason_ph')}
                      rows={3}
                      maxLength={500}
                      style={{ ...champ, resize: 'vertical' }}
                    />
                    <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', fontWeight: 600, marginTop: 4 }}>
                      {betwistReden.trim().length} / 10 {t('disp_min_chars')}
                    </div>
                    {betwistMsg && (
                      <div style={{ color: '#b91c1c', fontSize: 13, fontWeight: 700, marginTop: 8 }}>{betwistMsg}</div>
                    )}
                    <div style={{ marginTop: 14 }}>
                      <button
                        onClick={betwistEind}
                        disabled={betwistEnvoi || !betwistTijd || betwistReden.trim().length < 10}
                        className="cs-btn"
                        style={{
                          background: '#c2410c', color: '#fff', border: 'none', borderRadius: 12,
                          padding: '11px 24px', fontWeight: 700, fontSize: 13.5, fontFamily: FONT,
                          cursor: betwistEnvoi || betwistReden.trim().length < 10 ? 'not-allowed' : 'pointer',
                          opacity: betwistEnvoi || betwistReden.trim().length < 10 ? 0.55 : 1,
                        }}
                      >
                        {betwistEnvoi ? t('form_loading') : t('disp_send')}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ===== Paiement (horeca, après la fin du shift) ===== */}
        {role === 'HORECA' && shift.chosenKokId && (shift.status === 'CONFIRMED' || shift.status === 'COMPLETED') && !estPaye && (
          <div className="cs-fade cs-d2" style={{ ...carte, marginBottom: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
            <div>
              {eindBevestigd ? (
                <>
                  <div style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}>{t('pay_to_pay')}</div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>
                    €{(shift.invoice ? shift.invoice.amountInclVat / 100 : montantEstime).toFixed(2)}{' '}
                    <span style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}>{t('pay_incl_vat')}</span>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}>
                  <Ico n="clock" s={15} /> {t('pay_after')}
                </div>
              )}
              {msgPay && <div style={{ color: '#b91c1c', fontSize: 13, marginTop: 5, fontWeight: 600 }}>{msgPay}</div>}
            </div>
            {eindBevestigd && (
              <button
                onClick={payer}
                disabled={paiement}
                className="cs-btn"
                style={{
                  background: 'linear-gradient(135deg,#647a55,#46553c)', color: '#fff', border: 'none',
                  borderRadius: 12, padding: '13px 26px', fontWeight: 700, fontSize: 14.5,
                  cursor: paiement ? 'wait' : 'pointer', opacity: paiement ? 0.7 : 1, fontFamily: FONT,
                  boxShadow: '0 10px 22px -8px rgba(70,85,60,.5)',
                }}
              >
                <Ico n="card" s={16} />
                {paiement ? t('pay_starting') : t('pay_now')}
              </button>
            )}
          </div>
        )}
        {estPaye && (
          <p style={{ color: '#15803d', fontWeight: 700, marginBottom: 40, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Ico n="check" s={16} /> {t('pay_success')}
            {shift.invoice && (
              <a
                href={`/api/invoices/${shift.invoice.id}/pdf`}
                target="_blank"
                rel="noreferrer"
                style={{ color: '#4c5e42', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}
              >
                <Ico n="card" s={14} /> {t('invoice_view')}
              </a>
            )}
          </p>
        )}

        {/* ===== Candidatures (horeca uniquement) ===== */}
        {(role === 'HORECA' || role === 'ADMIN') && (<>
        <h2 className="cs-fade cs-d2" style={{ fontSize: 22, fontWeight: 800, marginBottom: 18, letterSpacing: -0.6 }}>
          {t('applicants')} ({shift.applications.length})
        </h2>
        {shift.applications.some((a) => favoris.includes(a.kokId)) && (
          <button
            onClick={() => setSeulementFav(!seulementFav)}
            className="cs-btn"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16,
              background: seulementFav ? '#23281f' : '#fff',
              color: seulementFav ? '#f3ead7' : 'hsl(var(--foreground))',
              border: '1.5px solid #dfe4d4', borderRadius: 999, padding: '8px 18px',
              fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: FONT,
            }}
          >
            <IcoStar s={14} plein /> {t('fav_only')} ({shift.applications.filter((a) => favoris.includes(a.kokId)).length})
          </button>
        )}
        {shift.applications.length === 0 ? (
          <div className="cs-card" style={{ ...carte, textAlign: 'center', padding: 48 }}>
            <p style={{ color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}>{t('no_applicants')}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {(seulementFav ? shift.applications.filter((a) => favoris.includes(a.kokId)) : shift.applications).map((app) => {
              const p = app.kok.kokProfile
              // Moyenne réelle du profil (mise à jour à chaque avis), pas la liste non chargée
              const nbAvis = p?.reviewCount || 0
              const moy = p?.averageScore || 0
              return (
                <div key={app.id} className="cs-card" style={carte}>
                  {/* En-tête du candidat */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.4 }}>
                        {p?.firstName} {p?.lastName}
                        {(role === 'HORECA' || role === 'ADMIN') && (
                          <button
                            onClick={() => toggleFavori(app.kokId)}
                            disabled={favEnvoi === app.kokId}
                            title={favoris.includes(app.kokId) ? t('fav_remove') : t('fav_add')}
                            aria-label={favoris.includes(app.kokId) ? t('fav_remove') : t('fav_add')}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 8px', verticalAlign: 'middle', opacity: favEnvoi === app.kokId ? 0.5 : 1 }}
                          >
                            <IcoStar s={18} plein={favoris.includes(app.kokId)} />
                          </button>
                        )}
                        {p?.dateOfBirth && (
                          <span style={{ color: 'hsl(var(--muted-foreground))', fontWeight: 600, fontSize: 14 }}> · {age(p.dateOfBirth)} {t('years_old')}</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                        <Etoiles n={moy} />
                        <span style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}>
                          {nbAvis > 0 ? `${moy.toFixed(1)} (${nbAvis} ${t('reviews')})` : t('no_reviews')}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 14, marginTop: 7, flexWrap: 'wrap' }}>
                        {p?.city && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13.5, color: 'hsl(var(--muted-foreground))' }}><Ico n="pin" s={13} /> {p.city}</span>}
                        {p?.yearsExperience != null && <span style={{ fontSize: 13.5, color: 'hsl(var(--muted-foreground))' }}>{p.yearsExperience} {t('experience_years')}</span>}
                      </div>
                    </div>
                    {(role === 'HORECA' || role === 'ADMIN') && shift.status === 'OPEN' && app.status === 'PENDING' && (
                      <button
                        onClick={() => choisir(app.id, app.kokId)}
                        disabled={choix === app.id}
                        className="cs-btn"
                        style={{
                          background: 'linear-gradient(135deg,#647a55,#46553c)', color: '#fff', border: 'none',
                          borderRadius: 999, padding: '11px 26px', fontWeight: 700, fontSize: 14,
                          cursor: choix === app.id ? 'wait' : 'pointer', fontFamily: FONT,
                          boxShadow: '0 8px 18px -8px rgba(70,85,60,.5)',
                        }}
                      >
                        {choix === app.id ? t('form_loading') : t('choose')}
                      </button>
                    )}
                    {app.status === 'ACCEPTED' && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, ...badgeSauge }}>
                          <Ico n="check" s={13} /> {t('chosen')}
                        </span>
                        {!estPaye && (!deselectBloque || role === 'ADMIN') && (
                          <button
                            onClick={deselect}
                            disabled={choix === 'deselect'}
                            className="cs-btn"
                            style={{
                              background: 'none', border: '1.5px solid #dfe4d4', borderRadius: 999,
                              padding: '7px 16px', fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
                              color: 'hsl(var(--foreground))', fontFamily: FONT,
                            }}
                          >
                            {choix === 'deselect' ? t('form_loading') : t('unchoose')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Certifs */}
                  {(p?.haccpCertified || p?.svhCertified) && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                      {p.haccpCertified && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, ...badgeSauge }}><Ico n="shield" s={12} /> HACCP</span>}
                      {p.svhCertified && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, ...badgeSauge }}><Ico n="award" s={12} /> SVH{p.svhLevel ? ` ${p.svhLevel}` : ''}</span>}
                    </div>
                  )}

                  {/* Tarif proposé */}
                  {app.proposedRate != null && (
                    <div style={{ marginTop: 12, fontSize: 14 }}>
                      {t('proposed_rate')} : <strong style={{ color: '#4c5e42' }}>€{app.proposedRate}{parHeure}</strong>
                    </div>
                  )}

                  {/* Message */}
                  {app.message && (
                    <p style={{ marginTop: 12, fontSize: 14, color: '#3c4436', lineHeight: 1.6, background: '#f9faf4', padding: '12px 16px', borderRadius: 12 }}>
                      {app.message}
                    </p>
                  )}

                  {/* Fonctions & spécialités */}
                  {p && (p.functions.length > 0 || p.specialties.length > 0) && (
                    <div style={{ marginTop: 14 }}>
                      {p.functions.length > 0 && (
                        <>
                          <div style={etiquetteSection}>{t('functions_title')}</div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                            {p.functions.map((f) => <span key={f} style={badgeSauge}>{afficherPoste(f, lang)}</span>)}
                          </div>
                        </>
                      )}
                      {p.specialties.length > 0 && (
                        <>
                          <div style={etiquetteSection}>{t('specialties_title')}</div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {p.specialties.map((s) => <span key={s} style={badgeSauge}>{afficherSpecialite(s, lang)}</span>)}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Tarif souhaité */}
                  {p?.hourlyRateMin != null && (
                    <div style={{ marginTop: 12, fontSize: 13.5, color: 'hsl(var(--muted-foreground))' }}>
                      {t('rate_range')} : €{p.hourlyRateMin} – €{p.hourlyRateMax}{parHeure}
                    </div>
                  )}

                  {/* Description */}
                  {p?.description && (
                    <p style={{ marginTop: 12, fontSize: 14, color: '#4a5044', lineHeight: 1.6 }}>{p.description}</p>
                  )}

                  {/* Expérience */}
                  {p && p.workExperience.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <div style={etiquetteSection}>{t('work_history')}</div>
                      <div style={{ display: 'grid', gap: 8 }}>
                        {p.workExperience.map((w) => (
                          <div key={w.id} style={{ fontSize: 13.5 }}>
                            <strong>{w.function}</strong>
                            {w.companyName && ` · ${w.companyName}`}
                            {w.location && ` · ${w.location}`}
                            <div style={{ color: 'hsl(var(--muted-foreground))', fontSize: 12.5 }}>
                              {new Date(w.fromDate).toLocaleDateString(locale, { month: 'short', year: 'numeric' })}
                              {' – '}
                              {w.isCurrent
                                ? t('current')
                                : w.toDate
                                ? new Date(w.toDate).toLocaleDateString(locale, { month: 'short', year: 'numeric' })
                                : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
        </>)}
      </div>
    </main>
  )
}
