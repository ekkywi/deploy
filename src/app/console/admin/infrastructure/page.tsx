'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Server,
  Plus,
  Activity,
  Key,
  Copy,
  CheckCircle2,
  Loader2,
  Edit2,
  Trash2,
  Power,
  AlertTriangle,
  RefreshCw,
  HeartPulse,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ConsolePageHeader } from '@/components/layout/console-page-header'
import { ConsoleStatChip } from '@/components/layout/console-stat-chip'
import { WorkerTierPicker } from '@/components/worker-tier-picker'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type TierValue = 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION'

type WorkerNode = {
  id: string
  name: string
  ipAddress: string
  authToken: string
  isActive: boolean
  supportedTiers: TierValue[]
  createdAt: string
  _count: {
    deployments: number
  }
}

type WorkerHealthStatus = 'online' | 'unreachable' | 'unauthorized'

type WorkerHealthResult = {
  workerId: string
  status: WorkerHealthStatus
  latencyMs: number
  checkedAt: string
  uptimeSeconds?: number
  error?: string
}

const AVAILABLE_TIERS = ['DEVELOPMENT', 'STAGING', 'PRODUCTION'] as const satisfies readonly TierValue[]

const TIER_LABELS: Record<TierValue, string> = {
  DEVELOPMENT: 'Development',
  STAGING: 'Staging',
  PRODUCTION: 'Production',
}

function formatLatency(ms: number) {
  return `${ms}ms`
}

function healthLabel(status: WorkerHealthStatus | 'checking' | undefined) {
  switch (status) {
    case 'online':
      return 'Online'
    case 'unauthorized':
      return 'Auth error'
    case 'unreachable':
      return 'Offline'
    case 'checking':
      return 'Checking'
    default:
      return 'Unknown'
  }
}

