import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Activity, GitBranch, Clock, Server } from 'lucide-react'
import prisma from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AutoRefresh } from '@/components/auto-refresh'
import { DeployButton } from './deploy-button'
import { EnvVarsManager } from './env-vars-manager'
import { DeployStatus } from '@prisma/client'
import { ToggleStateButton } from './toggle-state-button'
import { formatDistanceToNow } from 'date-fns'
import { CancelDeployButton } from '@/components/cancel-deploy-button'
import { DeploymentLogDialog } from '@/components/deployment-log-dialog'
import { DeploymentStatusBadge } from '@/components/deployment-status-badge'
import { RedeployButton } from '@/components/redeploy-button'
import { RollbackButton } from '@/components/rollback-button'
import { ConsoleEmptyState } from '@/components/layout/console-empty-state'
import { formatDeployRef } from '@/lib/git-ref'

export default async function EnvironmentDashboardPage({
  params,
}: {
  params: Promise<{ projectId: string; environmentId: string }>
}) {
  const resolvedParams = await params
  const { projectId, environmentId } = resolvedParams

  const environment = await prisma.environment.findUnique({
    where: { id: environmentId, projectId, deletedAt: null },
    include: {
      project: { select: { name: true, repoUrl: true } },
      variables: true,
    },
  })

  if (!environment) {
    notFound()
  }

  const deployments = await prisma.deployment.findMany({
    where: { environmentId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      workerNode: { select: { name: true } },
    },
  })

  const activeDeployment = deployments.find(
    (d) => d.status === DeployStatus.PENDING || d.status === DeployStatus.BUILDING
  )

  const lastSuccessDeploy = await prisma.deployment.findFirst({
    where: { environmentId, status: DeployStatus.SUCCESS },
    orderBy: { createdAt: 'desc' },
    include: { workerNode: true },
  })

  const isBuilding = !!activeDeployment
  const hasSuccessfulDeploy = !!lastSuccessDeploy

  return (
    <div className="space-y-4">
      <div className="space-y-2 border-b border-border pb-3">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          asChild
        >
          <Link href={`/console/projects/${projectId}`}>
            <ArrowLeft className="mr-1.5 size-3.5" />
            {environment.project.name}
          </Link>
        </Button>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-medium tracking-tight">{environment.name}</h1>
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                {environment.tier}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {environment.domain ? environment.domain : 'No domain configured'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {environment.project.repoUrl ? (
              <Button variant="outline" size="sm" asChild>
                <a href={environment.project.repoUrl} target="_blank" rel="noopener noreferrer">
                  <GitBranch className="mr-1.5 size-3.5" />
                  Repository
                </a>
              </Button>
            ) : null}

            <ToggleStateButton
              projectId={projectId}
              environmentId={environmentId}
              currentLifecycle={environment.lifecycle}
              hasSuccessfulDeploy={hasSuccessfulDeploy}
            />

            <RedeployButton
              projectId={projectId}
              environmentId={environmentId}
              branchName={environment.branchName}
              disabled={isBuilding || !environment.project.repoUrl}
            />

            <DeployButton
              projectId={projectId}
              environmentId={environmentId}
              hasRepoUrl={!!environment.project.repoUrl}
              defaultBranch={environment.branchName}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="gap-0 py-0 shadow-none lg:col-span-2">
          <CardHeader className="border-b px-3 py-2.5">
            <CardTitle className="text-sm font-medium">Deployments</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {deployments.length === 0 ? (
              <ConsoleEmptyState
                icon={Activity}
                title="No deployments yet"
                description='Click "Deploy" to start your first build.'
              />
            ) : (
              <div className="divide-y divide-border">
                {deployments.map((deploy) => (
                  <div
                    key={deploy.id}
                    className="flex flex-col gap-2 px-3 py-2.5 transition-colors hover:bg-accent/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-2.5">
                      <DeploymentStatusBadge status={deploy.status} />
                      <div className="min-w-0">
                        <p className="truncate font-mono text-sm">
                          {formatDeployRef(deploy.commitHash)}
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
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <RollbackButton
                        projectId={projectId}
                        environmentId={environmentId}
                        deploymentId={deploy.id}
                        commitHash={deploy.commitHash}
                        status={deploy.status}
                        disabled={isBuilding}
                      />
                      <CancelDeployButton
                        projectId={projectId}
                        environmentId={environmentId}
                        deploymentId={deploy.id}
                        status={deploy.status}
                      />
                      <DeploymentLogDialog
                        projectId={projectId}
                        environmentId={environmentId}
                        deploymentId={deploy.id}
                        status={deploy.status}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="gap-0 py-0 shadow-none">
          <CardHeader className="border-b px-3 py-2.5">
            <CardTitle className="text-sm font-medium">Runtime</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-3 py-3 text-sm">
            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground">Execution</span>
              <p className="font-medium">Docker</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground">Stack</span>
              <p className="font-medium">{environment.stackType}</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground">Node</span>
              <p className="font-medium">
                {environment.stackType === 'LARAVEL'
                  ? 'Not used'
                  : `Node ${environment.nodeVersion || '22'}`}
              </p>
            </div>
            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground">Worker</span>
              {lastSuccessDeploy?.workerNode ? (
                <p className="flex items-center gap-2 font-medium">
                  <Server className="size-3 text-emerald-500" />
                  {lastSuccessDeploy.workerNode.name}
                </p>
              ) : (
                <p className="font-medium text-muted-foreground">Waiting for deploy</p>
              )}
            </div>
            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground">Port</span>
              <p className="font-medium">
                {environment.assignedPort ? environment.assignedPort : 'Unassigned'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <EnvVarsManager
        projectId={projectId}
        environmentId={environmentId}
        initialVars={environment.variables}
      />
      <AutoRefresh isActive={isBuilding} />
    </div>
  )
}
