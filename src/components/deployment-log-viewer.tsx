'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Terminal } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DeploymentLogViewerProps {
  projectId: string
  environmentId: string
  deploymentId: string
  status: string
}

function isTerminalStatus(status: string) {
  return status === 'SUCCESS' || status === 'FAILED' || status === 'CANCELLED'
}

const CONNECT_TIMEOUT_MS = 8_000
/** Keep memory/DOM bounded for long builds. */
const MAX_LOG_LINES = 4_000
const STICK_TO_BOTTOM_THRESHOLD_PX = 80

const LOAD_ERROR_MESSAGE =
  'Could not load deployment logs. The worker agent may be offline, or logs for this deployment are no longer available.'

function appendCappedLines(previous: string[], incoming: string[]) {
  if (incoming.length === 0) return previous
  const combined = previous.length === 0 ? incoming : previous.concat(incoming)
  if (combined.length <= MAX_LOG_LINES) return combined
  return combined.slice(combined.length - MAX_LOG_LINES)
}

export function DeploymentLogViewer({
  projectId,
  environmentId,
  deploymentId,
  status,
}: DeploymentLogViewerProps) {
  const [logs, setLogs] = useState<string[]>([])
  const [trimmedCount, setTrimmedCount] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  const [streamError, setStreamError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickToBottomRef = useRef(true)
  const pendingRef = useRef<string[]>([])
  const flushRafRef = useRef<number | null>(null)
  const toastShownRef = useRef(false)
  const isFinished = isTerminalStatus(status)

  const flushPendingLogs = useCallback(() => {
    flushRafRef.current = null
    const batch = pendingRef.current
    if (batch.length === 0) return
    pendingRef.current = []

    setLogs((prev) => {
      const next = appendCappedLines(prev, batch)
      const dropped = prev.length + batch.length - next.length
      if (dropped > 0) {
        setTrimmedCount((count) => count + dropped)
      }
      return next
    })
  }, [])

  const enqueueLogChunk = useCallback(
    (chunk: string) => {
      pendingRef.current.push(chunk)
      if (flushRafRef.current != null) return
      flushRafRef.current = window.requestAnimationFrame(flushPendingLogs)
    },
    [flushPendingLogs]
  )

  const notifyLoadFailure = useCallback((message: string) => {
    setStreamError(message)
    if (toastShownRef.current) return
    toastShownRef.current = true
    toast.error('Failed to load logs', {
      description: message,
      duration: 8_000,
    })
  }, [])

  const handleRetry = () => {
    toastShownRef.current = false
    pendingRef.current = []
    if (flushRafRef.current != null) {
      window.cancelAnimationFrame(flushRafRef.current)
      flushRafRef.current = null
    }
    setLogs([])
    setTrimmedCount(0)
    setStreamError(null)
    setIsConnected(false)
    stickToBottomRef.current = true
    setRetryKey((key) => key + 1)
  }

  const handleScroll = () => {
    const node = scrollRef.current
    if (!node) return
    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight
    stickToBottomRef.current = distanceFromBottom <= STICK_TO_BOTTOM_THRESHOLD_PX
  }

  useEffect(() => {
    if (status === 'PENDING') return

    let closedByCleanup = false
    let opened = false
    let receivedMessage = false
    let settled = false

    setIsConnected(false)
    setStreamError(null)

    const url = `/api/projects/${projectId}/environments/${environmentId}/deployments/${deploymentId}/logs`
    const eventSource = new EventSource(url)

    const failIfNoData = () => {
      if (settled || closedByCleanup || opened || receivedMessage) return
      settled = true
      eventSource.close()
      notifyLoadFailure(LOAD_ERROR_MESSAGE)
    }

    const connectTimeout = window.setTimeout(failIfNoData, CONNECT_TIMEOUT_MS)

    eventSource.onopen = () => {
      opened = true
      settled = true
      window.clearTimeout(connectTimeout)
      setIsConnected(true)
      setStreamError(null)
    }

    eventSource.onmessage = (event) => {
      receivedMessage = true
      settled = true
      window.clearTimeout(connectTimeout)
      setIsConnected(true)
      setStreamError(null)
      const cleanText = event.data.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '')
      enqueueLogChunk(cleanText)
    }

    eventSource.onerror = () => {
      setIsConnected(false)
      window.clearTimeout(connectTimeout)

      if (closedByCleanup) return

      eventSource.close()

      if (opened || receivedMessage) {
        settled = true
        return
      }

      failIfNoData()
    }

    return () => {
      closedByCleanup = true
      window.clearTimeout(connectTimeout)
      eventSource.close()
      if (flushRafRef.current != null) {
        window.cancelAnimationFrame(flushRafRef.current)
        flushRafRef.current = null
      }
      // Flush any queued chunks so a remount mid-batch doesn't drop them silently.
      if (pendingRef.current.length > 0) {
        flushPendingLogs()
      }
    }
  }, [
    projectId,
    environmentId,
    deploymentId,
    status,
    retryKey,
    notifyLoadFailure,
    enqueueLogChunk,
    flushPendingLogs,
  ])

  useEffect(() => {
    const node = scrollRef.current
    if (!node || !stickToBottomRef.current) return
    node.scrollTop = node.scrollHeight
  }, [logs])

  const streamBadge = (() => {
    if (streamError) {
      return {
        label: 'Unavailable',
        className: 'border-destructive/20 bg-destructive/10 text-destructive',
      }
    }
    if (!isFinished && isConnected) {
      return {
        label: 'Live',
        className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
      }
    }
    if (!isFinished && !isConnected && status !== 'PENDING') {
      return {
        label: 'Connecting',
        className: 'border-sky-500/20 bg-sky-500/10 text-sky-400',
      }
    }
    if (isFinished || logs.length > 0) {
      return {
        label: 'Closed',
        className: 'border-border bg-muted/40 text-muted-foreground',
      }
    }
    return null
  })()

  const lineNumberOffset = trimmedCount

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-2">
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <Terminal className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate font-mono">build-execution.log</span>
          {trimmedCount > 0 ? (
            <span className="truncate text-muted-foreground/80">
              (showing last {logs.length.toLocaleString()} of{' '}
              {(logs.length + trimmedCount).toLocaleString()} lines)
            </span>
          ) : null}
        </div>
        {streamBadge ? (
          <Badge
            variant="outline"
            className={cn(
              'px-1.5 text-[10px] font-medium uppercase tracking-wide',
              streamBadge.className,
              !isFinished && isConnected && !streamError ? 'animate-pulse' : null
            )}
          >
            {streamBadge.label}
          </Badge>
        ) : null}
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 select-text overflow-x-hidden overflow-y-auto bg-card px-3 py-3 font-mono text-[12px] leading-relaxed tracking-tight sm:px-4"
      >
        {logs.length === 0 ? (
          <div className="flex h-full min-h-48 flex-col items-center justify-center gap-3 px-4 text-center">
            {streamError ? (
              <>
                <p className="max-w-md text-sm text-destructive">{streamError}</p>
                <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
                  Try again
                </Button>
              </>
            ) : (
              <>
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {status === 'PENDING'
                    ? 'Waiting for worker allocation…'
                    : 'Connecting to log stream…'}
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="min-w-0 space-y-px">
            {logs.map((log, index) => {
              const isError =
                log.includes('[ERROR]') ||
                log.includes('ERR!') ||
                log.toLowerCase().includes('failed')
              const isSuccess =
                log.includes('[SUCCESS]') ||
                log.includes('[✅ SUCCESS]') ||
                log.includes('Done in')

              return (
                <div
                  key={lineNumberOffset + index}
                  style={{
                    contentVisibility: 'auto',
                    containIntrinsicSize: 'auto 1.5rem',
                  }}
                  className="flex min-w-0 items-start gap-3 rounded-sm px-1.5 py-0.5 hover:bg-accent/50"
                >
                  <span className="w-10 shrink-0 select-none text-right text-muted-foreground/70">
                    {lineNumberOffset + index + 1}
                  </span>
                  <span
                    className={cn(
                      'min-w-0 flex-1 break-words whitespace-pre-wrap text-foreground/90',
                      isError && 'font-medium text-destructive',
                      isSuccess && 'text-emerald-400'
                    )}
                  >
                    {log}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
