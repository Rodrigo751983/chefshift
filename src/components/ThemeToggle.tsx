'use client'

import { useEffect, useState } from 'react'

// Bouton de bascule clair / sombre.
// Le thème est appliqué très tôt par le script anti-flash du layout (data-theme sur <html>).
// `clair` : icône blanche, pour les barres de navigation posées sur le hero sombre.
export default function ThemeToggle({ clair }: { clair?: boolean }) {
  const [dark, setDark] = useState(false)
  const [monte, setMonte] = useState(false)

  useEffect(() => {
    setDark(document.documentElement.getAttribute('data-theme') === 'dark')
    setMonte(true)
  }, [])

  function basculer() {
    const suivant = !dark
    setDark(suivant)
    document.documentElement.setAttribute('data-theme', suivant ? 'dark' : 'light')
    try {
      localStorage.setItem('chefshift-theme', suivant ? 'dark' : 'light')
    } catch {}
  }

  // Évite tout décalage d'hydratation : on ne fige l'icône qu'après le montage client.
  const label = dark ? 'Schakel naar lichte modus' : 'Schakel naar donkere modus'

  return (
    <button
      type="button"
      onClick={basculer}
      aria-label={label}
      title={label}
      className="cs-btn"
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 4,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: clair ? '#fff' : 'hsl(var(--foreground))',
        opacity: monte ? 1 : 0,
        transition: 'opacity .2s ease, color .2s ease',
      }}
    >
      {dark ? (
        // Soleil
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        // Lune
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  )
}
