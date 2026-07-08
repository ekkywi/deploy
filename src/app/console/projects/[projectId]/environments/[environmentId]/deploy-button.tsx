'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PlayCircle, Loader2, GitBranch, RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
  defaultBranch = 'main' 
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
      fetchBranches()
    }
  }

  const handleDeploy = async () => {
    if (!selectedBranch) {
      toast.error('Please select a branch to deploy.')
      return
    }

    setIsDeploying(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/environments/${environmentId}/deployments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch: selectedBranch })
      })

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
      <Button 
        onClick={handleOpenModal} 
        disabled={isDeploying || !hasRepoUrl} 
        className="bg-primary text-primary-foreground"
      >
        {isDeploying ? <Loader2 className="mr-2 size-4 animate-spin" /> : <PlayCircle className="mr-2 size-4" />}
        {isDeploying ? 'Queuing...' : 'Trigger Deploy'}
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md overflow-hidden rounded-lg border border-border/80 bg-background shadow-[0_18px_60px_rgba(0,0,0,0.36)] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b p-4">
              <div>
                <h2 className="text-[15px] font-medium tracking-[-0.02em]">Deploy Environment</h2>
                <p className="text-sm text-muted-foreground mt-1">Select the git branch you want to deploy.</p>
              </div>
              <Button variant="ghost" size="icon" className="size-8" onClick={() => setIsOpen(false)} disabled={isDeploying}>
                <X className="size-4" />
              </Button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Target Branch</label>
                  <button 
                    onClick={fetchBranches} 
                    disabled={isFetching || isDeploying} 
                    className="text-xs flex items-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`mr-1 size-3 ${isFetching ? 'animate-spin' : ''}`} /> 
                    Refresh
                  </button>
                </div>
                
                <div className="relative">
                  <GitBranch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <select 
                    className="w-full appearance-none rounded-md border border-input bg-background/70 py-2 pr-4 pl-9 text-sm shadow-none outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    disabled={isFetching || branches.length === 0 || isDeploying}
                  >
                    {isFetching ? (
                      <option>Fetching branches from repository...</option>
                    ) : branches.length === 0 ? (
                      <option>No branches found</option>
                    ) : (
                      branches.map(b => <option key={b} value={b}>{b}</option>)
                    )}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isDeploying}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleDeploy} 
                  disabled={isFetching || isDeploying || branches.length === 0}
                >
                  {isDeploying ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  {isDeploying ? 'Deploying...' : 'Confirm Deploy'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
