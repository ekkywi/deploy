import { Queue } from 'bullmq'
import { teardownRedisConnection } from './teardown-redis'

export const TEARDOWN_QUEUE_NAME = 'project-teardown-queue';

export interface TeardownJobPayload {
    projectId: string;
    userId: string;
    projectName: string;
}

export interface ProjectDeleteQueueResponse {
    status: number;
    body: {
        message?: string;
        status?: string;
        error?: string;
        retryable?: boolean;
    };
}

const PROJECT_DELETE_QUEUED_MESSAGE = 'Project deletion queued successfully. It will be removed in the background.'
const PROJECT_DELETE_REDIS_UNAVAILABLE_MESSAGE = 'Project deletion is temporarily unavailable because the queue cannot reach Redis. Please try again shortly.'

let teardownQueueInstance: Queue<TeardownJobPayload> | null = null

export function getTeardownQueue() {
    if (!teardownQueueInstance) {
        teardownQueueInstance = new Queue<TeardownJobPayload>(TEARDOWN_QUEUE_NAME, {
            connection: teardownRedisConnection,
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 5000,
                },
                removeOnComplete: true,
                removeOnFail: false,
            },
        })
    }

    return teardownQueueInstance
}

export function isRedisUnavailableError(error: unknown) {
    const visited = new Set<unknown>()

    const stack: unknown[] = [error]

    while (stack.length > 0) {
        const current = stack.pop()
        if (!current || typeof current !== 'object' || visited.has(current)) {
            continue
        }

        visited.add(current)

        const currentError = current as {
            code?: unknown
            name?: unknown
            message?: unknown
            cause?: unknown
        }

        const message = typeof currentError.message === 'string' ? currentError.message : ''
        const code = typeof currentError.code === 'string' ? currentError.code : ''
        const name = typeof currentError.name === 'string' ? currentError.name : ''

        if (
            code === 'ECONNREFUSED' ||
            code === 'ETIMEDOUT' ||
            code === 'EHOSTUNREACH' ||
            code === 'ENETUNREACH' ||
            name === 'ConnectionClosedError' ||
            name === 'MaxRetriesPerRequestError' ||
            message.includes('ECONNREFUSED') ||
            message.includes('Connection is closed') ||
            message.includes('Reached the max retries per request limit') ||
            message.includes('ETIMEDOUT') ||
            message.includes('EHOSTUNREACH') ||
            message.includes('ENETUNREACH')
        ) {
            return true
        }

        if ('cause' in currentError && currentError.cause) {
            stack.push(currentError.cause)
        }
    }

    return false
}

export async function enqueueProjectDeleteJob(
    payload: TeardownJobPayload,
    queue?: Pick<Queue<TeardownJobPayload>, 'add'>
): Promise<ProjectDeleteQueueResponse> {
    try {
        const activeQueue = queue ?? getTeardownQueue()

        await activeQueue.add('delete-project-job', payload)

        return {
            status: 202,
            body: {
                message: PROJECT_DELETE_QUEUED_MESSAGE,
                status: 'PROCESSING',
            },
        }
    } catch (error) {
        if (isRedisUnavailableError(error)) {
            return {
                status: 503,
                body: {
                    error: PROJECT_DELETE_REDIS_UNAVAILABLE_MESSAGE,
                    retryable: true,
                },
            }
        }

        throw error
    }
}
