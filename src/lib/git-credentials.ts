import { openSecret, sealSecret } from '@/lib/crypto/secret-box'

export function isHttpsGitRemote(repoUrl: string): boolean {
  try {
    const parsed = new URL(repoUrl)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

/**
 * Inject an HTTPS PAT into a clean repo URL for git clone / ls-remote.
 * Username `x-access-token` works for GitHub; GitLab/Bitbucket also accept token as password.
 */
export function withHttpsGitToken(repoUrl: string, token: string): string {
  const trimmedToken = token.trim()
  if (!trimmedToken) {
    throw new Error('Git HTTPS token is empty.')
  }

  let parsed: URL
  try {
    parsed = new URL(repoUrl)
  } catch {
    throw new Error('Repository URL is not a valid HTTP(S) URL for token auth.')
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(
      'HTTPS token auth requires an http(s) repository URL (not SSH git@…).'
    )
  }

  parsed.username = 'x-access-token'
  parsed.password = trimmedToken
  return parsed.toString()
}

/** Never log credentials — strip userinfo from git URLs. */
export function redactGitRemoteUrl(repoUrl: string): string {
  try {
    const parsed = new URL(repoUrl)
    parsed.username = ''
    parsed.password = ''
    return parsed.toString()
  } catch {
    return repoUrl.replace(/\/\/([^/@]+)@/, '//***@')
  }
}

export function sealGitHttpsToken(plaintext: string): string {
  return sealSecret(plaintext.trim())
}

export function revealGitHttpsToken(stored: string | null | undefined): string | null {
  if (!stored) return null
  return openSecret(stored)
}
