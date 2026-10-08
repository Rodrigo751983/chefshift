'use client'

import { useEffect, useRef, useState } from 'react'
import { useT, LangToggle } from '@/lib/i18n'
import ThemeToggle from '@/components/ThemeToggle'
import AnimStyles from '@/components/AnimStyles'
import { Ico, IcoTile, IcoStar } from '@/components/Icons'

const FONT = '"Sora","Inter","Helvetica Neue",Arial,sans-serif'
const CONTACT_EMAIL = 'info@chefshift.nl'

// Photo du hero générée pour ChefShift (hébergée en ligne)
const HERO_URL = '/og-image.jpg'
// Visuel côté restaurants (salle élégante au crépuscule)
const VIS_RESTO = '/og-image.jpg'

// Données structurées schema.org : organisation, site et FAQ (visible pour Google)
const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${process.env.NEXT_PUBLIC_APP_URL || 'https://chefshift.vercel.app'}/#org`,
      name: 'ChefShift',
      url: process.env.NEXT_PUBLIC_APP_URL || 'https://chefshift.vercel.app',
      logo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://chefshift.vercel.app'}/icon.svg`,
      description: 'Platform voor zzp-koks en horeca in Nederland.',
      email: CONTACT_EMAIL,
    },
    {
      '@type': 'WebSite',
      '@id': 'https://www.chefshift.nl/#site',
      name: 'ChefShift',
      url: 'https://www.chefshift.nl',
      inLanguage: 'nl',
      publisher: { '@id': 'https://www.chefshift.nl/#org' },
    },
    {
      '@type': 'FAQPage',
      '@id': 'https://www.chefshift.nl/#faq',
      mainEntity: [
        { q: 'Hoe betalen horecazaken?', a: 'Betaling verloopt veilig via iDEAL, pas nadat je een kok hebt gekozen. No cure, no pay: geen match, geen kosten.' },
        { q: 'Hoe worden koks geverifieerd?', a: 'Elke kok wordt gecontroleerd op KvK-inschrijving en kan een HACCP-certificaat uploaden. Beoordelingen van echte shifts houden de kwaliteit zichtbaar.' },
        { q: 'Wie is verzekerd tijdens een shift?', a: 'Koks werken als zelfstandige (zzp) en zijn zelf verantwoordelijk voor hun bedrijfs- en aansprakelijkheidsverzekering. ChefShift is het bemiddelingsplatform.' },
        { q: 'Hoe werken de facturen?', a: 'Na elke betaling staat de factuur automatisch klaar, met factuurnummer en 21% btw-specificatie. Downloadbaar voor je boekhouding.' },
        { q: 'Hoe bereik ik de support?', a: 'Mail naar info@chefshift.nl. We antwoorden meestal binnen één werkdag.' },
      ].map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ],
}

// Décor du hero : halos lumineux animés sur dégradé olive (aucune image externe)
function Halos() {
  return (
    <>
      <span className="cs-halo cs-halo1" aria-hidden="true" />
      <span className="cs-halo cs-halo2" aria-hidden="true" />
      <span className="cs-halo cs-halo3" aria-hidden="true" />
    </>
  )
}

// Photo de fond : la version en ligne (HERO_URL) est affichée en priorité ;
// si elle ne charge pas, on essaie une éventuelle image locale public/hero.jpg ;
// sinon seul le décor CSS reste, rien ne casse.
function PhotoFond({ alt = '' }: { alt?: string }) {
  const [src, setSrc] = useState(HERO_URL)
  if (!src) return null
  return (
    <img
      src={src}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      onError={() => setSrc(src === HERO_URL ? '/hero.jpg' : '')}
      className="cs-heroimg"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
    />
  )
}

