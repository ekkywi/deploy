'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Loader2,
  Shield,
  ShieldAlert,
  Trash2,
  UserPlus,
} from 'lucide-react'
import { GlobalRole, ProjectRoleType } from '@prisma/client'
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
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

type ProjectMember = {
  userId: string
  role: ProjectRoleType
  user: {
    id: string
    firstName: string
    lastName: string | null
    email: string
  }
}

type SuggestedUser = {
  id: string
  email: string
  firstName: string
  lastName: string | null
}

type RemovalTarget = {
  userId: string
  displayName: string
  email: string
  isSelfLeave: boolean
}

interface MembersTabProps {
  projectId: string
  currentUserId: string
  currentUserGlobalRole: GlobalRole
}

const roleBadgeClasses: Record<ProjectRoleType, string> = {
  OWNER: 'border-emerald-400/14 bg-emerald-400/10 text-emerald-200',
  EDITOR: 'border-sky-400/14 bg-sky-400/10 text-sky-200',
  VIEWER: 'border-border/60 bg-background/55 text-foreground/72',
}

function getInitials(firstName: string, lastName: string | null) {
  const first = firstName.charAt(0).toUpperCase()
  const last = lastName ? lastName.charAt(0).toUpperCase() : ''
  return `${first}${last}` || first
}

function getMemberDisplayName(member: ProjectMember) {
  return `${member.user.firstName} ${member.user.lastName || ''}`.trim()
}

