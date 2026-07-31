'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { History, Loader2 } from 'lucide-react'
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
import { isGitCommitSha } from '@/lib/git-ref'

type RollbackButtonProps = {
  projectId: string
  environmentId: string
  deploymentId: string
  commitHash: string | null
  status: string
  disabled?: boolean
}

export function RollbackButton({
  projectId,
  environmentId,
  deploymentId,
  commitHash,
  status,
  disabled = false,
}: RollbackButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isRollingBack, setIsRollingBack] = useState(false)
  const router = useRouter()

  const sha = commitHash?.trim() || ''
  const canRollback = status === 'SUCCESS' && isGitCommitSha(sha)

  if (!canRollback) {
    return null
  }

  const shortSha = sha.slice(0, 7)

  const handleRollback = async () => {
    setIsRollingBack(true)
    try {
      const res = await fetch(
        `/api/projects/${projectId}/environments/${environmentId}/deployments/${deploymentId}/rollback`,
        { method: 'POST' }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || 'Rollback failed')
      }
      toast.success(`Rollback to ${shortSha} started`)
      setIsOpen(false)
      router.refresh()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Rollback failed')
    } finally {
      setIsRollingBack(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 px-2.5 text-xs"
        disabled={disabled || isRollingBack}
        onClick={() => setIsOpen(true)}
      >
        {isRollingBack ? (
          <Loader2 className="mr-1.5 size-3 animate-spin" />
        ) : (
          <History className="mr-1.5 size-3" />
        )}
        Rollback
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rollback</DialogTitle>
            <DialogDescription>
              Deploy commit{' '}
              <span className="font-mono text-foreground">{shortSha}</span> again
              using the current environment variables. This creates a new deployment —
              it does not restore historical env vars.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isRollingBack}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleRollback()}
              disabled={isRollingBack}
            >
              {isRollingBack ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
              Confirm rollback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
