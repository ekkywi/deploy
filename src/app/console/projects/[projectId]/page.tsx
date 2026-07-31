'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ExternalLink,
  Server,
  Settings,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuthStore } from '@/store/useAuthStore'
import { ProjectWithDetails } from '../columns'
import { MembersTab } from './members-tab'
import { EnvironmentsTab } from './environments-tab'
import { SettingsTab } from './settings-tab'

type ProjectTab = 'environments' | 'members' | 'settings'

function ProjectWorkspaceSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2 border-b border-border pb-3">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-3.5 w-72" />
      </div>
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-56 w-full rounded-md" />
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
  const [activeTab, setActiveTab] = useState<ProjectTab>('environments')

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

  const myMembership = project.members.find((member) => member.userId === user.id)
  const accessLabel = user.role === 'SYSADMIN' ? 'Admin' : myMembership?.role ?? 'No access'

  return (
    <div className="space-y-4">
      <div className="space-y-2 border-b border-border pb-3">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => router.push('/console/projects')}
        >
          <ArrowLeft className="mr-1.5 size-3.5" />
          Projects
        </Button>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-0.5">
            <h1 className="text-lg font-medium tracking-tight">{project.name}</h1>
            {project.description ? (
              <p className="max-w-2xl text-xs text-muted-foreground">{project.description}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {project._count.environments} env
              {project._count.environments === 1 ? '' : 's'}
              <span className="mx-1.5">·</span>
              {project.members.length} member
              {project.members.length === 1 ? '' : 's'}
              <span className="mx-1.5">·</span>
              {accessLabel}
            </p>
          </div>

          {project.repoUrl ? (
            <Button variant="outline" size="sm" className="h-8 shrink-0" asChild>
              <a href={project.repoUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 size-3.5" />
                Repository
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as ProjectTab)}
        className="space-y-3"
      >
        <div className="border-b border-border">
          <TabsList variant="line" className="h-9 w-full justify-start gap-0">
            <TabsTrigger value="environments" className="text-xs">
              <Server className="mr-1.5 size-3.5" />
              Environments
            </TabsTrigger>
            <TabsTrigger value="members" className="text-xs">
              <Users className="mr-1.5 size-3.5" />
              Members
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs">
              <Settings className="mr-1.5 size-3.5" />
              Settings
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="environments" className="m-0">
          <EnvironmentsTab
            projectId={project.id}
            currentUserId={user.id}
            currentUserGlobalRole={user.role}
            projectMembers={project.members}
            onEnvironmentDeleted={() =>
              setProject((currentProject) =>
                currentProject
                  ? {
                      ...currentProject,
                      _count: {
                        ...currentProject._count,
                        environments: Math.max(currentProject._count.environments - 1, 0),
                      },
                    }
                  : currentProject
              )
            }
          />
        </TabsContent>

        <TabsContent value="members" className="m-0">
          <MembersTab
            projectId={project.id}
            currentUserGlobalRole={user.role}
            currentUserId={user.id}
          />
        </TabsContent>

        <TabsContent value="settings" className="m-0">
          <SettingsTab
            projectId={project.id}
            currentUserId={user.id}
            currentUserGlobalRole={user.role}
            projectMembers={project.members}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