// Compteur animé : démarre quand la section devient visible à l'écran
function Teller({ doel, suffix = '', decimalen = 0 }: { doel: number; suffix?: string; decimalen?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [waarde, setWaarde] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let gestart = false
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || gestart) return
        gestart = true
        const t0 = performance.now()
        const duur = 1500
        const stap = (nu: number) => {
          const p = Math.min(1, (nu - t0) / duur)
          const eased = 1 - Math.pow(1 - p, 3)
          setWaarde(doel * eased)
          if (p < 1) requestAnimationFrame(stap)
        }
        requestAnimationFrame(stap)
        io.disconnect()
      },
      { threshold: 0.4 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [doel])
  const tekst = waarde.toFixed(decimalen).replace('.', ',')
  return (
    <span ref={ref}>
      {tekst}
      {suffix}
    </span>
  )
}

// Petite carte flottante du hero (preuve sociale)
function ZweefKaart({ children, stijl }: { children: React.ReactNode; stijl: React.CSSProperties }) {
  return (
    <div
      className="cs-card cs-hide-mob"
      style={{
        position: 'absolute', zIndex: 3,
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)',
        borderRadius: 16, padding: '13px 18px',
        boxShadow: '0 16px 40px -12px rgba(20,26,17,.45)',
        display: 'flex', alignItems: 'center', gap: 11,
        ...stijl,
      }}
    >
      {children}
    </div>
  )
}

