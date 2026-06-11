'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  CalendarClock,
  ExternalLink,
  LayoutDashboard,
  Server,
  Settings,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuthStore } from '@/store/useAuthStore'
import { ProjectWithDetails } from '../columns'
import { MembersTab } from './members-tab'

type DetailStatProps = {
  label: string
  value: string
  hint?: string
}

function DetailStat({ label, value, hint }: DetailStatProps) {
  return (
    <div className="rounded-2xl border border-border/80 bg-muted/35 p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 text-sm font-medium text-foreground">{value}</p>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
    </div>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function ProjectWorkspaceSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="h-11 w-full max-w-lg rounded-2xl" />
          <Skeleton className="h-5 w-full max-w-xl" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-10 w-36 rounded-full" />
          <Skeleton className="h-10 w-28 rounded-full" />
          <Skeleton className="h-10 w-40 rounded-full" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader className="border-b">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="pt-5">
          <Skeleton className="h-10 w-full max-w-[520px] rounded-lg" />
          <Skeleton className="mt-6 h-64 rounded-2xl" />
        </CardContent>
      </Card>
    </div>
  )
}

export default function ProjectWorkspacePage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const router = useRouter()
  const { user } = useAuthStore()
  const resolvedParams = use(params)
  const { projectId } = resolvedParams

  const [project, setProject] = useState<ProjectWithDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      return
    }

    let isActive = true

    const fetchProjectDetails = async () => {
      setIsLoading(true)

      try {
        const res = await fetch('/api/projects')
        if (!res.ok) throw new Error('Failed to load project details')

        const data = await res.json()
        const projects = data.projects as ProjectWithDetails[]
        const foundProject = projects.find((item) => item.id === projectId)

        if (!isActive) return

        if (!foundProject) {
          toast.error('Project not found')
          router.push('/console/projects')
          return
        }

        setProject(foundProject)
      } catch {
        if (isActive) {
          toast.error('Failed to communicate with server')
          router.push('/console/projects')
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void fetchProjectDetails()

    return () => {
      isActive = false
    }
  }, [projectId, router, user])

  if (!user || isLoading) {
    return <ProjectWorkspaceSkeleton />
  }

  if (!project) return null

  const projectOwner = project.members.find((member) => member.role === 'OWNER')
  const myMembership = project.members.find((member) => member.userId === user.id)
  const accessLabel = user.role === 'SYSADMIN' ? 'System Admin' : myMembership?.role ?? 'No access'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Button
            variant="ghost"
            className="w-fit rounded-full px-3 text-muted-foreground hover:text-foreground"
            onClick={() => router.push('/console/projects')}
          >
            <ArrowLeft className="mr-2 size-4" />
            Back to Projects
          </Button>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Project Workspace
            </p>
            <h1 className="text-3xl font-medium tracking-[-0.04em] text-foreground lg:text-4xl">
              {project.name}
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              {project.description ||
                'Workspace metadata, access, and deployment context live here.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="rounded-full border-border/60 bg-muted/38 px-3 py-1.5 font-normal text-foreground">
            <Users className="mr-1.5 size-3.5" />
            {project.members.length} Members
          </Badge>
          <Badge variant="outline" className="rounded-full border-border/60 bg-muted/38 px-3 py-1.5 font-normal text-foreground">
            <Server className="mr-1.5 size-3.5" />
            {project._count.environments} Environments
          </Badge>
          <Badge variant="outline" className="rounded-full border-border/60 bg-muted/38 px-3 py-1.5 font-normal text-foreground">
            <CalendarClock className="mr-1.5 size-3.5" />
            Updated {formatDate(project.updatedAt)}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-lg font-medium">Workspace snapshot</CardTitle>
            <CardDescription>
              High-level metadata for the current project workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
            <DetailStat
              label="Repository"
              value={project.repoUrl ? 'Repository linked' : 'No repository linked'}
              hint={project.repoUrl ? 'Open the external repository source.' : 'Link a repository when the workspace is ready.'}
            />
            <DetailStat
              label="Project Owner"
              value={projectOwner ? `${projectOwner.user.firstName} ${projectOwner.user.lastName || ''}`.trim() : 'No owner set'}
              hint={projectOwner?.user.email || 'Ownership is not assigned yet.'}
            />
            <DetailStat
              label="Created"
              value={formatDate(project.createdAt)}
              hint="Original project registration timestamp."
            />
            <DetailStat
              label="Updated"
              value={formatDate(project.updatedAt)}
              hint="Last workspace metadata change."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-lg font-medium">Access summary</CardTitle>
            <CardDescription>
              Current session context and workspace visibility.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
            <DetailStat
              label="Your access"
              value={accessLabel}
              hint={user.role === 'SYSADMIN' ? 'Global access for this console session.' : 'Scoped access for this workspace.'}
            />
            <DetailStat
              label="Visibility"
              value={user.role === 'SYSADMIN' ? 'Full console visibility' : 'Project-scoped visibility'}
              hint="Permissions are evaluated from the active session."
            />
            <div className="sm:col-span-2 rounded-2xl border border-border/80 bg-muted/35 p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Repository
              </p>
              {project.repoUrl ? (
                <a
                  href={project.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-foreground transition-colors hover:text-muted-foreground"
                >
                  <ExternalLink className="size-4" />
                  <span className="truncate">{project.repoUrl.replace(/^https?:\/\//, '')}</span>
                </a>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  No repository has been linked to this workspace yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="members" className="space-y-4">
        <div className="rounded-[1.5rem] border border-border/70 bg-card/95 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
          <TabsList variant="line" className="w-full justify-start gap-1">
            <TabsTrigger value="overview">
              <LayoutDashboard className="mr-2 size-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="members">
              <Users className="mr-2 size-4" />
              Members
            </TabsTrigger>
            <TabsTrigger value="environments">
              <Server className="mr-2 size-4" />
              Environments
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="mr-2 size-4" />
              Settings
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="m-0">
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-lg font-medium">Workspace Overview</CardTitle>
              <CardDescription>
                Core summary details for this project workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
              <DetailStat label="Members" value={`${project.members.length}`} hint="Team members currently assigned." />
              <DetailStat label="Environments" value={`${project._count.environments}`} hint="Deployment targets registered to this project." />
              <DetailStat label="Access" value={accessLabel} hint="Session-scoped permissions in the console." />
              <DetailStat label="Repository" value={project.repoUrl ? 'Linked' : 'Not linked'} hint="External source control connection." />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="m-0">
          <MembersTab
            projectId={project.id}
            currentUserGlobalRole={user.role}
            currentUserId={user.id}
          />
        </TabsContent>

        <TabsContent value="environments" className="m-0">
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-lg font-medium">Environments</CardTitle>
              <CardDescription>
                Deployment environments and node mappings will appear here.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="rounded-2xl border border-dashed border-border/70 bg-muted/30 p-6 text-sm text-muted-foreground">
                Environment management is not implemented yet.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="m-0">
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-lg font-medium">Workspace Settings</CardTitle>
              <CardDescription>
                Project settings and operational controls will appear here.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="rounded-2xl border border-dashed border-border/70 bg-muted/30 p-6 text-sm text-muted-foreground">
                Settings controls are not implemented yet.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
