'use client'

import { useEffect, useState } from 'react'
import { LangToggle } from '@/lib/i18n'
import ThemeToggle from '@/components/ThemeToggle'

const FONT = '"Sora","Inter","Helvetica Neue",Arial,sans-serif'

type Lang = 'nl' | 'en'

// Lit la langue choisie sur le site (même mécanisme que lib/i18n)
function useLang(): Lang {
  const [lang, setLang] = useState<Lang>('nl')
  useEffect(() => {
    const lire = () => setLang(localStorage.getItem('chefshift-lang') === 'en' ? 'en' : 'nl')
    lire()
    window.addEventListener('chefshift-lang-change', lire)
    return () => window.removeEventListener('chefshift-lang-change', lire)
  }, [])
  return lang
}

const C = {
  nl: {
    signup: 'Gratis aanmelden',
    label: 'Voor koks',
    h1: 'ZZP-kok worden: werk waar en wanneer jij wilt',
    intro: 'Als zzp-kok bepaal je zelf welke shifts je werkt, bij welke restaurants en tegen welk tarief. Op ChefShift vind je keukens in heel Nederland zonder uitzendbureau ertussen. Gratis aanmelden kost 1 minuut.',
    s1h: 'Waarom steeds meer koks voor het zzp-leven kiezen',
    s1p: 'Vaste roosters en een salaris dat al jaren hetzelfde is: steeds meer koks kiezen voor vrijheid. Als zzp-kok combineer je shifts zoals het jou uitkomt. Extra bijverdienen naast je vaste baan, of juist fulltime zelfstandig aan de slag: het kan allebei.',
    s1l: [
      'Jij kiest welke shifts je werkt en welke je laat schieten.',
      'Je stelt zelf je uurtarief in, niemand anders.',
      'Er is geen uitzendbureau dat 25 tot 35% van je loon pakt.',
      'Je werkt in verschillende keukens en bouwt zo snel ervaring en een netwerk op.',
    ],
    s2h: 'Zo start je als zzp-kok op ChefShift',
    s2p: [
      ['1. Regel je KvK-inschrijving.', ' Als zelfstandig kok schrijf je je in bij de Kamer van Koophandel. Dat doe je online in ongeveer een kwartier.'],
      ['2. Maak je profiel compleet.', ' Vul je ervaring, functies en specialiteiten in en voeg je HACCP-certificering toe als je die hebt. Een compleet profiel krijgt tot 3x meer reacties van horecazaken.'],
      ['3. Reageer op shifts.', ' Bekijk het overzicht en reageer met jouw tarief op de shifts die bij jou passen. De zaak kiest, daarna staat de shift vast. Je krijgt een herinnering 24 uur en 2 uur voor aanvang.'],
      ['4. Werk en word betaald.', ' Na je shift geef je je eindtijd door. De zaak bevestigt en betaalt veilig via iDEAL. Jouw geld wordt daarna overgemaakt, en een kopie van de factuur vind je op je factuurpagina, handig voor je eigen boekhouding.'],
    ],
    s3h: 'Wat verdient een zzp-kok?',
    s3p: 'Jij bepaalt je tarief, met als minimum het wettelijk minimumuurloon. Ervaren zelfstandig werkende koks op ChefShift werken meestal voor €22 tot €35 per uur, afhankelijk van de functie en de regio. Bouw je een goede reputatie op met positieve beoordelingen, dan kun je je tarief stap voor stap verhogen.',
    faq_h: 'Veelgestelde vragen over zzp-kok worden',
    faq: [
      ['Heb ik een KvK-inschrijving nodig om als zzp-kok te werken?', 'Ja. Als zzp-kok werk je als zelfstandig ondernemer en daarvoor is een inschrijving bij de Kamer van Koophandel nodig. Die regel je online in ongeveer 15 minuten. Op ChefShift vragen we je KvK-nummer bij je profiel, zo weten horecazaken dat alles netjes geregeld is.'],
      ['Wat verdient een zzp-kok in Nederland?', 'Dat bepaal je grotendeels zelf. Op ChefShift stel je je eigen uurtarief in, met als minimum het wettelijk minimumuurloon. Ervaren zelfstandig werkende koks vragen meestal tussen €22 en €35 per uur. Veel koks verdienen €1.500 tot €3.000 per maand bij naast een vaste baan, en fulltime zzp-koks verdienen meer.'],
      ['Hoe en wanneer word ik betaald?', 'De horecazaak betaalt na de shift veilig via iDEAL. Jij geeft je gewerkte eindtijd door, de zaak bevestigt en daarna wordt je geld overgemaakt naar je rekening. De factuur van elke betaalde shift staat klaar op je factuurpagina, dus je administratie is zo bijgewerkt.'],
      ['Moet ik een HACCP-certificaat hebben?', 'HACCP is niet verplicht om je aan te melden, maar koks met een HACCP-certificering krijgen duidelijk meer en betere shifts. De meeste horecazaken vragen erom. Heb je hem nog niet, dan is dat een goede investering in jezelf.'],
      ['Kost ChefShift geld voor koks?', 'Nee. Aanmelden, een profiel maken en reageren op shifts is gratis voor koks. Je betaalt geen commissie zoals bij een uitzendbureau: wat je afspreekt, is wat je verdient.'],
    ],
    cta_t: 'Klaar voor je eerste shift?',
    cta_p: 'Gratis profiel in 1 minuut. Vandaag aangemeld, deze week aan het werk.',
    cta_b1: 'Maak gratis je profiel',
    cta_b2: 'Bekijk beschikbare shifts',
    outro: 'Horecazaak en op zoek naar een kok? Lees dan verder op',
    outro_link: 'kok inhuren',
  },
  en: {
    signup: 'Sign up free',
    label: 'For chefs',
    h1: 'Become a freelance chef: work where and when you want',
    intro: 'As a freelance chef you decide which shifts you work, at which restaurants and at what rate. On ChefShift you find kitchens across the Netherlands, with no temp agency in between. Signing up takes 1 minute and is free.',
    s1h: 'Why more and more chefs are going freelance',
    s1p: 'Fixed rosters and a salary that has barely moved in years: more and more chefs are choosing freedom. As a freelance chef you combine shifts however suits you. Earn extra alongside a permanent job, or go fully independent: both work.',
    s1l: [
      'You choose which shifts you take and which you skip.',
      'You set your own hourly rate, nobody else.',
      'There is no temp agency taking 25 to 35% of your pay.',
      'You work in different kitchens and build experience and a network fast.',
    ],
    s2h: 'How to start as a freelance chef on ChefShift',
    s2p: [
      ['1. Sort out your KvK registration.', ' As an independent chef you register with the Dutch Chamber of Commerce. You do it online in about 15 minutes.'],
      ['2. Complete your profile.', ' Add your experience, roles and specialties, plus your HACCP certification if you have it. A complete profile gets up to 3x more responses from businesses.'],
      ['3. Apply to shifts.', ' Browse the overview and respond with your rate to the shifts that suit you. The business chooses, then the shift is locked in. You get a reminder 24 hours and 2 hours before it starts.'],
      ['4. Work and get paid.', ' After your shift you report your end time. The business confirms and pays safely via iDEAL. Your money is then transferred, and a copy of the invoice is waiting on your invoices page, handy for your own bookkeeping.'],
    ],
    s3h: 'What does a freelance chef earn?',
    s3p: 'You set your own rate, with the statutory minimum hourly wage as the floor. Experienced independent chefs on ChefShift usually work for €22 to €35 per hour, depending on the role and the region. Build a good reputation with positive reviews and you can raise your rate step by step.',
    faq_h: 'Frequently asked questions about becoming a freelance chef',
    faq: [
      ['Do I need a KvK registration to work as a freelance chef?', 'Yes. As a freelance chef you work as an independent entrepreneur, which requires registration with the Dutch Chamber of Commerce (KvK). You arrange it online in about 15 minutes. On ChefShift we ask for your KvK number in your profile, so businesses know everything is properly arranged.'],
      ['What does a freelance chef earn in the Netherlands?', 'That is largely up to you. On ChefShift you set your own hourly rate, with the statutory minimum wage as the floor. Experienced independent chefs usually charge between €22 and €35 per hour. Many chefs earn €1,500 to €3,000 a month on the side, and full-time freelancers earn more.'],
      ['How and when do I get paid?', 'The business pays safely via iDEAL after the shift. You report your worked end time, the business confirms, and then your money is transferred to your account. The invoice for every paid shift is ready on your invoices page, so your admin is always up to date.'],
      ['Do I need a HACCP certificate?', 'HACCP is not required to sign up, but chefs with HACCP certification get clearly more and better shifts. Most businesses ask for it. If you do not have it yet, it is a good investment in yourself.'],
      ['Does ChefShift cost money for chefs?', 'No. Signing up, creating a profile and applying to shifts is free for chefs. You pay no commission like with a temp agency: what you agree is what you earn.'],
    ],
    cta_t: 'Ready for your first shift?',
    cta_p: 'Free profile in 1 minute. Signed up today, at work this week.',
    cta_b1: 'Create your free profile',
    cta_b2: 'Browse available shifts',
    outro: 'Run a hospitality business and looking for a chef? Read more at',
    outro_link: 'kok inhuren',
  },
} as const

