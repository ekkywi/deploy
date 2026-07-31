'use client'

import { useEffect, useState, useRef } from 'react'
import { Terminal, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface DeploymentLogViewerProps {
  projectId: string
  environmentId: string
  deploymentId: string
  status: string
}

export function DeploymentLogViewer({
  projectId,
  environmentId,
  deploymentId,
  status
}: DeploymentLogViewerProps) {
  const [logs, setLogs] = useState<string[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (status === 'PENDING') return

    const url = `/api/projects/${projectId}/environments/${environmentId}/deployments/${deploymentId}/logs`
    const eventSource = new EventSource(url)

    eventSource.onopen = () => {
      setIsConnected(true)
    }

    eventSource.onmessage = (event) => {
      const cleanText = event.data.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '')
      setLogs((prev) => [...prev, cleanText])
    }

    eventSource.onerror = (err) => {
      console.error("SSE Stream Error:", err)
      setIsConnected(false)
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [projectId, environmentId, deploymentId, status])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  const isFinished = status === 'SUCCESS' || status === 'FAILED'

  return (
    <Card className="flex h-full min-h-0 w-full flex-col rounded-none border-0 bg-[#0a0a0a] text-zinc-300 transition-all duration-200 dark">
      <CardHeader className="border-b border-zinc-800 bg-zinc-950/80 py-2.5 px-4 flex flex-row items-center justify-between space-y-0 shrink-0">
        <CardTitle className="flex items-center gap-2 text-[13px] font-mono font-medium text-zinc-400">
          <Terminal className="size-4" />
          build-execution.log
        </CardTitle>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {!isFinished && isConnected && (
              <Badge variant="outline" className="animate-pulse border-emerald-500/30 bg-emerald-500/10 text-[10px] uppercase text-emerald-400">
                Live Stream
              </Badge>
            )}
            {!isFinished && !isConnected && status !== 'PENDING' && (
              <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-[10px] uppercase text-amber-400">
                Connecting...
              </Badge>
            )}
            {isFinished && (
              <Badge variant="outline" className="border-zinc-700 bg-zinc-800 text-[10px] uppercase text-zinc-400">
                Stream Closed
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 font-mono text-[12px] leading-relaxed tracking-tight select-text bg-[#0a0a0a]"
      >
        {logs.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center space-y-3 text-zinc-600">
            <Loader2 className="size-5 animate-spin" />
            <p>{status === 'PENDING' ? 'Waiting for Worker Node allocation...' : 'Connecting to log stream...'}</p>
          </div>
        ) : (
          <div className="space-y-0.5 font-mono min-w-0">
            {logs.map((log, index) => {
              const isError = log.includes('[ERROR]') || log.includes('ERR!') || log.toLowerCase().includes('failed')
              const isSuccess = log.includes('[SUCCESS]') || log.includes('Done in')
              
              return (
                <div key={index} className="flex min-w-0 items-start rounded px-1 py-0.5 hover:bg-zinc-900/40">
                  <span className="mr-4 select-none text-zinc-600 text-right w-10 shrink-0 font-mono">{index + 1}</span>
                  <span className={`min-w-0 flex-1 whitespace-pre-wrap break-words font-mono ${isError ? 'text-red-400 font-medium' : isSuccess ? 'text-emerald-400' : 'text-zinc-300'}`}>
                    {log}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
