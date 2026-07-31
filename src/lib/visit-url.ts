type VisitUrlInput = {
  domain?: string | null
  assignedPort?: number | null
  workerIpAddress?: string | null
  deploymentPort?: number | null
}

export type VisitTarget = {
  url: string
  label: string
  kind: 'domain' | 'ip'
}

/**
 * Prefer configured domain; fall back to worker IP + port for internal access.
 */
export function resolveVisitTarget(input: VisitUrlInput): VisitTarget | null {
  const domain = input.domain?.trim()
  if (domain) {
    const normalized = domain.replace(/^https?:\/\//i, '')
    return {
      url: `https://${normalized}`,
      label: normalized,
      kind: 'domain',
    }
  }

  const ip = input.workerIpAddress?.trim()
  const port = input.assignedPort ?? input.deploymentPort
  if (ip && port) {
    const label = `${ip}:${port}`
    return {
      url: `http://${label}`,
      label,
      kind: 'ip',
    }
  }

  return null
}
