'use client'

import { useEffect, useState } from 'react'
import { useT, LangToggle } from '@/lib/i18n'
import ThemeToggle from '@/components/ThemeToggle'
import AnimStyles from '@/components/AnimStyles'
import { Ico, IcoStar } from '@/components/Icons'

const FONT = '"Sora","Inter","Helvetica Neue",Arial,sans-serif'

export default function ProfielHorecaPage() {
  const { t } = useT()
  const [chargement, setChargement] = useState(true)
  const [sauvegarde, setSauvegarde] = useState<'idle' | 'envoi' | 'ok' | 'erreur'>('idle')
  const [foutKvk, setFoutKvk] = useState(false)

  const [companyName, setCompanyName] = useState('')
  const [kvkNumber, setKvkNumber] = useState('')
  const [vatNumber, setVatNumber] = useState('')
  const [street, setStreet] = useState('')
  const [houseNumber, setHouseNumber] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [city, setCity] = useState('')
  const [province, setProvince] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactRole, setContactRole] = useState('')
  const [website, setWebsite] = useState('')
  const [description, setDescription] = useState('')
  const [avgScore, setAvgScore] = useState(0)
  const [nbReviews, setNbReviews] = useState(0)

  useEffect(() => {
    async function charger() {
      const s = await fetch('/api/auth/session').then((r) => r.json())
      if (!s?.user) {
        window.location.href = '/login'
        return
      }
      const res = await fetch('/api/profile-horeca')
      if (res.ok) {
        const data = await res.json()
        const p = data.profile
        if (p) {
          setCompanyName(p.companyName || '')
          setKvkNumber(p.kvkNumber || '')
          setVatNumber(p.vatNumber || '')
          setStreet(p.street || '')
          setHouseNumber(p.houseNumber || '')
          setPostalCode(p.postalCode || '')
          setCity(p.city || '')
          setProvince(p.province || '')
          setContactName(p.contactName || '')
          setContactRole(p.contactRole || '')
          setWebsite(p.website || '')
          setDescription(p.description || '')
          setAvgScore(p.averageScore || 0)
          setNbReviews(p.reviewCount || 0)
        }
      }
      setChargement(false)
    }
    charger()
  }, [])

  async function sauvegarder(e: React.FormEvent) {
    e.preventDefault()
    setSauvegarde('envoi')
    setFoutKvk(false)
    try {
      const res = await fetch('/api/profile-horeca', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName, kvkNumber, vatNumber,
          street, houseNumber, postalCode, city, province,
          contactName, contactRole, website, description,
        }),
      })
      setSauvegarde(res.ok ? 'ok' : 'erreur')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (data.champ === 'kvkNumber') setFoutKvk(true)
      }
      if (res.ok) setTimeout(() => setSauvegarde('idle'), 3000)
    } catch {
      setSauvegarde('erreur')
    }
  }

  const champ: React.CSSProperties = {
    width: '100%', padding: 11, border: '1.5px solid #e2e6d7', borderRadius: 12,
    fontSize: 14.5, outline: 'none', boxSizing: 'border-box', background: 'hsl(var(--card))', fontFamily: FONT,
  }
  const etiquette: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#3c4436' }
  const section: React.CSSProperties = {
    background: 'hsl(var(--card))', borderRadius: 20, border: '1px solid #eceee3',
    boxShadow: '0 3px 12px rgba(46,52,43,0.05)', padding: 28, marginBottom: 24,
  }
  const enteteSection: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }
  const titreSection: React.CSSProperties = { fontSize: 17, fontWeight: 800, letterSpacing: -0.3 }

  if (chargement) {
    return (
      <main style={{ fontFamily: FONT, background: 'hsl(var(--background))', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}>{t('dash_loading')}</p>
      </main>
    )
  }

  return (
    <main style={{ fontFamily: FONT, background: 'hsl(var(--background))', color: 'hsl(var(--foreground))', minHeight: '100vh' }}>
      <AnimStyles />
      <nav className="cs-nav" style={{
        background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #e8ebe0',
        padding: '13px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <a href="/dashboard" style={{ fontWeight: 800, fontSize: 20, color: 'hsl(var(--foreground))', textDecoration: 'none', letterSpacing: -0.5 }}>
          Chef<span style={{ color: '#5f7052' }}>Shift</span>
        </a>
        <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          <LangToggle />
          <ThemeToggle />
          <a href="/dashboard" className="cs-nav-link" style={{ color: '#5f7052', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
            {t('back_dashboard')}
          </a>
        </div>
      </nav>

      <form onSubmit={sauvegarder} className="cs-wrap" style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px' }}>
        <h1 className="cs-fade" style={{ fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 800, letterSpacing: -1.2 }}>{t('profile_title')}</h1>
        <p className="cs-fade cs-d1" style={{ color: 'hsl(var(--muted-foreground))', marginTop: 6, marginBottom: 20, fontSize: 15 }}>{t('profile_sub_horeca')}</p>

        {/* Notes reçues */}
        <div className="cs-fade cs-d1" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            {[1, 2, 3, 4, 5].map((i) => <IcoStar key={i} s={20} plein={i <= Math.round(avgScore)} />)}
          </span>
          <span style={{ fontWeight: 700, fontSize: 15 }}>
            {nbReviews > 0
              ? `${avgScore.toFixed(1)} · ${nbReviews} ${t('reviews')}`
              : t('no_reviews')}
          </span>
        </div>

        {/* Bedrijf */}
        <div className="cs-fade cs-d2" style={section}>
          <div style={enteteSection}>
            <Ico n="brief" s={20} />
            <h2 style={titreSection}>{t('section_company')}</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={etiquette}>{t('field_company')} *</label>
              <input required value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Restaurant Saffraan" style={champ} />
            </div>
            <div>
              <label style={etiquette}>{t('field_kvk')} *</label>
              <input required value={kvkNumber} onChange={(e) => setKvkNumber(e.target.value)} placeholder="12345678" style={{ ...champ, border: foutKvk ? '1.5px solid #c2410c' : champ.border }} />
              {foutKvk && (
                <p style={{ color: '#c2410c', fontSize: 12.5, fontWeight: 600, marginTop: 6 }}>{t('kvk_taken')}</p>
              )}
            </div>
            <div>
              <label style={etiquette}>{t('field_vat')}</label>
              <input value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} placeholder="NL123456789B01" style={champ} />
            </div>
            <div>
              <label style={etiquette}>{t('field_website')}</label>
              <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://www.restaurant.nl" style={champ} />
            </div>
          </div>
        </div>

        {/* Adres */}
        <div className="cs-fade cs-d3" style={section}>
          <div style={enteteSection}>
            <Ico n="pin" s={20} />
            <h2 style={titreSection}>{t('section_address')}</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={etiquette}>{t('field_street2')}</label>
              <input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Herengracht" style={champ} />
            </div>
            <div>
              <label style={etiquette}>{t('field_housenr')}</label>
              <input value={houseNumber} onChange={(e) => setHouseNumber(e.target.value)} placeholder="42" style={champ} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div>
              <label style={etiquette}>{t('field_postal')} *</label>
              <input required value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="1015 BA" style={champ} />
            </div>
            <div>
              <label style={etiquette}>{t('field_city')} *</label>
              <input required value={city} onChange={(e) => setCity(e.target.value)} placeholder="Amsterdam" style={champ} />
            </div>
            <div>
              <label style={etiquette}>{t('field_province')}</label>
              <input value={province} onChange={(e) => setProvince(e.target.value)} placeholder="Noord-Holland" style={champ} />
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="cs-fade cs-d4" style={section}>
          <div style={enteteSection}>
            <Ico n="user" s={20} />
            <h2 style={titreSection}>{t('field_contact')}</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={etiquette}>{t('field_name')}</label>
              <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Jan Jansen" style={champ} />
            </div>
            <div>
              <label style={etiquette}>{t('field_role')}</label>
              <input value={contactRole} onChange={(e) => setContactRole(e.target.value)} placeholder={t('field_role_ph')} style={champ} />
            </div>
          </div>
        </div>

        {/* Beschrijving */}
        <div className="cs-fade cs-d5" style={section}>
          <div style={enteteSection}>
            <Ico n="msg" s={20} />
            <h2 style={titreSection}>{t('field_description')}</h2>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder={t('profile_desc_ph')}
            style={{ ...champ, resize: 'vertical' }}
          />
        </div>

        <div className="cs-fade cs-d6" style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8 }}>
          <button
            type="submit"
            disabled={sauvegarde === 'envoi'}
            style={{
              padding: '13px 28px', borderRadius: 999, border: 'none', cursor: sauvegarde === 'envoi' ? 'wait' : 'pointer',
              background: '#5f7052', color: '#fff', fontWeight: 800, fontSize: 15, fontFamily: FONT,
              boxShadow: '0 4px 14px rgba(95,112,82,0.35)', opacity: sauvegarde === 'envoi' ? 0.7 : 1,
            }}
          >
            {sauvegarde === 'envoi' ? t('form_loading') : t('profile_save')}
          </button>
          {sauvegarde === 'ok' && <span style={{ color: '#4c5e42', fontWeight: 700, fontSize: 14 }}>{t('profile_saved')}</span>}
          {sauvegarde === 'erreur' && !foutKvk && <span style={{ color: '#c2410c', fontWeight: 700, fontSize: 14 }}>{t('profile_fail')}</span>}
        </div>
      </form>
    </main>
  )
}
