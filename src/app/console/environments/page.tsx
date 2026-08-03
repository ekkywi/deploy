import { Suspense } from 'react'
import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import {
  Box,
  Clock,
  ExternalLink,
  Globe,
  Layers,
  Server,
} from 'lucide-react'
import {
  EnvironmentTier,
  GlobalRole,
  LifeCycleStatus,
  Prisma,
} from '@prisma/client'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { resolveVisitTarget } from '@/lib/visit-url'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConsolePageHeader } from '@/components/layout/console-page-header'
import { ConsoleStatChip } from '@/components/layout/console-stat-chip'
import { ConsoleEmptyState } from '@/components/layout/console-empty-state'
import { DeploymentStatusBadge } from '@/components/deployment-status-badge'
import { EnvironmentsToolbar } from './environments-toolbar'

type SearchParams = Promise<{
  q?: string
  tier?: string
  lifecycle?: string
}>

function isTier(value: string | undefined): value is EnvironmentTier {
  return (
    value === 'DEVELOPMENT' || value === 'STAGING' || value === 'PRODUCTION'
  )
}

function isLifecycle(value: string | undefined): value is LifeCycleStatus {
  return (
    value === 'ACTIVE' || value === 'SUSPENDED' || value === 'DELETING'
  )
}

export default async function GlobalEnvironmentsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const headersList = await headers()
  const dummyRequest = new Request('http://localhost', { headers: headersList })
  const auth = await requireAuth(dummyRequest)

  if (!auth.session) {
    redirect('/login')
  }

  const { userId, role } = auth.session
  const params = await searchParams
  const q = params.q?.trim() ?? ''
  const tierFilter = isTier(params.tier) ? params.tier : undefined
  const lifecycleFilter = isLifecycle(params.lifecycle) ? params.lifecycle : undefined

  const where: Prisma.EnvironmentWhereInput = {
    deletedAt: null,
    lifecycle: { not: LifeCycleStatus.DELETED },
    ...(tierFilter ? { tier: tierFilter } : {}),
    ...(lifecycleFilter ? { lifecycle: lifecycleFilter } : {}),
    ...(role === GlobalRole.SYSADMIN
      ? {}
      : {
          project: {
            members: { some: { userId } },
          },
        }),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { domain: { contains: q, mode: 'insensitive' } },
            { project: { name: { contains: q, mode: 'insensitive' } } },
          ],
        }
      : {}),
  }

  const environments = await prisma.environment.findMany({
    where,
    orderBy: [{ updatedAt: 'desc' }],
    take: 100,
    include: {
      project: { select: { id: true, name: true, repoUrl: true } },
      deployments: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          workerNode: { select: { name: true, ipAddress: true } },
        },
      },
    },
  })

  const stats = environments.reduce(
    (acc, env) => {
      acc.total += 1
      if (env.lifecycle === 'ACTIVE') acc.active += 1
      if (env.lifecycle === 'SUSPENDED') acc.suspended += 1
      if (env.lifecycle === 'DELETING') acc.deleting += 1
      const last = env.deployments[0]
      if (last?.status === 'BUILDING' || last?.status === 'PENDING') acc.live += 1
      return acc
    },
    { total: 0, active: 0, suspended: 0, deleting: 0, live: 0 }
  )

  return (
    <div className="space-y-4">
      <ConsolePageHeader
        title="Environments"
        description="All environments across projects you can access."
      />

      <div className="flex flex-wrap gap-1.5">
        <ConsoleStatChip label="Total" value={stats.total} />
        <ConsoleStatChip label="Active" value={stats.active} variant="active" />
        <ConsoleStatChip label="Suspended" value={stats.suspended} variant="pending" />
        <ConsoleStatChip label="Deploying" value={stats.live} variant="info" />
      </div>

      <Suspense fallback={null}>
        <EnvironmentsToolbar />
      </Suspense>

      <div className="overflow-hidden rounded-md border border-border">
        {environments.length === 0 ? (
          <ConsoleEmptyState
            icon={Layers}
            title="No environments found"
            description="Create an environment inside a project, or adjust your filters."
          />
        ) : (
          <div className="divide-y divide-border">
            {environments.map((env) => {
              const href = `/console/projects/${env.projectId}/environments/${env.id}`
              const lastDeploy = env.deployments[0] ?? null
              const visit = resolveVisitTarget({
                domain: env.domain,
                assignedPort: env.assignedPort,
                workerIpAddress: lastDeploy?.workerNode?.ipAddress,
                deploymentPort: lastDeploy?.assignedPort,
              })

              return (
                <div
                  key={env.id}
                  className="flex flex-col gap-2 px-3 py-2.5 transition-colors hover:bg-accent/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <Link
                    href={href}
                    className="flex min-w-0 flex-1 items-start gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/30">
                      <Box className="size-3.5 text-muted-foreground" aria-hidden />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium">
                          {env.project.name}
                          <span className="mx-1.5 text-muted-foreground">/</span>
                          <span className="text-muted-foreground">{env.name}</span>
                        </p>
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                          {env.tier}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-[10px] uppercase tracking-wide ${
                            env.lifecycle === 'ACTIVE'
                              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                              : env.lifecycle === 'SUSPENDED'
                                ? 'border-amber-500/20 bg-amber-500/10 text-amber-400'
                                : 'border-border text-muted-foreground'
                          }`}
                        >
                          {env.lifecycle}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span>{env.stackType}</span>
                        {visit ? (
                          <span className="inline-flex items-center gap-1">
                            <Globe className="size-3" />
                            <span className="font-mono">{visit.label}</span>
                          </span>
                        ) : env.assignedPort ? (
                          <span className="font-mono">:{env.assignedPort}</span>
                        ) : null}
                        {lastDeploy ? (
                          <>
                            <DeploymentStatusBadge status={lastDeploy.status} />
                            <span className="inline-flex items-center gap-1">
                              <Clock className="size-3" />
                              {formatDistanceToNow(new Date(lastDeploy.createdAt), {
                                addSuffix: true,
                              })}
                            </span>
                            {lastDeploy.workerNode ? (
                              <span className="inline-flex items-center gap-1">
                                <Server className="size-3" />
                                {lastDeploy.workerNode.name}
                              </span>
                            ) : null}
                          </>
                        ) : (
                          <span>No deployments yet</span>
                        )}
                      </div>
                    </div>
                  </Link>

                  <div className="flex shrink-0 items-center gap-1.5 self-start sm:self-auto">
                    {visit ? (
                      <Button variant="outline" size="sm" className="h-7 gap-1.5 px-2.5 text-xs" asChild>
                        <a href={visit.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="size-3.5" />
                          Open
                        </a>
                      </Button>
                    ) : null}
                    <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" asChild>
                      <Link href={href}>View</Link>
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
