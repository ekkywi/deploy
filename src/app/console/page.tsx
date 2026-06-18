'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Cpu,
  ExternalLink,
  Layers,
  Loader2,
  Rocket,
  Server,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  Users,
  Workflow,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/useAuthStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ConsolePageHeader } from '@/components/layout/console-page-header'
import { ConsoleStatChip } from '@/components/layout/console-stat-chip'

type OverviewAlertTone = 'success' | 'info' | 'warning' | 'danger'

type OverviewAlert = {
  tone: OverviewAlertTone
  title: string
  description: string
}

type OverviewDeployment = {
  id: string
  status: 'PENDING' | 'BUILDING' | 'SUCCESS' | 'FAILED'
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
  breakdown: {
    PENDING: number
    BUILDING: number
    SUCCESS: number
    FAILED: number
  }
  recentDeployments: OverviewDeployment[]
  alerts: OverviewAlert[]
}

function formatRelativeTime(value: string | null) {
  if (!value) {
    return 'No deployments yet'
  }

  return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
    Math.round((new Date(value).getTime() - Date.now()) / 60000),
    'minute'
  )
}

function statusStyle(status: OverviewDeployment['status']) {
  switch (status) {
    case 'SUCCESS':
      return {
        badge: 'border-emerald-400/14 bg-emerald-400/8 text-emerald-200',
        label: 'Success',
        icon: CheckCircle2,
      }
    case 'FAILED':
      return {
        badge: 'border-destructive/20 bg-destructive/10 text-rose-200',
        label: 'Failed',
        icon: TriangleAlert,
      }
    case 'BUILDING':
      return {
        badge: 'border-sky-400/14 bg-sky-400/8 text-sky-100',
        label: 'Building',
        icon: Loader2,
      }
    case 'PENDING':
    default:
      return {
        badge: 'border-border/60 bg-muted/32 text-foreground/90',
        label: 'Pending',
        icon: Clock3,
      }
  }
}

function alertStyle(tone: OverviewAlertTone) {
  switch (tone) {
    case 'success':
      return {
        card: 'border-emerald-400/15 bg-emerald-400/6',
        badge: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
        icon: CheckCircle2,
      }
    case 'info':
      return {
        card: 'border-sky-400/15 bg-sky-400/6',
        badge: 'border-sky-400/20 bg-sky-400/10 text-sky-100',
        icon: Workflow,
      }
    case 'warning':
      return {
        card: 'border-amber-400/15 bg-amber-400/6',
        badge: 'border-amber-400/20 bg-amber-400/10 text-amber-100',
        icon: TriangleAlert,
      }
    case 'danger':
    default:
      return {
        card: 'border-destructive/20 bg-destructive/6',
        badge: 'border-destructive/20 bg-destructive/10 text-rose-200',
        icon: ShieldAlert,
      }
  }
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-5 w-32 rounded-full" />
          <Skeleton className="h-11 w-full max-w-xl rounded-2xl" />
          <Skeleton className="h-5 w-full max-w-2xl" />
        </div>
        <Skeleton className="h-10 w-44 rounded-full" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-10 w-28 rounded-full" />
        <Skeleton className="h-10 w-32 rounded-full" />
        <Skeleton className="h-10 w-28 rounded-full" />
        <Skeleton className="h-10 w-36 rounded-full" />
        <Skeleton className="h-10 w-30 rounded-full" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
        <Card>
          <CardHeader className="border-b">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-80" />
          </CardHeader>
          <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-3 pt-5">
            <Skeleton className="h-[4.5rem] w-full rounded-2xl" />
            <Skeleton className="h-[4.5rem] w-full rounded-2xl" />
            <Skeleton className="h-[4.5rem] w-full rounded-2xl" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-3 pt-5">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </CardContent>
      </Card>
    </div>
  )
}

