'use client'
import { useT } from '../../lib/i18n'

const artikelen: Record<'nl' | 'en', { titre: string; tekst: string }[]> = {
  nl: [
    { titre: 'Artikel 1. Wie zijn wij', tekst: 'ChefShift is het platform voor freelance keukenpersoneel in Nederland. Voor de verwerking van persoonsgegevens is ChefShift de verwerkingsverantwoordelijke in de zin van de Algemene Verordening Gegevensbescherming (AVG/GDPR). ChefShift is gevestigd aan de Fred. Roeskestraat 90, 1076 ED Amsterdam, Nederland, ingeschreven bij de Kamer van Koophandel onder nummer 91547261, btw-identificatienummer NL004899617B11. Contact: info@chefshift.nl.' },
    { titre: 'Artikel 2. Welke gegevens wij verzamelen', tekst: 'Wij verzamelen: accountgegevens (naam, e-mailadres, wachtwoord, rol); profielgegevens (specialiteiten, ervaring, tarief, KvK-nummer, btw-nummer, IBAN); bedrijfsgegevens (bedrijfsnaam, adres); shift- en sollicitatiegegevens; factuur- en betalingsgegevens; beoordelingen en berichten via het Platform.' },
    { titre: 'Artikel 3. Doeleinden van de verwerking', tekst: 'Wij gebruiken je gegevens voor: het aanmaken en beheren van je account; het bemiddelen tussen Opdrachtgevers en Zelfstandigen; het verwerken van betalingen en facturen; het versturen van meldingen over shifts en sollicitaties; het verbeteren en beveiligen van het Platform; het voldoen aan wettelijke verplichtingen (o.a. fiscale bewaarplicht).' },
    { titre: 'Artikel 4. Rechtsgronden', tekst: 'Wij verwerken persoonsgegevens op grond van: uitvoering van de overeenkomst (account, bemiddeling, betalingen); wettelijke verplichting (fiscale bewaartermijnen); gerechtvaardigd belang (veiligheid, fraudepreventie, platformverbetering); en waar nodig jouw toestemming.' },
    { titre: 'Artikel 5. Delen met derden', tekst: 'Wij delen gegevens alleen met: Stripe (betalingsverwerking, inclusief Stripe Connect voor uitbetalingen aan Zelfstandigen); hosting- en infrastructuurleveranciers; en overheidsinstanties wanneer wij daartoe wettelijk verplicht zijn. Wij verkopen nooit persoonsgegevens aan derden.' },
    { titre: 'Artikel 6. Bewaartermijnen', tekst: 'Account- en profielgegevens bewaren wij zolang je account actief is. Factuur- en betalingsgegevens bewaren wij 7 jaar conform de fiscale bewaarplicht. Beoordelingen blijven zichtbaar zolang het profiel bestaat. Na verwijdering van je account worden persoonsgegevens verwijderd of geanonimiseerd, behoudens wettelijke bewaarplicht.' },
    { titre: 'Artikel 7. Beveiliging', tekst: 'Wij nemen passende technische en organisatorische maatregelen: versleutelde verbindingen (HTTPS), versleuteld opgeslagen wachtwoorden, beperkte toegang tot persoonsgegevens en beveiligde betalingsverwerking via een gecertificeerde betaaldienstverlener.' },
    { titre: 'Artikel 8. Jouw rechten', tekst: 'Op grond van de AVG heb je recht op: inzage in je persoonsgegevens; rectificatie of verwijdering; beperking van de verwerking; dataportabiliteit; en bezwaar tegen verwerking. Verzoeken kun je indienen via je accountinstellingen of per e-mail; wij reageren binnen 30 dagen.' },
    { titre: 'Artikel 9. Cookies', tekst: 'Het Platform gebruikt uitsluitend functionele cookies en vergelijkbare technieken die noodzakelijk zijn voor het functioneren van de website (zoals inlogsessie en taalvoorkeur). Wij gebruiken geen tracking- of advertentiecookies.' },
    { titre: 'Artikel 10. Klachten', tekst: 'Heb je een klacht over de verwerking van je gegevens, neem dan eerst contact met ons op. Je hebt daarnaast het recht een klacht in te dienen bij de Autoriteit Persoonsgegevens (autoriteitpersoonsgegevens.nl).' },
    { titre: 'Artikel 11. Wijzigingen', tekst: 'Wij kunnen dit privacybeleid wijzigen. De meest recente versie staat altijd op deze pagina. Bij ingrijpende wijzigingen informeren wij actieve gebruikers per e-mail. Versie 1.1, 29 juli 2026.' }
  ],
  en: [
    { titre: 'Article 1. Who we are', tekst: 'ChefShift is the marketplace for freelance kitchen staff in the Netherlands. For the processing of personal data, ChefShift is the data controller within the meaning of the General Data Protection Regulation (GDPR). ChefShift is located at Fred. Roeskestraat 90, 1076 ED Amsterdam, the Netherlands, registered with the Dutch Chamber of Commerce under number 91547261, VAT identification number NL004899617B11. Contact: info@chefshift.nl.' },
    { titre: 'Article 2. What data we collect', tekst: 'We collect: account data (name, email address, password, role); profile data (specialties, experience, rate, KvK number, VAT number, IBAN); business data (company name, address); shift and application data; invoice and payment data; reviews and messages sent via the Platform.' },
    { titre: 'Article 3. Purposes of processing', tekst: 'We use your data for: creating and managing your account; intermediation between Clients and Freelancers; processing payments and invoices; sending notifications about shifts and applications; improving and securing the Platform; and complying with legal obligations (including tax retention requirements).' },
    { titre: 'Article 4. Legal bases', tekst: 'We process personal data on the basis of: performance of the contract (account, intermediation, payments); legal obligation (tax retention periods); legitimate interest (security, fraud prevention, platform improvement); and, where required, your consent.' },
    { titre: 'Article 5. Sharing with third parties', tekst: 'We only share data with: Stripe (payment processing, including Stripe Connect for payouts to Freelancers); hosting and infrastructure providers; and public authorities where we are legally required to do so. We never sell personal data to third parties.' },
    { titre: 'Article 6. Retention periods', tekst: 'Account and profile data is kept while your account is active. Invoice and payment data is retained for 7 years in accordance with tax retention obligations. Reviews remain visible while the profile exists. After deletion of your account, personal data is deleted or anonymised, except where legal retention obligations apply.' },
    { titre: 'Article 7. Security', tekst: 'We take appropriate technical and organisational measures: encrypted connections (HTTPS), encrypted storage of passwords, restricted access to personal data, and secure payment processing via a certified payment service provider.' },
    { titre: 'Article 8. Your rights', tekst: 'Under the GDPR you have the right to: access your personal data; rectification or deletion; restriction of processing; data portability; and objection to processing. You can submit requests via your account settings or by email; we respond within 30 days.' },
    { titre: 'Article 9. Cookies', tekst: 'The Platform only uses functional cookies and similar techniques that are necessary for the website to function (such as login session and language preference). We do not use tracking or advertising cookies.' },
    { titre: 'Article 10. Complaints', tekst: 'If you have a complaint about the processing of your data, please contact us first. You also have the right to file a complaint with the Dutch Data Protection Authority (Autoriteit Persoonsgegevens, autoriteitpersoonsgegevens.nl).' },
    { titre: 'Article 11. Changes', tekst: 'We may amend this privacy policy. The most recent version is always available on this page. In case of significant changes, we will inform active users by email. Version 1.1, July 29, 2026.' }
  ]
}

