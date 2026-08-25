// ============================================================================
// Vérification d'existence d'un KvK-nummer au Handelsregister.
//
// À ne pas confondre avec la validation de format (src/lib/validation.ts) :
// "12345679" a le bon format et n'existe probablement pas ; seul le registre
// de la KVK peut le dire.
//
// L'API KVK est un produit payant. Tant qu'aucune clé n'est configurée, cette
// fonction répond 'non_verifie' — le point d'accroche existe, le branchement
// se fera plus tard sans toucher aux appelants.
// ============================================================================

export type StatutKvk = 'non_verifie' | 'trouve' | 'introuvable' | 'erreur'

export type ResultatKvk = {
  statut: StatutKvk
  /** Raison sociale renvoyée par le registre, si trouvée. */
  handelsnaam?: string
  /** Détail technique, pour les logs — jamais affiché au client. */
  detail?: string
}

const BASE_URL = 'https://api.kvk.nl/api/v2/zoeken'

/**
 * Interroge le Handelsregister. Ne lève jamais : un registre indisponible ne
 * doit pas empêcher quelqu'un de s'inscrire.
 */
export async function verifierKvkExistence(nummer: string): Promise<ResultatKvk> {
  const cle = (process.env.KVK_API_KEY || '').trim()
  if (!cle) {
    return { statut: 'non_verifie', detail: 'KVK_API_KEY absente' }
  }

  try {
    const url = `${BASE_URL}?kvkNummer=${encodeURIComponent(nummer)}`
    const res = await fetch(url, {
      headers: { apikey: cle },
      // Le registre ne doit jamais faire attendre l'inscription.
      signal: AbortSignal.timeout(4000),
    })

    if (res.status === 404) return { statut: 'introuvable' }
    if (!res.ok) return { statut: 'erreur', detail: `HTTP ${res.status}` }

    const data = (await res.json()) as { resultaten?: { handelsnaam?: string }[] }
    const premier = data.resultaten?.[0]
    if (!premier) return { statut: 'introuvable' }

    return { statut: 'trouve', handelsnaam: premier.handelsnaam }
  } catch (error) {
    return { statut: 'erreur', detail: String(error) }
  }
}
