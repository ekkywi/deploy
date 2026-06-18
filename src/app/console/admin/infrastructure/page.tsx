'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Server, Plus, Activity, Key, Copy, CheckCircle2, ShieldAlert, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ConsolePageHeader } from '@/components/layout/console-page-header'
import { ConsoleStatChip } from '@/components/layout/console-stat-chip'

type WorkerNode = {
  id: string
  name: string
  ipAddress: string
  authToken: string
  isActive: boolean
  createdAt: string
  _count: {
    deployments: number
  }
}

export default function InfrastructurePage() {
  const [workers, setWorkers] = useState<WorkerNode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({ name: '', ipAddress: '' })
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null)

  const refreshWorkers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/workers')
      if (!res.ok) {
        if (res.status === 403) throw new Error('Forbidden: You are not a Sysadmin.')
        throw new Error('Failed to fetch worker nodes')
      }
      const data = await res.json()
      setWorkers(data.workers)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to fetch worker nodes')
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadWorkers = async () => {
      try {
        const res = await fetch('/api/admin/workers')
        if (!res.ok) {
          if (res.status === 403) throw new Error('Forbidden: You are not a Sysadmin.')
          throw new Error('Failed to fetch worker nodes')
        }

        const data = await res.json()
        if (isMounted) {
          setWorkers(data.workers)
        }
      } catch (error: unknown) {
        if (isMounted) {
          toast.error(error instanceof Error ? error.message : 'Failed to fetch worker nodes')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadWorkers()

    return () => {
      isMounted = false
    }
  }, [])

  const handleRegisterWorker = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/admin/workers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast.success(data.message)
      setIsDialogOpen(false)
      setFormData({ name: '', ipAddress: '' })
      await refreshWorkers()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to register worker node')
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyToClipboard = (token: string, id: string) => {
    navigator.clipboard.writeText(token)
    setCopiedTokenId(id)
    toast.success('Agent Token copied to clipboard')
    setTimeout(() => setCopiedTokenId(null), 3000)
  }

  const stats = {
    total: workers.length,
    active: workers.filter((worker) => worker.isActive).length,
    disabled: workers.filter((worker) => !worker.isActive).length,
    deployments: workers.reduce((total, worker) => total + worker._count.deployments, 0),
  }

  if (isLoading) return <div className="py-12 text-center text-muted-foreground animate-pulse">Loading global infrastructure...</div>

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        eyebrow="Platform Administration"
        title="Global Infrastructure"
        description="Manage physical or virtual execution nodes (Docker Pools) for the entire platform."
        actions={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="size-4" /> Register Worker
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleRegisterWorker}>
                <DialogHeader>
                  <DialogTitle>Register Worker Node</DialogTitle>
                  <DialogDescription>
                    Add a new Proxmox LXC or server to act as a Docker Pool executor.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Worker Name</Label>
                    <Input
                      placeholder="e.g., worker-pool-01"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required minLength={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>IPv4 Address</Label>
                    <Input
                      placeholder="e.g., 192.168.1.100"
                      value={formData.ipAddress}
                      onChange={(e) => setFormData({...formData, ipAddress: e.target.value})}
                      required
                    />
                  </div>
                  <div className="bg-muted/50 p-3 rounded-md flex items-start gap-3 text-sm mt-2 border">
                    <ShieldAlert className="size-5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-muted-foreground leading-relaxed">
                      A secure Agent Token will be generated automatically. You must insert this token into the Docker Agent environment variables on the target machine.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting || !formData.name || !formData.ipAddress}>
                    {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />} Register
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
        <ConsoleStatChip label="Disabled" value={stats.disabled} variant="destructive" />
        <ConsoleStatChip label="Containers" value={stats.deployments} variant="info" />
      </div>

      {workers.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed py-20">
          <Server className="mb-4 size-10 text-muted-foreground/30" />
          <h3 className="text-[15px] font-medium tracking-[-0.02em]">No worker nodes registered</h3>
          <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground/90">
            You need at least one active worker node to handle application deployments.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {workers.map((worker) => (
            <Card key={worker.id} className="flex flex-col">
              <CardHeader className="border-b pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[15px] font-medium tracking-[-0.02em]">{worker.name}</CardTitle>
                  <Badge variant={worker.isActive ? "default" : "destructive"} className="uppercase text-[10px] tracking-[0.16em]">
                    {worker.isActive ? 'Active' : 'Disabled'}
                  </Badge>
                </div>
                <CardDescription className="font-mono text-[11px]">{worker.ipAddress}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 pt-5 pb-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground/80">
                  <div className="flex items-center gap-1.5">
                    <Activity className="size-4" />
                    <span>{worker._count.deployments} active containers</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col items-start gap-2 border-t bg-muted/25 pt-4">
                <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">
                  <Key className="size-3" /> Agent Auth Token
                </span>
                <div className="flex w-full items-center gap-2">
                  <code className="flex-1 truncate rounded bg-muted px-2 py-1.5 font-mono text-[11px] text-muted-foreground/90">
                    {worker.authToken}
                  </code>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8 shrink-0"
                    onClick={() => copyToClipboard(worker.authToken, worker.id)}
                  >
                    {copiedTokenId === worker.id ? <CheckCircle2 className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
