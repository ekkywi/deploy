import { openSecret, sealSecret } from '@/lib/crypto/secret-box'

export function sealGitHttpsToken(plaintext: string): string {
  return sealSecret(plaintext.trim())
}

export function revealGitHttpsToken(stored: string | null | undefined): string | null {
  if (!stored) return null
  return openSecret(stored)
}
