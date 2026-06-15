'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PlayCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DeployButtonProps {
  projectId: string
  environmentId: string
  hasRepoUrl: boolean
}

export function DeployButton({ projectId, environmentId, hasRepoUrl }: DeployButtonProps) {
  const [isDeploying, setIsDeploying] = useState(false)
  const router = useRouter()

  const handleDeploy = async () => {
    if (!hasRepoUrl) {
      toast.error('Cannot deploy without a repository URL in project settings.')
      return
    }

    setIsDeploying(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/environments/${environmentId}/deployments`, {
        method: 'POST'
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      
      toast.success(data.message)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsDeploying(false)
    }
  }

  return (
    <Button 
      onClick={handleDeploy} 
      disabled={isDeploying || !hasRepoUrl} 
      className="rounded-full bg-primary text-primary-foreground"
    >
      {isDeploying ? <Loader2 className="mr-2 size-4 animate-spin" /> : <PlayCircle className="mr-2 size-4" />}
      {isDeploying ? 'Queuing...' : 'Trigger Deploy'}
    </Button>
  )
}