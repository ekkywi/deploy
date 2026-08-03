import { DeployStatus, LifeCycleStatus, Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

type OverviewAlertTone = 'success' | 'info' | 'warning' | 'danger'

type OverviewAlert = {
  tone: OverviewAlertTone
  title: string
  description: string
}

/** Count envs whose most recent deployment is FAILED — without loading every environment. */
async function countEnvironmentsWithFailedLatestDeploy(
  environmentWhere: Prisma.EnvironmentWhereInput
) {
  const latestByEnvironment = await prisma.deployment.groupBy({
    by: ['environmentId'],
    where: { environment: environmentWhere },
    _max: { createdAt: true },
  })

  const latestPairs = latestByEnvironment.flatMap((row) =>
    row._max.createdAt
      ? [{ environmentId: row.environmentId, createdAt: row._max.createdAt }]
      : []
  )

  if (latestPairs.length === 0) {
    return 0
  }

  return prisma.deployment.count({
    where: {
      status: DeployStatus.FAILED,
      OR: latestPairs.map((pair) => ({
        environmentId: pair.environmentId,
        createdAt: pair.createdAt,
      })),
    },
  })
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

    const isSysAdmin = auth.session.role === 'SYSADMIN'
    const accessibleProjectIds = isSysAdmin
      ? null
      : (
          await prisma.projectRole.findMany({
            where: {
              userId: auth.session.userId,
              project: {
                deletedAt: null,
              },
            },
            select: {
              projectId: true,
            },
          })
        ).map((membership) => membership.projectId)

    const projectWhere: Prisma.ProjectWhereInput = isSysAdmin
      ? { deletedAt: null }
      : {
          deletedAt: null,
          id: {
            in: accessibleProjectIds ?? [],
          },
        }

    const environmentWhere: Prisma.EnvironmentWhereInput = isSysAdmin
      ? {
          deletedAt: null,
          lifecycle: { not: LifeCycleStatus.DELETED },
        }
      : {
          deletedAt: null,
          lifecycle: { not: LifeCycleStatus.DELETED },
          projectId: {
            in: accessibleProjectIds ?? [],
          },
        }

    const deploymentWhere: Prisma.DeploymentWhereInput = isSysAdmin
      ? {}
      : {
          environment: {
            projectId: {
              in: accessibleProjectIds ?? [],
            },
          },
        }

    const [
      projectCount,
      environmentCount,
      deploymentCount,
      workerCount,
      activeWorkerCount,
      deploymentBreakdown,
      recentDeployments,
      environmentsWithoutDeployments,
      environmentsWithFailedLatestDeploy,
    ] = await Promise.all([
      prisma.project.count({
        where: projectWhere,
      }),
      prisma.environment.count({
        where: environmentWhere,
      }),
      prisma.deployment.count({
        where: deploymentWhere,
      }),
      prisma.workerNode.count(),
      prisma.workerNode.count({
        where: { isActive: true },
      }),
      prisma.deployment.groupBy({
        by: ['status'],
        where: deploymentWhere,
        _count: { status: true },
      }),
      prisma.deployment.findMany({
        where: deploymentWhere,
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: {
          environment: {
            select: {
              name: true,
              projectId: true,
              project: { select: { name: true } },
            },
          },
          workerNode: {
            select: { name: true },
          },
        },
      }),
      prisma.environment.count({
        where: {
          ...environmentWhere,
          deployments: { none: {} },
        },
      }),
      countEnvironmentsWithFailedLatestDeploy(environmentWhere),
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
        CANCELLED: 0,
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

    const latestDeployment = recentDeployments[0] ?? null

    const alerts: OverviewAlert[] = []

    if (projectCount === 0) {
      alerts.push({
        tone: 'warning',
        title: isSysAdmin ? 'No projects yet' : 'No project memberships',
        description: isSysAdmin
          ? 'Create the first project to expose environments and release activity.'
          : 'You are not assigned to any project yet, so project activity is hidden from this overview.',
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
        projectId: deployment.environment.projectId,
        environmentId: deployment.environmentId,
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
