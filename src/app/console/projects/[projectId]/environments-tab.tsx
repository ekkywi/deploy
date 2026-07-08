'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Activity,
  Boxes,
  ExternalLink,
  Globe,
  Layers,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Server,
  Sparkles,
  Trash2,
} from 'lucide-react'

import { ConsoleStatChip } from '@/components/layout/console-stat-chip'
import { TierOptionGrid, type TierOption } from '@/components/tier-option-grid'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { formatEnvironmentDeleteErrorMessage, formatEnvironmentDeleteSuccessMessage } from '../environment-delete-message-utils'

const STACK_TYPES = {
  NEXTJS: 'NEXTJS',
  LARAVEL: 'LARAVEL',
  NODEJS: 'NODEJS',
} as const

const ENVIRONMENT_TIERS = {
  PRODUCTION: 'PRODUCTION',
  STAGING: 'STAGING',
  DEVELOPMENT: 'DEVELOPMENT',
} as const

type StackType = typeof STACK_TYPES[keyof typeof STACK_TYPES]
type EnvironmentTier = typeof ENVIRONMENT_TIERS[keyof typeof ENVIRONMENT_TIERS]

const NODE_VERSION_OPTIONS = ['18', '20', '22', '24'] as const

function isNodeStack(stackType: StackType) {
  return stackType === STACK_TYPES.NEXTJS || stackType === STACK_TYPES.NODEJS
}

type EnvironmentData = {
  id: string
  name: string
  domain: string | null
  stackType: StackType
  nodeVersion: string
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
  currentUserGlobalRole: 'SYSADMIN' | 'MANAGER' | 'DEVELOPER'
  projectMembers: { userId: string; role: 'OWNER' | 'EDITOR' | 'VIEWER' }[]
  onEnvironmentDeleted?: () => void
}

type EnvironmentFormData = {
  name: string
  domain: string
  stackType: StackType
  nodeVersion: string
  tier: EnvironmentTier
}