function QuickActionCard({
  href,
  title,
  description,
  icon: Icon,
  label,
}: {
  href: string
  title: string
  description: string
  icon: LucideIcon
  label: string
}) {
  return (
    <Link
      href={href}
      className="group flex h-full min-h-28 flex-col justify-between rounded-3xl border border-border/70 bg-muted/20 p-4 transition-all hover:-translate-y-0.5 hover:border-border/90 hover:bg-muted/30"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/80">
            {label}
          </div>
          <p className="text-[15px] font-medium tracking-[-0.02em] text-foreground">
            {title}
          </p>
          <p className="max-w-sm text-[13px] leading-5 text-muted-foreground/85">
            {description}
          </p>
        </div>
        <span className="inline-flex size-10 items-center justify-center rounded-2xl border border-border/60 bg-background/50 text-foreground transition-transform group-hover:translate-x-0.5">
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <div className="mt-4 flex items-center gap-2 text-[13px] font-medium text-foreground/90">
        Open
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  )
}

export default function ConsoleOverviewPage() {
  const { user } = useAuthStore()
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      return
    }

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

        if (isActive) {
          setOverview(data)
        }
      } catch (fetchError) {
        if (!isActive || controller.signal.aborted) {
          return
        }

        setOverview(null)
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : 'Unable to load overview data'
        )
        toast.error('Failed to load console overview')
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadOverview()

    return () => {
      isActive = false
      controller.abort()
    }
  }, [user])

  const fullName = useMemo(() => {
    if (!user) return ''
    return `${user.firstName} ${user.lastName || ''}`.trim()
  }, [user])

  if (!user) return null

  const isSysAdmin = user.role === 'SYSADMIN'
  const summary = overview?.summary
  const recentDeployments = overview?.recentDeployments ?? []
  const alerts = overview?.alerts ?? []
  const successRateLabel = summary
    ? summary.successRate === null
      ? 'No deployment data yet'
      : `${summary.successRate}% success rate`
    : 'No deployment data yet'

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        eyebrow="Operational Command Center"
        title="Console Overview"
        description="Monitor projects, environments, deployment flow, and platform readiness from one operational surface."
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button variant="outline" className="w-full rounded-full sm:w-auto" asChild>
              <Link href="/console/projects">
                <Layers className="mr-2 size-4" />
                Projects
              </Link>
            </Button>
            <Button className="w-full rounded-full sm:w-auto" asChild>
              <Link href="/console/deployments">
                <Rocket className="mr-2 size-4" />
                Deployments
              </Link>
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        <ConsoleStatChip label="Projects" value={summary?.projects ?? '—'} />
        <ConsoleStatChip label="Environments" value={summary?.environments ?? '—'} />
        <ConsoleStatChip label="Deployments" value={summary?.deployments ?? '—'} variant="info" />
        <ConsoleStatChip
          label="In Progress"
          value={summary?.activeDeployments ?? '—'}
          variant="pending"
        />
        <ConsoleStatChip
          label="Failed"
          value={summary?.failedDeployments ?? '—'}
          variant="destructive"
        />
        <ConsoleStatChip
          label="Workers"
          value={summary ? `${summary.workers.active}/${summary.workers.total}` : '—'}
          variant="active"
        />
      </div>

      {isLoading ? (
        <OverviewSkeleton />
      ) : error ? (
        <Card className="border-destructive/20">
          <CardHeader className="border-b border-destructive/20">
            <CardTitle className="flex items-center gap-2 text-[15px] font-medium tracking-[-0.02em]">
              <TriangleAlert className="size-4 text-rose-200" aria-hidden />
              Unable to load console overview
            </CardTitle>
            <CardDescription className="text-[13px] leading-5">
              {error}. Refresh the page or try again in a moment.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row">
            <Button onClick={() => window.location.reload()} className="rounded-full">
              Retry
            </Button>
            <Button variant="outline" asChild className="rounded-full">
              <Link href="/console/projects">Open Projects</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-[15px] font-medium tracking-[-0.02em]">
                  Platform pulse
                </CardTitle>
                <CardDescription className="text-[13px] leading-5">
                  The current control-plane snapshot for this workspace session.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                  <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground/80">
                    Session
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <span className="inline-flex size-10 items-center justify-center rounded-full bg-foreground text-xs font-medium text-background">
                      {user.firstName?.[0] ?? 'U'}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{fullName}</p>
                      <p className="text-[13px] text-muted-foreground/80">{user.email}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                  <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground/80">
                    Access
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Badge variant={isSysAdmin ? 'default' : 'secondary'}>{user.role}</Badge>
                    {user.role === 'SYSADMIN' ? (
                      <ShieldCheck className="size-4 text-emerald-500" aria-hidden />
                    ) : (
                      <ShieldAlert className="size-4 text-amber-500" aria-hidden />
                    )}
                    <Badge variant="outline" className="border-border/60">
                      {user.status}
                    </Badge>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                  <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground/80">
                    Release flow
                  </p>
                  <p className="mt-4 text-[13px] font-medium text-foreground">
                    {summary?.activeDeployments ?? 0} active deployment
                    {(summary?.activeDeployments ?? 0) === 1 ? '' : 's'}
                  </p>
                  <p className="mt-1 text-[13px] leading-5 text-muted-foreground/85">
                    {summary?.failedDeployments
                      ? `${summary.failedDeployments} recent failure${summary.failedDeployments === 1 ? '' : 's'} need review.`
                      : 'No recent failures detected in the latest deployment window.'}
                  </p>
                  {summary?.environmentsWithFailedLatestDeploy ? (
                    <p className="mt-2 text-[12px] leading-5 text-muted-foreground/80">
                      {summary.environmentsWithFailedLatestDeploy} environment
                      {summary.environmentsWithFailedLatestDeploy === 1 ? '' : 's'} currently
                      has a failed latest deployment.
                    </p>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                  <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground/80">
                    Health
                  </p>
                  <p className="mt-4 text-[13px] font-medium text-foreground">
                    {successRateLabel}
                  </p>
                  <p className="mt-1 text-[13px] leading-5 text-muted-foreground/85">
                    {summary?.latestDeploymentAt
                      ? `Latest activity ${formatRelativeTime(summary.latestDeploymentAt)}.`
                      : 'No deployment activity has been recorded yet.'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-[15px] font-medium tracking-[-0.02em]">
                  <TriangleAlert className="size-4 text-amber-400" aria-hidden />
                  What needs attention
                </CardTitle>
                <CardDescription className="text-[13px] leading-5">
                  Operational signals that may require follow-up before the next release.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-5">
                {alerts.map((alert, index) => {
                  const styles = alertStyle(alert.tone)
                  const Icon = styles.icon

                  return (
                    <div
                      key={`${alert.title}-${index}`}
                      className={`rounded-2xl border p-4 ${styles.card}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`inline-flex size-9 items-center justify-center rounded-xl border ${styles.badge}`}>
                          <Icon className="size-4" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium text-foreground">{alert.title}</p>
                          <p className="mt-1 text-[13px] leading-5 text-muted-foreground/85">
                            {alert.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-[15px] font-medium tracking-[-0.02em]">
                Recent deployment activity
              </CardTitle>
              <CardDescription className="text-[13px] leading-5">
                The latest release events across projects and environments.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {recentDeployments.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
                  <Workflow className="size-10 opacity-20" aria-hidden />
                  <div>
                    <p className="text-[13px] font-medium text-foreground/85">
                      No deployment history yet.
                    </p>
                    <p className="mt-1 max-w-xl text-[13px] leading-5 text-muted-foreground/85">
                      Trigger a deployment from an environment to start building an operational timeline here.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-border/70">
                  {recentDeployments.map((deployment) => {
                    const styles = statusStyle(deployment.status)
                    const StatusIcon = styles.icon

                    return (
                      <div
                        key={deployment.id}
                        className="flex flex-col gap-4 p-4 transition-colors hover:bg-muted/25 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="flex min-w-0 items-start gap-3.5">
                          <span className={`inline-flex min-w-28 items-center justify-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium ${styles.badge}`}>
                            <StatusIcon
                              className={`size-3 ${deployment.status === 'BUILDING' ? 'animate-spin' : ''}`}
                              aria-hidden
                            />
                            {styles.label}
                          </span>

                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium tracking-[-0.01em] text-foreground">
                              {deployment.projectName}
                              <span className="mx-1 text-muted-foreground">/</span>
                              <span className="text-muted-foreground">{deployment.environmentName}</span>
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground/78">
                              <span className="inline-flex items-center gap-1">
                                <Clock3 className="size-3" />
                                {formatRelativeTime(deployment.createdAt)}
                              </span>
                              {deployment.workerNodeName ? (
                                <span className="inline-flex items-center gap-1">
                                  <Server className="size-3" />
                                  {deployment.workerNodeName}
                                </span>
                              ) : null}
                              {deployment.assignedPort ? (
                                <span className="inline-flex items-center gap-1">
                                  <Cpu className="size-3" />
                                  Port {deployment.assignedPort}
                                </span>
                              ) : null}
                              {deployment.commitHash ? (
                                <span className="font-mono text-[11px]">
                                  {deployment.commitHash.substring(0, 7)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <Button variant="ghost" size="sm" className="w-fit rounded-full" asChild>
                          <Link href="/console/deployments">
                            View deployment log
                            <ExternalLink className="ml-2 size-4" />
                          </Link>
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-[15px] font-medium tracking-[-0.02em]">
                  Quick actions
                </CardTitle>
                <CardDescription className="text-[13px] leading-5">
                  Common platform tasks and navigation shortcuts.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 pt-5 sm:grid-cols-2">
                <QuickActionCard
                  href="/console/projects"
                  title="Manage projects"
                  description="Create, edit, and review workspace ownership and repository links."
                  icon={Layers}
                  label="Workspace"
                />
                <QuickActionCard
                  href="/console/environments"
                  title="Review environments"
                  description="See the current release surface across development, staging, and production."
                  icon={Server}
                  label="Runtime"
                />
                <QuickActionCard
                  href="/console/deployments"
                  title="Track deployments"
                  description="Inspect the latest build outcomes, worker assignments, and release status."
                  icon={Rocket}
                  label="Activity"
                />
                <QuickActionCard
                  href={isSysAdmin ? '/console/admin/users' : '/console/projects'}
                  title={isSysAdmin ? 'Admin users' : 'View workspace access'}
                  description={
                    isSysAdmin
                      ? 'Manage account status and control who can access the platform.'
                      : 'Review the project workspace and your assigned permissions.'
                  }
                  icon={isSysAdmin ? Users : ShieldCheck}
                  label={isSysAdmin ? 'Admin' : 'Access'}
                />
                {isSysAdmin ? (
                  <QuickActionCard
                    href="/console/admin/infrastructure"
                    title="Infrastructure"
                    description="Inspect worker nodes and the platform layer that executes deployments."
                    icon={Server}
                    label="Admin"
                  />
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-[15px] font-medium tracking-[-0.02em]">
                  Session context
                </CardTitle>
                <CardDescription className="text-[13px] leading-5">
                  The current signed-in account and its console privileges.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-5">
                <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                  <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground/80">
                    User
                  </p>
                  <p className="mt-3 text-sm font-medium text-foreground">{fullName}</p>
                  <p className="mt-1 text-[13px] text-muted-foreground/85">{user.email}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                    <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground/80">
                      Role
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <Badge variant={isSysAdmin ? 'default' : 'secondary'}>{user.role}</Badge>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                    <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground/80">
                      Account
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <Badge variant="outline" className="border-border/60">
                        {user.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                  <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground/80">
                    Workspace fit
                  </p>
                  <p className="mt-3 text-[13px] leading-5 text-muted-foreground/85">
                    {isSysAdmin
                      ? 'You have platform-wide visibility, including administration and infrastructure tools.'
                      : 'You have operational access to the workspace surface and deployment activity relevant to your role.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