export function MembersTab({ projectId, currentUserId, currentUserGlobalRole }: MembersTabProps) {
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedRole, setSelectedRole] = useState<ProjectRoleType>(ProjectRoleType.VIEWER)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pendingRemoval, setPendingRemoval] = useState<RemovalTarget | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  const myMembership = members.find((member) => member.userId === currentUserId)
  const isSysadmin = currentUserGlobalRole === GlobalRole.SYSADMIN
  const isOwner = myMembership?.role === ProjectRoleType.OWNER
  const canModify = isSysadmin || isOwner

  useEffect(() => {
    let isActive = true

    const loadMembers = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/members`)
        if (!res.ok) throw new Error('Failed to fetch members')

        const data = await res.json()
        if (!isActive) return

        setMembers(data.members)
      } catch (error: unknown) {
        if (isActive) {
          toast.error(error instanceof Error ? error.message : 'Failed to load members')
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadMembers()

    return () => {
      isActive = false
    }
  }, [projectId])

  useEffect(() => {
    const trimmedQuery = searchQuery.trim()

    if (trimmedQuery.length < 3) {
      const resetTimeoutId = window.setTimeout(() => {
        setSuggestions([])
        setIsSearching(false)
      }, 0)

      return () => {
        window.clearTimeout(resetTimeoutId)
      }
    }

    const searchingTimeoutId = window.setTimeout(() => {
      setIsSearching(true)
    }, 0)
    const controller = new AbortController()

    const timeoutId = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(trimmedQuery)}`, {
          signal: controller.signal,
        })

        if (!res.ok) {
          setSuggestions([])
          return
        }

        const data = await res.json()
        setSuggestions(data.users)
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          console.error('Search error', error)
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false)
        }
      }
    }, 300)

    return () => {
      controller.abort()
      window.clearTimeout(searchingTimeoutId)
      window.clearTimeout(timeoutId)
    }
  }, [searchQuery])

  const handleAddMember = async () => {
    if (searchQuery.trim().length < 3) return

    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: searchQuery, role: selectedRole }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add member')

      toast.success(data.message)
      setSearchQuery('')
      setSuggestions([])
      await reloadMembers()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to add member')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateRole = async (targetUserId: string, newRole: ProjectRoleType) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/members/${targetUserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update role')

      toast.success(data.message)
      setMembers((prev) =>
        prev.map((member) => (member.userId === targetUserId ? { ...member, role: newRole } : member))
      )
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to update role')
    }
  }

  const requestRemoveMember = (member: ProjectMember, isSelfLeave = false) => {
    setPendingRemoval({
      userId: member.userId,
      displayName: getMemberDisplayName(member),
      email: member.user.email,
      isSelfLeave,
    })
  }

  const confirmRemoveMember = async () => {
    if (!pendingRemoval) return

    setIsRemoving(true)

    try {
      const res = await fetch(`/api/projects/${projectId}/members/${pendingRemoval.userId}`, {
        method: 'DELETE',
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to remove member')

      toast.success(data.message)

      if (pendingRemoval.isSelfLeave) {
        window.location.href = '/console/projects'
        return
      }

      setMembers((prev) => prev.filter((member) => member.userId !== pendingRemoval.userId))
      setPendingRemoval(null)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove member')
    } finally {
      setIsRemoving(false)
    }
  }

  async function reloadMembers() {
    const res = await fetch(`/api/projects/${projectId}/members`)
    if (!res.ok) throw new Error('Failed to fetch members')

    const data = await res.json()
    setMembers(data.members)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="border-b">
          <div className="space-y-2">
            <div className="h-5 w-40 animate-pulse rounded-full bg-muted" />
            <div className="h-4 w-72 animate-pulse rounded-full bg-muted" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_auto]">
            <div className="h-10 animate-pulse rounded-full bg-muted" />
            <div className="h-10 animate-pulse rounded-full bg-muted" />
            <div className="h-10 animate-pulse rounded-full bg-muted" />
          </div>
          <div className="space-y-3 rounded-2xl border border-border/80 bg-muted/25 p-4">
            <div className="h-4 w-40 animate-pulse rounded-full bg-muted" />
            <div className="h-24 animate-pulse rounded-2xl bg-muted" />
            <div className="h-24 animate-pulse rounded-2xl bg-muted" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {canModify && (
        <Card className="relative z-20 overflow-visible">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-[15px] font-medium tracking-[-0.02em]">
              <UserPlus className="size-4" aria-hidden />
              Add New Member
            </CardTitle>
            <CardDescription className="text-[13px] leading-5">
              Invite collaborators by email and choose their workspace role.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <div className="grid gap-3 lg:grid-cols-[1fr_180px_auto]">
              <div className="relative">
                <Input
                  placeholder="Search by name or type email..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="h-10 rounded-full pr-20"
                />
                {isSearching && (
                  <span className="absolute top-1/2 right-4 -translate-y-1/2 text-xs text-muted-foreground">
                    Searching...
                  </span>
                )}

                {(suggestions.length > 0 || (searchQuery.trim().length >= 3 && !isSearching)) && (
                  <div className="absolute top-full right-0 left-0 z-30 mt-2 overflow-hidden rounded-2xl border border-border/70 bg-popover shadow-[0_20px_40px_rgba(0,0,0,0.2)]">
                    {suggestions.length > 0 ? (
                      suggestions.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          type="button"
                          className="flex w-full flex-col px-4 py-3 text-left text-sm transition-colors hover:bg-muted/60"
                          onClick={() => {
                            setSearchQuery(suggestion.email)
                            setSuggestions([])
                          }}
                        >
                          <span className="font-medium text-foreground">
                            {suggestion.firstName} {suggestion.lastName || ''}
                          </span>
                          <span className="text-xs text-muted-foreground">{suggestion.email}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-muted-foreground">
                        No matching users found.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <select
                className="flex h-10 w-full items-center justify-between rounded-full border border-input bg-background px-4 py-2 text-sm ring-offset-background outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedRole}
                onChange={(event) => setSelectedRole(event.target.value as ProjectRoleType)}
              >
                <option value={ProjectRoleType.VIEWER}>Viewer</option>
                <option value={ProjectRoleType.EDITOR}>Editor</option>
                <option value={ProjectRoleType.OWNER}>Owner</option>
              </select>

              <Button
                className="h-10 rounded-full"
                onClick={handleAddMember}
                disabled={isSubmitting || searchQuery.length < 3}
              >
                {isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Invite
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="relative z-10">
        <CardHeader className="border-b">
          <CardTitle className="text-[15px] font-medium tracking-[-0.02em]">Project Members</CardTitle>
          <CardDescription className="text-[13px] leading-5">
            Manage who has access to this project and their permission levels.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="px-4 py-3">User</TableHead>
                <TableHead className="px-4 py-3">Role</TableHead>
                <TableHead className="px-4 py-3 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length > 0 ? (
                members.map((member) => {
                  const isSelf = member.userId === currentUserId
                  const memberName = getMemberDisplayName(member)

                  return (
                    <TableRow key={member.userId}>
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar size="sm">
                            <AvatarFallback className="text-xs font-medium">
                              {getInitials(member.user.firstName, member.user.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate font-medium text-foreground">{memberName}</p>
                              {isSelf && (
                                <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[10px]">
                                  You
                                </Badge>
                              )}
                            </div>
                            <p className="truncate text-xs text-muted-foreground">{member.user.email}</p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="px-4 py-3">
                        {canModify && !isSelf ? (
                          <select
                            className="h-9 rounded-full border border-input bg-background px-3 text-xs outline-none focus:ring-1 focus:ring-ring"
                            value={member.role}
                            onChange={(event) =>
                              handleUpdateRole(member.userId, event.target.value as ProjectRoleType)
                            }
                          >
                            <option value={ProjectRoleType.VIEWER}>Viewer</option>
                            <option value={ProjectRoleType.EDITOR}>Editor</option>
                            <option value={ProjectRoleType.OWNER}>Owner</option>
                          </select>
                        ) : (
                          <Badge
                            variant="outline"
                            className={cn('rounded-full px-3 py-1 font-normal', roleBadgeClasses[member.role])}
                          >
                            {member.role === ProjectRoleType.OWNER && (
                              <Shield className="mr-1 size-3" aria-hidden />
                            )}
                            {member.role}
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="px-4 py-3 text-right">
                        {isSelf ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => requestRemoveMember(member, true)}
                          >
                            Leave
                          </Button>
                        ) : canModify ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => requestRemoveMember(member, false)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="px-4 py-12">
                    <div className="flex flex-col items-center justify-center gap-2 text-center">
                      <ShieldAlert className="size-7 text-muted-foreground/45" />
                      <p className="text-[13px] font-medium text-foreground/90">No members found</p>
                      <p className="text-[13px] leading-5 text-muted-foreground/85">
                        Invite the first collaborator to start this workspace.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog
        open={Boolean(pendingRemoval)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingRemoval(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingRemoval?.isSelfLeave ? 'Leave Project?' : 'Remove Member?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRemoval ? (
                pendingRemoval.isSelfLeave ? (
                  <>
                    You are about to leave this project. This will remove access for{' '}
                    <strong>{pendingRemoval.email}</strong>.
                  </>
                ) : (
                  <>
                    This will remove <strong>{pendingRemoval.displayName}</strong> from the project.
                    This action cannot be undone.
                  </>
                )
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmRemoveMember}
              disabled={isRemoving}
            >
              {isRemoving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {pendingRemoval?.isSelfLeave ? 'Leave Project' : 'Remove Member'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