export default function InfrastructurePage() {
  const [workers, setWorkers] = useState<WorkerNode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null)
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [editWorker, setEditWorker] = useState<WorkerNode | null>(null)
  const [deleteWorker, setDeleteWorker] = useState<WorkerNode | null>(null)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [healthById, setHealthById] = useState<Record<string, WorkerHealthResult>>({})
  const [checkingIds, setCheckingIds] = useState<Set<string>>(new Set())
  const [isCheckingAll, setIsCheckingAll] = useState(false)
  const [formData, setFormData] = useState(() => ({
    name: '',
    ipAddress: '',
    supportedTiers: [...AVAILABLE_TIERS] as TierValue[],
  }))

  const isMixingProduction =
    formData.supportedTiers.includes('PRODUCTION') &&
    (formData.supportedTiers.includes('DEVELOPMENT') || formData.supportedTiers.includes('STAGING'))

  const refreshWorkers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/workers')
      if (!res.ok) throw new Error('Failed to fetch worker nodes')
      const data = await res.json()
      setWorkers(data.workers)
      return data.workers as WorkerNode[]
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error loading nodes')
      return [] as WorkerNode[]
    }
  }, [])

  const applyHealthResults = useCallback((results: WorkerHealthResult[]) => {
    setHealthById((prev) => {
      const next = { ...prev }
      for (const result of results) {
        next[result.workerId] = result
      }
      return next
    })
  }, [])

  const checkAllHealth = useCallback(async () => {
    setIsCheckingAll(true)
    try {
      const res = await fetch('/api/admin/workers/health')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Health check failed')
      applyHealthResults(data.results as WorkerHealthResult[])
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Health check failed')
    } finally {
      setIsCheckingAll(false)
    }
  }, [applyHealthResults])

  const checkWorkerHealth = useCallback(
    async (workerId: string) => {
      setCheckingIds((prev) => new Set(prev).add(workerId))
      try {
        const res = await fetch(`/api/admin/workers/${workerId}/health`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Health check failed')
        applyHealthResults([data.health as WorkerHealthResult])
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : 'Health check failed')
      } finally {
        setCheckingIds((prev) => {
          const next = new Set(prev)
          next.delete(workerId)
          return next
        })
      }
    },
    [applyHealthResults]
  )

  useEffect(() => {
    let isMounted = true

    const loadWorkers = async () => {
      const loaded = await refreshWorkers()
      if (!isMounted) return
      setIsLoading(false)
      if (loaded.length > 0) {
        void checkAllHealth()
      }
    }

    void loadWorkers()

    return () => {
      isMounted = false
    }
  }, [refreshWorkers, checkAllHealth])

  const resetForm = () =>
    setFormData({
      name: '',
      ipAddress: '',
      supportedTiers: [...AVAILABLE_TIERS],
    })

  const handleRegisterWorker = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.supportedTiers.length === 0) return toast.error('Select at least one supported tier.')

    setIsActionLoading(true)
    try {
      const res = await fetch('/api/admin/workers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast.success(data.message)
      setIsRegisterOpen(false)
      resetForm()
      await refreshWorkers()
      void checkAllHealth()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Registration failed')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleEditWorker = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editWorker) return
    if (formData.supportedTiers.length === 0) return toast.error('Select at least one supported tier.')

    setIsActionLoading(true)
    try {
      const res = await fetch(`/api/admin/workers/${editWorker.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          ipAddress: formData.ipAddress,
          supportedTiers: formData.supportedTiers,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast.success(data.message)
      setEditWorker(null)
      resetForm()
      await refreshWorkers()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Update failed')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleToggleStatus = async (worker: WorkerNode) => {
    const loadingToastId = toast.loading(`${worker.isActive ? 'Deactivating' : 'Activating'} node...`)
    try {
      const res = await fetch(`/api/admin/workers/${worker.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !worker.isActive }),
      })
      if (!res.ok) throw new Error('Toggle failed')
      toast.success('Status updated', { id: loadingToastId })
      await refreshWorkers()
    } catch {
      toast.error('Failed to toggle status', { id: loadingToastId })
    }
  }

  const handleDeleteWorker = async () => {
    if (!deleteWorker) return
    setIsActionLoading(true)
    try {
      const res = await fetch(`/api/admin/workers/${deleteWorker.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.details ? `${data.error}\n\n${data.details}` : data.error)

      toast.success(data.message)
      setDeleteWorker(null)
      await refreshWorkers()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete worker', { duration: 8000 })
    } finally {
      setIsActionLoading(false)
    }
  }

  const copyToClipboard = (token: string, id: string) => {
    navigator.clipboard.writeText(token)
    setCopiedTokenId(id)
    toast.success('Agent Token copied')
    setTimeout(() => setCopiedTokenId(null), 3000)
  }

  const stats = {
    total: workers.length,
    active: workers.filter((worker) => worker.isActive).length,
    disabled: workers.filter((worker) => !worker.isActive).length,
    online: workers.filter((worker) => healthById[worker.id]?.status === 'online').length,
    deployments: workers.reduce((total, worker) => total + worker._count.deployments, 0),
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="space-y-2 border-b border-border pb-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-3.5 w-64" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="h-7 w-20 rounded-md" />
          <Skeleton className="h-7 w-20 rounded-md" />
          <Skeleton className="h-7 w-20 rounded-md" />
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-40 rounded-md" />
          <Skeleton className="h-40 rounded-md" />
          <Skeleton className="h-40 rounded-md" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ConsolePageHeader
        title="Infrastructure"
        actions={
          <div className="flex items-center gap-2">
            {workers.length > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => void checkAllHealth()}
                disabled={isCheckingAll}
              >
                {isCheckingAll ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <HeartPulse className="size-3.5" />
                )}
                Check health
              </Button>
            ) : null}
            <Dialog
              open={isRegisterOpen}
              onOpenChange={(open) => {
                setIsRegisterOpen(open)
                if (!open) resetForm()
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <Plus className="size-4" /> Register Worker
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <form onSubmit={handleRegisterWorker} className="space-y-4">
                <DialogHeader>
                  <DialogTitle>Register worker</DialogTitle>
                  <DialogDescription>
                    Add a host that runs deployments for your environments.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="worker-name" className="text-xs">
                      Name
                    </Label>
                    <Input
                      id="worker-name"
                      placeholder="worker-01"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      minLength={2}
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="worker-ip" className="text-xs">
                      IPv4 address
                    </Label>
                    <Input
                      id="worker-ip"
                      placeholder="192.168.1.10"
                      value={formData.ipAddress}
                      onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                      required
                      className="h-9 font-mono text-sm"
                    />
                  </div>
                </div>

                <WorkerTierPicker
                  value={formData.supportedTiers}
                  onChange={(supportedTiers) =>
                    setFormData((prev) => ({ ...prev, supportedTiers }))
                  }
                />

                {formData.supportedTiers.length === 0 ? (
                  <p className="text-[11px] text-destructive">Select at least one tier.</p>
                ) : null}

                {isMixingProduction ? (
                  <p className="flex items-start gap-1.5 text-[11px] leading-4 text-amber-500">
                    <AlertTriangle className="mt-0.5 size-3 shrink-0" aria-hidden />
                    Production is mixed with lower tiers — keep spare capacity on this host.
                  </p>
                ) : null}

                <p className="text-[11px] leading-4 text-muted-foreground">
                  A secure agent token is generated after register. Paste it into the agent{' '}
                  <code className="text-foreground">.env</code> on that machine.
                </p>

                <DialogFooter className="gap-2 sm:gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsRegisterOpen(false)}
                    disabled={isActionLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={
                      isActionLoading ||
                      !formData.name ||
                      !formData.ipAddress ||
                      formData.supportedTiers.length === 0
                    }
                  >
                    {isActionLoading && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                    Register
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        }
      />

      <div className="flex flex-wrap gap-1.5">
        <ConsoleStatChip label="Total Nodes" value={stats.total} />
        <ConsoleStatChip label="Online" value={stats.online} variant="active" />
        <ConsoleStatChip label="Enabled" value={stats.active} variant="info" />
        <ConsoleStatChip label="Maintenance" value={stats.disabled} variant="destructive" />
        <ConsoleStatChip label="Containers" value={stats.deployments} />
      </div>

      {workers.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed py-12 shadow-none">
          <Server className="mb-3 size-7 text-muted-foreground/30" />
          <h3 className="text-sm font-medium">No worker nodes registered</h3>
          <p className="mt-1 max-w-md text-center text-xs text-muted-foreground">
            Register the first execution node so projects can start scheduling deployments.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {workers.map((worker) => {
            const health = healthById[worker.id]
            const isChecking = checkingIds.has(worker.id) || (isCheckingAll && !health)
            const reachability = isChecking ? 'checking' : health?.status

            return (
            <Card
              key={worker.id}
              className="flex flex-col overflow-hidden transition-colors hover:border-border/80"
            >
              <CardHeader className="border-b pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-[15px] font-medium tracking-[-0.02em]">
                        {worker.name}
                      </CardTitle>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-[9px] uppercase tracking-[0.16em]',
                          worker.isActive
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-amber-500/10 text-amber-300'
                        )}
                      >
                        {worker.isActive ? 'Enabled' : 'Maintenance'}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-[9px] uppercase tracking-[0.16em]',
                          reachability === 'online' &&
                            'bg-emerald-500/15 text-emerald-400',
                          reachability === 'unreachable' &&
                            'bg-red-500/15 text-red-400',
                          reachability === 'unauthorized' &&
                            'bg-amber-500/15 text-amber-300',
                          (reachability === 'checking' || !reachability) &&
                            'bg-muted text-muted-foreground'
                        )}
                        title={health?.error}
                      >
                        {healthLabel(reachability)}
                      </Badge>
                    </div>
                    <CardDescription className="font-mono text-[11px]">{worker.ipAddress}:4000</CardDescription>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      title="Check health"
                      disabled={isChecking}
                      onClick={() => void checkWorkerHealth(worker.id)}
                    >
                      {isChecking ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <RefreshCw className="size-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 ${worker.isActive ? 'text-emerald-500' : 'text-amber-500'}`}
                      title={worker.isActive ? 'Put in maintenance' : 'Enable worker'}
                      onClick={() => handleToggleStatus(worker)}
                    >
                      <Power className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setFormData({
                          name: worker.name,
                          ipAddress: worker.ipAddress,
                          supportedTiers: worker.supportedTiers,
                        })
                        setEditWorker(worker)
                      }}
                    >
                      <Edit2 className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteWorker(worker)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {worker.supportedTiers.map((tier) => (
                    <Badge
                      key={tier}
                      variant="secondary"
                      className="bg-muted/60 text-[9px] uppercase tracking-wider text-muted-foreground"
                    >
                      {TIER_LABELS[tier] ?? tier}
                    </Badge>
                  ))}
                </div>
              </CardHeader>

              <CardContent className="flex-1 space-y-3 pb-4 pt-5">
                <div className="flex items-center justify-between text-sm text-muted-foreground/80">
                  <div className="flex items-center gap-1.5">
                    <Activity className="size-4" />
                    <span>{worker._count.deployments} execution logs</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
                    {worker.supportedTiers.length} tier{worker.supportedTiers.length === 1 ? '' : 's'}
                  </span>
                </div>
                {health ? (
                  <p className="text-[11px] text-muted-foreground">
                    Last check {formatLatency(health.latencyMs)}
                    {typeof health.uptimeSeconds === 'number'
                      ? ` · up ${Math.floor(health.uptimeSeconds / 60)}m`
                      : ''}
                    {health.error ? ` · ${health.error}` : ''}
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Health not checked yet.
                  </p>
                )}
              </CardContent>

              <CardFooter className="flex flex-col items-start gap-2 border-t bg-muted/25 pt-4">
                <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">
                  <Key className="size-3" /> Agent Auth Token
                </span>
                <div className="flex w-full items-center gap-2">
                  <code className="flex-1 truncate rounded-lg border border-border/60 bg-background/55 px-2.5 py-1.5 font-mono text-[11px] text-muted-foreground/90">
                    {worker.authToken}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => copyToClipboard(worker.authToken, worker.id)}
                  >
                    {copiedTokenId === worker.id ? (
                      <CheckCircle2 className="size-4 text-emerald-500" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                </div>
              </CardFooter>
            </Card>
            )
          })}
        </div>
      )}

      <Dialog
        open={!!editWorker}
        onOpenChange={(open) => {
          if (!open) {
            setEditWorker(null)
            resetForm()
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleEditWorker} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Edit worker</DialogTitle>
              <DialogDescription>Update connection details and allowed tiers.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-worker-name" className="text-xs">
                  Name
                </Label>
                <Input
                  id="edit-worker-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  minLength={2}
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-worker-ip" className="text-xs">
                  IPv4 address
                </Label>
                <Input
                  id="edit-worker-ip"
                  value={formData.ipAddress}
                  onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                  required
                  className="h-9 font-mono text-sm"
                />
              </div>
            </div>

            <WorkerTierPicker
              value={formData.supportedTiers}
              onChange={(supportedTiers) =>
                setFormData((prev) => ({ ...prev, supportedTiers }))
              }
            />

            {formData.supportedTiers.length === 0 ? (
              <p className="text-[11px] text-destructive">Select at least one tier.</p>
            ) : null}

            {isMixingProduction ? (
              <p className="flex items-start gap-1.5 text-[11px] leading-4 text-amber-500">
                <AlertTriangle className="mt-0.5 size-3 shrink-0" aria-hidden />
                Production is mixed with lower tiers — keep spare capacity on this host.
              </p>
            ) : null}

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditWorker(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isActionLoading || formData.supportedTiers.length === 0}
              >
                {isActionLoading && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteWorker} onOpenChange={(open) => !open && setDeleteWorker(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" /> Confirm Deletion
            </DialogTitle>
            <DialogDescription className="pt-2 leading-relaxed">
              Are you sure you want to permanently delete the <strong className="text-foreground">{deleteWorker?.name}</strong>{' '}
              node? This action will destroy the connection configuration and cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-[13px] text-destructive">
            <strong>System Rule:</strong> This node can only be deleted if there are absolutely zero environments
            currently hosted on it.
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setDeleteWorker(null)} disabled={isActionLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteWorker} disabled={isActionLoading}>
              {isActionLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Trash2 className="mr-2 size-4" />}
              Delete Node
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
