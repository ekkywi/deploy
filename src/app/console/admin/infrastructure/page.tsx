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
  ShieldAlert,
  Loader2,
  Edit2,
  Trash2,
  Power,
  AlertTriangle,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ConsolePageHeader } from '@/components/layout/console-page-header'
import { ConsoleStatChip } from '@/components/layout/console-stat-chip'
import { TierOptionGrid, type TierOption } from '@/components/tier-option-grid'
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

const AVAILABLE_TIERS = ['DEVELOPMENT', 'STAGING', 'PRODUCTION'] as const satisfies readonly TierValue[]

const tierOptions: TierOption[] = [
  {
    value: 'DEVELOPMENT',
    label: 'Development',
    description: 'Best for active iteration, quick feedback, and isolated test runs.',
    accentClassName: 'border-blue-500/30 bg-blue-500/6',
  },
  {
    value: 'STAGING',
    label: 'Staging',
    description: 'Use for release previews and validation before production traffic.',
    accentClassName: 'border-amber-500/30 bg-amber-500/6',
  },
  {
    value: 'PRODUCTION',
    label: 'Production',
    description: 'Reserved for live workloads with the strictest isolation expectations.',
    accentClassName: 'border-emerald-500/30 bg-emerald-500/6',
  },
]

export default function InfrastructurePage() {
  const [workers, setWorkers] = useState<WorkerNode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null)
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [editWorker, setEditWorker] = useState<WorkerNode | null>(null)
  const [deleteWorker, setDeleteWorker] = useState<WorkerNode | null>(null)
  const [isActionLoading, setIsActionLoading] = useState(false)
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
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error loading nodes')
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadWorkers = async () => {
      await refreshWorkers()
      if (isMounted) setIsLoading(false)
    }

    void loadWorkers()

    return () => {
      isMounted = false
    }
  }, [refreshWorkers])

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
    deployments: workers.reduce((total, worker) => total + worker._count.deployments, 0),
  }

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground animate-pulse">Loading global infrastructure...</div>
  }

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        eyebrow="Platform Administration"
        title="Global Infrastructure"
        description="Manage physical or virtual execution nodes (Docker Pools) for the entire platform."
        actions={
          <Dialog
            open={isRegisterOpen}
            onOpenChange={(open) => {
              setIsRegisterOpen(open)
              if (!open) resetForm()
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="size-4" /> Register Worker
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[640px]">
              <form onSubmit={handleRegisterWorker}>
                <DialogHeader>
                  <DialogTitle>Register Worker Node</DialogTitle>
                  <DialogDescription>
                    Add a new execution node and define its supported workload isolation.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Worker Name</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      minLength={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>IPv4 Address</Label>
                    <Input
                      value={formData.ipAddress}
                      onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                      required
                    />
                  </div>

                  <div className="rounded-lg border border-border/70 bg-muted/16 p-4">
                    <TierOptionGrid
                      options={tierOptions}
                      selectedValues={formData.supportedTiers}
                      onChange={(nextValues) =>
                        setFormData((prev) => ({ ...prev, supportedTiers: nextValues as TierValue[] }))
                      }
                      mode="multi"
                      label="Allowed Workload Tiers"
                      helperText="Choose every tier this worker can host. Keeping production separate is the safest default."
                    />

                    {formData.supportedTiers.length === 0 ? (
                      <p className="mt-3 text-[11px] text-destructive">
                        Select at least one tier before registering.
                      </p>
                    ) : null}

                    {isMixingProduction ? (
                      <div className="mt-3 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-[13px] text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                        <p className="leading-relaxed">
                          <strong>Production sharing warning:</strong> this worker mixes production with lower
                          environments. Keep enough headroom to avoid noisy-neighbor OOM events.
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-2 flex items-start gap-3 rounded-xl border bg-muted/50 p-3 text-sm">
                    <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-500" />
                    <p className="leading-relaxed text-muted-foreground">
                      A secure Agent Token will be generated automatically. You must insert this token into the
                      Docker Agent environment variables on the target machine.
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsRegisterOpen(false)}
                    disabled={isActionLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      isActionLoading ||
                      !formData.name ||
                      !formData.ipAddress ||
                      formData.supportedTiers.length === 0
                    }
                  >
                    {isActionLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Register
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex flex-wrap gap-2">
        <ConsoleStatChip label="Total Nodes" value={stats.total} />
        <ConsoleStatChip label="Active" value={stats.active} variant="active" />
        <ConsoleStatChip label="Maintenance" value={stats.disabled} variant="destructive" />
        <ConsoleStatChip label="Containers" value={stats.deployments} variant="info" />
      </div>

      {workers.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed py-20">
          <Server className="mb-4 size-10 text-muted-foreground/30" />
          <h3 className="text-[15px] font-medium tracking-[-0.02em]">No worker nodes registered</h3>
          <p className="mt-1 max-w-md text-center text-[13px] leading-5 text-muted-foreground/85">
            Register the first execution node so projects can start scheduling deployments.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workers.map((worker) => (
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
                        variant={worker.isActive ? 'default' : 'secondary'}
                        className={cn(
                          'text-[9px] uppercase tracking-[0.16em]',
                          worker.isActive
                            ? 'bg-emerald-500 text-emerald-950 hover:bg-emerald-500'
                            : 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/10'
                        )}
                      >
                        {worker.isActive ? 'Ready' : 'Maintenance'}
                      </Badge>
                    </div>
                    <CardDescription className="font-mono text-[11px]">{worker.ipAddress}</CardDescription>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 ${worker.isActive ? 'text-emerald-500' : 'text-amber-500'}`}
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
                      {tierOptions.find((item) => item.value === tier)?.label ?? tier}
                    </Badge>
                  ))}
                </div>
              </CardHeader>

              <CardContent className="flex-1 pb-4 pt-5">
                <div className="flex items-center justify-between text-sm text-muted-foreground/80">
                  <div className="flex items-center gap-1.5">
                    <Activity className="size-4" />
                    <span>{worker._count.deployments} execution logs</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
                    {worker.supportedTiers.length} tier{worker.supportedTiers.length === 1 ? '' : 's'}
                  </span>
                </div>
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
          ))}
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
        <DialogContent className="sm:max-w-[640px]">
          <form onSubmit={handleEditWorker}>
            <DialogHeader>
              <DialogTitle>Edit Worker Node</DialogTitle>
              <DialogDescription>Update connection details and allowed workloads.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Worker Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  minLength={2}
                />
              </div>

              <div className="space-y-2">
                <Label>IPv4 Address</Label>
                <Input
                  value={formData.ipAddress}
                  onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                  required
                />
              </div>

              <div className="rounded-lg border border-border/70 bg-muted/16 p-4">
                <TierOptionGrid
                  options={tierOptions}
                  selectedValues={formData.supportedTiers}
                  onChange={(nextValues) =>
                    setFormData((prev) => ({ ...prev, supportedTiers: nextValues as TierValue[] }))
                  }
                  mode="multi"
                  label="Allowed Workload Tiers"
                  helperText="Adjust which environments this node can serve. Production should stay isolated unless capacity is intentionally shared."
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditWorker(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isActionLoading || formData.supportedTiers.length === 0}>
                {isActionLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                Save Changes
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
