// ============================================================================
// Cloudflare Turnstile — vérification côté serveur.
//
// Le widget côté client produit un token à usage unique. Ce token ne prouve
// rien tant que le serveur ne l'a pas soumis à /siteverify avec la clé
// secrète : sans cette étape, un bot poste simplement la requête sans passer
// par la page.
// ============================================================================

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export type ResultatCaptcha =
  | { ok: true; ignore?: boolean }
  | { ok: false; code: 'CAPTCHA_REQUIRED' | 'CAPTCHA_INVALID'; detail?: string }

/** Le captcha n'est actif que si la clé secrète est configurée. */
export function captchaActif(): boolean {
  return !!(process.env.TURNSTILE_SECRET_KEY || '').trim()
}

/**
 * Valide un token Turnstile.
 * Sans TURNSTILE_SECRET_KEY : laisse passer avec un warning, pour que le dev
 * local et les tests ne soient pas bloqués. En production la clé est présente,
 * donc la vérification s'applique réellement.
 */
export async function verifierTurnstile(
  token: string | null | undefined,
  ip?: string | null
): Promise<ResultatCaptcha> {
  const secret = (process.env.TURNSTILE_SECRET_KEY || '').trim()

  if (!secret) {
    console.warn(
      '[turnstile] TURNSTILE_SECRET_KEY absente : captcha desactive. ' +
        'A configurer sur Vercel avant la mise en production.'
    )
    return { ok: true, ignore: true }
  }

  if (!token) {
    return { ok: false, code: 'CAPTCHA_REQUIRED' }
  }

  try {
    const corps = new URLSearchParams({ secret, response: token })
    if (ip) corps.set('remoteip', ip)

    const res = await fetch(SITEVERIFY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: corps,
      signal: AbortSignal.timeout(5000),
    })

    const data = (await res.json()) as { success?: boolean; 'error-codes'?: string[] }
    if (data.success) return { ok: true }

    return {
      ok: false,
      code: 'CAPTCHA_INVALID',
      detail: (data['error-codes'] || []).join(','),
    }
  } catch (error) {
    // Cloudflare injoignable : on refuse plutôt que d'ouvrir la porte.
    // Un incident réseau vaut mieux qu'une vague de faux comptes.
    console.error('[turnstile] siteverify injoignable', error)
    return { ok: false, code: 'CAPTCHA_INVALID', detail: 'siteverify unreachable' }
  }
}
