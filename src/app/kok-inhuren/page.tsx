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
    signup: 'Account aanmaken',
    label: 'Voor horecazaken',
    h1: 'Een kok inhuren zonder uitzendbureau',
    intro: 'Vanavond nog een kok in je keuken, morgen ook. Op ChefShift plaats je een shift in 1 minuut en kies je zelf welke geverifieerde zzp-kok er komt werken. Betaling loopt veilig via iDEAL, en geen match betekent geen kosten.',
    s1h: 'Waarom horecazaken zelf een kok inhuren via ChefShift',
    s1p: 'Het personeelstekort in de horeca is groot en uitzendbureaus rekenen vaak 25 tot 35% commissie bovenop het uurtarief. ChefShift werkt anders: je spreekt rechtstreeks met de kok af, zonder tussenpersoon. Daardoor houd je de kosten in de hand en weet je precies wie er in je keuken staat.',
    s1l: [
      'De eerste reacties op je shift komen gemiddeld binnen 2 uur binnen.',
      'Alle koks zijn geverifieerd op KvK en HACCP, met beoordelingen van andere zaken.',
      'Jij kiest zelf wie er komt werken, op basis van profiel, ervaring en tarief.',
      'Je betaalt pas na de shift. Geen match, geen kosten.',
    ],
    s2h: 'Zo werkt een kok inhuren via ChefShift',
    s2p: [
      ['1. Plaats je shift.', ' Vul de datum, de tijden, de functie (bijvoorbeeld chef de partie of saucier) en het uurtarief in. De shift is direct zichtbaar voor koks in heel Nederland. In een noodgeval markeer je de shift als urgent.'],
      ['2. Kies je kok.', ' Je ontvangt sollicitaties met profiel, werkervaring, specialiteiten en beoordelingen. Je vergelijkt rustig en kiest zelf wie er komt werken. Daarna staat de shift vast.'],
      ['3. Bevestig de uren en betaal.', ' Na de shift geef je de gewerkte eindtijd door. Je betaalt veilig via iDEAL en ontvangt direct een factuur met nummer en 21% btw-specificatie, klaar voor je administratie.'],
    ],
    s3h: 'Wat kost een zzp-kok inhuren?',
    s3p: 'De koks op ChefShift bepalen hun eigen tarief, met als minimum het wettelijk minimumuurloon. Ervaren zelfstandig werkende koks vragen meestal tussen €22 en €35 per uur, afhankelijk van de functie, de regio en de drukte. Omdat je geen uitzendcommissie betaalt, ben je per dienst vaak tientallen euro\u2019s goedkoper uit dan via een bureau.',
    s4h: 'Voor welke zaken werkt ChefShift?',
    s4p: 'Restaurants, hotels, brasseries, cateringbedrijven en evenementenlocaties gebruiken ChefShift voor zowel geplande diensten als last-minute uitval. Van een enkele avonddienst tot wekelijks terugkerende banqueting-shifts.',
    faq_h: 'Veelgestelde vragen over een kok inhuren',
    faq: [
      ['Hoe snel vind ik een kok via ChefShift?', 'De meeste shifts krijgen binnen 2 uur de eerste reacties van beschikbare koks. Bij een spoedshift kun je de shift als urgent markeren, dan krijgt hij extra zichtbaarheid.'],
      ['Zijn de koks op ChefShift geverifieerd?', 'Ja. Elke kok wordt gecontroleerd op KvK-inschrijving en kan zijn HACCP-certificering uploaden. Daarnaast zie je bij elke sollicitatie de ervaring en de beoordelingen van andere horecazaken.'],
      ['Wat kost het inhuren van een kok via ChefShift?', 'Je betaalt alleen de gewerkte uren tegen het afgesproken uurtarief, plus een kleine platformfee. Aanmelden en shifts plaatsen is gratis. Geen match, geen kosten: no cure, no pay.'],
      ['Wat als de kok niet komt opdagen?', 'Omdat de betaling pas na de shift plaatsvindt, betaal je niets als er niet gewerkt is. Je kunt direct een nieuwe urgent-shift plaatsen. Koks die niet komen opdagen krijgen een negatieve beoordeling en verdwijnen van het platform.'],
      ['Hoe zit het met de administratie en facturatie?', 'Alle afspraken, uren en betalingen lopen via het platform. Na elke betaalde shift staat de factuur automatisch klaar op je factuurpagina: met factuurnummer, gewerkte uren en 21% btw-specificatie. Je downloadt hem als PDF voor je boekhouding. Dat scheelt uren administratie.'],
    ],
    cta_t: 'Vanavond al een kok nodig?',
    cta_p: 'Plaats je shift in 1 minuut. Gemiddeld binnen 2 uur de eerste reacties.',
    cta_b: 'Plaats gratis een shift',
    outro: 'Zelf kok en op zoek naar werk? Lees dan verder op',
    outro_link: 'zzp-kok worden',
    outro2: 'of bekijk direct de',
    outro2_link: 'beschikbare shifts',
  },
  en: {
    signup: 'Sign up',
    label: 'For hospitality businesses',
    h1: 'Hire a chef without a temp agency',
    intro: 'A chef in your kitchen tonight, and tomorrow too. On ChefShift you post a shift in 1 minute and choose which verified freelance chef comes to work. Payment runs safely via iDEAL, and no match means no cost.',
    s1h: 'Why businesses hire chefs directly through ChefShift',
    s1p: 'The staff shortage in hospitality is real, and temp agencies often charge 25 to 35% commission on top of the hourly rate. ChefShift works differently: you deal with the chef directly, no middleman. That keeps costs under control and you know exactly who is in your kitchen.',
    s1l: [
      'The first responses to your shift usually arrive within 2 hours.',
      'All chefs are verified on KvK and HACCP, with reviews from other businesses.',
      'You choose who comes to work, based on profile, experience and rate.',
      'You only pay after the shift. No match, no cost.',
    ],
    s2h: 'How hiring a chef through ChefShift works',
    s2p: [
      ['1. Post your shift.', ' Enter the date, times, role (for example chef de partie or saucier) and the hourly rate. The shift is instantly visible to chefs across the Netherlands. In an emergency, mark it as urgent.'],
      ['2. Choose your chef.', ' You receive applications with profile, work experience, specialties and reviews. Compare at your own pace and choose who comes to work. Then the shift is locked in.'],
      ['3. Confirm the hours and pay.', ' After the shift you confirm the worked end time. You pay safely via iDEAL and instantly receive an invoice with a number and 21% VAT breakdown, ready for your administration.'],
    ],
    s3h: 'What does it cost to hire a freelance chef?',
    s3p: 'The chefs on ChefShift set their own rate, with the statutory minimum hourly wage as the floor. Experienced independent chefs usually charge between €22 and €35 per hour, depending on the role, the region and how busy it is. Because you pay no agency commission, you often save dozens of euros per shift compared to an agency.',
    s4h: 'Which businesses use ChefShift?',
    s4p: 'Restaurants, hotels, brasseries, catering companies and event venues use ChefShift for both planned services and last-minute dropouts. From a single evening shift to weekly recurring banqueting shifts.',
    faq_h: 'Frequently asked questions about hiring a chef',
    faq: [
      ['How fast will I find a chef through ChefShift?', 'Most shifts get their first responses from available chefs within 2 hours. For an urgent shift you can mark it as urgent, which gives it extra visibility.'],
      ['Are the chefs on ChefShift verified?', 'Yes. Every chef is checked for KvK registration and can upload their HACCP certification. You also see each applicant\u2019s experience and reviews from other businesses.'],
      ['What does it cost to hire a chef through ChefShift?', 'You only pay the worked hours at the agreed hourly rate, plus a small platform fee. Signing up and posting shifts is free. No match, no cost: no cure, no pay.'],
      ['What if the chef does not show up?', 'Because payment only happens after the shift, you pay nothing if no work was done. You can immediately post a new urgent shift. Chefs who do not show up get a negative review and disappear from the platform.'],
      ['How does administration and invoicing work?', 'All agreements, hours and payments run through the platform. After every paid shift the invoice is automatically ready on your invoices page: with an invoice number, worked hours and a 21% VAT breakdown. You download it as a PDF for your bookkeeping. That saves hours of admin.'],
    ],
    cta_t: 'Need a chef tonight?',
    cta_p: 'Post your shift in 1 minute. On average the first responses arrive within 2 hours.',
    cta_b: 'Post a shift for free',
    outro: 'A chef looking for work? Read more at',
    outro_link: 'zzp-kok worden',
    outro2: 'or browse the',
    outro2_link: 'available shifts',
  },
} as const

const h2s: React.CSSProperties = { fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 800, letterSpacing: -0.8, margin: '46px 0 14px' }
const ps: React.CSSProperties = { color: 'hsl(var(--muted-foreground))', fontSize: 16, lineHeight: 1.75, margin: '0 0 14px' }

export default function KokInhurenPage() {
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

        <h2 style={h2s}>{c.s4h}</h2>
        <p style={ps}>{c.s4p}</p>

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
          <a href="/shifts/new" style={{ background: '#fff', color: '#3f4d36', padding: '15px 34px', borderRadius: 999, fontWeight: 800, fontSize: 15, textDecoration: 'none', display: 'inline-block' }}>
            {c.cta_b}
          </a>
        </div>

        <p style={{ ...ps, marginTop: 36, fontSize: 14, color: 'hsl(var(--muted-foreground))' }}>
          {c.outro}{' '}
          <a href="/zzp-kok-worden" style={{ color: '#5f7052', fontWeight: 700 }}>{c.outro_link}</a>{' '}
          {c.outro2}{' '}
          <a href="/shifts" style={{ color: '#5f7052', fontWeight: 700 }}>{c.outro2_link}</a>.
        </p>
      </article>
    </main>
  )
}
