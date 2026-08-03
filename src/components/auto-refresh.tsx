'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

type StatusPayload = {
  fingerprint?: string
  hasLive?: boolean
}

/**
 * Polls a lightweight status endpoint and only calls router.refresh() when the
 * fingerprint changes — avoids re-running heavy RSC work every few seconds.
 */
export function AutoRefresh({
  isActive,
  statusUrl,
  initialFingerprint = '',
  interval = 3000,
}: {
  isActive: boolean
  statusUrl: string
  initialFingerprint?: string
  interval?: number
}) {
  const router = useRouter()
  const fingerprintRef = useRef(initialFingerprint)

  useEffect(() => {
    fingerprintRef.current = initialFingerprint
  }, [initialFingerprint])

  useEffect(() => {
    if (!isActive || !statusUrl) return

    let cancelled = false
    let timer: ReturnType<typeof setInterval> | null = null

    const poll = async () => {
      try {
        const res = await fetch(statusUrl, {
          method: 'GET',
          cache: 'no-store',
          credentials: 'same-origin',
        })
        if (!res.ok || cancelled) return

        const data = (await res.json()) as StatusPayload
        const nextFingerprint =
          typeof data.fingerprint === 'string' ? data.fingerprint : ''

        if (nextFingerprint !== fingerprintRef.current) {
          fingerprintRef.current = nextFingerprint
          router.refresh()
        }
      } catch {
        // Transient network errors — keep polling while isActive.
      }
    }

    void poll()
    timer = setInterval(() => {
      void poll()
    }, interval)

    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
    }
  }, [isActive, statusUrl, interval, router])

  return null
}
