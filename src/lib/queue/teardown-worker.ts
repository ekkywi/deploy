import { Job, Worker } from 'bullmq'
import { deleteProjectWorkflow } from '@/lib/services/project-delete-workflow'
import {
  getStuckDeploySweepIntervalMs,
  reconcileStuckDeployments,
} from '@/lib/services/stuck-deploy-reconcile'
import { TEARDOWN_QUEUE_NAME } from './teardown-queue'
import { teardownRedisConnection } from './teardown-redis'

type TeardownJobPayload = {
    projectId: string;
    userId: string;
    projectName: string;
}

export const teardownWorker = new Worker<TeardownJobPayload>(
    TEARDOWN_QUEUE_NAME,
    async (job: Job<TeardownJobPayload>) => {
        const { projectId, userId, projectName } = job.data

        console.log(`[WORKER] Processing project deletion: ${projectName} (${projectId})`)

        const result = await deleteProjectWorkflow(projectId, userId, projectName)

        if (result.status !== 200) {
            throw new Error(JSON.stringify(result.body))
        }

        console.log(`[WORKER] Project ${projectName} was fully deleted.`)
        return result.body
    },
    {
        connection: teardownRedisConnection,
        concurrency: 1,
    }
)

teardownWorker.on('ready', () => {
    console.log(`[WORKER] Listening on queue "${TEARDOWN_QUEUE_NAME}"`)
})

teardownWorker.on('failed', (job, err) => {
    console.error(`[WORKER ERROR] Job ${job?.id} failed:`, err.message)
})

const sweepIntervalMs = getStuckDeploySweepIntervalMs()
let sweepInFlight = false

async function runStuckDeploySweep() {
    if (sweepInFlight) return
    sweepInFlight = true
    try {
        const result = await reconcileStuckDeployments({ limit: 50 })
        if (result.timedOut > 0) {
            console.log(`[WORKER] Stuck-deploy sweep timed out ${result.timedOut} deployment(s).`)
        }
    } catch (error: unknown) {
        console.error(
            '[WORKER] Stuck-deploy sweep failed:',
            error instanceof Error ? error.message : error
        )
    } finally {
        sweepInFlight = false
    }
}

// Initial delay so Redis/DB settle, then periodic sweeps.
const stuckDeploySweepTimer = setInterval(() => {
    void runStuckDeploySweep()
}, sweepIntervalMs)
setTimeout(() => {
    void runStuckDeploySweep()
}, 5_000)

console.log(
    `[WORKER] Stuck-deploy sweep enabled (every ${Math.round(sweepIntervalMs / 1000)}s)`
)

async function shutdown() {
    clearInterval(stuckDeploySweepTimer)
    await teardownWorker.close()
    process.exit(0)
}

process.on('SIGINT', () => {
    void shutdown()
})

process.on('SIGTERM', () => {
    void shutdown()
})
