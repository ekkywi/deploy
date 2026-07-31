'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type RedeployButtonProps = {
  projectId: string
  environmentId: string
  branchName?: string | null
  disabled?: boolean
}

export function RedeployButton({
  projectId,
  environmentId,
  branchName,
  disabled = false,
}: RedeployButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isRedeploying, setIsRedeploying] = useState(false)
  const router = useRouter()

  const handleRedeploy = async () => {
    setIsRedeploying(true)
    try {
      const res = await fetch(
        `/api/projects/${projectId}/environments/${environmentId}/redeploy`,
        { method: 'POST' }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || 'Redeploy failed')
      }
      toast.success('Redeploy started')
      setIsOpen(false)
      router.refresh()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Redeploy failed')
    } finally {
      setIsRedeploying(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || isRedeploying}
        onClick={() => setIsOpen(true)}
      >
        {isRedeploying ? (
          <Loader2 className="mr-1.5 size-3.5 animate-spin" />
        ) : (
          <RotateCcw className="mr-1.5 size-3.5" />
        )}
        Redeploy
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Redeploy</DialogTitle>
            <DialogDescription>
              Trigger a new build for{' '}
              <span className="font-mono text-foreground">
                {branchName?.trim() || 'the last known ref'}
              </span>{' '}
              using the current environment variables.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isRedeploying}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleRedeploy()}
              disabled={isRedeploying}
            >
              {isRedeploying ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
              Confirm redeploy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
