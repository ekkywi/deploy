import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Activity, GitBranch, CheckCircle2, XCircle, Loader2, Clock, Server } from 'lucide-react';
import prisma from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AutoRefresh } from '@/components/auto-refresh';
import { DeployButton } from './deploy-button';
import { EnvVarsManager } from './env-vars-manager';
import { DeployStatus } from '@prisma/client';
import { ToggleStateButton } from './toggle-state-button'; 
import { formatDistanceToNow } from 'date-fns';

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'SUCCESS':
      return <Badge className="rounded-full border border-emerald-400/14 bg-emerald-400/8 px-2.5 py-1 text-[10px] font-medium text-emerald-200 hover:bg-emerald-400/12"><CheckCircle2 className="mr-1 size-3" /> Success</Badge>
    case 'FAILED':
      return <Badge variant="destructive" className="rounded-full px-2.5 py-1 text-[10px] font-medium"><XCircle className="mr-1 size-3" /> Failed</Badge>
    case 'BUILDING':
      return <Badge className="rounded-full border border-sky-400/14 bg-sky-400/8 px-2.5 py-1 text-[10px] font-medium text-sky-100 hover:bg-sky-400/12"><Loader2 className="mr-1 size-3 animate-spin" /> Building</Badge>
    case 'PENDING':
    default:
      return <Badge variant="outline" className="rounded-full border-border/60 px-2.5 py-1 text-[10px] font-medium text-muted-foreground"><Clock className="mr-1 size-3" /> Pending</Badge>
  }
}

export default async function EnvironmentDashboardPage({
  params,
}: {
  params: Promise<{ projectId: string; environmentId: string }>
}) {
  const resolvedParams = await params;
  const { projectId, environmentId } = resolvedParams;

  const environment = await prisma.environment.findUnique({
    where: { id: environmentId, projectId, deletedAt: null },
    include: {
      project: { select: { name: true, repoUrl: true } },
      variables: true 
    }
  });

  if (!environment) {
    notFound()
  }

  const deployments = await prisma.deployment.findMany({
    where: { environmentId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      workerNode: { select: { name: true } }
    }
  });

  const activeDeployment = deployments.find(d => d.status === DeployStatus.PENDING || d.status === DeployStatus.BUILDING);
  
  const lastSuccessDeploy = await prisma.deployment.findFirst({
    where: { environmentId, status: DeployStatus.SUCCESS },
    orderBy: { createdAt: 'desc' },
    include: { workerNode: true }
  });

  const isBuilding = !!activeDeployment;
  const hasSuccessfulDeploy = !!lastSuccessDeploy;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <Button variant="ghost" className="w-fit rounded-full px-3 text-muted-foreground" asChild>
            <Link href={`/console/projects/${projectId}`}>
              <ArrowLeft className="mr-2 size-4" /> Back to Project
            </Link>
          </Button>

          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-medium tracking-tight text-foreground">
                {environment.name}
              </h1>
              <Badge variant="outline" className="rounded-full uppercase tracking-widest text-[10px]">
                {environment.tier}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {environment.domain ? `Routed to ${environment.domain}` : 'No domain routed yet'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {environment.project.repoUrl && (
            <Button variant="outline" className="rounded-full" asChild>
              <a href={environment.project.repoUrl} target="_blank" rel="noopener noreferrer">
                <GitBranch className="mr-2 size-4" /> Repository
              </a>
            </Button>
          )}
          
          <ToggleStateButton 
            projectId={projectId}
            environmentId={environmentId}
            currentLifecycle={environment.lifecycle}
            hasSuccessfulDeploy={hasSuccessfulDeploy}
          />
          
          <DeployButton 
            projectId={projectId} 
            environmentId={environmentId} 
            hasRepoUrl={!!environment.project.repoUrl} 
            defaultBranch={environment.branchName}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="border-b">
            <CardTitle className="text-lg font-medium">Deployment History</CardTitle>
            <CardDescription>Recent builds and execution logs for this environment.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {deployments.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Activity className="mx-auto size-12 opacity-20 mb-3" />
                <p>No deployments yet.</p>
                <p className="text-sm">Click &quot;Trigger Deploy&quot; to start your first build.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/70">
                {deployments.map((deploy) => (
                  <div key={deploy.id} className="flex items-center justify-between p-4 transition-colors hover:bg-muted/30">
                    <div className="flex items-center gap-4">
                      <div className="w-28">
                        <StatusBadge status={deploy.status} />
                      </div>
                      <div>
                        <p className="flex items-center gap-2 text-sm font-medium">
                          {deploy.commitHash ? `Branch: ${deploy.commitHash}` : 'Triggered Deploy'}
                        </p>
                        <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground/80">
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {formatDistanceToNow(new Date(deploy.createdAt), { addSuffix: true })}
                          </span>
                          {deploy.workerNode && (
                            <span className="flex items-center gap-1">
                              <Server className="size-3" />
                              {deploy.workerNode.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      <Badge variant="secondary" className="rounded-full font-mono text-[10px] font-medium cursor-pointer hover:bg-secondary/80">
                        View Logs
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-lg font-medium">Active Runtime</CardTitle>
            <CardDescription>Current execution coordinates.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4 text-sm">
            <div className="space-y-1">
              <span className="text-muted-foreground">Stack Type</span>
              <p className="font-medium">{environment.stackType}</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">Worker Node</span>
              {lastSuccessDeploy?.workerNode ? (
                <p className="font-medium flex items-center gap-2">
                  <Server className="size-3 text-emerald-500" />
                  {lastSuccessDeploy.workerNode.name}
                </p>
              ) : (
                <p className="font-medium italic opacity-70">Waiting for deployment...</p>
              )}
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">Internal Port</span>
              <p className={`font-medium ${!environment.assignedPort ? 'italic opacity-70' : ''}`}>
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