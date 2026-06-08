'use client'

import { useEffect, useState, useMemo } from 'react'
import { toast } from 'sonner'
import { getColumns, AdminUser } from './columns'
import { DataTable } from './data-table'
import { UserEditSheet } from './user-edit-sheet'
import { AddUserDialog } from './add-user-dialog'

function StatChip({
  label,
  value,
  variant = 'default',
}: {
  label: string
  value: number
  variant?: 'default' | 'pending' | 'active' | 'suspended'
}) {
  const variantStyles = {
    default: 'bg-muted text-foreground',
    pending: 'bg-amber-500/10 text-amber-700 ring-amber-200',
    active: 'bg-emerald-500/10 text-emerald-700 ring-emerald-200',
    suspended: 'bg-destructive/10 text-destructive ring-destructive/20',
  }

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ring-inset ${variantStyles[variant]}`}
    >
      <span className="text-muted-foreground font-normal">{label}</span>
      <span>{value}</span>
    </div>
  )
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users')
      if (!res.ok) throw new Error('Failed to retrieve user data')
      const data = await res.json()
      setUsers(data.users)
    } catch (error) {
      toast.error('Failed to load user list')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusUpdate = async (userId: string, newStatus: string) => {
    setProcessingId(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update status')
      }

      toast.success(data.message)
      
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, status: newStatus as AdminUser['status'] } : user
        )
      )
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setProcessingId(null)
    }
  }

  const handleEditClick = (user: AdminUser) => {
    setSelectedUser(user)
    setIsSheetOpen(true)
  }

  const handleUpdateSuccess = (updatedUser: AdminUser) => {
    setUsers((prev) => 
      prev.map((user) => (user.id === updatedUser.id ? updatedUser : user))
    )
  }

  const columns = useMemo(
    () => getColumns(handleStatusUpdate, handleEditClick, processingId),
    [processingId]
  )

  const stats = useMemo(
    () => ({
      total: users.length,
      pending: users.filter((u) => u.status === 'PENDING').length,
      active: users.filter((u) => u.status === 'ACTIVE').length,
      suspended: users.filter((u) => u.status === 'SUSPENDED').length,
    }),
    [users]
  )

  const handleAddSuccess = (newUser: AdminUser) => {
    setUsers((prev) => [newUser, ...prev])
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            User Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Account authorization and approval control center.
          </p>
        </div>
        
        <AddUserDialog onSuccess={handleAddSuccess} />
      </div>

      <div className="flex flex-wrap gap-2">
        <StatChip label="Total" value={stats.total} />
        <StatChip label="Pending" value={stats.pending} variant="pending" />
        <StatChip label="Active" value={stats.active} variant="active" />
        <StatChip label="Suspended" value={stats.suspended} variant="suspended" />
      </div>

      <DataTable columns={columns} data={users} isLoading={isLoading} />

      <UserEditSheet 
        user={selectedUser} 
        open={isSheetOpen} 
        onOpenChange={setIsSheetOpen}
        onSuccess={handleUpdateSuccess}
      />
    </div>
  )
}