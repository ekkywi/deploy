import { revealWorkerAuthToken } from '@/lib/crypto/sealed-secrets';

const AGENT_PORT = 4000;
const DEFAULT_TIMEOUT_MS = 10_000;

type AgentWorker = {
    ipAddress: string;
    authToken: string;
};

type AgentStatusResponse = {
    status?: string;
    message?: string;
    exists: boolean;
    running: boolean;
    containerName: string;
    imageName: string;
    port?: number | null;
    deletedResources?: string[];
    missingResources?: string[];
};

async function parseJsonResponse<T>(response: Response): Promise<T | null> {
    try {
        return (await response.json()) as T;
    } catch {
        return null;
    }
}

async function agentRequest<T>(
    worker: AgentWorker,
    path: string,
    init?: RequestInit
): Promise<T> {
    const response = await fetch(`http://${worker.ipAddress}:${AGENT_PORT}${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${revealWorkerAuthToken(worker)}`,
            ...(init?.headers || {}),
        },
        signal: init?.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });

    if (!response.ok) {
        const errorBody = await parseJsonResponse<{ error?: string; message?: string }>(response);
        const detail = errorBody?.error || errorBody?.message || `Agent responded with ${response.status}`;
        throw new Error(detail);
    }

    const payload = await parseJsonResponse<T>(response);
    if (!payload) {
        throw new Error('Agent returned an empty response.');
    }

    return payload;
}

export async function getEnvironmentRuntimeStatus(worker: AgentWorker, environmentId: string) {
    return agentRequest<AgentStatusResponse>(worker, `/api/environment/${environmentId}/status`, {
        method: 'GET',
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
}

export async function stopEnvironmentContainer(worker: AgentWorker, environmentId: string) {
    return agentRequest<{ message: string; status?: string }>(worker, `/api/environment/${environmentId}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ environmentId }),
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
}

export async function destroyEnvironmentResources(worker: AgentWorker, environmentId: string) {
    return agentRequest<{
        status?: string;
        message?: string;
        deletedResources?: string[];
        missingResources?: string[];
    }>(worker, `/api/environment/${environmentId}/resources`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ environmentId }),
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
}

