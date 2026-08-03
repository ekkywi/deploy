import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

export const SEALED_PREFIX = 'enc:v1:'

const KEY_BYTE_LENGTH = 32
const IV_BYTE_LENGTH = 12
const AUTH_TAG_BYTE_LENGTH = 16

function parseEncryptionKey(raw: string): Buffer {
  const trimmed = raw.trim()

  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex')
  }

  try {
    const asBase64 = Buffer.from(trimmed, 'base64')
    if (asBase64.length === KEY_BYTE_LENGTH) {
      return asBase64
    }
  } catch {
    // fall through to sha256 derivation
  }

  // Passphrase-style key: derive a stable 32-byte key.
  return createHash('sha256').update(trimmed, 'utf8').digest()
}

export function getEncryptionKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY?.trim()
  if (!raw) {
    throw new Error(
      'ENCRYPTION_KEY is not set. Add a strong secret to encrypt env vars and worker tokens at rest.'
    )
  }
  return parseEncryptionKey(raw)
}

export function hasEncryptionKey(): boolean {
  return Boolean(process.env.ENCRYPTION_KEY?.trim())
}

export function isSealed(value: string): boolean {
  return value.startsWith(SEALED_PREFIX)
}

/** Encrypt plaintext. Returns `enc:v1:<iv>.<tag>.<ciphertext>` (base64url parts). */
export function sealSecret(plaintext: string, key = getEncryptionKey()): string {
  const iv = randomBytes(IV_BYTE_LENGTH)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  return (
    SEALED_PREFIX +
    [
      iv.toString('base64url'),
      tag.toString('base64url'),
      encrypted.toString('base64url'),
    ].join('.')
  )
}

/** Decrypt a sealed value, or return plaintext unchanged (legacy rows). */
export function openSecret(stored: string, key = getEncryptionKey()): string {
  if (!isSealed(stored)) {
    return stored
  }

  const payload = stored.slice(SEALED_PREFIX.length)
  const [ivPart, tagPart, dataPart] = payload.split('.')
  if (!ivPart || !tagPart || !dataPart) {
    throw new Error('Invalid sealed secret format.')
  }

  const iv = Buffer.from(ivPart, 'base64url')
  const tag = Buffer.from(tagPart, 'base64url')
  const data = Buffer.from(dataPart, 'base64url')

  if (iv.length !== IV_BYTE_LENGTH || tag.length !== AUTH_TAG_BYTE_LENGTH) {
    throw new Error('Invalid sealed secret parameters.')
  }

  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()])
  return decrypted.toString('utf8')
}

/** Seal only if not already sealed (idempotent for migrations). */
export function sealSecretIfNeeded(plaintextOrSealed: string): string {
  if (isSealed(plaintextOrSealed)) {
    return plaintextOrSealed
  }
  return sealSecret(plaintextOrSealed)
}

export function hashToken(plaintext: string): string {
  return createHash('sha256').update(plaintext, 'utf8').digest('hex')
}
