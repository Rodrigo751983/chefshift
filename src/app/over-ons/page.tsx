'use client'

import { useT, LangToggle } from '@/lib/i18n'
import ThemeToggle from '@/components/ThemeToggle'

const FONT = '"Sora","Inter","Helvetica Neue",Arial,sans-serif'

const h2: React.CSSProperties = { fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 800, letterSpacing: -0.8, margin: '46px 0 14px' }
const p: React.CSSProperties = { color: 'hsl(var(--muted-foreground))', fontSize: 16, lineHeight: 1.75, margin: '0 0 14px' }

export default function OverOnsPage() {
  const { t } = useT()

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
            {t('nav_register')}
          </a>
        </span>
      </nav>

      <article style={{ maxWidth: 760, margin: '0 auto', padding: '64px 24px 96px' }}>
        <span style={{ color: '#5f7052', fontWeight: 800, fontSize: 12.5, letterSpacing: 2.5, textTransform: 'uppercase' }}>{t('over_label')}</span>
        <h1 style={{ fontSize: 'clamp(34px, 5vw, 52px)', fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.08, margin: '14px 0 18px' }}>
          {t('over_title')}
        </h1>
        <p style={{ ...p, fontSize: 18, color: 'hsl(var(--muted-foreground))' }}>{t('over_intro')}</p>

        <h2 style={h2}>{t('over_why_h')}</h2>
        <p style={p}>{t('over_why_p1')}</p>
        <p style={p}>{t('over_why_p2')}</p>

        <h2 style={h2}>{t('over_bel_h')}</h2>
        <p style={p}><strong>{t('over_bel1_t')}</strong> {t('over_bel1_p')}</p>
        <p style={p}><strong>{t('over_bel2_t')}</strong> {t('over_bel2_p')}</p>
        <p style={p}><strong>{t('over_bel3_t')}</strong> {t('over_bel3_p')}</p>

        <h2 style={h2}>{t('over_who_h')}</h2>
        <p style={p}>{t('over_who_p1')}</p>
        <p style={p}>
          {t('over_who_p2')}{' '}
          <a href="mailto:info@chefshift.nl" style={{ color: '#5f7052', fontWeight: 700 }}>info@chefshift.nl</a>. {t('over_who_p3')}
        </p>

        <div style={{ marginTop: 52, background: 'linear-gradient(135deg, #242c1f 0%, #38452c 55%, #55684a 100%)', borderRadius: 24, padding: '48px 32px', textAlign: 'center', color: '#fff' }}>
          <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 800, letterSpacing: -1, margin: '0 0 12px' }}>
            {t('over_cta_t')}
          </h2>
          <p style={{ opacity: 0.9, fontSize: 15.5, margin: '0 0 26px' }}>{t('over_cta_p')}</p>
          <a href="/register" style={{ background: '#fff', color: '#3f4d36', padding: '15px 34px', borderRadius: 999, fontWeight: 800, fontSize: 15, textDecoration: 'none', display: 'inline-block' }}>
            {t('over_cta_b')}
          </a>
        </div>
      </article>
    </main>
  )
}
