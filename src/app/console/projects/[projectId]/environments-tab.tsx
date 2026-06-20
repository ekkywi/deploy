'use client'

import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, Server, Globe, Activity, Layers, ExternalLink, Loader2, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { GlobalRole, ProjectRoleType, EnvironmentTier, StackType } from '@prisma/client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { TierOptionGrid, type TierOption } from '@/components/tier-option-grid'
import { cn } from '@/lib/utils'

type EnvironmentData = {
  id: string
  name: string
  domain: string | null
  stackType: StackType
  tier: EnvironmentTier
  lifecycle: string
  createdAt: string
  _count: {
    deployments: number
  }
}

interface EnvironmentsTabProps {
  projectId: string
  currentUserId: string
  currentUserGlobalRole: GlobalRole
  projectMembers: { userId: string; role: ProjectRoleType }[]
}

type EnvironmentFormData = {
  name: string
  domain: string
  stackType: StackType
  tier: EnvironmentTier
}

const tierConfig: Record<EnvironmentTier, { color: string; label: string }> = {
  PRODUCTION: { color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300', label: 'Production' },
  STAGING: { color: 'border-amber-500/30 bg-amber-500/10 text-amber-300', label: 'Staging' },
  DEVELOPMENT: { color: 'border-blue-500/30 bg-blue-500/10 text-blue-300', label: 'Development' },
}

const tierOptions: TierOption[] = [
  {
    value: EnvironmentTier.DEVELOPMENT,
    label: 'Development',
    description: 'Fast iteration space for active builds, debugging, and test traffic.',
    accentClassName: 'border-blue-500/30 bg-blue-500/6',
  },
  {
    value: EnvironmentTier.STAGING,
    label: 'Staging',
    description: 'Preview the release path with production-like configuration and data flow.',
    accentClassName: 'border-amber-500/30 bg-amber-500/6',
  },
  {
    value: EnvironmentTier.PRODUCTION,
    label: 'Production',
    description: 'Live traffic target with the strongest operational and isolation expectations.',
    accentClassName: 'border-emerald-500/30 bg-emerald-500/6',
  },
]

export function EnvironmentsTab({ projectId, currentUserId, currentUserGlobalRole, projectMembers }: EnvironmentsTabProps) {
  const [environments, setEnvironments] = useState<EnvironmentData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createData, setCreateData] = useState<EnvironmentFormData>({
    name: '',
    domain: '',
    stackType: StackType.NEXTJS,
    tier: EnvironmentTier.DEVELOPMENT,
  })
  const [editingEnv, setEditingEnv] = useState<EnvironmentData | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [editData, setEditData] = useState<EnvironmentFormData>({
    name: '',
    domain: '',
    stackType: StackType.NEXTJS,
    tier: EnvironmentTier.DEVELOPMENT,
  })
  const [deletingEnv, setDeletingEnv] = useState<EnvironmentData | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const myMembership = projectMembers.find((member) => member.userId === currentUserId)
  const isSysadmin = currentUserGlobalRole === GlobalRole.SYSADMIN
  const isOwner = myMembership?.role === ProjectRoleType.OWNER
  const isEditor = myMembership?.role === ProjectRoleType.EDITOR
  const canEdit = isSysadmin || isOwner || isEditor
  const canDelete = isSysadmin || isOwner

  const fetchEnvironments = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/environments`)
      if (!res.ok) throw new Error('Failed to fetch environments')
      const data = await res.json()
      setEnvironments(data.environments)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error loading environments')
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    let isActive = true

    const loadEnvironments = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/environments`)
        if (!res.ok) throw new Error('Failed to fetch environments')

        const data = await res.json()
        if (isActive) {
          setEnvironments(data.environments)
        }
      } catch (error: unknown) {
        if (isActive) {
          toast.error(error instanceof Error ? error.message : 'Error loading environments')
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadEnvironments()

    return () => {
      isActive = false
    }
  }, [projectId])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)

    try {
      const res = await fetch(`/api/projects/${projectId}/environments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...createData, domain: createData.domain || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast.success(data.message)
      setIsCreateOpen(false)
      setCreateData({
        name: '',
        domain: '',
        stackType: StackType.NEXTJS,
        tier: EnvironmentTier.DEVELOPMENT,
      })
      fetchEnvironments()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to create environment')
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingEnv) return
    setIsUpdating(true)

    try {
      const res = await fetch(`/api/projects/${projectId}/environments/${editingEnv.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editData, domain: editData.domain || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast.success(data.message)
      setEditingEnv(null)
      fetchEnvironments()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to update environment')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingEnv) return
    setIsDeleting(true)

    try {
      const res = await fetch(`/api/projects/${projectId}/environments/${deletingEnv.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast.success(data.message)
      setDeletingEnv(null)
      fetchEnvironments()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete environment')
    } finally {
      setIsDeleting(false)
    }
  }

  const openEditModal = (env: EnvironmentData) => {
    setEditData({
      name: env.name,
      domain: env.domain || '',
      stackType: env.stackType,
      tier: env.tier,
    })
    setEditingEnv(env)
  }

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground animate-pulse">Loading infrastructure maps...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-medium tracking-[-0.02em] text-foreground">Deployment Environments</h2>
          <p className="text-[13px] leading-5 text-muted-foreground/85">
            Manage logic environments and execution nodes for this project.
          </p>
        </div>

        {canEdit && (
          <Dialog
            open={isCreateOpen}
            onOpenChange={(open) => {
              setIsCreateOpen(open)
              if (!open) {
                setCreateData({
                  name: '',
                  domain: '',
                  stackType: StackType.NEXTJS,
                  tier: EnvironmentTier.DEVELOPMENT,
                })
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="rounded-full gap-2 text-[13px]">
                <Plus className="size-4" /> New Environment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[640px]">
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle>Create Environment</DialogTitle>
                  <DialogDescription>Define a new isolated environment logic layer.</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Environment Name <span className="text-destructive">*</span></Label>
                    <Input
                      placeholder="e.g., Production Core"
                      value={createData.name}
                      onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
                      required
                      minLength={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Domain / Subdomain</Label>
                    <Input
                      placeholder="e.g., app.yourdomain.com"
                      value={createData.domain}
                      onChange={(e) => setCreateData({ ...createData, domain: e.target.value })}
                    />
                  </div>

                  <div className="space-y-4 rounded-2xl border border-border/70 bg-muted/20 p-4">
                    <TierOptionGrid
                      options={tierOptions}
                      selectedValues={[createData.tier]}
                      onChange={(nextValues) =>
                        setCreateData((prev) => ({
                          ...prev,
                          tier: (nextValues[0] ?? prev.tier) as EnvironmentTier,
                        }))
                      }
                      mode="single"
                      label="Environment Tier"
                      helperText="Choose one placement tier. This drives the default operational context for the environment."
                    />

                    <div className="space-y-2">
                      <Label>Tech Stack</Label>
                      <select
                        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                        value={createData.stackType}
                        onChange={(e) => setCreateData({ ...createData, stackType: e.target.value as StackType })}
                      >
                        {Object.values(StackType).map((stackType) => (
                          <option key={stackType} value={stackType}>
                            {stackType}
                          </option>
                        ))}
                      </select>

                      <div className="rounded-xl border border-border/60 bg-background/55 p-3 text-[12px] leading-5 text-muted-foreground/85">
                        Tier and stack are shown together in the console so teammates can understand routing and
                        runtime placement at a glance.
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isCreating}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreating || !createData.name}>
                    {isCreating && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Create
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {environments.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed py-16">
          <Layers className="mb-4 size-8 text-muted-foreground/30" />
          <h3 className="text-[15px] font-medium tracking-[-0.02em]">No environments configured</h3>
          <p className="mt-1 max-w-sm text-center text-[13px] leading-5 text-muted-foreground/85">
            Create an environment to start mapping your application and database nodes.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {environments.map((env) => (
            <Card
              key={env.id}
              className="relative flex flex-col justify-between overflow-hidden transition-all hover:-translate-y-0.5 hover:border-border/80"
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="pr-6 text-[15px] font-medium tracking-[-0.02em]">{env.name}</CardTitle>
                    {env.domain ? (
                      <a
                        href={`https://${env.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-[11px] text-muted-foreground/80 transition-colors hover:text-foreground"
                      >
                        <Globe className="mr-1 size-3" /> {env.domain} <ExternalLink className="ml-1 size-2.5 opacity-50" />
                      </a>
                    ) : (
                      <div className="flex items-center text-[11px] text-muted-foreground/60">
                        <Globe className="mr-1 size-3" /> No domain routed
                      </div>
                    )}
                  </div>

                  {canEdit ? (
                    <div className="absolute right-4 top-4 flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn('px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em]', tierConfig[env.tier].color)}
                      >
                        {tierConfig[env.tier].label}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditModal(env)}>
                            <Pencil className="mr-2 size-4" /> Edit Configuration
                          </DropdownMenuItem>
                          {canDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeletingEnv(env)}>
                                <Trash2 className="mr-2 size-4" /> Delete Environment
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ) : (
                    <Badge
                      variant="outline"
                      className={cn('px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em]', tierConfig[env.tier].color)}
                    >
                      {tierConfig[env.tier].label}
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pb-4">
                <div className="flex items-center gap-4 text-[13px] text-muted-foreground/85">
                  <div className="flex items-center gap-1.5" title="Tech Stack">
                    <Layers className="size-4" />
                    <span className="font-medium">{env.stackType}</span>
                  </div>
                  <div className="flex items-center gap-1.5" title="Infrastructure">
                    <Server className="size-4" />
                    <span>Docker Pool</span>
                  </div>
                  <div className="flex items-center gap-1.5" title="Total Deployments">
                    <Activity className="size-4" />
                    <span>{env._count.deployments} Deploys</span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="pt-0">
                <Button variant="secondary" className="w-full text-[13px]" size="sm" asChild>
                  <Link href={`/console/projects/${projectId}/environments/${env.id}`}>Open Deployment Dashboard</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={!!editingEnv}
        onOpenChange={(open) => {
          if (!open) {
            setEditingEnv(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-[640px]">
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle>Edit Environment</DialogTitle>
              <DialogDescription>Modify metadata and tier settings for this environment.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Environment Name <span className="text-destructive">*</span></Label>
                <Input
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  required
                  minLength={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Domain / Subdomain</Label>
                <Input
                  value={editData.domain}
                  onChange={(e) => setEditData({ ...editData, domain: e.target.value })}
                />
              </div>

              <div className="space-y-4 rounded-2xl border border-border/70 bg-muted/20 p-4">
                <TierOptionGrid
                  options={tierOptions}
                  selectedValues={[editData.tier]}
                  onChange={(nextValues) =>
                    setEditData((prev) => ({
                      ...prev,
                      tier: (nextValues[0] ?? prev.tier) as EnvironmentTier,
                    }))
                  }
                  mode="single"
                  label="Environment Tier"
                  helperText="Choose one placement tier. This keeps release intent and operational expectations clear."
                />

                <div className="space-y-2">
                  <Label>Tech Stack</Label>
                  <select
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    value={editData.stackType}
                    onChange={(e) => setEditData({ ...editData, stackType: e.target.value as StackType })}
                  >
                    {Object.values(StackType).map((stackType) => (
                      <option key={stackType} value={stackType}>
                        {stackType}
                      </option>
                    ))}
                  </select>

                  <div className="rounded-xl border border-border/60 bg-background/55 p-3 text-[12px] leading-5 text-muted-foreground/85">
                    Tier selection is now visually grouped with stack info so updates feel faster and more obvious.
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingEnv(null)} disabled={isUpdating}>
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating || !editData.name}>
                {isUpdating && <Loader2 className="mr-2 size-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingEnv} onOpenChange={(open) => !open && setDeletingEnv(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Environment?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to permanently delete <strong>{deletingEnv?.name}</strong>. This action will also
              terminate all node configurations attached to this environment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Delete Environment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