export default function HomePage() {
  const { t } = useT()
  const [user, setUser] = useState<any>(null)
  const [charge, setCharge] = useState(false)
  const [scrolde, setScrolde] = useState(false)
  const [faqOpen, setFaqOpen] = useState<number | null>(0)

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((s) => setUser(s?.user || null))
      .catch(() => {})
      .finally(() => setCharge(true))
  }, [])

  // La nav devient claire et opaque dès qu'on quitte le haut du hero
  useEffect(() => {
    const onScroll = () => setScrolde(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const btnPrimaire: React.CSSProperties = {
    background: 'linear-gradient(135deg,#647a55,#46553c)', color: '#fff',
    padding: '15px 32px', borderRadius: 999, fontWeight: 700, fontSize: 15,
    textDecoration: 'none', boxShadow: '0 10px 24px -8px rgba(70,85,60,.55)',
  }

  // Destination du bouton "Plaats een shift" : connecté → création directe,
  // sinon → connexion (le compte existe déjà dans ce cas le plus souvent)
  const shiftCtaHref = charge && user ? '/shifts/new' : '/login'

  // Témoignages (restaurant, hôtel, chef) — textes existants conservés


  const faqItems = [
    { q: t('faq1_q'), a: t('faq1_a') },
    { q: t('faq2_q'), a: t('faq2_a') },
    { q: t('faq3_q'), a: t('faq3_a') },
    { q: t('faq4_q'), a: t('faq4_a') },
    { q: t('faq5_q'), a: t('faq5_a') },
  ]

  const navTekstKleur = scrolde ? 'hsl(var(--foreground))' : 'rgba(255,255,255,0.92)'

  const kopStijl: React.CSSProperties = { textAlign: 'center', maxWidth: 680, margin: '0 auto 58px' }
  const overStijl: React.CSSProperties = { color: '#5f7052', fontWeight: 800, fontSize: 12.5, letterSpacing: 2.5, textTransform: 'uppercase' }
  const h2Stijl: React.CSSProperties = { fontSize: 'clamp(30px, 4vw, 46px)', fontWeight: 800, letterSpacing: -1.4, margin: '12px 0 14px' }
  const subStijl: React.CSSProperties = { color: 'hsl(var(--muted-foreground))', fontSize: 16.5, lineHeight: 1.6 }

  return (
    <main style={{ fontFamily: FONT, background: 'hsl(var(--background))', color: 'hsl(var(--foreground))', minHeight: '100vh' }}>
      <AnimStyles />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      {/* ===== Navigation collante : verre sur le hero, blanche après défilement ===== */}
      <nav className="cs-nav" style={{
        position: 'fixed', top: 18, left: '50%', transform: 'translateX(-50%)',
        width: 'min(1160px, calc(100% - 32px))', zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '13px 26px', borderRadius: 999,
        background: scrolde ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.13)',
        backdropFilter: 'blur(16px)',
        border: scrolde ? '1px solid hsl(var(--border))' : '1px solid rgba(255,255,255,0.28)',
        boxShadow: scrolde ? '0 10px 30px rgba(46,52,43,.14)' : '0 8px 30px rgba(20,26,17,.18)',
        transition: 'background .3s ease, border-color .3s ease, box-shadow .3s ease',
      }}>
        <a href="/" style={{ fontWeight: 800, fontSize: 20, color: scrolde ? 'hsl(var(--foreground))' : '#fff', textDecoration: 'none', letterSpacing: -0.5, transition: 'color .3s ease' }}>
          Chef<span style={{ color: scrolde ? '#5f7052' : '#cfdcba' }}>Shift</span>
        </a>
        <div style={{ display: 'flex', gap: 22, alignItems: 'center' }}>
          <a href="#hoe" className="cs-nav-link cs-hide-mob" style={{ color: navTekstKleur, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
            {t('nav_how')}
          </a>
          <a href="#faq" className="cs-nav-link cs-hide-mob" style={{ color: navTekstKleur, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
            {t('nav_faq')}
          </a>
          <LangToggle clair={!scrolde} />
          <ThemeToggle clair={!scrolde} />
          {charge && user ? (
            <>
              <span className="cs-hide-mob" style={{ color: navTekstKleur, fontSize: 13.5, fontWeight: 600 }}>
                {user.email}
              </span>
              <a href="/dashboard" className="cs-btn" style={{ ...btnPrimaire, padding: '10px 22px', fontSize: 14 }}>
                {t('nav_dashboard')} <Ico n="arrow" s={15} />
              </a>
            </>
          ) : (
            <>
              <a href="/login" className="cs-nav-link" style={{ color: navTekstKleur, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
                {t('nav_login')}
              </a>
              <a href="/register" className="cs-btn" style={{ ...btnPrimaire, padding: '10px 22px', fontSize: 14 }}>
                {t('nav_register')}
              </a>
            </>
          )}
        </div>
      </nav>

      {/* ===== Hero : photo pro, double CTA et cartes flottantes de preuve ===== */}
      <header style={{
        position: 'relative', height: '100vh', minHeight: 680, display: 'flex', alignItems: 'flex-end', overflow: 'hidden',
        background: 'linear-gradient(160deg, #1c2317 0%, #2b3522 48%, #46553c 100%)',
      }}>
        <PhotoFond alt="ZZP-kok aan het werk in een professionele horecakeuken" />
        <Halos />
        {/* Voile de lisibilité : garantit le contraste du texte blanc, avec ou sans photo */}
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(24,30,21,0.82) 0%, rgba(24,30,21,0.30) 48%, rgba(24,30,21,0.44) 100%)' }} />

        {/* Cartes flottantes : note, vérification, disponibilité */}
        <ZweefKaart stijl={{ top: '38%', right: '16%' }}>
          <span style={{ width: 36, height: 36, borderRadius: 11, background: 'hsl(var(--accent))', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ico n="shield" s={17} c="#4c5e42" />
          </span>
          <div style={{ fontWeight: 700, fontSize: 13.5, letterSpacing: -0.2 }}>{t('fc_verified')}</div>
        </ZweefKaart>
        <ZweefKaart stijl={{ top: '53%', right: '5%' }}>
          <span style={{ width: 36, height: 36, borderRadius: 11, background: 'hsl(var(--accent))', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ico n="cal" s={17} c="#4c5e42" />
          </span>
          <div style={{ fontWeight: 700, fontSize: 13.5, letterSpacing: -0.2 }}>{t('fc_today')}</div>
        </ZweefKaart>

        <div className="cs-hero-pad" style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 1200, margin: '0 auto', padding: '0 24px 92px', color: '#fff' }}>
          <span className="cs-fade" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.3)', padding: '8px 18px', borderRadius: 999,
            fontSize: 12.5, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 22,
          }}>
            <Ico n="chef" s={14} /> {t('hero_badge')}
          </span>
          <h1 className="cs-fade cs-d1" style={{ fontSize: 'clamp(44px, 7vw, 86px)', fontWeight: 800, lineHeight: 1.01, letterSpacing: -2, maxWidth: '13ch', marginBottom: 22 }}>
            {t('hero_title_a')} <span style={{ color: '#cfdcba' }}>{t('hero_title_b')}</span>
          </h1>
          <p className="cs-fade cs-d2" style={{ fontSize: 17.5, maxWidth: '46ch', opacity: 0.92, marginBottom: 34, lineHeight: 1.65 }}>{t('hero_sub')}</p>
          <div className="cs-fade cs-d3" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {charge && user ? (
              <a href="/dashboard" className="cs-btn" style={btnPrimaire}>
                {t('nav_dashboard')} <Ico n="arrow" s={16} />
              </a>
            ) : (
              <>
                <a href="/register" className="cs-btn" style={btnPrimaire}>
                  {t('hero_cta_chef')} <Ico n="arrow" s={16} />
                </a>
                <a href="/shifts" className="cs-btn" style={{ background: 'rgba(255,255,255,0.14)', color: '#fff', border: '1px solid rgba(255,255,255,0.42)', backdropFilter: 'blur(6px)', padding: '15px 32px', borderRadius: 999, fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
                  {t('hero_cta_shift')}
                </a>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ===== Bandeau de confiance : segments desservis ===== */}
      <section aria-label={t('trust_over')} style={{ padding: '34px 24px', borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, flexWrap: 'wrap' }}>
          <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: 12.5, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>{t('trust_over')}</span>
          {[t('trust_1'), t('trust_2'), t('trust_3'), t('trust_4'), t('trust_5')].map((s) => (
            <span key={s} style={{ color: '#4c5e42', fontWeight: 800, fontSize: 15, letterSpacing: -0.2, padding: '8px 18px', background: 'hsl(var(--secondary))', borderRadius: 999, border: '1px solid hsl(var(--border))' }}>
              {s}
            </span>
          ))}
        </div>
      </section>

      {/* ===== Comment ça marche : double audience en timeline ===== */}
      <section id="hoe" className="cs-sec2" style={{ padding: '66px 24px 96px', maxWidth: 1200, margin: '0 auto', scrollMarginTop: 90 }}>
        <div style={kopStijl}>
          <span style={overStijl}>{t('steps_over')}</span>
          <h2 style={h2Stijl}>{t('steps_title')}</h2>
          <p style={subStijl}>{t('steps_sub')}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 26 }}>
          {[
            {
              label: t('hor_over'), icon: 'brief',
              stappen: [
                { t: t('how_r1_t'), d: t('how_r1_d') },
                { t: t('how_r2_t'), d: t('how_r2_d') },
                { t: t('how_r3_t'), d: t('how_r3_d') },
              ],
            },
            {
              label: t('how_kok_tab'), icon: 'chef',
              stappen: [
                { t: t('how_k1_t'), d: t('how_k1_d') },
                { t: t('how_k2_t'), d: t('how_k2_d') },
                { t: t('how_k3_t'), d: t('how_k3_d') },
              ],
            },
          ].map((groep) => (
            <div key={groep.label} className="cs-card" style={{ background: 'hsl(var(--card))', borderRadius: 22, border: '1px solid hsl(var(--border))', padding: '38px 32px', boxShadow: '0 3px 12px rgba(46,52,43,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
                <IcoTile n={groep.icon} s={20} />
                <h3 style={{ fontSize: 19, fontWeight: 800, letterSpacing: -0.4 }}>{groep.label}</h3>
              </div>
              <div style={{ display: 'grid', gap: 22 }}>
                {groep.stappen.map((e, i) => (
                  <div key={e.t} style={{ display: 'flex', gap: 15, position: 'relative' }}>
                    {/* Timeline verticale */}
                    {i < groep.stappen.length - 1 && (
                      <span aria-hidden="true" style={{ position: 'absolute', left: 19, top: 44, bottom: -18, width: 2, background: 'hsl(var(--border))' }} />
                    )}
                    <span style={{
                      width: 40, height: 40, flexShrink: 0, borderRadius: 13,
                      background: 'linear-gradient(135deg,#647a55,#46553c)', color: '#fff',
                      fontWeight: 800, fontSize: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 8px 18px -6px rgba(70,85,60,.5)', position: 'relative', zIndex: 1,
                    }}>
                      {i + 1}
                    </span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15.5, letterSpacing: -0.2, marginBottom: 4 }}>{e.t}</div>
                      <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{e.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Features : grille moderne ===== */}
      <section id="features" className="cs-sec2" style={{ padding: '0 24px 96px', maxWidth: 1200, margin: '0 auto', scrollMarginTop: 90 }}>
        <div style={kopStijl}>
          <span style={overStijl}>{t('why_over')}</span>
          <h2 style={h2Stijl}>{t('why_title')}</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 26 }}>
          {[
            { icon: 'bolt', t: t('feat1_t'), d: t('feat1_d') },
            { icon: 'shield', t: t('feat2_t'), d: t('feat2_d') },
            { icon: 'card', t: t('feat3_t'), d: t('feat3_d') },
            { icon: 'bank', t: t('feat4_t'), d: t('feat4_d') },
            { icon: 'award', t: t('feat5_t'), d: t('feat5_d') },
            { icon: 'bell', t: t('feat6_t'), d: t('feat6_d') },
            { icon: 'flame', t: t('feat9_t'), d: t('feat9_d') },
          ].map((c) => (
            <div key={c.t} className="cs-card" style={{ background: 'hsl(var(--card))', borderRadius: 20, border: '1px solid hsl(var(--border))', boxShadow: '0 3px 12px rgba(46,52,43,0.05)', padding: '32px 28px' }}>
              <div style={{ marginBottom: 18 }}><IcoTile n={c.icon} s={21} /></div>
              <h3 style={{ fontSize: 18.5, fontWeight: 800, marginBottom: 9, letterSpacing: -0.3 }}>{c.t}</h3>
              <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 14.5, lineHeight: 1.6 }}>{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Comparatif : ChefShift vs uitzendbureau ===== */}
      <section id="vergelijk" className="cs-sec2" style={{ padding: '0 24px 96px', maxWidth: 980, margin: '0 auto', scrollMarginTop: 90 }}>
        <div style={kopStijl}>
          <span style={overStijl}>{t('why_over')}</span>
          <h2 style={h2Stijl}>{t('cmp_title')}</h2>
          <p style={subStijl}>{t('cmp_sub')}</p>
        </div>
        <div className="cs-card" style={{ background: 'hsl(var(--card))', borderRadius: 22, border: '1px solid hsl(var(--border))', boxShadow: '0 3px 12px rgba(46,52,43,0.05)', overflow: 'hidden' }}>
          {/* En-tête */}
          <div className="cs-cmp-head" style={{ background: 'hsl(var(--secondary))', borderBottom: '1px solid hsl(var(--border))' }}>
            <div style={{ padding: '18px 22px' }} />
            <div style={{ padding: '18px 22px', color: 'hsl(var(--muted-foreground))', fontWeight: 700, fontSize: 13.5 }}>{t('cmp_col_a')}</div>
            <div style={{ padding: '18px 22px', fontWeight: 800, fontSize: 14.5, color: '#46553c', background: 'hsl(var(--accent))' }}>
              ChefShift
            </div>
          </div>
          {[
            { l: t('cmp_l1'), a: t('cmp_r1_a'), b: t('cmp_r1_b') },
            { l: t('cmp_l2'), a: t('cmp_r2_a'), b: t('cmp_r2_b') },
            { l: t('cmp_l3'), a: t('cmp_r3_a'), b: t('cmp_r3_b') },
            { l: t('cmp_l4'), a: t('cmp_r4_a'), b: t('cmp_r4_b') },
            { l: t('cmp_l5'), a: t('cmp_r5_a'), b: t('cmp_r5_b') },
            { l: t('cmp_l6'), a: t('cmp_r6_a'), b: t('cmp_r6_b') },
          ].map((r, i, arr) => (
            <div key={r.l} className="cs-cmp-row" style={{ borderBottom: i < arr.length - 1 ? '1px solid hsl(var(--border))' : 'none' }}>
              <div className="cs-cmp-label" style={{ padding: '17px 22px', fontWeight: 700, fontSize: 14, color: 'hsl(var(--foreground))' }}>{r.l}</div>
              <div className="cs-cmp-cel" data-kolom={t('cmp_col_a')} style={{ padding: '17px 22px', color: 'hsl(var(--muted-foreground))', fontSize: 13.5, lineHeight: 1.55, display: 'flex', gap: 9 }}>
                <span aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }}>✕</span>{r.a}
              </div>
              <div className="cs-cmp-cel cs-cmp-cel-cs" data-kolom="ChefShift" style={{ padding: '17px 22px', color: 'hsl(var(--foreground))', fontSize: 13.5, fontWeight: 600, lineHeight: 1.55, background: 'hsl(var(--accent))', display: 'flex', gap: 9 }}>
                <span style={{ flexShrink: 0, marginTop: 1 }}><Ico n="check" s={14} c="#4c5e42" /></span>{r.b}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Voor horeca : photo + arguments restaurants ===== */}
      <section id="horeca" className="cs-sec2" style={{ padding: '0 24px 96px', maxWidth: 1200, margin: '0 auto', scrollMarginTop: 90 }}>
        <div className="cs-card" style={{
          background: 'hsl(var(--card))', borderRadius: 24, border: '1px solid hsl(var(--border))',
          boxShadow: '0 3px 12px rgba(46,52,43,0.05)', overflow: 'hidden',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        }}>
          <img
            src={VIS_RESTO}
            alt="Restaurantzaal 's avonds, klaar voor de dinerservice"
            loading="lazy"
            style={{ width: '100%', height: '100%', minHeight: 320, objectFit: 'cover', display: 'block' }}
          />
          <div style={{ padding: '46px 42px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={overStijl}>{t('hor_over')}</span>
            <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 800, letterSpacing: -1.1, margin: '12px 0 12px' }}>{t('hor_title')}</h2>
            <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 15.5, lineHeight: 1.65, marginBottom: 24 }}>{t('hor_sub')}</p>
            <div style={{ display: 'grid', gap: 13, marginBottom: 30 }}>
              {[t('hor_p1'), t('hor_p2'), t('hor_p3'), t('hor_p4')].map((p) => (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 11, fontSize: 14.5, fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                  <span style={{ width: 27, height: 27, borderRadius: 9, background: 'hsl(var(--accent))', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Ico n="check" s={14} c="#4c5e42" />
                  </span>
                  {p}
                </div>
              ))}
            </div>
            <div>
              <a href={shiftCtaHref} className="cs-btn" style={btnPrimaire}>
                {t('hor_cta')} <Ico n="arrow" s={15} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Debut assume : ce que gagnent les premiers inscrits =====
           Remplace les temoignages. Sans utilisateurs, toute preuve sociale
           serait inventee ; assumer le demarrage convertit mieux. */}
      <section className="cs-sec2" style={{ padding: '0 24px 96px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={kopStijl}>
          <span style={overStijl}>{t('start_over')}</span>
          <h2 style={h2Stijl}>{t('start_title')}</h2>
          <p style={subStijl}>{t('start_sub')}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 26 }}>
          {[
            { n: '01', t: t('start1_t'), d: t('start1_d') },
            { n: '02', t: t('start2_t'), d: t('start2_d') },
            { n: '03', t: t('start3_t'), d: t('start3_d') },
          ].map((c) => (
            <div key={c.n} className="cs-card" style={{ background: 'hsl(var(--card))', borderRadius: 20, border: '1px solid hsl(var(--border))', boxShadow: '0 3px 12px rgba(46,52,43,0.05)', padding: '30px 28px' }}>
              <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2, color: 'hsl(var(--muted-foreground))' }}>{c.n}</div>
              <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: -0.3, margin: '10px 0 8px' }}>{c.t}</div>
              <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 14.5, lineHeight: 1.7, margin: 0 }}>{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== FAQ : accordéon accessible ===== */}
      <section id="faq" className="cs-sec2" style={{ padding: '0 24px 96px', maxWidth: 820, margin: '0 auto', scrollMarginTop: 90 }}>
        <div style={kopStijl}>
          <span style={overStijl}>{t('faq_over')}</span>
          <h2 style={h2Stijl}>{t('faq_title')}</h2>
        </div>
        <div style={{ display: 'grid', gap: 14 }}>
          {faqItems.map((f, i) => {
            const open = faqOpen === i
            return (
              <div key={f.q} className="cs-card" style={{ background: 'hsl(var(--card))', borderRadius: 18, border: '1px solid hsl(var(--border))', boxShadow: '0 3px 12px rgba(46,52,43,0.05)', overflow: 'hidden' }}>
                <button
                  type="button"
                  onClick={() => setFaqOpen(open ? null : i)}
                  aria-expanded={open}
                  aria-controls={`faq-paneel-${i}`}
                  style={{
                    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
                    padding: '22px 26px', background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: 16, fontWeight: 800, letterSpacing: -0.3, color: 'hsl(var(--foreground))', textAlign: 'left',
                  }}
                >
                  {f.q}
                  <span aria-hidden="true" style={{
                    width: 32, height: 32, flexShrink: 0, borderRadius: 10, background: open ? '#46553c' : '#eef2e6',
                    color: open ? '#fff' : '#4c5e42', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, fontWeight: 700, transition: 'background .25s ease, color .25s ease, transform .25s ease',
                    transform: open ? 'rotate(45deg)' : 'none',
                  }}>
                    +
                  </span>
                </button>
                <div
                  id={`faq-paneel-${i}`}
                  role="region"
                  style={{ maxHeight: open ? 300 : 0, overflow: 'hidden', transition: 'max-height .35s ease' }}
                >
                  <p style={{ padding: '0 26px 24px', margin: 0, color: 'hsl(var(--muted-foreground))', fontSize: 14.5, lineHeight: 1.7 }}>{f.a}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ===== Bannière CTA finale : double bouton ===== */}
      <section className="cs-sec2" style={{ padding: '0 24px 96px', maxWidth: 1200, margin: '0 auto' }}>
        <div className="cs-card" style={{
          position: 'relative', borderRadius: 28, overflow: 'hidden', padding: '84px 40px', textAlign: 'center', color: '#fff',
          border: '1px solid hsl(var(--border))', background: 'linear-gradient(135deg, #242c1f 0%, #38452c 55%, #55684a 100%)',
        }}>
          <PhotoFond />
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(36,44,31,0.80), rgba(70,85,60,0.70))' }} />
          <Halos />
          <div aria-hidden="true" style={{
            position: 'absolute', inset: 0, opacity: 0.45,
            backgroundImage: 'radial-gradient(rgba(207,220,186,0.14) 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }} />
          <div style={{ position: 'relative', zIndex: 2 }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: -1.2, marginBottom: 14 }}>{t('banner_title')}</h2>
            <p style={{ opacity: 0.9, marginBottom: 30, fontSize: 16.5 }}>{t('banner_sub')}</p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href={charge && user ? '/dashboard' : '/register'} className="cs-btn" style={{ background: '#fff', color: '#3f4d36', padding: '15px 34px', borderRadius: 999, fontWeight: 800, fontSize: 15, textDecoration: 'none' }}>
                {charge && user ? t('nav_dashboard') : t('banner_cta')} <Ico n="arrow" s={16} />
              </a>
              {!(charge && user) && (
                <a href="/register" className="cs-btn" style={{ background: 'rgba(255,255,255,0.14)', color: '#fff', border: '1px solid rgba(255,255,255,0.42)', backdropFilter: 'blur(6px)', padding: '15px 34px', borderRadius: 999, fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
                  {t('banner_cta2')}
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===== Contact ===== */}
      <section className="cs-sec2" style={{ padding: '0 24px 96px', maxWidth: 1200, margin: '0 auto' }}>
        <div className="cs-card" style={{ background: 'hsl(var(--card))', borderRadius: 20, border: '1px solid hsl(var(--border))', boxShadow: '0 3px 12px rgba(46,52,43,0.05)', padding: '44px 32px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><IcoTile n="msg" s={22} taille={56} /></div>
          <h2 style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 800, letterSpacing: -0.8, marginBottom: 10 }}>{t('contact_title')}</h2>
          <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 15, marginBottom: 24 }}>{t('contact_sub')}</p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="cs-btn" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'linear-gradient(135deg,#647a55,#46553c)', color: '#fff',
            padding: '14px 30px', borderRadius: 999, fontWeight: 700, fontSize: 15, textDecoration: 'none',
            boxShadow: '0 10px 22px -8px rgba(70,85,60,.5)',
          }}>
            {CONTACT_EMAIL}
          </a>
        </div>
      </section>

      {/* ===== Pied de page ===== */}
      <footer style={{ background: '#23281f', color: 'rgba(255,255,255,0.72)', padding: '64px 24px 30px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 22, marginBottom: 12, letterSpacing: -0.5 }}>Chef<span style={{ color: '#8a9a7b' }}>Shift</span></div>
          <p style={{ maxWidth: 360, marginBottom: 40, lineHeight: 1.6 }}>{t('footer_tag')}</p>
          {/* Maillage interne SEO : pages piliers + pages légales */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 24, fontSize: 13.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
            <span>{t('footer_rights')}<br /><span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{t('footer_legal')}</span></span>
            <span style={{ display: 'flex', gap: 22, flexWrap: 'wrap', alignItems: 'center' }}>
              <a href="/kok-inhuren" style={{ color: 'rgba(255,255,255,0.72)', textDecoration: 'none', fontWeight: 600 }}>Kok inhuren</a>
              <a href="/zzp-kok-worden" style={{ color: 'rgba(255,255,255,0.72)', textDecoration: 'none', fontWeight: 600 }}>ZZP-kok worden</a>
              <a href="/over-ons" style={{ color: 'rgba(255,255,255,0.72)', textDecoration: 'none', fontWeight: 600 }}>{t('footer_over')}</a>
              <a href="/shifts" style={{ color: 'rgba(255,255,255,0.72)', textDecoration: 'none', fontWeight: 600 }}>Shifts</a>
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'rgba(255,255,255,0.72)', textDecoration: 'none', fontWeight: 600 }}>{t('contact')}</a>
              <a href="/voorwaarden" style={{ color: 'rgba(255,255,255,0.72)', textDecoration: 'none', fontWeight: 600 }}>{t('terms_of')}</a>
              <a href="/privacy" style={{ color: 'rgba(255,255,255,0.72)', textDecoration: 'none', fontWeight: 600 }}>{t('privacy_of')}</a>
            </span>
          </div>
        </div>
      </footer>
    </main>
  )
}
