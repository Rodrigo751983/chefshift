import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  kvkSchema,
  btwSchema,
  emailSchema,
  nomSchema,
  registerSchema,
  codesErreur,
  messageNL,
} from '../src/lib/validation'

/** Retourne le code d'erreur d'un schéma, ou null si la valeur passe. */
function code(schema: { safeParse: (v: unknown) => any }, valeur: unknown): string | null {
  const r = schema.safeParse(valeur)
  return r.success ? null : r.error.issues[0].message
}

// ===== KvK : format =====

test('un KvK de 8 chiffres est accepte', () => {
  assert.equal(code(kvkSchema, '69599084'), null)
  assert.equal(kvkSchema.parse('69599084'), '69599084')
})

test('les espaces et points sont toleres puis retires', () => {
  assert.equal(kvkSchema.parse('6959 9084'), '69599084')
  assert.equal(kvkSchema.parse('69.599.084'), '69599084')
})

test('moins de 8 chiffres est refuse', () => {
  assert.equal(code(kvkSchema, '1234567'), 'KVK_FORMAT')
})

test('plus de 8 chiffres est refuse', () => {
  assert.equal(code(kvkSchema, '695990841'), 'KVK_FORMAT')
})

test('des lettres dans le KvK sont refusees', () => {
  assert.equal(code(kvkSchema, '6959908A'), 'KVK_FORMAT')
  assert.equal(code(kvkSchema, 'abcdefgh'), 'KVK_FORMAT')
})

test('un KvK vide est refuse', () => {
  assert.equal(code(kvkSchema, ''), 'KVK_REQUIRED')
})

// ===== KvK : suites evidentes =====

test('12345678 est refuse (suite croissante)', () => {
  assert.equal(code(kvkSchema, '12345678'), 'KVK_FAKE')
})

test('87654321 est refuse (suite decroissante)', () => {
  assert.equal(code(kvkSchema, '87654321'), 'KVK_FAKE')
})

test('23456789 est refuse (suite croissante decalee)', () => {
  assert.equal(code(kvkSchema, '23456789'), 'KVK_FAKE')
})

test('00000000 est refuse (chiffres identiques)', () => {
  assert.equal(code(kvkSchema, '00000000'), 'KVK_FAKE')
})

test('11111111 et 99999999 sont refuses', () => {
  assert.equal(code(kvkSchema, '11111111'), 'KVK_FAKE')
  assert.equal(code(kvkSchema, '99999999'), 'KVK_FAKE')
})

test('un numero qui contient une suite sans en etre une passe', () => {
  assert.equal(code(kvkSchema, '12345670'), null)
})

// ===== Btw-id =====

test('un btw-id valide est accepte et normalise', () => {
  assert.equal(btwSchema.parse('nl123456789b01'), 'NL123456789B01')
  assert.equal(btwSchema.parse('NL 123456789 B01'), 'NL123456789B01')
})

test('un btw-id malforme est refuse', () => {
  assert.equal(code(btwSchema, 'NL123456789'), 'BTW_FORMAT')
  assert.equal(code(btwSchema, 'BE123456789B01'), 'BTW_FORMAT')
  assert.equal(code(btwSchema, '123456789B01'), 'BTW_FORMAT')
  assert.equal(code(btwSchema, 'NL12345678B01'), 'BTW_FORMAT')
})

// ===== E-mail =====

test('un e-mail normal est accepte et mis en minuscules', () => {
  assert.equal(emailSchema.parse('  Jan@Bedrijf.NL '), 'jan@bedrijf.nl')
})

test('un e-mail malforme est refuse', () => {
  assert.equal(code(emailSchema, 'jan-bedrijf.nl'), 'EMAIL_FORMAT')
  assert.equal(code(emailSchema, 'jan@bedrijf'), 'EMAIL_FORMAT')
})

test('un domaine jetable est refuse', () => {
  assert.equal(code(emailSchema, 'jan@mailinator.com'), 'EMAIL_DISPOSABLE')
  assert.equal(code(emailSchema, 'jan@yopmail.com'), 'EMAIL_DISPOSABLE')
  assert.equal(code(emailSchema, 'jan@sub.mailinator.com'), 'EMAIL_DISPOSABLE')
})

// ===== Noms =====

test('un nom trop court ou trop long est refuse', () => {
  assert.equal(code(nomSchema, 'A'), 'NAME_TOO_SHORT')
  assert.equal(code(nomSchema, '   '), 'NAME_TOO_SHORT')
  assert.equal(code(nomSchema, 'x'.repeat(101)), 'NAME_TOO_LONG')
  assert.equal(code(nomSchema, 'Jan de Vries'), null)
})

// ===== Inscription complete =====

const baseKok = {
  email: 'jan@bedrijf.nl',
  password: 'geheim123',
  role: 'KOK',
  name: 'Jan de Vries',
  kvkNumber: '69599084',
}

test('une inscription de kok valide passe', () => {
  const r = registerSchema.safeParse(baseKok)
  assert.equal(r.success, true)
})

test('un token captcha absent ne bloque pas le schema (verifie cote serveur)', () => {
  const r = registerSchema.safeParse({ ...baseKok, turnstileToken: null })
  assert.equal(r.success, true)
})

test('une horeca sans raison sociale est refusee', () => {
  const r = registerSchema.safeParse({ ...baseKok, role: 'HORECA' })
  assert.equal(r.success, false)
  if (!r.success) {
    assert.equal(codesErreur(r.error).companyName, 'COMPANY_REQUIRED')
  }
})

test('un role inconnu retombe sur KOK, jamais ADMIN', () => {
  const r = registerSchema.safeParse({ ...baseKok, role: 'ADMIN' })
  assert.equal(r.success, true)
  if (r.success) assert.equal(r.data.role, 'KOK')
})

test('les erreurs sont aplaties par champ', () => {
  const r = registerSchema.safeParse({ ...baseKok, kvkNumber: '12345678', email: 'nope' })
  assert.equal(r.success, false)
  if (!r.success) {
    const codes = codesErreur(r.error)
    assert.equal(codes.kvkNumber, 'KVK_FAKE')
    assert.equal(codes.email, 'EMAIL_FORMAT')
  }
})

// ===== Traduction =====

test('chaque code a une phrase neerlandaise, avec repli', () => {
  assert.equal(messageNL('KVK_FAKE'), 'Dit KVK-nummer bestaat niet. Vul je echte nummer in.')
  assert.equal(messageNL('CODE_INCONNU'), messageNL('UNKNOWN'))
  assert.equal(messageNL(undefined), messageNL('UNKNOWN'))
})
