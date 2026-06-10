'use client'

import { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Pencil, Trash2, ExternalLink, ShieldAlert, ShieldCheck } from 'lucide-react'
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
import { GlobalRole, ProjectRoleType } from '@prisma/client'
import { cn } from '@/lib/utils'

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

export type ProjectWithDetails = {
  id: string
  name: string
  description: string | null
  repoUrl: string | null
  createdAt: string
  updatedAt: string
  members: ProjectMember[]
  _count: {
    environments: number
  }
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
      return (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{name}</span>
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
      const myMembership = row.original.members.find(m => m.userId === currentUserId)
      
      if (currentUserGlobalRole === 'SYSADMIN') {
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
      const count = row.original._count.environments
      return (
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{count}</Badge>
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
      const isSysadmin = currentUserGlobalRole === 'SYSADMIN'
      const isOwner = myMembership?.role === 'OWNER'
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
