'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useT, LangToggle } from '@/lib/i18n'
import AnimStyles from '@/components/AnimStyles'
import { Ico } from '@/components/Icons'
import Turnstile, { TURNSTILE_SITE_KEY } from '@/components/Turnstile'
import { registerSchema, codesErreur, messageNL } from '@/lib/validation'

const FONT = '"Sora","Inter","Helvetica Neue",Arial,sans-serif'

const sources = ['google', 'facebook', 'linkedin', 'doorverwezen', 'anders']

export default function RegisterPage() {
  const { t } = useT()
  const [name, setName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [kvkNumber, setKvkNumber] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [source, setSource] = useState('')
  const [role, setRole] = useState<'HORECA' | 'KOK'>('KOK')
  const [akkoord, setAkkoord] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  // Incremente a chaque echec : un token Turnstile ne sert qu'une fois.
  const [resetCaptcha, setResetCaptcha] = useState(0)

  function echec(message: string) {
    setError(message)
    setLoading(false)
    // Le widget doit etre rejoue : son token vient d'etre consomme ou refuse.
    setResetCaptcha((n) => n + 1)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!akkoord) {
      setError(t('terms_required'))
      return
    }

    const charge = {
      name,
      email,
      password,
      role,
      firstName: name,
      kvkNumber,
      source: source || null,
      turnstileToken: captchaToken,
      ...(role === 'HORECA' ? { companyName: companyName || name } : {}),
    }

    // Meme schema que l'API : le message affiche ici est celui que le serveur
    // aurait renvoye, donc pas de divergence possible entre les deux cotes.
    const verif = registerSchema.safeParse(charge)
    if (!verif.success) {
      const codes = codesErreur(verif.error)
      setError(messageNL(Object.values(codes)[0]))
      return
    }

    // Le captcha n'est exige que s'il est configure (dev local sans cle : ignore).
    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setError(messageNL('CAPTCHA_REQUIRED'))
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(charge),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const code =
          data?.error === 'VALIDATION_FAILED'
            ? Object.values(data?.champs || {})[0]
            : data?.error
        echec(messageNL(typeof code === 'string' ? code : undefined))
        return
      }
      const login = await signIn('credentials', { email, password, redirect: false })
      if (login?.error) {
        window.location.href = '/login'
      } else {
        window.location.href = '/dashboard'
      }
    } catch {
      echec(t('register_error'))
    }
  }

  const champ = {
    width: '100%', padding: 12, border: '1.5px solid #e2e6d7', borderRadius: 12,
    fontSize: 15, outline: 'none', boxSizing: 'border-box' as const, background: 'hsl(var(--card))', fontFamily: FONT,
  }
  const etiquette = { display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#3c4436' }

  return (
    <main style={{ fontFamily: FONT, background: 'hsl(var(--background))', color: 'hsl(var(--foreground))', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AnimStyles />

      <nav style={{ padding: '22px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <a href="/" style={{ fontWeight: 800, fontSize: 20, color: 'hsl(var(--foreground))', textDecoration: 'none', letterSpacing: -0.5 }}>
          Chef<span style={{ color: '#5f7052' }}>Shift</span>
        </a>
        <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          <LangToggle />
          <a href="/login" style={{ color: '#5f7052', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
            {t('register_have')}
          </a>
        </div>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="cs-pop cs-auth" style={{
          background: 'hsl(var(--card))', width: '100%', maxWidth: 440, padding: 42,
          borderRadius: 22, border: '1px solid #eceee3',
          boxShadow: '0 18px 44px -16px rgba(46,52,43,0.18)',
        }}>
          <h1 style={{ fontSize: 27, fontWeight: 800, letterSpacing: -0.9, marginBottom: 6 }}>{t('register_title')}</h1>
          <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 14.5, marginBottom: 28 }}>{t('register_sub')}</p>

          {/* Choix du rôle */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            {([
              { valeur: 'KOK' as const, titre: t('role_kok_t'), desc: t('role_kok_d'), icone: 'chef' },
              { valeur: 'HORECA' as const, titre: t('role_horeca_t'), desc: t('role_horeca_d'), icone: 'brief' },
            ]).map((o) => (
              <button
                key={o.valeur} type="button"
                onClick={() => setRole(o.valeur)}
                className="cs-seg"
                data-active={role === o.valeur}
                style={{
                  flex: 1, padding: '14px 12px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                  border: role === o.valeur ? '2px solid #5f7052' : '1.5px solid #e2e6d7',
                  background: role === o.valeur ? '#f0f4ea' : '#fff',
                  fontFamily: FONT, transition: 'border-color .2s ease, background .2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 800, fontSize: 15, color: 'hsl(var(--foreground))' }}>
                  <Ico n={o.icone} s={16} c="#5f7052" /> {o.titre}
                </div>
                <div style={{ fontSize: 12.5, color: 'hsl(var(--muted-foreground))', marginTop: 3 }}>{o.desc}</div>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={etiquette}>{role === 'HORECA' ? t('field_contact') : t('field_name')}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required
                placeholder="Jan de Vries" style={champ} />
            </div>

            {role === 'HORECA' && (
              <div style={{ marginBottom: 16 }}>
                <label style={etiquette}>{t('field_company')}</label>
                <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required
                  placeholder="Restaurant De Gouden Lepel" style={champ} />
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={etiquette}>{t('field_kvk')}</label>
              <input value={kvkNumber} onChange={(e) => setKvkNumber(e.target.value)} required
                placeholder="8 cijfers" style={champ} />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={etiquette}>{t('source_label')}</label>
              <select value={source} onChange={(e) => setSource(e.target.value)} style={{ ...champ, cursor: 'pointer' }}>
                <option value="">{t('source_choose')}</option>
                {sources.map((s) => (
                  <option key={s} value={s}>{t(`source_${s}` as any)}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={etiquette}>{t('field_email')}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                placeholder="naam@bedrijf.nl" style={champ} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={etiquette}>{t('field_password')}</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                minLength={8} placeholder="Minimaal 8 tekens" style={champ} />
            </div>

            {/* Acceptation des CGV */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 18, cursor: 'pointer', fontSize: 13.5, color: '#4a5048', lineHeight: 1.5 }}>
              <input type="checkbox" checked={akkoord} onChange={(e) => setAkkoord(e.target.checked)} style={{ width: 17, height: 17, marginTop: 2 }} />
              <span>
                {t('terms_agree')}{' '}
                <a href="/voorwaarden" target="_blank" style={{ color: '#5f7052', fontWeight: 700 }}>{t('terms_of')}</a>
                {' & '}
                <a href="/privacy" target="_blank" style={{ color: '#5f7052', fontWeight: 700 }}>{t('privacy_of')}</a>
              </span>
            </label>

            <Turnstile onToken={setCaptchaToken} resetSignal={resetCaptcha} />

            {error && (
              <p style={{ color: '#b91c1c', fontSize: 13.5, marginBottom: 16, background: '#fef2f2', padding: '10px 14px', borderRadius: 10, fontWeight: 600 }}>
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="cs-btn" style={{
              width: '100%', padding: 14, background: 'linear-gradient(135deg,#647a55,#46553c)', color: '#fff',
              border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, fontFamily: FONT,
              cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
              boxShadow: '0 10px 22px -8px rgba(70,85,60,.5)',
            }}>
              {loading ? t('form_loading') : t('form_submit')}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
