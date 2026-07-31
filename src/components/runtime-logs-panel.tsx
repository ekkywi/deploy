'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, RefreshCw, Terminal } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type RuntimeLogsPanelProps = {
  projectId: string
  environmentId: string
  enabled: boolean
}

export function RuntimeLogsPanel({
  projectId,
  environmentId,
  enabled,
}: RuntimeLogsPanelProps) {
  const [logs, setLogs] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLive, setIsLive] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  const stopLive = useCallback(() => {
    eventSourceRef.current?.close()
    eventSourceRef.current = null
    setIsLive(false)
  }, [])

  const loadSnapshot = useCallback(async () => {
    if (!enabled) return
    setIsLoading(true)
    setError(null)
    stopLive()

    try {
      const res = await fetch(
        `/api/projects/${projectId}/environments/${environmentId}/runtime-logs?tail=300`
      )
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load runtime logs.')
      }
      setLogs(typeof data.logs === 'string' ? data.logs : '')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load runtime logs.'
      setError(message)
      setLogs('')
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }, [enabled, environmentId, projectId, stopLive])

  const startLive = useCallback(() => {
    if (!enabled) return
    stopLive()
    setError(null)
    setLogs('')
    setIsLive(true)

    const url = `/api/projects/${projectId}/environments/${environmentId}/runtime-logs?tail=200&follow=1`
    const eventSource = new EventSource(url)
    eventSourceRef.current = eventSource

    eventSource.onmessage = (event) => {
      setLogs((current) => (current ? `${current}\n${event.data}` : event.data))
    }

    eventSource.onerror = () => {
      stopLive()
      setError('Live log stream disconnected. Refresh to load a snapshot.')
    }
  }, [enabled, environmentId, projectId, stopLive])

  useEffect(() => {
    if (!enabled) {
      stopLive()
      setLogs('')
      setError(null)
      return
    }
    void loadSnapshot()
    return () => stopLive()
  }, [enabled, loadSnapshot, stopLive])

  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [logs])

  if (!enabled) {
    return (
      <Card className="gap-0 py-0 shadow-none">
        <CardHeader className="border-b px-3 py-2.5">
          <CardTitle className="text-sm font-medium">Runtime logs</CardTitle>
        </CardHeader>
        <CardContent className="px-3 py-6 text-center text-xs text-muted-foreground">
          Runtime logs appear after a successful deploy on a worker.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="gap-0 py-0 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between gap-2 border-b px-3 py-2.5">
        <CardTitle className="inline-flex items-center gap-1.5 text-sm font-medium">
          <Terminal className="size-3.5 text-muted-foreground" />
          Runtime logs
        </CardTitle>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7"
            onClick={() => void loadSnapshot()}
            disabled={isLoading || isLive}
          >
            {isLoading ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 size-3.5" />
            )}
            Refresh
          </Button>
          {isLive ? (
            <Button type="button" variant="outline" size="sm" className="h-7" onClick={stopLive}>
              Stop live
            </Button>
          ) : (
            <Button type="button" size="sm" className="h-7" onClick={startLive}>
              Follow
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {error ? (
          <p className="border-b border-border px-3 py-2 text-xs text-destructive">{error}</p>
        ) : null}
        <div
          ref={scrollRef}
          className={cn(
            'max-h-80 overflow-auto bg-muted/30 px-3 py-3 font-mono text-[11px] leading-5 text-foreground'
          )}
        >
          {isLoading && !logs ? (
            <p className="text-muted-foreground">Loading logs…</p>
          ) : logs ? (
            <pre className="whitespace-pre-wrap break-all">{logs}</pre>
          ) : (
            <p className="text-muted-foreground">No runtime log output yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
