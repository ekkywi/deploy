import { Activity, Clock, Server, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import prisma from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { ConsolePageHeader } from '@/components/layout/console-page-header'
import { ConsoleStatChip } from '@/components/layout/console-stat-chip'
import { AutoRefresh } from '@/components/auto-refresh'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { GlobalRole } from '@prisma/client'
import { DeploymentLogDialog } from '@/components/deployment-log-dialog'

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

export default async function GlobalDeploymentsPage() {
  const headersList = await headers()
  const dummyRequest = new Request('http://localhost', { headers: headersList })
  const auth = await requireAuth(dummyRequest)

  if (!auth.session) {
    redirect('/auth/login') 
  }

  const { userId, role } = auth.session

  const deployments = await prisma.deployment.findMany({
    where: role === GlobalRole.SYSADMIN ? undefined : {
      environment: {
        project: {
          members: {
            some: { userId: userId }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      environment: {
        include: {
          project: { select: { name: true } }
        }
      },
      workerNode: { select: { name: true } }
    }
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
    <div className="space-y-6">
      <ConsolePageHeader
        eyebrow="Operational Review"
        title="Global Deployments"
        description="Bird's-eye view of all deployment activities across all projects and environments."
      />

      <div className="flex flex-wrap gap-2">
        <ConsoleStatChip label="Total" value={deployments.length} />
        <ConsoleStatChip label="Success" value={totals.success} variant="active" />
        <ConsoleStatChip label="Building" value={totals.building} variant="info" />
        <ConsoleStatChip label="Pending" value={totals.pending} variant="pending" />
        <ConsoleStatChip label="Failed" value={totals.failed} variant="destructive" />
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-[15px] font-medium tracking-[-0.02em]">Recent Activities</CardTitle>
          <CardDescription className="text-[13px] leading-5">Showing the last 50 execution logs.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {deployments.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center text-muted-foreground">
              <Activity className="mb-3 size-8 opacity-20" />
              <p className="text-[13px] font-medium text-foreground/85">No deployments triggered yet.</p>
              <p className="mt-1 text-[13px] leading-5 text-muted-foreground/85">
                Deployment activity will appear here once environments start releasing builds.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/70">
              {deployments.map((deploy) => (
                <div key={deploy.id} className="flex items-center justify-between p-3.5 transition-colors hover:bg-muted/30">
                  <div className="flex items-center gap-3.5">
                    <div className="w-28">
                      <StatusBadge status={deploy.status} />
                    </div>
                    <div>
                      <p className="flex items-center gap-1.5 text-[13px] font-medium tracking-[-0.01em]">
                        {deploy.environment.project.name} 
                        <span className="text-muted-foreground">/</span> 
                        <span className="text-muted-foreground">{deploy.environment.name}</span>
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground/78">
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
                        {deploy.commitHash && (
                          <span className="font-mono text-[11px]">
                            {deploy.commitHash.substring(0, 7)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
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
        </CardContent>
      </Card>

      <AutoRefresh isActive={hasLiveDeployments} />
    </div>
  )
}