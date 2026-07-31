'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { DeploymentStatusBadge } from '@/components/deployment-status-badge'
import { DeploymentLogViewer } from '@/components/deployment-log-viewer'

interface DeploymentLogDialogProps {
  projectId: string
  environmentId: string
  deploymentId: string
  status: string
}

export function DeploymentLogDialog({
  projectId,
  environmentId,
  deploymentId,
  status,
}: DeploymentLogDialogProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-7 px-2.5 text-xs">
          Logs
        </Button>
      </DialogTrigger>
      <DialogContent
        showCloseButton
        className="flex h-[min(86vh,720px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
      >
        <DialogHeader className="shrink-0 space-y-1 border-b border-border px-4 py-3 pr-12 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="text-sm font-medium tracking-tight">
              Deployment logs
            </DialogTitle>
            <DeploymentStatusBadge status={status} />
          </div>
          <DialogDescription className="text-xs">
            Build output from the worker agent for this deployment.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1">
          {isOpen ? (
            <DeploymentLogViewer
              projectId={projectId}
              environmentId={environmentId}
              deploymentId={deploymentId}
              status={status}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
