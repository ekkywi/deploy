'use client'

import { useEffect, useState, useMemo } from 'react'
import { toast } from 'sonner'
import { getColumns, AdminUser } from './columns'
import { DataTable } from './data-table'
import { UserEditSheet } from './user-edit-sheet'
import { AddUserDialog } from './add-user-dialog'
import { ConsolePageHeader } from '@/components/layout/console-page-header'
import { ConsoleStatChip } from '@/components/layout/console-stat-chip'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)

  useEffect(() => {
    let isActive = true

    const loadUsers = async () => {
      try {
        const res = await fetch('/api/admin/users')
        if (!res.ok) throw new Error('Failed to retrieve user data')
        const data = await res.json()

        if (!isActive) return

        setUsers(data.users)
      } catch {
        if (isActive) {
          toast.error('Failed to load user list')
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadUsers()

    return () => {
      isActive = false
    }
  }, [])

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
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to update status')
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
      <ConsolePageHeader
        title="Users"
        description="Approve accounts and manage access."
        actions={<AddUserDialog onSuccess={handleAddSuccess} />}
      />

      <div className="flex flex-wrap gap-2">
        <ConsoleStatChip label="Total" value={stats.total} />
        <ConsoleStatChip label="Pending" value={stats.pending} variant="pending" />
        <ConsoleStatChip label="Active" value={stats.active} variant="active" />
        <ConsoleStatChip label="Suspended" value={stats.suspended} variant="destructive" />
      </div>

      <DataTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        searchPlaceholder="Search users..."
        entityLabel="users"
        emptyTitle="No users found"
      />

      <UserEditSheet 
        user={selectedUser} 
        open={isSheetOpen} 
        onOpenChange={setIsSheetOpen}
        onSuccess={handleUpdateSuccess}
      />
    </div>
  )
}
