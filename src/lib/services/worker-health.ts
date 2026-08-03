import { revealWorkerAuthToken } from '@/lib/crypto/sealed-secrets'

const AGENT_PORT = 4000
const HEALTH_TIMEOUT_MS = 3000

export type WorkerHealthStatus = 'online' | 'unreachable' | 'unauthorized'

export type WorkerHealthResult = {
  workerId: string
  status: WorkerHealthStatus
  latencyMs: number
  checkedAt: string
  uptimeSeconds?: number
  error?: string
}

type WorkerProbeTarget = {
  id: string
  ipAddress: string
  authToken: string
}

export async function probeWorkerHealth(
  worker: WorkerProbeTarget
): Promise<WorkerHealthResult> {
  const checkedAt = new Date().toISOString()
  const started = Date.now()

  try {
    const response = await fetch(
      `http://${worker.ipAddress}:${AGENT_PORT}/api/health`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${revealWorkerAuthToken(worker)}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
        cache: 'no-store',
      }
    )

    const latencyMs = Date.now() - started

    if (response.status === 401 || response.status === 403) {
      return {
        workerId: worker.id,
        status: 'unauthorized',
        latencyMs,
        checkedAt,
        error: 'Agent rejected the worker auth token.',
      }
    }

    if (!response.ok) {
      return {
        workerId: worker.id,
        status: 'unreachable',
        latencyMs,
        checkedAt,
        error: `Agent responded with HTTP ${response.status}.`,
      }
    }

    const body = (await response.json().catch(() => null)) as {
      ok?: boolean
      uptimeSeconds?: number
    } | null

    if (!body?.ok) {
      return {
        workerId: worker.id,
        status: 'unreachable',
        latencyMs,
        checkedAt,
        error: 'Agent health payload was invalid.',
      }
    }

    return {
      workerId: worker.id,
      status: 'online',
      latencyMs,
      checkedAt,
      uptimeSeconds:
        typeof body.uptimeSeconds === 'number' ? body.uptimeSeconds : undefined,
    }
  } catch (error: unknown) {
    return {
      workerId: worker.id,
      status: 'unreachable',
      latencyMs: Date.now() - started,
      checkedAt,
      error: error instanceof Error ? error.message : 'Worker probe failed.',
    }
  }
}

export async function probeWorkersHealth(workers: WorkerProbeTarget[]) {
  return Promise.all(workers.map((worker) => probeWorkerHealth(worker)))
}
