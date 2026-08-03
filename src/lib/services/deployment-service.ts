import prisma from '@/lib/prisma'
import { DeployStatus } from '@prisma/client'
import { logAudit } from '@/lib/audit-logger'
import { isGitCommitSha } from '@/lib/git-ref'
import {
  mapVariablesForUse,
  revealWorkerAuthToken,
} from '@/lib/crypto/sealed-secrets'
import { revealGitHttpsToken } from '@/lib/git/project-git-credential'
import {
  deploymentBlockedMessage,
  isDeploymentBlockedByLifecycle,
} from '@/lib/services/environment-lifecycle'
import { reconcileStuckDeployments } from '@/lib/services/stuck-deploy-reconcile'
import { probeWorkersHealth } from '@/lib/services/worker-health'

export type DeployAuditAction =
  | 'TRIGGER_DEPLOYMENT'
  | 'WEBHOOK_DEPLOYMENT'
  | 'REDEPLOY'
  | 'ROLLBACK_DEPLOYMENT'

export type ExecuteDeploymentMeta = {
  action?: DeployAuditAction
  /** When false, do not overwrite environment.branchName (used for SHA rollbacks). */
  updateBranchName?: boolean
  sourceDeploymentId?: string
}

export { isGitCommitSha } from '@/lib/git-ref'

export async function executeDeploymentService(
  environmentId: string,
  gitRef: string,
  actorId: string,
  request?: Request,
  meta?: ExecuteDeploymentMeta
) {
  let deploymentId: string | null = null
  const ref = gitRef.trim()
  const action: DeployAuditAction =
    meta?.action ?? (request ? 'TRIGGER_DEPLOYMENT' : 'WEBHOOK_DEPLOYMENT')
  const updateBranchName = meta?.updateBranchName ?? !isGitCommitSha(ref)

  try {
    if (!ref) {
      throw new Error('A git branch or commit is required.')
    }

    const environment = await prisma.environment.findUnique({
      where: { id: environmentId, deletedAt: null },
      include: { project: true, variables: true },
    })

    if (!environment) throw new Error('Environment not found.')
    if (!environment.project.repoUrl) throw new Error('Project repository URL missing.')

    if (isDeploymentBlockedByLifecycle(environment.lifecycle)) {
      throw new Error(deploymentBlockedMessage(environment.lifecycle))
    }

    // Clear timed-out in-flight deploys so a zombie PENDING/BUILDING cannot lock forever.
    await reconcileStuckDeployments({ environmentId, limit: 10 })

    const inFlight = await prisma.deployment.findFirst({
      where: {
        environmentId,
        status: { in: [DeployStatus.PENDING, DeployStatus.BUILDING] },
      },
      select: { id: true, status: true },
    })

    if (inFlight) {
      throw new Error(
        `A deployment is already ${inFlight.status.toLowerCase()} for this environment. Wait for it to finish.`
      )
    }

    const candidateWorkers = await prisma.workerNode.findMany({
      where: { isActive: true, supportedTiers: { has: environment.tier } },
      include: {
        _count: {
          select: {
            deployments: {
              where: { status: { in: [DeployStatus.SUCCESS, DeployStatus.BUILDING] } },
            },
          },
        },
      },
    })

    if (candidateWorkers.length === 0) {
      throw new Error(
        `No active worker nodes are available for the ${environment.tier} tier.`
      )
    }

    const healthResults = await probeWorkersHealth(candidateWorkers)
    const onlineIds = new Set(
      healthResults
        .filter((result) => result.status === 'online')
        .map((result) => result.workerId)
    )
    const onlineWorkers = candidateWorkers.filter((worker) => onlineIds.has(worker.id))

    if (onlineWorkers.length === 0) {
      throw new Error(
        `No reachable (online) worker nodes are available for the ${environment.tier} tier. Check agent health in Infrastructure.`
      )
    }

    const lastSuccessful = await prisma.deployment.findFirst({
      where: {
        environmentId,
        status: DeployStatus.SUCCESS,
        workerNodeId: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      select: { workerNodeId: true },
    })

    const preferredWorker =
      lastSuccessful?.workerNodeId != null
        ? onlineWorkers.find((worker) => worker.id === lastSuccessful.workerNodeId)
        : undefined

    const selectedWorker =
      preferredWorker ??
      [...onlineWorkers].sort((a, b) => a._count.deployments - b._count.deployments)[0]

    let targetPort = environment.assignedPort
    if (!targetPort) {
      const highestPortEnv = await prisma.environment.findFirst({
        where: { assignedPort: { not: null } },
        orderBy: { assignedPort: 'desc' },
        select: { assignedPort: true },
      })
      targetPort =
        highestPortEnv?.assignedPort != null ? highestPortEnv.assignedPort + 1 : 30000
    }

    await prisma.environment.update({
      where: { id: environmentId },
      data: {
        assignedPort: targetPort,
        ...(updateBranchName ? { branchName: ref } : {}),
      },
    })

    const newDeployment = await prisma.deployment.create({
      data: {
        environmentId,
        workerNodeId: selectedWorker.id,
        status: DeployStatus.PENDING,
        assignedPort: targetPort,
        commitHash: ref,
        logFilePath: `/logs/${environmentId}-${Date.now()}.log`,
      },
    })
    deploymentId = newDeployment.id

    logAudit({
      userId: actorId,
      action,
      targetType: 'ENVIRONMENT',
      targetId: environmentId,
      request,
      metadata: meta?.sourceDeploymentId
        ? { sourceDeploymentId: meta.sourceDeploymentId, gitRef: ref }
        : { gitRef: ref },
    })

    const agentUrl = `http://${selectedWorker.ipAddress}:4000/api/deploy`
    const gitHttpsToken = revealGitHttpsToken(environment.project.gitHttpsToken)
    const payload = {
      deploymentId: newDeployment.id,
      environmentId: environmentId,
      repoUrl: environment.project.repoUrl,
      ...(gitHttpsToken ? { gitHttpsToken } : {}),
      stackType: environment.stackType,
      nodeVersion: environment.nodeVersion,
      environmentName: environment.name,
      branch: ref,
      targetPort: targetPort,
      envVars: mapVariablesForUse(environment.variables).map((v) => ({
        key: v.key,
        value: v.value,
      })),
    }

    const agentResponse = await fetch(agentUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${revealWorkerAuthToken(selectedWorker)}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    })

    if (!agentResponse.ok) {
      const errorData = await agentResponse.json().catch(() => ({}))
      throw new Error(
        (errorData as { error?: string }).error ||
          'Agent rejected the deployment request.'
      )
    }

    const updatedDeployment = await prisma.deployment.update({
      where: { id: newDeployment.id },
      data: { status: DeployStatus.BUILDING },
    })

    return { success: true as const, deployment: updatedDeployment }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown deployment error'
    console.error(`[Deploy Service]`, message)

    if (deploymentId) {
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: {
          status: DeployStatus.FAILED,
          errorMessage: `Failed: ${message}`,
        },
      })
    }

    return { success: false as const, error: message }
  }
}

