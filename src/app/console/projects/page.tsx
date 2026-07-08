'use client'

import { useEffect, useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/useAuthStore'
import { ConsolePageHeader } from '@/components/layout/console-page-header'
import { ConsoleStatChip } from '@/components/layout/console-stat-chip'
import { getColumns, ProjectWithDetails } from './columns'
import { DataTable } from '../admin/users/data-table'
import { CreateProjectDialog } from './create-project-dialog'
import { EditProjectDialog } from './edit-project-dialog'
import { formatProjectDeleteErrorMessage, formatProjectDeleteSuccessMessage } from './delete-message-utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export default function ProjectsPage() {
  const { user } = useAuthStore()
  const [projects, setProjects] = useState<ProjectWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<ProjectWithDetails | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [projectPendingDelete, setProjectPendingDelete] = useState<ProjectWithDetails | null>(null)

  useEffect(() => {
    if (!user) {
      return
    }

    let isActive = true

    const loadProjects = async () => {
      setIsLoading(true)

      try {
        const res = await fetch('/api/projects')
        if (!res.ok) throw new Error('Failed to retrieve project data')

        const data = await res.json()
        if (!isActive) return

        setProjects(data.projects)
      } catch {
        if (isActive) {
          toast.error('Failed to load project list')
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadProjects()

    return () => {
      isActive = false
    }
  }, [user])

  const handleEditClick = (project: ProjectWithDetails) => {
    setSelectedProject(project)
    setIsEditOpen(true)
  }

  const handleDeleteRequest = (project: ProjectWithDetails) => {
    setProjectPendingDelete(project)
  }

  const handleDeleteConfirm = async () => {
    if (!projectPendingDelete) return

    const targetProject = projectPendingDelete
    try {
      const res = await fetch(`/api/projects/${targetProject.id}`, {
        method: 'DELETE',
      })
      
      const data = await res.json()
      if (!res.ok) {
        throw new Error(formatProjectDeleteErrorMessage(data))
      }

      toast.success(formatProjectDeleteSuccessMessage(data))
      setProjectPendingDelete(null)
      
      setProjects((prev) => prev.filter((p) => p.id !== targetProject.id))
    } catch (error: unknown) {
      setProjectPendingDelete(null)
      toast.error(error instanceof Error ? error.message : 'Failed to delete project')
    }
  }

  const columns = useMemo(
    () => {
      if (!user) return []
      return getColumns(user.id, user.role, handleEditClick, handleDeleteRequest)
    },
    [user]
  )

  const stats = useMemo(() => {
    if (!user) return { total: 0, myOwn: 0 }
    return {
      total: projects.length,
      myOwn: projects.filter(p => 
        p.members.some(m => m.userId === user.id && m.role === 'OWNER')
      ).length
    }
  }, [projects, user])

  if (!user) return null

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        eyebrow="Project Administration"
        title="Project Management"
        description="Organize workloads, repositories, and logical environments."
        actions={
          <Button onClick={() => setIsCreateOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 size-4" />
            Create Project
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        <ConsoleStatChip label="Total Projects" value={stats.total} />
        <ConsoleStatChip label="Owned by Me" value={stats.myOwn} />
      </div>

      <DataTable
        columns={columns}
        data={projects}
        isLoading={isLoading}
        searchPlaceholder="Search projects..."
        entityLabel="projects"
        emptyTitle="No projects found"
        emptyDescription="Create a project or adjust your search terms."
      />

      <CreateProjectDialog 
        open={isCreateOpen} 
        onOpenChange={setIsCreateOpen} 
        onSuccess={(newProject) => setProjects(prev => [newProject, ...prev])} 
      />
      
      <EditProjectDialog
        project={selectedProject}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onSuccess={(updatedProject) => setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p))}
      />

      <AlertDialog
        open={Boolean(projectPendingDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setProjectPendingDelete(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              {projectPendingDelete ? (
                <>
                  This will permanently delete <strong>{projectPendingDelete.name}</strong> after all
                  environments inside it are torn down. If any container is still running, delete will be
                  blocked until it is stopped.
                </>
              ) : (
                'This action cannot be undone.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDeleteConfirm}>
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
