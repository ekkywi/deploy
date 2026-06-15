import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Activity, GitBranch } from 'lucide-react'
import prisma from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DeployButton } from './deploy-button'

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
      project: { select: { name: true, repoUrl: true } }
    }
  })

  if (!environment) {
    notFound()
  }

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
          
          <DeployButton 
            projectId={projectId} 
            environmentId={environmentId} 
            hasRepoUrl={!!environment.project.repoUrl} 
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="border-b">
            <CardTitle className="text-lg font-medium">Deployment History</CardTitle>
            <CardDescription>Recent builds and execution logs for this environment.</CardDescription>
          </CardHeader>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Activity className="mx-auto size-12 opacity-20 mb-3" />
            <p>No deployments yet.</p>
            <p className="text-sm">Click "Trigger Deploy" to start your first build.</p>
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
              <p className="font-medium italic opacity-70">Waiting for deployment...</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">Internal Port</span>
              <p className="font-medium italic opacity-70">Unassigned</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}