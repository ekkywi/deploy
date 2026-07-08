'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
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
  status
}: DeploymentLogDialogProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button className="rounded-md border border-border/60 bg-muted/20 px-2.5 py-1 font-mono text-[10px] font-medium text-foreground/80 transition-colors hover:bg-muted/45 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1">
          View Logs
        </button>
      </DialogTrigger>
      <DialogContent
        className="h-[90vh] max-h-[90vh] border-zinc-800 bg-[#0a0a0a] p-0 overflow-hidden sm:rounded-xl shadow-2xl gap-0"
        style={{
          width: 'min(92vw, 1120px)',
          maxWidth: 'calc(100vw - 2rem)',
        }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Deployment Logs</DialogTitle>
        </DialogHeader>
        
        {isOpen && (
          <DeploymentLogViewer 
            projectId={projectId}
            environmentId={environmentId}
            deploymentId={deploymentId}
            status={status}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