const h2s: React.CSSProperties = { fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 800, letterSpacing: -0.8, margin: '46px 0 14px' }
const ps: React.CSSProperties = { color: 'hsl(var(--muted-foreground))', fontSize: 16, lineHeight: 1.75, margin: '0 0 14px' }

export default function ZzpKokWordenPage() {
  const lang = useLang()
  const c = C[lang]

  return (
    <main style={{ fontFamily: FONT, background: 'hsl(var(--background))', color: 'hsl(var(--foreground))', minHeight: '100vh' }}>
      <nav className="cs-nav" style={{ background: '#fff', borderBottom: '1px solid #e8ebe0', padding: '14px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <a href="/" style={{ fontWeight: 800, fontSize: 20, color: 'hsl(var(--foreground))', textDecoration: 'none', letterSpacing: -0.5 }}>
          Chef<span style={{ color: '#5f7052' }}>Shift</span>
        </a>
        <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <LangToggle />
          <ThemeToggle />
          <a href="/register" style={{ background: 'linear-gradient(135deg,#647a55,#46553c)', color: '#fff', padding: '10px 22px', borderRadius: 999, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
            {c.signup}
          </a>
        </span>
      </nav>

      <article style={{ maxWidth: 760, margin: '0 auto', padding: '64px 24px 96px' }}>
        <span style={{ color: '#5f7052', fontWeight: 800, fontSize: 12.5, letterSpacing: 2.5, textTransform: 'uppercase' }}>{c.label}</span>
        <h1 style={{ fontSize: 'clamp(34px, 5vw, 52px)', fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.08, margin: '14px 0 18px' }}>
          {c.h1}
        </h1>
        <p style={{ ...ps, fontSize: 18, color: 'hsl(var(--muted-foreground))' }}>{c.intro}</p>

        <h2 style={h2s}>{c.s1h}</h2>
        <p style={ps}>{c.s1p}</p>
        <ul style={{ paddingLeft: 22, margin: '0 0 14px', display: 'grid', gap: 8 }}>
          {c.s1l.map((z) => (
            <li key={z} style={{ color: 'hsl(var(--muted-foreground))', fontSize: 16, lineHeight: 1.75 }}>
              {z}
            </li>
          ))}
        </ul>

        <h2 style={h2s}>{c.s2h}</h2>
        {c.s2p.map(([t, d]) => (
          <p key={t} style={ps}>
            <strong>{t}</strong>
            {d}
          </p>
        ))}

        <h2 style={h2s}>{c.s3h}</h2>
        <p style={ps}>{c.s3p}</p>

        <h2 style={h2s}>{c.faq_h}</h2>
        <div style={{ display: 'grid', gap: 12, marginTop: 18 }}>
          {c.faq.map(([v, a]) => (
            <details key={v} style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 14, padding: '18px 20px' }}>
              <summary style={{ fontWeight: 700, fontSize: 15.5, cursor: 'pointer' }}>{v}</summary>
              <p style={{ ...ps, marginTop: 10, marginBottom: 0 }}>{a}</p>
            </details>
          ))}
        </div>

        <div style={{ marginTop: 52, background: 'linear-gradient(135deg, #242c1f 0%, #38452c 55%, #55684a 100%)', borderRadius: 24, padding: '48px 32px', textAlign: 'center', color: '#fff' }}>
          <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 800, letterSpacing: -1, margin: '0 0 12px' }}>
            {c.cta_t}
          </h2>
          <p style={{ opacity: 0.9, fontSize: 15.5, margin: '0 0 26px' }}>{c.cta_p}</p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/register" style={{ background: '#fff', color: '#3f4d36', padding: '15px 34px', borderRadius: 999, fontWeight: 800, fontSize: 15, textDecoration: 'none', display: 'inline-block' }}>
              {c.cta_b1}
            </a>
            <a href="/shifts" style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.42)', color: '#fff', padding: '15px 34px', borderRadius: 999, fontWeight: 700, fontSize: 15, textDecoration: 'none', display: 'inline-block' }}>
              {c.cta_b2}
            </a>
          </div>
        </div>

        <p style={{ ...ps, marginTop: 36, fontSize: 14, color: 'hsl(var(--muted-foreground))' }}>
          {c.outro}{' '}
          <a href="/kok-inhuren" style={{ color: '#5f7052', fontWeight: 700 }}>{c.outro_link}</a>.
        </p>
      </article>
    </main>
  )
}
