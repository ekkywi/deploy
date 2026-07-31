import { LifeCycleStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import {
    destroyEnvironmentResources,
    getEnvironmentRuntimeStatus,
    stopEnvironmentContainer,
} from '@/lib/services/agent-service';

type EnvironmentRuntimeWorker = {
    ipAddress: string;
    authToken: string;
};

type EnvironmentToDelete = {
    id: string;
    name: string;
    assignedPort: number | null;
    lifecycle: LifeCycleStatus;
    deployments: Array<{
        workerNode: EnvironmentRuntimeWorker | null;
    }>;
};

type DeleteResult = {
    id: string;
    name: string;
    status: 'DELETED' | 'SKIPPED' | 'BLOCKED';
    reason?: string;
    stopped?: boolean;
};

type RunningEnvironment = {
    id: string;
    name: string;
    containerName: string;
    imageName: string;
    port: number | null;
};

type DeleteWorkflowDeps = {
    prisma: typeof prisma;
    getEnvironmentRuntimeStatus: typeof getEnvironmentRuntimeStatus;
    stopEnvironmentContainer: typeof stopEnvironmentContainer;
    destroyEnvironmentResources: typeof destroyEnvironmentResources;
    now: () => number;
};

const defaultDeleteWorkflowDeps: DeleteWorkflowDeps = {
    prisma,
    getEnvironmentRuntimeStatus,
    stopEnvironmentContainer,
    destroyEnvironmentResources,
    now: () => Date.now(),
};

export async function getProjectEnvironmentsToDelete(projectId: string) {
    return prisma.environment.findMany({
        where: { projectId, deletedAt: null },
        select: {
            id: true,
            name: true,
            assignedPort: true,
            lifecycle: true,
            deployments: {
                where: {
                    workerNodeId: { not: null },
                    status: { in: ['SUCCESS', 'BUILDING', 'PENDING'] }
                },
                orderBy: { createdAt: 'desc' },
                take: 1,
                include: {
                    workerNode: true
                }
            }
        },
        orderBy: { createdAt: 'asc' }
    }) as Promise<EnvironmentToDelete[]>;
}

export async function getEnvironmentWorker(environmentId: string) {
    return prisma.deployment.findFirst({
        where: {
            environmentId,
            workerNodeId: { not: null },
            status: { in: ['SUCCESS', 'BUILDING', 'PENDING'] }
        },
        orderBy: { createdAt: 'desc' },
        include: { workerNode: true }
    });
}

export async function inspectRunningEnvironments(environments: EnvironmentToDelete[]) {
    const runningEnvironments: RunningEnvironment[] = [];

    for (const environment of environments) {
        const worker = environment.deployments[0]?.workerNode;

        if (!worker) {
            continue;
        }

        const runtime = await getEnvironmentRuntimeStatus(worker, environment.id);

        if (runtime.running) {
            runningEnvironments.push({
                id: environment.id,
                name: environment.name,
                containerName: runtime.containerName,
                imageName: runtime.imageName,
                port: runtime.port ?? environment.assignedPort ?? null,
            });
        }
    }

    return runningEnvironments;
}

export async function stopRunningEnvironment(
    worker: EnvironmentRuntimeWorker,
    environmentId: string,
    deps: Pick<DeleteWorkflowDeps, 'stopEnvironmentContainer'> = defaultDeleteWorkflowDeps
) {
    try {
        return await deps.stopEnvironmentContainer(worker, environmentId);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown agent stop error';

        if (message.includes('already stopped') || message.includes('not present') || message.includes('No such container')) {
            return { message };
        }

        throw error;
    }
}

async function finalizeEnvironmentDeletion(
    environmentId: string,
    releasedName: string,
    originalName: string,
    userId: string | null | undefined,
    deps: DeleteWorkflowDeps = defaultDeleteWorkflowDeps
) {
    await deps.prisma.$transaction(async (tx) => {
        await tx.environment.update({
            where: { id: environmentId },
            data: {
                lifecycle: LifeCycleStatus.DELETED,
                deletedAt: new Date(),
                name: releasedName,
                domain: null,
                assignedPort: null
            }
        });

        await tx.auditLog.create({
            data: {
                userId: userId ?? null,
                action: 'DELETE_ENVIRONMENT',
                targetType: 'ENVIRONMENT',
                targetId: environmentId,
                metadata: {
                    environmentName: originalName
                }
            }
        });
    });
}

async function markEnvironmentDeleting(environmentId: string, deps: DeleteWorkflowDeps = defaultDeleteWorkflowDeps) {
    await deps.prisma.environment.update({
        where: { id: environmentId },
        data: {
            lifecycle: LifeCycleStatus.DELETING
        }
    });
}

export async function teardownEnvironmentSafely(
    environment: EnvironmentToDelete,
    userId?: string | null,
    deps: DeleteWorkflowDeps = defaultDeleteWorkflowDeps
): Promise<DeleteResult> {
    const worker = environment.deployments[0]?.workerNode;
    const timestamp = deps.now();
    const releasedName = `${environment.name}_deleted_${timestamp}`;
    let wasStopped = false;

    if (environment.lifecycle === LifeCycleStatus.DELETED) {
        return { id: environment.id, name: environment.name, status: 'SKIPPED' };
    }

    try {
        if (environment.lifecycle !== LifeCycleStatus.DELETING) {
            await markEnvironmentDeleting(environment.id, deps);
        }

        if (worker) {
            const runtime = await deps.getEnvironmentRuntimeStatus(worker, environment.id);

            if (runtime.running) {
                await stopRunningEnvironment(worker, environment.id, deps);
                wasStopped = true;
            }

            await deps.destroyEnvironmentResources(worker, environment.id);
        }

        await finalizeEnvironmentDeletion(environment.id, releasedName, environment.name, userId, deps);

        return { id: environment.id, name: environment.name, status: 'DELETED', stopped: wasStopped };
    } catch (error) {
        throw error;
    }
}

export async function reconcileDeletingEnvironment(
    environmentId: string,
    userId?: string | null,
    deps: DeleteWorkflowDeps = defaultDeleteWorkflowDeps
) {
    const environment = await deps.prisma.environment.findUnique({
        where: { id: environmentId, deletedAt: null },
        select: {
            id: true,
            name: true,
            assignedPort: true,
            lifecycle: true,
            deployments: {
                where: {
                    workerNodeId: { not: null },
                    status: { in: ['SUCCESS', 'BUILDING', 'PENDING'] }
                },
                orderBy: { createdAt: 'desc' },
                take: 1,
                include: { workerNode: true }
            }
        }
    });

    if (!environment || environment.lifecycle !== LifeCycleStatus.DELETING) {
        return null;
    }

    await teardownEnvironmentSafely(environment, userId, deps);

    return { id: environment.id, name: environment.name };
}

export async function getProjectDeleteCandidates(projectId: string) {
    const environments = await getProjectEnvironmentsToDelete(projectId);
    const runningEnvironments = await inspectRunningEnvironments(environments);

    return { environments, runningEnvironments };
}

export function isDeleteBlockedByRunningEnvironments(runningEnvironments: RunningEnvironment[]) {
    return runningEnvironments.length > 0;
}

export type { RunningEnvironment, DeleteResult, EnvironmentToDelete, DeleteWorkflowDeps };

type DeleteProjectWorkflowDeps = {
    prisma: typeof prisma;
    getProjectDeleteCandidates: typeof getProjectDeleteCandidates;
    teardownEnvironmentSafely: typeof teardownEnvironmentSafely;
    now: () => number;
};

const defaultDeleteProjectWorkflowDeps: DeleteProjectWorkflowDeps = {
    prisma,
    getProjectDeleteCandidates,
    teardownEnvironmentSafely,
    now: () => Date.now(),
};

export async function deleteProjectWorkflow(
    projectId: string,
    userId: string,
    projectName: string,
    deps: DeleteProjectWorkflowDeps = defaultDeleteProjectWorkflowDeps
) {
    const deletedEnvironments: Array<{ id: string; name: string; stopped: boolean; }> = [];
    const failedTeardowns: Array<{ id: string; name: string; error: string; }> = [];
    const autoStoppedEnvironments: Array<{ id: string; name: string }> = [];

    const { environments, runningEnvironments } = await deps.getProjectDeleteCandidates(projectId);

    for (const environment of environments) {
        try {
            const result = await deps.teardownEnvironmentSafely(environment, userId);

            if (result.status === 'DELETED') {
                deletedEnvironments.push({
                    id: environment.id,
                    name: environment.name,
                    stopped: Boolean(result.stopped),
                });
            }

            if (result.stopped) {
                autoStoppedEnvironments.push({ id: environment.id, name: environment.name });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown teardown error';
            failedTeardowns.push({ id: environment.id, name: environment.name, error: message });
        }
    }

    if (failedTeardowns.length > 0) {
        return {
            status: 502,
            body: {
                error: 'Project deletion aborted because one or more environments could not be torn down safely.',
                runningEnvironments,
                deletedEnvironments,
                autoStoppedEnvironments,
                failedTeardowns,
                retryable: true,
            },
        };
    }

    const timestamp = deps.now();
    const releasedName = `${projectName}_deleted_${timestamp}`;

    await deps.prisma.$transaction(async (tx) => {
        await tx.project.update({
            where: { id: projectId },
            data: {
                deletedAt: new Date(),
                name: releasedName
            }
        });

        await tx.auditLog.create({
            data: {
                userId,
                action: 'DELETE_PROJECT',
                targetType: 'PROJECT',
                targetId: projectId,
                metadata: {
                    projectName: projectName
                }
            }
        });
    });

    return {
        status: 200,
        body: {
            message: 'Project deleted successfully after all environments were torn down.',
            deletedEnvironments,
            autoStoppedEnvironments,
        },
    };
}