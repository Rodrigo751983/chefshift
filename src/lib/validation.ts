import { z } from 'zod'

// ============================================================================
// Schémas de validation partagés entre l'API et les formulaires.
//
// Principe : les messages produits par zod sont des CODES stables en anglais
// (KVK_FORMAT, EMAIL_DISPOSABLE...). L'API les renvoie tels quels, le client
// les traduit via MESSAGES_NL. Un seul schéma, un seul jeu de règles, deux
// affichages — impossible que le front et le back divergent.
// ============================================================================

// ===== Helpers =====

/** Retire espaces, points et tirets : les gens tapent "1234 5678" ou "12.345.678". */
function compacter(v: string): string {
  return v.replace(/[\s.\-]/g, '')
}

/** 8 chiffres identiques : 00000000, 11111111, 99999999... */
function tousIdentiques(s: string): boolean {
  return /^(\d)\1+$/.test(s)
}

/**
 * Suite strictement croissante ou décroissante : 12345678, 87654321, 23456789.
 * On compare chaque chiffre au précédent — pas de liste en dur à maintenir.
 */
function estSequence(s: string): boolean {
  const d = s.split('').map(Number)
  const croissante = d.every((n, i) => i === 0 || n === d[i - 1] + 1)
  const decroissante = d.every((n, i) => i === 0 || n === d[i - 1] - 1)
  return croissante || decroissante
}

// ===== Domaines e-mail jetables =====
// Liste volontairement courte : elle attrape les plus courants sans devenir
// un fichier à maintenir. Un service dédié serait à envisager si le volume
// de faux comptes le justifie un jour.
export const DOMAINES_JETABLES = [
  'mailinator.com',
  'yopmail.com',
  'yopmail.fr',
  'guerrillamail.com',
  'guerrillamail.net',
  '10minutemail.com',
  'temp-mail.org',
  'tempmail.com',
  'throwawaymail.com',
  'trashmail.com',
  'getnada.com',
  'sharklasers.com',
] as const

function estJetable(email: string): boolean {
  const domaine = email.split('@')[1]?.toLowerCase() || ''
  return DOMAINES_JETABLES.some((d) => domaine === d || domaine.endsWith(`.${d}`))
}

// ============================================================================
// Champs
// ============================================================================

/**
 * KvK-nummer : exactement 8 chiffres (source : kvk.nl).
 * Attention — c'est une validation de FORMAT. Elle ne prouve pas que
 * l'entreprise existe au Handelsregister : voir verifierKvkExistence().
 */
export const kvkSchema = z
  .string({ required_error: 'KVK_REQUIRED', invalid_type_error: 'KVK_REQUIRED' })
  .transform(compacter)
  .refine((v) => v.length > 0, 'KVK_REQUIRED')
  .refine((v) => /^\d{8}$/.test(v), 'KVK_FORMAT')
  .refine((v) => !tousIdentiques(v), 'KVK_FAKE')
  .refine((v) => !estSequence(v), 'KVK_FAKE')

/**
 * Btw-id néerlandais : NL + 9 chiffres + B + 2 chiffres (ex. NL123456789B01).
 * Insensible à la casse, espaces et points ignorés, normalisé en majuscules.
 */
export const btwSchema = z
  .string({ required_error: 'BTW_REQUIRED', invalid_type_error: 'BTW_REQUIRED' })
  .transform((v) => compacter(v).toUpperCase())
  .refine((v) => v.length > 0, 'BTW_REQUIRED')
  .refine((v) => /^NL\d{9}B\d{2}$/.test(v), 'BTW_FORMAT')

/** Nom, prénom, raison sociale : 2 à 100 caractères une fois trimé. */
export const nomSchema = z
  .string({ required_error: 'NAME_REQUIRED', invalid_type_error: 'NAME_REQUIRED' })
  .transform((v) => v.trim())
  .refine((v) => v.length >= 2, 'NAME_TOO_SHORT')
  .refine((v) => v.length <= 100, 'NAME_TOO_LONG')

/** E-mail : même regex qu'avant + refus des domaines jetables. */
export const emailSchema = z
  .string({ required_error: 'EMAIL_REQUIRED', invalid_type_error: 'EMAIL_REQUIRED' })
  .transform((v) => v.trim().toLowerCase())
  .refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'EMAIL_FORMAT')
  .refine((v) => v.length <= 254, 'EMAIL_TOO_LONG')
  .refine((v) => !estJetable(v), 'EMAIL_DISPOSABLE')

