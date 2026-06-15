import { Rocket, Activity, Clock, Server, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import prisma from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'SUCCESS':
      return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"><CheckCircle2 className="mr-1 size-3" /> Success</Badge>
    case 'FAILED':
      return <Badge variant="destructive"><XCircle className="mr-1 size-3" /> Failed</Badge>
    case 'BUILDING':
      return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"><Loader2 className="mr-1 size-3 animate-spin" /> Building</Badge>
    case 'PENDING':
    default:
      return <Badge variant="outline" className="text-muted-foreground"><Clock className="mr-1 size-3" /> Pending</Badge>
  }
}

export default async function GlobalDeploymentsPage() {
  const deployments = await prisma.deployment.findMany({
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Rocket className="size-6 text-primary" /> Global Deployments
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bird's-eye view of all deployment activities across all projects and environments.
        </p>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Recent Activities</CardTitle>
          <CardDescription>Showing the last 50 execution logs.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {deployments.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground flex flex-col items-center">
              <Activity className="size-12 opacity-20 mb-3" />
              <p>No deployments triggered yet.</p>
            </div>
          ) : (
            <div className="divide-y">
              {deployments.map((deploy) => (
                <div key={deploy.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-28">
                      <StatusBadge status={deploy.status} />
                    </div>
                    <div>
                      <p className="font-medium text-sm flex items-center gap-1.5">
                        {deploy.environment.project.name} 
                        <span className="text-muted-foreground">/</span> 
                        <span className="text-muted-foreground">{deploy.environment.name}</span>
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
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
                          <span className="font-mono">
                            {deploy.commitHash.substring(0, 7)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="font-mono text-[10px] cursor-pointer hover:bg-muted-foreground/20">
                      View Logs
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}