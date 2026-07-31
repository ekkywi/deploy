'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PlayCircle, Loader2, GitBranch, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface DeployButtonProps {
  projectId: string
  environmentId: string
  hasRepoUrl: boolean
  defaultBranch?: string
}

export function DeployButton({
  projectId,
  environmentId,
  hasRepoUrl,
  defaultBranch = 'main',
}: DeployButtonProps) {
  const [isDeploying, setIsDeploying] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [branches, setBranches] = useState<string[]>([])
  const [selectedBranch, setSelectedBranch] = useState<string>(defaultBranch)
  const [isFetching, setIsFetching] = useState(false)
  const router = useRouter()

  const fetchBranches = async () => {
    setIsFetching(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/branches`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to fetch branches')

      setBranches(data.branches)

      if (data.branches.length > 0 && !data.branches.includes(selectedBranch)) {
        setSelectedBranch(data.branches[0])
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to fetch branches')
    } finally {
      setIsFetching(false)
    }
  }

  const handleOpenModal = () => {
    if (!hasRepoUrl) {
      toast.error('Cannot deploy without a repository URL in project settings.')
      return
    }
    setIsOpen(true)
    if (branches.length === 0) {
      void fetchBranches()
    }
  }

  const handleDeploy = async () => {
    if (!selectedBranch) {
      toast.error('Please select a branch to deploy.')
      return
    }

    setIsDeploying(true)
    try {
      const res = await fetch(
        `/api/projects/${projectId}/environments/${environmentId}/deployments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ branch: selectedBranch }),
        }
      )

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Deployment failed')

      toast.success(data.message || 'Deployment triggered successfully')
      setIsOpen(false)
      router.refresh()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Deployment failed')
    } finally {
      setIsDeploying(false)
    }
  }

  return (
    <>
      <Button onClick={handleOpenModal} disabled={isDeploying || !hasRepoUrl} size="sm">
        {isDeploying ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <PlayCircle className="mr-2 size-4" />
        )}
        {isDeploying ? 'Queuing...' : 'Deploy'}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Deploy</DialogTitle>
            <DialogDescription>Select the git branch to deploy.</DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Branch</label>
              <button
                type="button"
                onClick={() => void fetchBranches()}
                disabled={isFetching || isDeploying}
                className="inline-flex items-center text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              >
                <RefreshCw className={`mr-1 size-3 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            <div className="relative">
              <GitBranch className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <select
                className="w-full appearance-none rounded-md border border-input bg-background py-2 pr-4 pl-9 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:opacity-50"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                disabled={isFetching || branches.length === 0 || isDeploying}
              >
                {isFetching ? (
                  <option>Fetching branches...</option>
                ) : branches.length === 0 ? (
                  <option>No branches found</option>
                ) : (
                  branches.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isDeploying}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleDeploy()}
              disabled={isFetching || isDeploying || branches.length === 0}
            >
              {isDeploying ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {isDeploying ? 'Deploying...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
