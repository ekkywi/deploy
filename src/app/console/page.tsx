'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  ExternalLink,
  Layers,
  Plus,
  Rocket,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/useAuthStore'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ConsolePageHeader } from '@/components/layout/console-page-header'
import { ConsoleStatChip } from '@/components/layout/console-stat-chip'
import { ConsoleEmptyState } from '@/components/layout/console-empty-state'
import { DeploymentLogDialog } from '@/components/deployment-log-dialog'
import { CancelDeployButton } from '@/components/cancel-deploy-button'
import {
  DeploymentStatusBadge,
  getDeploymentStatusMeta,
} from '@/components/deployment-status-badge'

type OverviewAlertTone = 'success' | 'info' | 'warning' | 'danger'

type OverviewAlert = {
  tone: OverviewAlertTone
  title: string
  description: string
}

type OverviewDeployment = {
  id: string
  status: 'PENDING' | 'BUILDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED'
  projectId: string
  environmentId: string
  projectName: string
  environmentName: string
  workerNodeName: string | null
  commitHash: string | null
  assignedPort: number | null
  createdAt: string
}

type OverviewData = {
  summary: {
    projects: number
    environments: number
    deployments: number
    activeDeployments: number
    failedDeployments: number
    successRate: number | null
    workers: {
      total: number
      active: number
    }
    environmentsWithoutDeployments: number
    environmentsWithFailedLatestDeploy: number
    latestDeploymentAt: string | null
  }
  recentDeployments: OverviewDeployment[]
  alerts: OverviewAlert[]
}

function formatRelativeTime(value: string | null) {
  if (!value) return '—'
  return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
    Math.round((new Date(value).getTime() - Date.now()) / 60000),
    'minute'
  )
}

function alertDot(tone: OverviewAlertTone) {
  switch (tone) {
    case 'success':
      return 'bg-emerald-400'
    case 'info':
      return 'bg-sky-400'
    case 'warning':
      return 'bg-amber-400'
    case 'danger':
    default:
      return 'bg-red-500'
  }
}

export default function ConsoleOverviewPage() {
  const { user } = useAuthStore()
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    const controller = new AbortController()
    let isActive = true

    const loadOverview = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/console/overview', {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Failed to load console overview')
        }

        const data = (await response.json()) as OverviewData
        if (isActive) setOverview(data)
      } catch (fetchError) {
        if (!isActive || controller.signal.aborted) return
        setOverview(null)
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : 'Unable to load overview data'
        )
        toast.error('Failed to load console overview')
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    void loadOverview()

    return () => {
      isActive = false
      controller.abort()
    }
  }, [user])

  if (!user) return null

  const summary = overview?.summary
  const recentDeployments = overview?.recentDeployments ?? []
  const alerts = overview?.alerts ?? []

  return (
    <div className="space-y-4">
      <ConsolePageHeader
        title="Overview"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/console/deployments">
                <Rocket className="mr-1.5 size-3.5" />
                Activity
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/console/projects">
                <Plus className="mr-1.5 size-3.5" />
                New Project
              </Link>
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-1.5">
        <ConsoleStatChip label="Projects" value={isLoading ? '—' : (summary?.projects ?? 0)} />
        <ConsoleStatChip label="Environments" value={isLoading ? '—' : (summary?.environments ?? 0)} />
        <ConsoleStatChip
          label="In Progress"
          value={isLoading ? '—' : (summary?.activeDeployments ?? 0)}
          variant="pending"
        />
        <ConsoleStatChip
          label="Failed"
          value={isLoading ? '—' : (summary?.failedDeployments ?? 0)}
          variant="destructive"
        />
        <ConsoleStatChip
          label="Success rate"
          value={
            isLoading
              ? '—'
              : summary?.successRate === null || summary?.successRate === undefined
                ? '—'
                : `${summary.successRate}%`
          }
          variant="active"
        />
        <ConsoleStatChip
          label="Workers"
          value={
            isLoading
              ? '—'
              : summary
                ? `${summary.workers.active}/${summary.workers.total}`
                : '—'
          }
          variant="info"
        />
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm">
          <p className="font-medium text-destructive">Unable to load overview</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{error}</p>
          <Button className="mt-2" size="sm" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      ) : null}

      {!isLoading && !error && alerts.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Needs attention
          </h2>
          <div className="divide-y divide-border rounded-md border border-border">
            {alerts.map((alert, index) => (
              <div key={`${alert.title}-${index}`} className="flex gap-2.5 px-3 py-2.5">
                <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${alertDot(alert.tone)}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{alert.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{alert.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Recent deployments
          </h2>
          <Link
            href="/console/deployments"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            View activity
            <ArrowRight className="size-3" />
          </Link>
        </div>

        <div className="overflow-hidden rounded-md border border-border">
          {isLoading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                  <Skeleton className="size-3.5 rounded-full" />
                  <Skeleton className="h-3.5 w-48" />
                  <Skeleton className="ml-auto h-3.5 w-16" />
                </div>
              ))}
            </div>
          ) : recentDeployments.length === 0 ? (
            <ConsoleEmptyState
              icon={Layers}
              title="No deployments yet"
              description="Deploy from an environment to see activity here."
            />
          ) : (
            <div className="divide-y divide-border">
              {recentDeployments.map((deployment) => {
                const meta = getDeploymentStatusMeta(deployment.status)
                const StatusIcon = meta.icon
                const environmentHref = `/console/projects/${deployment.projectId}/environments/${deployment.environmentId}`

                return (
                  <div
                    key={deployment.id}
                    className="flex flex-col gap-2 px-3 py-2.5 transition-colors hover:bg-accent/50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <Link
                      href={environmentHref}
                      className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <StatusIcon
                        className={`size-3.5 shrink-0 ${meta.iconClassName} ${meta.spin ? 'animate-spin' : ''}`}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm">
                          {deployment.projectName}
                          <span className="mx-1.5 text-muted-foreground">/</span>
                          <span className="text-muted-foreground">{deployment.environmentName}</span>
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          <DeploymentStatusBadge status={deployment.status} />
                          <span>{formatRelativeTime(deployment.createdAt)}</span>
                          {deployment.commitHash ? (
                            <span className="font-mono">
                              {deployment.commitHash.substring(0, 7)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </Link>

                    <div className="flex items-center gap-1.5 self-start sm:self-auto">
                      <CancelDeployButton
                        projectId={deployment.projectId}
                        environmentId={deployment.environmentId}
                        deploymentId={deployment.id}
                        status={deployment.status}
                      />
                      <DeploymentLogDialog
                        projectId={deployment.projectId}
                        environmentId={deployment.environmentId}
                        deploymentId={deployment.id}
                        status={deployment.status}
                      />
                      <Button variant="ghost" size="sm" className="h-7 px-2" asChild>
                        <Link href={environmentHref}>
                          <ExternalLink className="size-3.5" />
                          <span className="sr-only">Open environment</span>
                        </Link>
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
