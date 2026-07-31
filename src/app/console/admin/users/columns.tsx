'use client'

import { ColumnDef, Column } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ShieldCheck, Ban, CheckCircle2, Loader2, ArrowUpDown, Edit2 } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export type AdminUser = {
  id: string
  email: string
  firstName: string
  lastName: string | null
  globalRole: string
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED'
  createdAt: string
}

const ROLE_LABELS: Record<string, string> = {
  SYSADMIN: 'System Admin',
  MANAGER: 'Manager',
  DEVELOPER: 'Developer',
}

function getInitials(firstName: string, lastName: string | null) {
  const first = firstName.charAt(0).toUpperCase()
  const last = lastName ? lastName.charAt(0).toUpperCase() : ''
  return `${first}${last}` || first
}

function SortableHeader<TData>({
  column,
  label,
  align = 'start',
}: {
  column: Column<TData, unknown>
  label: string
  align?: 'start' | 'offset'
}) {
  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      className={cn(
        'h-8 px-0 font-medium uppercase tracking-wide text-xs text-muted-foreground hover:text-foreground',
        align === 'offset' && 'pl-9'
      )}
    >
      {label}
      <ArrowUpDown className="ml-2 size-3.5" />
    </Button>
  )
}

const renderStatusBadge = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return (
        <Badge className="gap-1.5 border-emerald-400/14 bg-emerald-400/10 text-emerald-200 shadow-[0_0_0_1px_rgba(16,185,129,0.02)_inset] hover:bg-emerald-400/14">
          <span className="size-1.5 rounded-full bg-emerald-300/80" aria-hidden />
          Active
        </Badge>
      )
    case 'PENDING':
      return (
        <Badge
          variant="secondary"
          className="gap-1.5 border-amber-300/14 bg-amber-300/10 text-amber-100 shadow-[0_0_0_1px_rgba(251,191,36,0.02)_inset] hover:bg-amber-300/14"
        >
          <span className="size-1.5 rounded-full bg-amber-200/80" aria-hidden />
          Pending
        </Badge>
      )
    case 'SUSPENDED':
      return (
        <Badge variant="destructive" className="gap-1.5 border-destructive/14 bg-destructive/10 text-rose-200">
          <span className="size-1.5 rounded-full bg-rose-300/80" aria-hidden />
          Suspended
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

const renderRoleBadge = (role: string) => {
  const label = ROLE_LABELS[role] ?? role
  return (
    <Badge variant="outline" className="gap-1 border-border/60 bg-background/55 font-normal text-foreground/88">
      {role === 'SYSADMIN' && <ShieldCheck className="size-3 text-primary" />}
      {label}
    </Badge>
  )
}

function ActionIconButton({
  label,
  onClick,
  disabled,
  isProcessing,
  className,
  children,
}: {
  label: string
  onClick?: () => void
  disabled?: boolean
  isProcessing?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`size-8 ${className ?? ''}`}
          onClick={onClick}
          disabled={disabled}
        >
          {isProcessing ? <Loader2 className="size-4 animate-spin" /> : children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export const getColumns = (
  onAction: (userId: string, newStatus: string) => void,
  onEdit: (user: AdminUser) => void,
  processingId: string | null
): ColumnDef<AdminUser>[] => [
  {
    id: 'user',
    accessorFn: (row) =>
      `${row.firstName} ${row.lastName || ''} ${row.email}`.trim(),
    header: ({ column }) => (
      <SortableHeader column={column} label="User" align="offset" />
    ),
    cell: ({ row }) => {
      const user = row.original
      const fullName = `${user.firstName} ${user.lastName || ''}`.trim()

      return (
        <div className="flex items-center gap-3">
          <Avatar size="sm">
            <AvatarFallback className="text-xs font-medium">
              {getInitials(user.firstName, user.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">{fullName}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: 'globalRole',
    header: 'Access Level',
    cell: ({ row }) => renderRoleBadge(row.getValue('globalRole') as string),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => renderStatusBadge(row.getValue('status')),
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <SortableHeader column={column} label="Registered" />
    ),
    cell: ({ row }) => {
      const dateStr = row.getValue('createdAt') as string
      const date = new Date(dateStr)

      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-default text-sm text-muted-foreground">
              {format(date, 'dd MMM yyyy')}
            </span>
          </TooltipTrigger>
          <TooltipContent>{format(date, 'dd MMM yyyy, HH:mm')}</TooltipContent>
        </Tooltip>
      )
    },
  },
  {
    id: 'actions',
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => {
      const user = row.original
      const isProcessing = processingId === user.id

      return (
        <div className="flex justify-end gap-0.5">
          <ActionIconButton
            label="Edit user"
            onClick={() => onEdit(user)}
            disabled={isProcessing}
          >
            <Edit2 className="size-4" />
          </ActionIconButton>

          {user.status === 'PENDING' && (
            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-4" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent>Approve account</TooltipContent>
              </Tooltip>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Approve User Account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action will activate the <strong>{user.email}</strong>{' '}
                    account and give them access to the console according
                    to their role.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onAction(user.id, 'ACTIVE')}>
                    Yes, Approve
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {user.status === 'ACTIVE' && user.globalRole !== 'SYSADMIN' && (
            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      disabled={isProcessing}
                    >
                      <Ban className="size-4" />
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent>Suspend account</TooltipContent>
              </Tooltip>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Suspend User Account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    The <strong>{user.email}</strong> account will be immediately
                    removed from its active session and will not be able to enter the
                    system until the account is reactivated.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onAction(user.id, 'SUSPENDED')}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, Suspend
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {user.status === 'SUSPENDED' && (
            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-primary"
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-4" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent>Reactivate account</TooltipContent>
              </Tooltip>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reactivate Account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Lift the suspension on the <strong>{user.email}</strong> account.
                    Users will be able to log back into the system.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onAction(user.id, 'ACTIVE')}>
                    Reactivate
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      )
    },
  },
]
