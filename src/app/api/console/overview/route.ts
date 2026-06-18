import { DeployStatus, LifeCycleStatus } from '@prisma/client'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

type OverviewAlertTone = 'success' | 'info' | 'warning' | 'danger'

type OverviewAlert = {
  tone: OverviewAlertTone
  title: string
  description: string
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request)

    if (auth.response || !auth.session) {
      return auth.response ?? Response.json(
        { error: 'Access denied. Invalid or missing token' },
        { status: 401 }
      )
    }

    const [
      projectCount,
      environmentCount,
      deploymentCount,
      workerCount,
      activeWorkerCount,
      deploymentBreakdown,
      recentDeployments,
      environments,
    ] = await Promise.all([
      prisma.project.count({
        where: { deletedAt: null },
      }),
      prisma.environment.count({
        where: {
          deletedAt: null,
          lifecycle: { not: LifeCycleStatus.DELETED },
        },
      }),
      prisma.deployment.count(),
      prisma.workerNode.count(),
      prisma.workerNode.count({
        where: { isActive: true },
      }),
      prisma.deployment.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      prisma.deployment.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: {
          environment: {
            select: {
              name: true,
              project: { select: { name: true } },
            },
          },
          workerNode: {
            select: { name: true },
          },
        },
      }),
      prisma.environment.findMany({
        where: {
          deletedAt: null,
          lifecycle: { not: LifeCycleStatus.DELETED },
        },
        select: {
          id: true,
          name: true,
          tier: true,
          project: {
            select: { name: true },
          },
          _count: {
            select: { deployments: true },
          },
          deployments: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              status: true,
              createdAt: true,
            },
          },
        },
      }),
    ])

    const statusCounts = deploymentBreakdown.reduce<Record<DeployStatus, number>>(
      (acc, item) => {
        acc[item.status] = item._count.status
        return acc
      },
      {
        PENDING: 0,
        BUILDING: 0,
        SUCCESS: 0,
        FAILED: 0,
      }
    )

    const activeDeployments =
      statusCounts.PENDING + statusCounts.BUILDING

    const failedDeployments = statusCounts.FAILED
    const successfulDeployments = statusCounts.SUCCESS
    const successRate =
      deploymentCount > 0
        ? Math.round((successfulDeployments / deploymentCount) * 100)
        : null

    const environmentsWithoutDeployments = environments.filter(
      (environment) => environment._count.deployments === 0
    ).length

    const environmentsWithFailedLatestDeploy = environments.filter(
      (environment) => environment.deployments[0]?.status === 'FAILED'
    ).length

    const latestDeployment = recentDeployments[0] ?? null

    const alerts: OverviewAlert[] = []

    if (projectCount === 0) {
      alerts.push({
        tone: 'warning',
        title: 'No projects yet',
        description: 'Create the first project to expose environments and release activity.',
      })
    }

    if (environmentsWithoutDeployments > 0) {
      alerts.push({
        tone: 'info',
        title: `${environmentsWithoutDeployments} environment${environmentsWithoutDeployments === 1 ? '' : 's'} waiting for a first deploy`,
        description: 'These environments are configured, but have no deployment history yet.',
      })
    }

    if (activeDeployments > 0) {
      alerts.push({
        tone: 'info',
        title: `${activeDeployments} deployment${activeDeployments === 1 ? '' : 's'} in progress`,
        description: 'Keep this overview open to watch pending or building releases move forward.',
      })
    }

    if (failedDeployments > 0) {
      alerts.push({
        tone: 'danger',
        title: `${failedDeployments} failed deployment${failedDeployments === 1 ? '' : 's'}`,
        description: 'Review the most recent failures before the next release window.',
      })
    }

    if (activeWorkerCount === 0 && workerCount > 0) {
      alerts.push({
        tone: 'danger',
        title: 'No active worker nodes',
        description: 'Queued deployments will not run until a worker node is marked active.',
      })
    }

    if (alerts.length === 0) {
      alerts.push({
        tone: 'success',
        title: 'No immediate action required',
        description: 'Projects, environments, and deployment activity are all in a steady state.',
      })
    }

    return Response.json({
      summary: {
        projects: projectCount,
        environments: environmentCount,
        deployments: deploymentCount,
        activeDeployments,
        failedDeployments,
        successRate,
        workers: {
          total: workerCount,
          active: activeWorkerCount,
        },
        environmentsWithoutDeployments,
        environmentsWithFailedLatestDeploy,
        latestDeploymentAt: latestDeployment?.createdAt ?? null,
      },
      breakdown: statusCounts,
      recentDeployments: recentDeployments.map((deployment) => ({
        id: deployment.id,
        status: deployment.status,
        projectName: deployment.environment.project.name,
        environmentName: deployment.environment.name,
        workerNodeName: deployment.workerNode?.name ?? null,
        commitHash: deployment.commitHash,
        assignedPort: deployment.assignedPort,
        createdAt: deployment.createdAt,
      })),
      alerts,
    })
  } catch (error) {
    console.error('Console overview error:', error)

    return Response.json(
      { error: 'Internal server error.' },
      { status: 500 }
    )
  }
}
