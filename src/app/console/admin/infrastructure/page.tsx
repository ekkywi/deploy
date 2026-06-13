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

  const fetchWorkers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/workers')
      if (!res.ok) {
        if (res.status === 403) throw new Error('Forbidden: You are not a Sysadmin.')
        throw new Error('Failed to fetch worker nodes')
      }
      const data = await res.json()
      setWorkers(data.workers)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWorkers()
  }, [fetchWorkers])

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
      fetchWorkers()
    } catch (error: any) {
      toast.error(error.message)
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

  if (isLoading) return <div className="py-12 text-center text-muted-foreground animate-pulse">Loading global infrastructure...</div>

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Server className="size-6 text-primary" /> Global Infrastructure
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage physical or virtual execution nodes (Docker Pools) for the entire platform.
          </p>
        </div>

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
      </div>

      {workers.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-20 border-dashed">
          <Server className="size-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium">No worker nodes registered</h3>
          <p className="text-sm text-muted-foreground mt-1 text-center max-w-sm">
            You need at least one active worker node to handle application deployments.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {workers.map((worker) => (
            <Card key={worker.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{worker.name}</CardTitle>
                  <Badge variant={worker.isActive ? "default" : "destructive"} className="uppercase text-[10px]">
                    {worker.isActive ? 'Active' : 'Disabled'}
                  </Badge>
                </div>
                <CardDescription className="font-mono text-xs">{worker.ipAddress}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 pb-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                  <div className="flex items-center gap-1.5">
                    <Activity className="size-4" />
                    <span>{worker._count.deployments} active containers</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 border-t pt-4 flex flex-col items-start gap-2">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Key className="size-3" /> Agent Auth Token
                </span>
                <div className="flex w-full items-center gap-2">
                  <code className="flex-1 rounded bg-muted px-2 py-1.5 text-xs font-mono text-muted-foreground truncate">
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