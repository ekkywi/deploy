'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ShieldCheck, Ban, CheckCircle2, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

export type AdminUser = {
  id: string
  email: string
  firstName: string
  lastName: string | null
  globalRole: string
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED'
  createdAt: string
}

const renderStatusBadge = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 border-emerald-200">Active</Badge>
    case 'PENDING':
      return <Badge variant="secondary" className="bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 border-amber-200">Pending</Badge>
    case 'SUSPENDED':
      return <Badge variant="destructive">Suspended</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export const getColumns = (
  onAction: (userId: string, newStatus: string) => void,
  processingId: string | null
): ColumnDef<AdminUser>[] => [
  {
    id: 'name', 
    accessorFn: (row) => `${row.firstName} ${row.lastName || ''}`.trim(),
    header: 'Fullname',
    cell: ({ row }) => {
      return (
        <span className="font-medium">
          {row.getValue('name')} 
        </span>
      )
    },
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => <span className="text-muted-foreground">{row.getValue('email')}</span>
  },
  {
    accessorKey: 'globalRole',
    header: 'Access Level',
    cell: ({ row }) => {
      const role = row.getValue('globalRole') as string
      return (
        <div className="flex items-center gap-1.5">
          {role === 'SYSADMIN' && <ShieldCheck className="size-4 text-primary" />}
          <span className="text-sm">{role}</span>
        </div>
      )
    }
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => renderStatusBadge(row.getValue('status')),
  },
  {
    accessorKey: 'createdAt',
    header: 'Registration Date',
    cell: ({ row }) => {
      const dateStr = row.getValue('createdAt') as string
      return (
        <span className="text-muted-foreground text-sm">
          {format(new Date(dateStr), 'dd MMM yyyy, HH:mm')}
        </span>
      )
    }
  },
  {
    id: 'actions',
    header: () => <div className="text-right">Aksi</div>,
    cell: ({ row }) => {
      const user = row.original
      const isProcessing = processingId === user.id

      return (
        <div className="flex justify-end gap-2">
          {user.status === 'PENDING' && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700"
              onClick={() => onAction(user.id, 'ACTIVE')}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-1.5 size-3.5" />
              )}
              Approve
            </Button>
          )}
          
          {user.status === 'ACTIVE' && user.globalRole !== 'SYSADMIN' && (
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => onAction(user.id, 'SUSPENDED')}
              disabled={isProcessing}
            >
              <Ban className="mr-1.5 size-3.5 text-muted-foreground" />
              Suspend
            </Button>
          )}

          {user.status === 'SUSPENDED' && (
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => onAction(user.id, 'ACTIVE')}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-1.5 size-3.5" />
              )}
              Reactivate
            </Button>
          )}
        </div>
      )
    },
  },
]