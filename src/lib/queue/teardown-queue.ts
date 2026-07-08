import { Queue, Worker, Job } from 'bullmq';
import { deleteProjectWorkflow } from '@/lib/services/project-delete-workflow';

export const TEARDOWN_QUEUE_NAME = 'project-teardown-queue';

const redisConnection = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
};

export const teardownQueue = new Queue(TEARDOWN_QUEUE_NAME, {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
    },
});

interface TeardownJobPayload {
    projectId: string;
    userId: string;
    projectName: string;
}

export const teardownWorker = new Worker<TeardownJobPayload>(
    TEARDOWN_QUEUE_NAME,
    async (job: Job) => {
        const { projectId, userId, projectName } = job.data;
        
        console.log(`[WORKER] Processing project deletion: ${projectName} (${projectId})`);
        
        const result = await deleteProjectWorkflow(projectId, userId, projectName);

        if (result.status !== 200) {
            throw new Error(JSON.stringify(result.body));
        }

        console.log(`[WORKER] Project ${projectName} was fully deleted.`);
        return result.body;
    },
    {
        connection: redisConnection,
        concurrency: 1,
    }
);

teardownWorker.on('failed', (job, err) => {
    console.error(`[WORKER ERROR] Job ${job?.id} failed:`, err.message);
});
