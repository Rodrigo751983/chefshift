'use client'
import { useT } from '../../lib/i18n'

const artikelen: Record<'nl' | 'en', { titre: string; tekst: string }[]> = {
  nl: [
    { titre: 'Artikel 1. Definities', tekst: 'In deze algemene voorwaarden wordt verstaan onder: "Platform": ChefShift, de online marktplaats voor freelance keukenpersoneel; "Opdrachtgever": een horecaonderneming die via het Platform een shift aanbiedt; "Zelfstandige" (kok): een zelfstandig ondernemer (ZZP\u2019er) die via het Platform opdrachten aanneemt; "Shift": een tijdelijke keukenopdracht met een bepaalde datum, tijdstip en uurtarief. Het Platform wordt geëxploiteerd door ChefShift, gevestigd aan de Fred. Roeskestraat 90, 1076 ED Amsterdam, Nederland, ingeschreven bij de Kamer van Koophandel onder nummer 91547261, btw-identificatienummer NL004899617B11 (info@chefshift.nl).' },
    { titre: 'Artikel 2. Rol van het Platform', tekst: 'ChefShift is uitsluitend een bemiddelingsplatform. ChefShift brengt Opdrachtgevers en Zelfstandigen bij elkaar en is zelf geen werkgever, uitzendbureau of partij in de overeenkomst van opdracht die tussen Opdrachtgever en Zelfstandige tot stand komt. ChefShift is niet verantwoordelijk voor de uitvoering van de werkzaamheden.' },
    { titre: 'Artikel 3. Account en registratie', tekst: 'Iedere gebruiker dient een account aan te maken met juiste en volledige gegevens. Zelfstandigen dienen te beschikken over een geldige KvK-inschrijving en btw-nummer en voeren deze zelf in op hun profiel. De gebruiker is verantwoordelijk voor het geheimhouden van zijn inloggegevens.' },
    { titre: 'Artikel 4. Totstandkoming van de opdracht', tekst: 'Een Opdrachtgever plaatst een shift op het Platform. Zelfstandigen kunnen solliciteren. Zodra de Opdrachtgever een Zelfstandige bevestigt, komt rechtstreeks tussen Opdrachtgever en Zelfstandige een overeenkomst van opdracht tot stand onder de voorwaarden van de shift (datum, tijdstip, uurtarief). Beide partijen zijn vrij in het aangaan of weigeren van een opdracht.' },
    { titre: 'Artikel 5. Tarieven en commissie', tekst: 'Het uurtarief wordt per shift afgesproken tussen Opdrachtgever en Zelfstandige. Over de factuurwaarde brengt ChefShift een bemiddelingscommissie van 15% in rekening. De commissie is vrijgesteld van omzetbelasting op grond van artikel 25 Wet op de omzetbelasting 1968 (kleineondernemersregeling). De commissie wordt zichtbaar verrekend bij de betaling via het Platform. Wijzigingen in het commissiepercentage kondigen wij minimaal 30 dagen vooraf aan per e-mail; voor reeds bevestigde shifts geldt het percentage op het moment van bevestiging.' },
    { titre: 'Artikel 6. Betaling en facturatie', tekst: 'Betaling verloopt via het Platform (o.a. iDEAL en creditcard via Stripe). Betaling is pas mogelijk nadat de shift is voltooid. De Zelfstandige machtigt ChefShift om namens en voor rekening van de Zelfstandige een factuur uit te reiken aan de Opdrachtgever (zelf-facturatie). Deze factuur vermeldt de naam, het KvK-nummer en het btw-nummer van de Zelfstandige. De Zelfstandige blijft zelf verantwoordelijk voor zijn fiscale verplichtingen en kan bezwaar maken tegen een uitgereikte factuur via info@chefshift.nl. Na betaling wordt het afgesproken bedrag, verminderd met de commissie, uitbetaald aan de Zelfstandige. ChefShift beheert geen gelden namens derden buiten de betaalstromen van de betaaldienstverlener.' },
    { titre: 'Artikel 7. Annulering', tekst: 'Een Opdrachtgever kan een bevestigde Zelfstandige deselecteren zolang de factuur nog niet is betaald; de shift wordt dan opnieuw geopend. Annuleringen kort voor aanvang van de shift kunnen leiden tot beperking van accountfuncties. Partijen worden geadviseerd annuleringen zo tijdig mogelijk te melden.' },
    { titre: 'Artikel 8. Verantwoordelijkheden van partijen', tekst: 'Opdrachtgever en Zelfstandige zijn zelf verantwoordelijk voor de juiste kwalificatie van hun samenwerking (Wet DBA). De Zelfstandige verklaart ondernemer te zijn in de zin van de Wet DBA en is verantwoordelijk voor eigen verzekeringen, belastingaangiften en eventuele AOV. De Opdrachtgever zorgt voor een veilige werkomgeving conform de Arbowet.' },
    { titre: 'Artikel 9. Aansprakelijkheid', tekst: 'ChefShift is niet aansprakelijk voor schade ontstaan door (het werk van) Zelfstandigen of door Opdrachtgevers, noch voor indirecte schade. De aansprakelijkheid van ChefShift is in alle gevallen beperkt tot het bedrag van de commissie die voor de betreffende shift is betaald.' },
    { titre: 'Artikel 10. Intellectueel eigendom', tekst: 'Alle rechten op het Platform, waaronder teksten, logo\u2019s en software, berusten bij ChefShift. Gebruikers krijgen een beperkt, niet-exclusief gebruiksrecht voor de duur van hun account.' },
    { titre: 'Artikel 11. Misbruik en beëindiging', tekst: 'Bij fraude, misbruik of schending van deze voorwaarden kan ChefShift accounts opschorten of verwijderen. Omzeiling van de commissie (rechtstreeks contracteren na bemiddeling) kan leiden tot uitsluiting van het Platform.' },
    { titre: 'Artikel 12. Toepasselijk recht', tekst: 'Op deze voorwaarden is Nederlands recht van toepassing. Geschillen worden voorgelegd aan de bevoegde rechter in Nederland. Indien een bepaling nietig blijkt, blijven de overige bepalingen onverkort van kracht.' }
  ],
  en: [
    { titre: 'Article 1. Definitions', tekst: 'In these terms and conditions: "Platform" means ChefShift, the online marketplace for freelance kitchen staff; "Client" means a hospitality business offering a shift via the Platform; "Freelancer" (chef) means a self-employed professional (ZZP\u2019er) accepting assignments via the Platform; "Shift" means a temporary kitchen assignment with a specific date, time and hourly rate. The Platform is operated by ChefShift, located at Fred. Roeskestraat 90, 1076 ED Amsterdam, the Netherlands, registered with the Dutch Chamber of Commerce under number 91547261, VAT identification number NL004899617B11 (info@chefshift.nl).' },
    { titre: 'Article 2. Role of the Platform', tekst: 'ChefShift is strictly an intermediary platform. ChefShift connects Clients and Freelancers and is itself not an employer, temporary employment agency, or a party to the service agreement concluded between Client and Freelancer. ChefShift is not responsible for the performance of the work.' },
    { titre: 'Article 3. Account and registration', tekst: 'Every user must create an account with accurate and complete information. Freelancers must hold a valid Dutch Chamber of Commerce (KvK) registration and VAT number, which they enter on their profile. Users are responsible for keeping their login credentials confidential.' },
    { titre: 'Article 4. Formation of the assignment', tekst: 'A Client posts a shift on the Platform. Freelancers may apply. Once the Client confirms a Freelancer, a service agreement is concluded directly between Client and Freelancer under the conditions of the shift (date, time, hourly rate). Both parties are free to enter into or decline an assignment.' },
    { titre: 'Article 5. Rates and commission', tekst: 'The hourly rate is agreed per shift between Client and Freelancer. ChefShift charges an intermediation commission of 15% on the invoice value. The commission is exempt from VAT pursuant to article 25 of the Dutch VAT Act 1968 (small businesses scheme, KOR). The commission is shown transparently during payment via the Platform. Changes to the commission rate are announced by email at least 30 days in advance; for shifts already confirmed, the rate at the moment of confirmation applies.' },
    { titre: 'Article 6. Payment and invoicing', tekst: 'Payments are processed via the Platform (including iDEAL and credit card via Stripe). Payment is only possible after the shift has been completed. The Freelancer authorises ChefShift to issue invoices to the Client in the name and on behalf of the Freelancer (self-billing). Each invoice states the Freelancer\u2019s name, KvK number and VAT number. The Freelancer remains responsible for their own tax obligations and may object to an issued invoice via info@chefshift.nl. After payment, the agreed amount minus the commission is paid out to the Freelancer. ChefShift does not hold funds on behalf of third parties outside the payment flows of the payment service provider.' },
    { titre: 'Article 7. Cancellation', tekst: 'A Client may deselect a confirmed Freelancer as long as the invoice has not been paid; the shift is then reopened. Cancellations shortly before the start of a shift may lead to restrictions on account features. Parties are advised to report cancellations as early as possible.' },
    { titre: 'Article 8. Responsibilities of the parties', tekst: 'Client and Freelancer are themselves responsible for the correct qualification of their collaboration (DBA Act). The Freelancer declares to be an entrepreneur within the meaning of the DBA Act and is responsible for their own insurances, tax filings and any disability insurance. The Client provides a safe working environment in accordance with the Dutch Working Conditions Act (Arbowet).' },
    { titre: 'Article 9. Liability', tekst: 'ChefShift is not liable for damage caused by (the work of) Freelancers or by Clients, nor for indirect damage. The liability of ChefShift is in all cases limited to the amount of the commission paid for the shift concerned.' },
    { titre: 'Article 10. Intellectual property', tekst: 'All rights to the Platform, including texts, logos and software, belong to ChefShift. Users receive a limited, non-exclusive right of use for the duration of their account.' },
    { titre: 'Article 11. Abuse and termination', tekst: 'In case of fraud, abuse or breach of these terms, ChefShift may suspend or delete accounts. Circumventing the commission (contracting directly after intermediation) may lead to exclusion from the Platform.' },
    { titre: 'Article 12. Applicable law', tekst: 'These terms are governed by Dutch law. Disputes will be submitted to the competent court in the Netherlands. If any provision proves invalid, the remaining provisions remain in full force.' }
  ]
}

const titres = {
  nl: { h1: 'Algemene voorwaarden', sub: 'ChefShift, platform voor freelance keukenpersoneel. Versie 1.5, 29 juli 2026.', disclaimer: 'Conceptversie: laat deze voorwaarden valideren door een jurist voordat je ze definitief publiceert.' },
  en: { h1: 'Terms & Conditions', sub: 'ChefShift, the marketplace for freelance kitchen staff. Version 1.5, July 29, 2026.', disclaimer: 'Draft version: have these terms validated by a lawyer before publishing them definitively.' }
}

const FONT = '"Sora","Inter","Helvetica Neue",Arial,sans-serif'

export default function VoorwaardenPage() {
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
