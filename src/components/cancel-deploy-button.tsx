'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

type CancelDeployButtonProps = {
  projectId: string
  environmentId: string
  deploymentId: string
  status: string
}

export function CancelDeployButton({
  projectId,
  environmentId,
  deploymentId,
  status,
}: CancelDeployButtonProps) {
  const [isCancelling, setIsCancelling] = useState(false)
  const router = useRouter()

  if (status !== 'PENDING' && status !== 'BUILDING') {
    return null
  }

  const handleCancel = async () => {
    setIsCancelling(true)
    try {
      const res = await fetch(
        `/api/projects/${projectId}/environments/${environmentId}/deployments/${deploymentId}/cancel`,
        { method: 'POST' }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          (data as { error?: string }).error || 'Failed to cancel deployment'
        )
      }
      toast.success('Deployment cancelled')
      router.refresh()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel deployment')
    } finally {
      setIsCancelling(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-7 gap-1.5 px-2.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
      onClick={() => void handleCancel()}
      disabled={isCancelling}
    >
      {isCancelling ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        <XCircle className="size-3" />
      )}
      {isCancelling ? 'Cancelling…' : 'Cancel'}
    </Button>
  )
}
