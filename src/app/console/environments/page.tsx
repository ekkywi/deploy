import Link from 'next/link'
import prisma from '@/lib/prisma'
import { Box, ArrowRight, Server } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConsolePageHeader } from '@/components/layout/console-page-header'
import { ConsoleStatChip } from '@/components/layout/console-stat-chip'
import { AutoRefresh } from '@/components/auto-refresh'
import { requireAuth } from '@/lib/auth'
import { GlobalRole } from '@prisma/client'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function EnvironmentsShortcutPage() {
  const headersList = await headers()
  const dummyRequest = new Request('http://localhost', { headers: headersList })
  const auth = await requireAuth(dummyRequest)

  if (!auth.session) {
    redirect('/auth/login')
  }

  const { userId, role } = auth.session

  const projects = await prisma.project.findMany({
    where: role === GlobalRole.SYSADMIN ? undefined : {
      members: {
        some: { userId: userId }
      }
    },
    include: {
      environments: {
        include: {
          deployments: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { status: true }
          }
        }
      }
    },
    orderBy: { updatedAt: 'desc' }
  })

  const totals = projects.reduce(
    (acc, project) => {
      acc.environments += project.environments.length

      project.environments.forEach((env) => {
        const lastDeploy = env.deployments[0]
        if (!lastDeploy) {
          acc.withoutDeploy += 1
          return
        }

        if (lastDeploy.status === 'SUCCESS') acc.success += 1
        if (lastDeploy.status === 'BUILDING') acc.building += 1
        if (lastDeploy.status === 'FAILED') acc.failed += 1
      })

      return acc
    },
    {
      environments: 0,
      success: 0,
      building: 0,
      failed: 0,
      withoutDeploy: 0,
    }
  )

  const hasLiveDeployments = projects.some((project) =>
    project.environments.some((env) => {
      const lastDeploy = env.deployments[0]
      return lastDeploy?.status === 'PENDING' || lastDeploy?.status === 'BUILDING'
    })
  )

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        eyebrow="Workspace Operations"
        title="Environment Hub"
        description="A shortcut view for managing all environments across your projects."
      />

      <div className="flex flex-wrap gap-2">
        <ConsoleStatChip label="Projects" value={projects.length} />
        <ConsoleStatChip label="Environments" value={totals.environments} />
        <ConsoleStatChip label="Latest Success" value={totals.success} variant="active" />
        <ConsoleStatChip label="Deploying" value={totals.building} variant="info" />
        <ConsoleStatChip label="No Deploys" value={totals.withoutDeploy} />
      </div>

      {projects.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 text-center text-muted-foreground">
            <Box className="mb-3 size-10 opacity-20" />
                    <p className="text-sm">No projects or environments found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => (
            <Card key={project.id}>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-[15px] font-medium tracking-[-0.02em]">
                  <Box className="size-[18px] text-muted-foreground" aria-hidden />
                  {project.name}
                </CardTitle>
                <CardDescription className="text-sm leading-6">
                  {project.environments.length} environment(s) provisioned.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {project.environments.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground/90">
                    No environments have been created for this project yet.
                  </div>
                ) : (
                  <div className="divide-y divide-border/80">
                    {project.environments.map((env) => {
                      const lastDeploy = env.deployments[0]
                      let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "outline"
                      let statusText = "No Deployments"

                      if (lastDeploy) {
                        statusText = lastDeploy.status
                        if (statusText === 'SUCCESS') badgeVariant = "default"
                        if (statusText === 'FAILED') badgeVariant = "destructive"
                        if (statusText === 'BUILDING') badgeVariant = "secondary"
                      }

                      return (
                        <div key={env.id} className="flex items-center justify-between p-4 transition-colors hover:bg-muted/35">
                          <div className="flex items-center gap-4">
                            <div className="flex size-9 items-center justify-center rounded-lg border bg-background">
                              <Server className="size-[18px] text-muted-foreground" aria-hidden />
                            </div>
                            <div>
                              <p className="flex items-center gap-2 text-sm font-medium">
                                {env.name}
                                <Badge variant="outline" className="text-[10px] uppercase tracking-[0.16em]">
                                  {env.tier}
                                </Badge>
                              </p>
                              <div className="mt-1 flex items-center gap-2">
                                <span className="text-[11px] text-muted-foreground/80">Last status:</span>
                                <Badge variant={badgeVariant} className="h-4 px-1.5 py-0 text-[10px]">
                                  {statusText}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          <Button variant="ghost" size="sm" className="text-xs" asChild>
                            <Link href={`/console/projects/${project.id}/environments/${env.id}`}>
                              Manage <ArrowRight className="ml-2 size-4" />
                            </Link>
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AutoRefresh isActive={hasLiveDeployments} />
    </div>
  )
}