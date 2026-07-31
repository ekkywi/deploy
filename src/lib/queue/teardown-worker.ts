import { Job, Worker } from 'bullmq'
import { deleteProjectWorkflow } from '@/lib/services/project-delete-workflow'
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

teardownWorker.on('failed', (job, err) => {
    console.error(`[WORKER ERROR] Job ${job?.id} failed:`, err.message)
})
