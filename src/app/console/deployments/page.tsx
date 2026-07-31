import { Activity, Clock, Server } from 'lucide-react'
import prisma from '@/lib/prisma'
import { formatDistanceToNow } from 'date-fns'
import { ConsolePageHeader } from '@/components/layout/console-page-header'
import { ConsoleStatChip } from '@/components/layout/console-stat-chip'
import { ConsoleEmptyState } from '@/components/layout/console-empty-state'
import { AutoRefresh } from '@/components/auto-refresh'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { GlobalRole } from '@prisma/client'
import { DeploymentLogDialog } from '@/components/deployment-log-dialog'
import { DeploymentStatusBadge } from '@/components/deployment-status-badge'

export default async function GlobalDeploymentsPage() {
  const headersList = await headers()
  const dummyRequest = new Request('http://localhost', { headers: headersList })
  const auth = await requireAuth(dummyRequest)

  if (!auth.session) {
    redirect('/auth/login')
  }

  const { userId, role } = auth.session

  const deployments = await prisma.deployment.findMany({
    where:
      role === GlobalRole.SYSADMIN
        ? undefined
        : {
            environment: {
              project: {
                members: {
                  some: { userId: userId },
                },
              },
            },
          },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      environment: {
        include: {
          project: { select: { name: true } },
        },
      },
      workerNode: { select: { name: true } },
    },
  })

  const totals = deployments.reduce(
    (acc, deployment) => {
      if (deployment.status === 'SUCCESS') acc.success += 1
      if (deployment.status === 'FAILED') acc.failed += 1
      if (deployment.status === 'BUILDING') acc.building += 1
      if (deployment.status === 'PENDING') acc.pending += 1
      return acc
    },
    {
      success: 0,
      failed: 0,
      building: 0,
      pending: 0,
    }
  )

  const hasLiveDeployments = deployments.some(
    (deployment) => deployment.status === 'PENDING' || deployment.status === 'BUILDING'
  )

  return (
    <div className="space-y-4">
      <ConsolePageHeader title="Deployments" />

      <div className="flex flex-wrap gap-1.5">
        <ConsoleStatChip label="Total" value={deployments.length} />
        <ConsoleStatChip label="Ready" value={totals.success} variant="active" />
        <ConsoleStatChip label="Building" value={totals.building} variant="info" />
        <ConsoleStatChip label="Queued" value={totals.pending} variant="pending" />
        <ConsoleStatChip label="Error" value={totals.failed} variant="destructive" />
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        {deployments.length === 0 ? (
          <ConsoleEmptyState
            icon={Activity}
            title="No deployments yet"
            description="Activity will appear here once you deploy an environment."
          />
        ) : (
          <div className="divide-y divide-border">
            {deployments.map((deploy) => (
              <div
                key={deploy.id}
                className="flex flex-col gap-2 px-3 py-2.5 transition-colors hover:bg-accent/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="pt-0.5">
                    <DeploymentStatusBadge status={deploy.status} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {deploy.environment.project.name}
                      <span className="mx-1.5 text-muted-foreground">/</span>
                      <span className="text-muted-foreground">{deploy.environment.name}</span>
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatDistanceToNow(new Date(deploy.createdAt), { addSuffix: true })}
                      </span>
                      {deploy.workerNode ? (
                        <span className="inline-flex items-center gap-1">
                          <Server className="size-3" />
                          {deploy.workerNode.name}
                        </span>
                      ) : null}
                      {deploy.commitHash ? (
                        <span className="font-mono">{deploy.commitHash.substring(0, 7)}</span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="self-start sm:self-auto">
                  <DeploymentLogDialog
                    projectId={deploy.environment.projectId}
                    environmentId={deploy.environmentId}
                    deploymentId={deploy.id}
                    status={deploy.status}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AutoRefresh isActive={hasLiveDeployments} />
    </div>
  )
}
