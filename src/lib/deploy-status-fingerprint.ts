import type { DeployStatus } from '@prisma/client'

export function buildDeployStatusFingerprint(
  deployments: { id: string; status: DeployStatus; commitHash: string | null }[]
) {
  return deployments.map((d) => `${d.id}:${d.status}:${d.commitHash ?? ''}`).join('|')
}

export function hasLiveDeployments(
  deployments: { status: DeployStatus }[]
) {
  return deployments.some((d) => d.status === 'PENDING' || d.status === 'BUILDING')
}