export const motDePasseSchema = z
  .string({ required_error: 'PASSWORD_REQUIRED', invalid_type_error: 'PASSWORD_REQUIRED' })
  .min(8, 'PASSWORD_TOO_SHORT')
  .max(200, 'PASSWORD_TOO_LONG')

// ============================================================================
// Inscription
// ============================================================================

export const registerSchema = z
  .object({
    email: emailSchema,
    password: motDePasseSchema,
    // Le rôle n'est jamais accepté tel quel : tout ce qui n'est pas HORECA
    // devient KOK. ADMIN ne s'obtient que côté base.
    role: z.enum(['KOK', 'HORECA']).catch('KOK'),
    name: nomSchema,
    kvkNumber: kvkSchema,
    companyName: nomSchema.optional(),
    firstName: nomSchema.optional(),
    lastName: nomSchema.optional(),
    source: z.string().trim().max(50).optional().nullable(),
    turnstileToken: z.string().max(4096).optional().nullable(),
  })
  .superRefine((val, ctx) => {
    // Une zaak sans raison sociale n'a pas de sens sur une facture.
    if (val.role === 'HORECA' && !val.companyName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['companyName'],
        message: 'COMPANY_REQUIRED',
      })
    }
  })

export type DonneesInscription = z.infer<typeof registerSchema>

// ============================================================================
// Traduction des codes (UI en néerlandais)
// ============================================================================

export const MESSAGES_NL: Record<string, string> = {
  KVK_REQUIRED: 'Vul je KVK-nummer in.',
  KVK_FORMAT: 'Een KVK-nummer bestaat uit precies 8 cijfers.',
  KVK_FAKE: 'Dit KVK-nummer bestaat niet. Vul je echte nummer in.',
  BTW_REQUIRED: 'Vul je btw-id in.',
  BTW_FORMAT: 'Een btw-id ziet eruit als NL123456789B01.',
  NAME_REQUIRED: 'Vul je naam in.',
  NAME_TOO_SHORT: 'Naam is te kort (minimaal 2 tekens).',
  NAME_TOO_LONG: 'Naam is te lang (maximaal 100 tekens).',
  COMPANY_REQUIRED: 'Vul de naam van je zaak in.',
  EMAIL_REQUIRED: 'Vul je e-mailadres in.',
  EMAIL_FORMAT: 'Dit e-mailadres klopt niet.',
  EMAIL_TOO_LONG: 'Dit e-mailadres is te lang.',
  EMAIL_DISPOSABLE: 'Gebruik een vast e-mailadres, geen wegwerpadres.',
  PASSWORD_REQUIRED: 'Kies een wachtwoord.',
  PASSWORD_TOO_SHORT: 'Wachtwoord moet minimaal 8 tekens zijn.',
  PASSWORD_TOO_LONG: 'Wachtwoord is te lang.',
  CAPTCHA_REQUIRED: 'Bevestig even dat je geen robot bent.',
  CAPTCHA_INVALID: 'De controle is verlopen. Probeer het opnieuw.',
  EMAIL_ALREADY_REGISTERED: 'Dit e-mailadres is al geregistreerd.',
  RATE_LIMITED: 'Te veel pogingen. Probeer het over een uur opnieuw.',
  UNKNOWN: 'Er ging iets mis. Probeer het opnieuw.',
}

/** Code -> phrase néerlandaise, avec repli sur un message générique. */
export function messageNL(code: string | undefined): string {
  if (!code) return MESSAGES_NL.UNKNOWN
  return MESSAGES_NL[code] || MESSAGES_NL.UNKNOWN
}

/**
 * Aplatit les erreurs zod en { champ: CODE }, pour que le formulaire puisse
 * afficher l'erreur sous le bon champ plutôt qu'un message global.
 */
export function codesErreur(erreur: z.ZodError): Record<string, string> {
  const sortie: Record<string, string> = {}
  for (const issue of erreur.issues) {
    const champ = issue.path[0]
    if (typeof champ === 'string' && !sortie[champ]) {
      sortie[champ] = issue.message
    }
  }
  return sortie
}