const titres = {
  nl: { h1: 'Privacybeleid', sub: 'ChefShift, hoe wij met je gegevens omgaan. Versie 1.1, 29 juli 2026.', disclaimer: 'Conceptversie: laat dit privacybeleid valideren door een jurist voordat je het definitief publiceert.' },
  en: { h1: 'Privacy Policy', sub: 'ChefShift, how we handle your data. Version 1.1, July 29, 2026.', disclaimer: 'Draft version: have this privacy policy validated by a lawyer before publishing it definitively.' }
}

const FONT = '"Sora","Inter","Helvetica Neue",Arial,sans-serif'

export default function PrivacyPage() {
  const { lang } = useT()
  const l = lang === 'en' ? 'en' : 'nl'
  const lijst = artikelen[l]
  const t = titres[l]
  return (
    <main style={{ minHeight: '100vh', background: 'hsl(var(--background))', fontFamily: FONT, color: 'hsl(var(--foreground))', padding: '48px 20px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <a href="/" style={{ color: '#5f7052', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>← ChefShift</a>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: '18px 0 6px', letterSpacing: '-0.5px' }}>{t.h1}</h1>
        <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 14, margin: '0 0 28px' }}>{t.sub}</p>
        <div style={{ background: '#fffdf4', border: '1px solid #efe7c8', borderRadius: 14, padding: '14px 18px', fontSize: 13.5, color: '#8a7320', marginBottom: 28 }}>{t.disclaimer}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {lijst.map((a) => (
            <section key={a.titre} style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 16, padding: '20px 24px', boxShadow: '0 1px 2px rgba(35,40,31,0.04)' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px', color: '#46553c' }}>{a.titre}</h2>
              <p style={{ fontSize: 14.5, lineHeight: 1.7, color: 'hsl(var(--muted-foreground))', margin: 0 }}>{a.tekst}</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