export async function redeployEnvironmentService(
  environmentId: string,
  actorId: string,
  request?: Request
) {
  const environment = await prisma.environment.findUnique({
    where: { id: environmentId, deletedAt: null },
    select: { branchName: true },
  })

  if (!environment) {
    return { success: false as const, error: 'Environment not found.' }
  }

  let gitRef = environment.branchName?.trim() || ''

  if (!gitRef) {
    const lastSuccess = await prisma.deployment.findFirst({
      where: { environmentId, status: DeployStatus.SUCCESS, commitHash: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: { commitHash: true },
    })
    gitRef = lastSuccess?.commitHash?.trim() || ''
  }

  if (!gitRef) {
    return {
      success: false as const,
      error: 'No branch or previous successful commit available to redeploy.',
    }
  }

  return executeDeploymentService(environmentId, gitRef, actorId, request, {
    action: 'REDEPLOY',
    updateBranchName: !isGitCommitSha(gitRef),
  })
}

export async function rollbackDeploymentService(
  environmentId: string,
  sourceDeploymentId: string,
  actorId: string,
  request?: Request
) {
  const source = await prisma.deployment.findFirst({
    where: { id: sourceDeploymentId, environmentId },
    select: { id: true, status: true, commitHash: true },
  })

  if (!source) {
    return { success: false as const, error: 'Source deployment not found.', status: 404 }
  }

  if (source.status !== DeployStatus.SUCCESS) {
    return {
      success: false as const,
      error: 'Only successful deployments can be rolled back to.',
      status: 409,
    }
  }

  const commitHash = source.commitHash?.trim() || ''
  if (!isGitCommitSha(commitHash)) {
    return {
      success: false as const,
      error:
        'This deployment has no recorded commit SHA. Redeploy a new build first, then rollback will be available.',
      status: 409,
    }
  }

  const result = await executeDeploymentService(
    environmentId,
    commitHash,
    actorId,
    request,
    {
      action: 'ROLLBACK_DEPLOYMENT',
      updateBranchName: false,
      sourceDeploymentId: source.id,
    }
  )

  if (!result.success) {
    return { success: false as const, error: result.error, status: 502 }
  }

  return result
}
