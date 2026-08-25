'use client'

import { useEffect, useRef } from 'react'

// La site key est publique par nature : elle est lue par le navigateur.
// C'est TURNSTILE_SECRET_KEY, côté serveur uniquement, qui protège quoi que ce soit.
export const TURNSTILE_SITE_KEY = (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '').trim()

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string
      reset: (id: string) => void
      remove: (id: string) => void
    }
  }
}

const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

/**
 * Widget Cloudflare Turnstile.
 * Sans NEXT_PUBLIC_TURNSTILE_SITE_KEY le composant ne rend rien : le dev local
 * fonctionne sans compte Cloudflare, exactement comme le serveur qui laisse
 * passer quand la clé secrète est absente.
 *
 * `resetSignal` : incrémenter cette valeur remet le widget à zéro (un token
 * Turnstile est à usage unique — après un échec il faut en redemander un).
 */
export default function Turnstile({
  onToken,
  resetSignal = 0,
}: {
  onToken: (token: string | null) => void
  resetSignal?: number
}) {
  const conteneur = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)
  // Le callback passe par une ref : sinon un parent qui redéfinit la fonction
  // à chaque rendu ferait re-monter le widget en boucle.
  const rappel = useRef(onToken)
  rappel.current = onToken

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return
    let annule = false

    function rendre() {
      if (annule || !conteneur.current || widgetId.current || !window.turnstile) return
      widgetId.current = window.turnstile.render(conteneur.current, {
        sitekey: TURNSTILE_SITE_KEY,
        language: 'nl',
        callback: (token: string) => rappel.current(token),
        'expired-callback': () => rappel.current(null),
        'error-callback': () => rappel.current(null),
      })
    }

    if (window.turnstile) {
      rendre()
      return () => {
        annule = true
      }
    }

    let script = document.querySelector<HTMLScriptElement>('script[data-turnstile]')
    if (!script) {
      script = document.createElement('script')
      script.src = SRC
      script.async = true
      script.defer = true
      script.dataset.turnstile = '1'
      document.head.appendChild(script)
    }
    script.addEventListener('load', rendre)

    return () => {
      annule = true
      script?.removeEventListener('load', rendre)
    }
  }, [])

  useEffect(() => {
    if (resetSignal > 0 && widgetId.current && window.turnstile) {
      window.turnstile.reset(widgetId.current)
      rappel.current(null)
    }
  }, [resetSignal])

  if (!TURNSTILE_SITE_KEY) return null
  return <div ref={conteneur} style={{ marginBottom: 16 }} />
}
