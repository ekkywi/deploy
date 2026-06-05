'use client'

import { useEffect, useState, useMemo } from 'react'
import { toast } from 'sonner'
import { getColumns, AdminUser } from './columns'
import { DataTable } from './data-table'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

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

  const columns = useMemo(
    () => getColumns(handleStatusUpdate, processingId),
    [processingId]
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          User Management
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Account authorization and approval control center.
        </p>
      </div>

      <DataTable columns={columns} data={users} isLoading={isLoading} />
    </div>
  )
}