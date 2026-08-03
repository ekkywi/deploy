import prisma from '@/lib/prisma'
import { DeployStatus } from '@prisma/client'
import { logAudit } from '@/lib/audit-logger'
import { revealWorkerAuthToken } from '@/lib/crypto/sealed-secrets'

type CancelResult =
  | { success: true; deployment: { id: string; status: DeployStatus } }
  | { success: false; error: string; status?: number }

export async function cancelDeploymentService(
  deploymentId: string,
  actorId: string,
  request?: Request
): Promise<CancelResult> {
  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
    include: {
      workerNode: true,
      environment: { select: { id: true, projectId: true } },
    },
  })

  if (!deployment) {
    return { success: false, error: 'Deployment not found.', status: 404 }
  }

  if (
    deployment.status !== DeployStatus.PENDING &&
    deployment.status !== DeployStatus.BUILDING
  ) {
    return {
      success: false,
      error: `Only queued or building deployments can be cancelled (current: ${deployment.status}).`,
      status: 409,
    }
  }

  const cancelled = await prisma.deployment.update({
    where: { id: deploymentId },
    data: {
      status: DeployStatus.CANCELLED,
      errorMessage: 'Cancelled by user.',
    },
  })

  logAudit({
    userId: actorId,
    action: 'CANCEL_DEPLOYMENT',
    targetType: 'DEPLOYMENT',
    targetId: deploymentId,
    request,
  })

  if (deployment.workerNode) {
    try {
      const agentUrl = `http://${deployment.workerNode.ipAddress}:4000/api/deploy/${deploymentId}/cancel`
      const agentResponse = await fetch(agentUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${revealWorkerAuthToken(deployment.workerNode)}`,
        },
        signal: AbortSignal.timeout(10_000),
      })

      if (!agentResponse.ok && agentResponse.status !== 404) {
        const body = await agentResponse.json().catch(() => ({}))
        console.warn(
          `[Cancel Deploy] Agent responded ${agentResponse.status}:`,
          (body as { error?: string }).error ?? agentResponse.statusText
        )
      }
    } catch (error: unknown) {
      console.warn(
        '[Cancel Deploy] Failed to reach agent (deployment marked cancelled anyway):',
        error instanceof Error ? error.message : error
      )
    }
  }

  return {
    success: true,
    deployment: { id: cancelled.id, status: cancelled.status },
  }
}
