/**
 * Build an authenticated git remote URL for HTTPS clones without mutating stored repoUrl.
 * Username `x-access-token` works for GitHub; GitLab/Bitbucket accept token as password too.
 */
export function buildAuthenticatedHttpsRepoUrl(repoUrl: string, token: string): string {
  const trimmedToken = token.trim()
  if (!trimmedToken) {
    throw new Error('Git HTTPS token is empty.')
  }

  let parsed: URL
  try {
    parsed = new URL(repoUrl)
  } catch {
    throw new Error('Repository URL is not a valid HTTP(S) URL for token authentication.')
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(
      'HTTPS token authentication requires an http:// or https:// repository URL (not SSH).'
    )
  }

  parsed.username = 'x-access-token'
  parsed.password = trimmedToken
  return parsed.toString()
}

/** Strip credentials from a remote URL for safe logging. */
export function redactGitRemoteUrl(repoUrl: string): string {
  try {
    const parsed = new URL(repoUrl)
    if (parsed.password || parsed.username) {
      parsed.username = parsed.username ? '***' : ''
      parsed.password = parsed.password ? '***' : ''
    }
    return parsed.toString()
  } catch {
    return repoUrl.replace(/\/\/([^/@]+)@/g, '//***@')
  }
}

export function isHttpsOrHttpRepoUrl(repoUrl: string): boolean {
  try {
    const parsed = new URL(repoUrl)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}