const tierConfig: Record<EnvironmentTier, { color: string; label: string }> = {
  PRODUCTION: { color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300', label: 'Production' },
  STAGING: { color: 'border-amber-500/30 bg-amber-500/10 text-amber-300', label: 'Staging' },
  DEVELOPMENT: { color: 'border-blue-500/30 bg-blue-500/10 text-blue-300', label: 'Development' },
}

const tierOptions: TierOption[] = [
  {
    value: ENVIRONMENT_TIERS.DEVELOPMENT,
    label: 'Development',
    description: 'Fast iteration space for active builds, debugging, and test traffic.',
    accentClassName: 'border-blue-500/30 bg-blue-500/6',
  },
  {
    value: ENVIRONMENT_TIERS.STAGING,
    label: 'Staging',
    description: 'Preview the release path with production-like configuration and data flow.',
    accentClassName: 'border-amber-500/30 bg-amber-500/6',
  },
  {
    value: ENVIRONMENT_TIERS.PRODUCTION,
    label: 'Production',
    description: 'Live traffic target with the strongest operational and isolation expectations.',
    accentClassName: 'border-emerald-500/30 bg-emerald-500/6',
  },
]

function getInitialCreateData(): EnvironmentFormData {
  return {
    name: '',
    domain: '',
    stackType: STACK_TYPES.NEXTJS,
    nodeVersion: '22',
    tier: ENVIRONMENT_TIERS.DEVELOPMENT,
  }
}

export function EnvironmentsTab({
  projectId,
  currentUserId,
  currentUserGlobalRole,
  projectMembers,
  onEnvironmentDeleted,
}: EnvironmentsTabProps) {
  const [environments, setEnvironments] = useState<EnvironmentData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createData, setCreateData] = useState<EnvironmentFormData>(getInitialCreateData())
  const [editingEnv, setEditingEnv] = useState<EnvironmentData | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [editData, setEditData] = useState<EnvironmentFormData>(getInitialCreateData())
  const [deletingEnv, setDeletingEnv] = useState<EnvironmentData | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const myMembership = projectMembers.find((member) => member.userId === currentUserId)
  const isSysadmin = currentUserGlobalRole === 'SYSADMIN'
  const isOwner = myMembership?.role === 'OWNER'
  const isEditor = myMembership?.role === 'EDITOR'
  const canEdit = isSysadmin || isOwner || isEditor
  const canDelete = isSysadmin || isOwner

  const summary = {
    total: environments.length,
    production: environments.filter((env) => env.tier === ENVIRONMENT_TIERS.PRODUCTION).length,
    staging: environments.filter((env) => env.tier === ENVIRONMENT_TIERS.STAGING).length,
    development: environments.filter((env) => env.tier === ENVIRONMENT_TIERS.DEVELOPMENT).length,
    nodeBased: environments.filter((env) => isNodeStack(env.stackType)).length,
  }

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
      setCreateData(getInitialCreateData())
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
    const deletedEnvironmentId = deletingEnv.id

    try {
      const res = await fetch(`/api/projects/${projectId}/environments/${deletingEnv.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(formatEnvironmentDeleteErrorMessage(data))
      }

      toast.success(formatEnvironmentDeleteSuccessMessage(data))
      setEnvironments((prev) => prev.filter((env) => env.id !== deletedEnvironmentId))
      setDeletingEnv(null)
      onEnvironmentDeleted?.()
      await fetchEnvironments()
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
      nodeVersion: env.nodeVersion || '22',
      tier: env.tier,
    })
    setEditingEnv(env)
  }

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground animate-pulse">Loading infrastructure maps...</div>
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/80 bg-gradient-to-br from-card via-card to-muted/20">
        <CardHeader className="gap-4 border-b">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border/60 bg-background/55 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/85">
                <Boxes className="size-3.5" />
                Environment Control Panel
              </div>
              <div className="space-y-1">
                <CardTitle className="text-[18px] tracking-[-0.03em]">Deployment Environments</CardTitle>
                <CardDescription>
                  Manage runtime placement, stack context, and deployment targets for this project.
                </CardDescription>
              </div>
            </div>

            {canEdit ? (
              <Dialog
                open={isCreateOpen}
                onOpenChange={(open) => {
                  setIsCreateOpen(open)
                  if (!open) {
                    setCreateData(getInitialCreateData())
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button className="rounded-full gap-2 text-[13px] lg:self-start">
                    <Plus className="size-4" /> New Environment
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[640px] max-h-[calc(100vh-2rem)] overflow-hidden p-0">
                  <form onSubmit={handleCreate} className="flex max-h-[calc(100vh-2rem)] flex-col">
                    <DialogHeader className="shrink-0 px-4 pt-4">
                      <DialogTitle>Create Environment</DialogTitle>
                      <DialogDescription>Define a new isolated environment logic layer.</DialogDescription>
                    </DialogHeader>

                    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                      <div className="grid gap-4">
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
                              onChange={(e) => {
                                const nextStack = e.target.value as StackType
                                setCreateData((prev) => ({
                                  ...prev,
                                  stackType: nextStack,
                                  nodeVersion: isNodeStack(nextStack) ? prev.nodeVersion || '22' : prev.nodeVersion,
                                }))
                              }}
                            >
                              {Object.values(STACK_TYPES).map((stackType) => (
                                <option key={stackType} value={stackType}>
                                  {stackType}
                                </option>
                              ))}
                            </select>

                            {isNodeStack(createData.stackType) && (
                              <div className="space-y-2 rounded-2xl border border-border/70 bg-background/55 p-4">
                                <div className="flex items-center justify-between gap-3">
                                  <Label className="text-[13px]">Node Version</Label>
                                  <span className="rounded-full border border-border/60 bg-muted/50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                    Node runtime only
                                  </span>
                                </div>
                                <select
                                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                                  value={createData.nodeVersion}
                                  onChange={(e) => setCreateData({ ...createData, nodeVersion: e.target.value })}
                                >
                                  {NODE_VERSION_OPTIONS.map((version) => (
                                    <option key={version} value={version}>
                                      Node {version}
                                    </option>
                                  ))}
                                </select>
                                <p className="text-[12px] leading-5 text-muted-foreground/80">
                                  This version will be sent to the agent and used as the Docker base image for Node stacks.
                                </p>
                              </div>
                            )}

                            <div className="rounded-xl border border-border/60 bg-background/55 p-3 text-[12px] leading-5 text-muted-foreground/85">
                              Tier and stack are shown together in the console so teammates can understand routing and
                              runtime placement at a glance.
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <DialogFooter className="shrink-0 px-4 pb-4">
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
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <ConsoleStatChip label="Total" value={summary.total} />
            <ConsoleStatChip label="Production" value={summary.production} variant="active" />
            <ConsoleStatChip label="Staging" value={summary.staging} variant="pending" />
            <ConsoleStatChip label="Development" value={summary.development} variant="info" />
            <ConsoleStatChip label="Node-based" value={summary.nodeBased} />
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/18 p-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="text-[13px] font-medium text-foreground">Runtime overview</p>
              <p className="text-[12px] leading-5 text-muted-foreground/85">
                Scan tier, stack, and deployment readiness before diving into each environment dashboard.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground/75">
              <Sparkles className="size-3.5" />
              Control panel view
            </div>
          </div>
        </CardHeader>
      </Card>

      {environments.length === 0 ? (
        <Card className="border-dashed py-16">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-border/70 bg-muted/30">
              <Layers className="size-7 text-muted-foreground/40" />
            </div>
            <h3 className="text-[15px] font-medium tracking-[-0.02em]">No environments configured yet</h3>
            <p className="mt-2 max-w-md text-[13px] leading-5 text-muted-foreground/85">
              Start by creating the first environment so this project has a clear runtime target and deployment lane.
            </p>
            {canEdit ? (
              <Button className="mt-5 rounded-full gap-2 text-[13px]" onClick={() => setIsCreateOpen(true)}>
                <Plus className="size-4" />
                Create First Environment
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {environments.map((env) => (
            <Card
              key={env.id}
              className="flex flex-col border-border/75 bg-gradient-to-b from-card to-muted/18 transition-all hover:-translate-y-0.5 hover:border-border/90"
            >
              <CardHeader className="gap-3 border-b pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex size-9 items-center justify-center rounded-xl border border-border/70 bg-background/65">
                        <Server className="size-4 text-muted-foreground" />
                      </div>
                      <CardTitle className="truncate pr-2">{env.name}</CardTitle>
                    </div>

                    {env.domain ? (
                      <a
                        href={`https://${env.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex max-w-full items-center text-[11px] text-muted-foreground/80 transition-colors hover:text-foreground"
                      >
                        <Globe className="mr-1 size-3 shrink-0" />
                        <span className="truncate">{env.domain}</span>
                        <ExternalLink className="ml-1 size-2.5 shrink-0 opacity-50" />
                      </a>
                    ) : (
                      <div className="flex items-center text-[11px] text-muted-foreground/60">
                        <Globe className="mr-1 size-3" /> No domain routed
                      </div>
                    )}
                  </div>

                  {canEdit ? (
                    <div className="flex shrink-0 items-center gap-2">
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
                          {canDelete ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeletingEnv(env)}>
                                <Trash2 className="mr-2 size-4" /> Delete Environment
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ) : (
                    <Badge
                      variant="outline"
                      className={cn('shrink-0 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em]', tierConfig[env.tier].color)}
                    >
                      {tierConfig[env.tier].label}
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/60 bg-background/55 p-3">
                    <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">Stack</p>
                    <div className="mt-2 flex items-center gap-2 text-[13px] font-medium text-foreground">
                      <Layers className="size-4 text-muted-foreground" />
                      <span>{env.stackType}</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-background/55 p-3">
                    <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">
                      {isNodeStack(env.stackType) ? 'Node Version' : 'Runtime'}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-[13px] font-medium text-foreground">
                      <Server className="size-4 text-muted-foreground" />
                      <span>{isNodeStack(env.stackType) ? `Node ${env.nodeVersion || '22'}` : 'Docker Pool'}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-muted/18 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/72">
                        Deployment activity
                      </p>
                      <p className="mt-1 text-[13px] leading-5 text-muted-foreground/85">
                        This environment has recorded {env._count.deployments} deployment{env._count.deployments === 1 ? '' : 's'}.
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 bg-background/55">
                      <Activity className="mr-1 size-3" />
                      {env._count.deployments}
                    </Badge>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="mt-auto justify-between gap-3 pt-0">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground/72">
                  Open runtime dashboard
                </p>
                <Button variant="secondary" className="text-[13px]" size="sm" asChild>
                  <Link href={`/console/projects/${projectId}/environments/${env.id}`}>Open Dashboard</Link>
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
        <DialogContent className="sm:max-w-[640px] max-h-[calc(100vh-2rem)] overflow-hidden p-0">
          <form onSubmit={handleUpdate} className="flex max-h-[calc(100vh-2rem)] flex-col">
            <DialogHeader className="shrink-0 px-4 pt-4">
              <DialogTitle>Edit Environment</DialogTitle>
              <DialogDescription>Modify metadata and tier settings for this environment.</DialogDescription>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <div className="grid gap-4">
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
                      onChange={(e) => {
                        const nextStack = e.target.value as StackType
                        setEditData((prev) => ({
                          ...prev,
                          stackType: nextStack,
                          nodeVersion: isNodeStack(nextStack) ? prev.nodeVersion || '22' : prev.nodeVersion,
                        }))
                      }}
                    >
                      {Object.values(STACK_TYPES).map((stackType) => (
                        <option key={stackType} value={stackType}>
                          {stackType}
                        </option>
                      ))}
                    </select>

                    {isNodeStack(editData.stackType) && (
                      <div className="space-y-2 rounded-2xl border border-border/70 bg-background/55 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <Label className="text-[13px]">Node Version</Label>
                          <span className="rounded-full border border-border/60 bg-muted/50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                            Node runtime only
                          </span>
                        </div>
                        <select
                          className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                          value={editData.nodeVersion}
                          onChange={(e) => setEditData({ ...editData, nodeVersion: e.target.value })}
                        >
                          {NODE_VERSION_OPTIONS.map((version) => (
                            <option key={version} value={version}>
                              Node {version}
                            </option>
                          ))}
                        </select>
                        <p className="text-[12px] leading-5 text-muted-foreground/80">
                          Changing the stack to a non-Node runtime will keep the value stored, but it is ignored until a Node stack is selected again.
                        </p>
                      </div>
                    )}

                    <div className="rounded-xl border border-border/60 bg-background/55 p-3 text-[12px] leading-5 text-muted-foreground/85">
                      Tier selection is now visually grouped with stack info so updates feel faster and more obvious.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="shrink-0 px-4 pb-4">
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
              You are about to permanently delete <strong>{deletingEnv?.name}</strong>. If its container
              is still running, stop it first. After that, the environment resources on the worker node
              will be torn down.
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
