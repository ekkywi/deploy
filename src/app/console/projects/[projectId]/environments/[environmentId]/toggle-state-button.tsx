'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PauseCircle, Play, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ToggleStateButtonProps {
  projectId: string
  environmentId: string
  currentLifecycle: 'ACTIVE' | 'SUSPENDED' | 'DELETING' | 'DELETED'
  hasSuccessfulDeploy: boolean
}

export function ToggleStateButton({ projectId, environmentId, currentLifecycle, hasSuccessfulDeploy }: ToggleStateButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const isActive = currentLifecycle === 'ACTIVE'

  const handleToggle = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/environments/${environmentId}/toggle`, {
        method: 'POST'
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      
      toast.success(data.message)
      router.refresh()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Update failed')
    } finally {
      setIsLoading(false)
    }
  }

  if (!hasSuccessfulDeploy || currentLifecycle === 'DELETING' || currentLifecycle === 'DELETED') {
    return null
  }

  return (
    <Button 
      onClick={handleToggle} 
      disabled={isLoading} 
      variant={isActive ? "outline" : "default"}
    >
      {isLoading ? (
        <Loader2 className="mr-2 size-4 animate-spin" />
      ) : isActive ? (
        <PauseCircle className="mr-2 size-4 text-amber-500" />
      ) : (
        <Play className="mr-2 size-4" />
      )}
      {isLoading ? 'Updating...' : isActive ? 'Suspend App' : 'Resume App'}
    </Button>
  )
}
