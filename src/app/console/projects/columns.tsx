'use client'

import { ColumnDef } from '@tanstack/react-table'
import Link from 'next/link'
import { MoreHorizontal, Pencil, Trash2, ExternalLink, ShieldAlert, ShieldCheck, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const GLOBAL_ROLES = {
  SYSADMIN: 'SYSADMIN',
  MANAGER: 'MANAGER',
  DEVELOPER: 'DEVELOPER',
} as const

const PROJECT_ROLES = {
  OWNER: 'OWNER',
  EDITOR: 'EDITOR',
  VIEWER: 'VIEWER',
} as const

type GlobalRole = typeof GLOBAL_ROLES[keyof typeof GLOBAL_ROLES]
type ProjectRoleType = typeof PROJECT_ROLES[keyof typeof PROJECT_ROLES]

export type ProjectMember = {
  userId: string
  role: ProjectRoleType
  user: {
    id: string
    firstName: string
    lastName: string | null
    email: string
  }
}

export type ProjectEnvironmentSummary = {
  id: string
  name: string
  tier: 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT'
}

export type ProjectWithDetails = {
  id: string
  name: string
  description: string | null
  repoUrl: string | null
  createdAt: string
  updatedAt: string
  members: ProjectMember[]
  environments: ProjectEnvironmentSummary[]
  _count: {
    environments: number
  }
}

const environmentTierStyles: Record<ProjectEnvironmentSummary['tier'], string> = {
  PRODUCTION: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/14',
  STAGING: 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/14',
  DEVELOPMENT: 'border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/14',
}

export const getColumns = (
  currentUserId: string,
  currentUserGlobalRole: GlobalRole,
  onEdit: (project: ProjectWithDetails) => void,
  onRequestDelete: (project: ProjectWithDetails) => void
): ColumnDef<ProjectWithDetails>[] => [
  {
    accessorKey: 'name',
    header: 'Project Name',
    cell: ({ row }) => {
      const name = row.getValue('name') as string
      const description = row.original.description
      const projectId = row.original.id
      return (
        <div className="flex flex-col">
          <Link
            href={`/console/projects/${projectId}`}
            className="font-medium text-foreground transition-colors hover:text-foreground/80"
          >
            {name}
          </Link>
          {description && (
            <span className="text-xs text-muted-foreground line-clamp-1 max-w-[300px]">
              {description}
            </span>
          )}
        </div>
      )
    },
  },
  {
    id: 'myRole',
    header: 'My Access',
    cell: ({ row }) => {
      const myMembership = row.original.members?.find(m => m.userId === currentUserId)
      
      if (currentUserGlobalRole === GLOBAL_ROLES.SYSADMIN) {
        return (
          <Badge variant="outline" className="gap-1 border-border/60 bg-background/55 font-normal text-foreground/88">
            <ShieldCheck className="size-3 text-primary" />
            System Admin
          </Badge>
        )
      }

      if (!myMembership) return <Badge variant="outline">NO ACCESS</Badge>

      const roleColors = {
        OWNER: 'border-emerald-400/14 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/14',
        EDITOR: 'border-sky-400/14 bg-sky-400/10 text-sky-200 hover:bg-sky-400/14',
        VIEWER: 'border-border/60 bg-background/55 text-foreground/72 hover:bg-background/70',
      }

      return (
        <Badge variant="outline" className={cn('font-normal', roleColors[myMembership.role])}>
          {myMembership.role}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'repoUrl',
    header: 'Repository',
    cell: ({ row }) => {
      const url = row.getValue('repoUrl') as string | null
      if (!url) return <span className="text-muted-foreground text-sm">-</span>
      
      return (
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex w-fit items-center gap-1 text-sm text-foreground/80 transition-colors hover:text-foreground"
        >
          <ExternalLink className="size-3" />
          <span className="truncate max-w-[200px]">{url.replace(/^https?:\/\//, '')}</span>
        </a>
      )
    },
  },
  {
    id: 'environments',
    header: 'Environments',
    cell: ({ row }) => {
      const projectId = row.original.id
      const environments = row.original.environments ?? []

      if (environments.length === 0) {
        return <span className="text-sm text-muted-foreground">None</span>
      }

      return (
        <div className="flex max-w-[280px] flex-wrap gap-1.5">
          {environments.map((env) => (
            <Link
              key={env.id}
              href={`/console/projects/${projectId}/environments/${env.id}`}
              className={cn(
                'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors',
                environmentTierStyles[env.tier]
              )}
              title={`Open ${env.name} dashboard`}
            >
              {env.name}
            </Link>
          ))}
        </div>
      )
    },
  },
  {
    id: 'actions',
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => {
      const project = row.original
      const myMembership = project.members.find(m => m.userId === currentUserId)
      const isSysadmin = currentUserGlobalRole === GLOBAL_ROLES.SYSADMIN
      const isOwner = myMembership?.role === PROJECT_ROLES.OWNER
      const canModify = isSysadmin || isOwner

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link href={`/console/projects/${project.id}`} className="cursor-pointer font-medium">
                <Settings className="mr-2 size-4" />
                Manage Workspace
              </Link>
            </DropdownMenuItem>
            
            {canModify ? (
              <>
                <DropdownMenuItem onClick={() => onEdit(project)} className="cursor-pointer">
                  <Pencil className="mr-2 size-4" />
                  Edit Metadata
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onRequestDelete(project)} className="cursor-pointer text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 size-4" />
                  Delete Project
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem disabled>
                <ShieldAlert className="mr-2 size-4" />
                View Only (Requires Owner)
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
