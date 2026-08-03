import { openSecret, sealSecret } from '@/lib/crypto/secret-box'

export function sealGitHttpsToken(plaintext: string): string {
  return sealSecret(plaintext.trim())
}

export function revealGitHttpsToken(stored: string | null | undefined): string | null {
  if (!stored) return null
  return openSecret(stored)
}

export function sealGitSshPrivateKey(plaintext: string): string {
  const trimmed = plaintext.trim()
  if (!trimmed.includes('PRIVATE KEY')) {
    throw new Error('Invalid SSH private key format.')
  }
  return sealSecret(trimmed.endsWith('\n') ? trimmed : `${trimmed}\n`)
}

export function revealGitSshPrivateKey(stored: string | null | undefined): string | null {
  if (!stored) return null
  return openSecret(stored)
}
