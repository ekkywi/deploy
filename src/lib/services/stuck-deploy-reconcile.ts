import prisma from '@/lib/prisma'
import { DeployStatus } from '@prisma/client'
import { revealWorkerAuthToken } from '@/lib/crypto/sealed-secrets'

const DEFAULT_TIMEOUT_MINUTES = 45
const MIN_TIMEOUT_MINUTES = 5

export function getDeployTimeoutMinutes(): number {
  const parsed = Number(process.env.DEPLOY_TIMEOUT_MINUTES ?? DEFAULT_TIMEOUT_MINUTES)
  if (!Number.isFinite(parsed)) return DEFAULT_TIMEOUT_MINUTES
  return Math.max(MIN_TIMEOUT_MINUTES, Math.floor(parsed))
}

export function getDeployTimeoutMs(): number {
  return getDeployTimeoutMinutes() * 60_000
}

export function getStuckDeploySweepIntervalMs(): number {
  const parsed = Number(process.env.STUCK_DEPLOY_SWEEP_INTERVAL_MS ?? 60_000)
  if (!Number.isFinite(parsed) || parsed < 10_000) return 60_000
  return Math.floor(parsed)
}

async function signalAgentCancel(
  worker: { ipAddress: string; authToken: string },
  deploymentId: string
) {
  try {
    const agentUrl = `http://${worker.ipAddress}:4000/api/deploy/${deploymentId}/cancel`
    const response = await fetch(agentUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${revealWorkerAuthToken(worker)}`,
      },
      signal: AbortSignal.timeout(8_000),
    })
    if (!response.ok && response.status !== 404) {
      console.warn(
        `[Stuck Deploy] Agent cancel for ${deploymentId} returned HTTP ${response.status}`
      )
    }
  } catch (error: unknown) {
    console.warn(
      `[Stuck Deploy] Agent cancel for ${deploymentId} failed:`,
      error instanceof Error ? error.message : error
    )
  }
}

export type StuckDeployReconcileResult = {
  timedOut: number
  deploymentIds: string[]
}

/**
 * Marks long-running PENDING/BUILDING deployments as FAILED and best-effort
 * cancels the agent job so environments are not locked forever.
 */
export async function reconcileStuckDeployments(options?: {
  environmentId?: string
  limit?: number
}): Promise<StuckDeployReconcileResult> {
  const cutoff = new Date(Date.now() - getDeployTimeoutMs())
  const limit = options?.limit ?? 50

  const stuck = await prisma.deployment.findMany({
    where: {
      status: { in: [DeployStatus.PENDING, DeployStatus.BUILDING] },
      createdAt: { lt: cutoff },
      ...(options?.environmentId ? { environmentId: options.environmentId } : {}),
    },
    include: { workerNode: true },
    orderBy: { createdAt: 'asc' },
    take: limit,
  })

  const deploymentIds: string[] = []
  const timeoutMinutes = getDeployTimeoutMinutes()

  for (const deployment of stuck) {
    const updated = await prisma.deployment.updateMany({
      where: {
        id: deployment.id,
        status: { in: [DeployStatus.PENDING, DeployStatus.BUILDING] },
      },
      data: {
        status: DeployStatus.FAILED,
        errorMessage: `Timed out after ${timeoutMinutes} minutes with no successful completion from the worker agent.`,
      },
    })

    if (updated.count === 0) continue

    deploymentIds.push(deployment.id)

    if (deployment.workerNode) {
      await signalAgentCancel(deployment.workerNode, deployment.id)
    }
  }

  if (deploymentIds.length > 0) {
    console.log(
      `[Stuck Deploy] Timed out ${deploymentIds.length} deployment(s): ${deploymentIds.join(', ')}`
    )
  }

  return { timedOut: deploymentIds.length, deploymentIds }
}
