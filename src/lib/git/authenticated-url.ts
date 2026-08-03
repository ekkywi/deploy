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

export function isSshGitRepoUrl(repoUrl: string): boolean {
  if (/^git@[\w.-]+:/.test(repoUrl)) return true
  try {
    const parsed = new URL(repoUrl)
    return parsed.protocol === 'ssh:'
  } catch {
    return false
  }
}

/**
 * Convert an HTTP(S) git remote into an SSH remote when possible.
 * Example: https://github.com/acme/app.git → git@github.com:acme/app.git
 */
export function resolveSshCloneUrl(repoUrl: string): string {
  if (isSshGitRepoUrl(repoUrl)) {
    if (repoUrl.startsWith('ssh://')) {
      const parsed = new URL(repoUrl)
      const host = parsed.hostname
      const path = parsed.pathname.replace(/^\/+/, '').replace(/\.git$/, '')
      return `git@${host}:${path}.git`
    }
    return repoUrl
  }

  if (!isHttpsOrHttpRepoUrl(repoUrl)) {
    throw new Error('Cannot derive an SSH clone URL from this repository URL.')
  }

  const parsed = new URL(repoUrl)
  const path = parsed.pathname.replace(/^\/+/, '').replace(/\.git$/, '')
  if (!path.includes('/')) {
    throw new Error('Repository path is too short to convert to an SSH URL.')
  }

  return `git@${parsed.hostname}:${path}.git`
}
