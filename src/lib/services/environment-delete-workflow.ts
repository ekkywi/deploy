import { GlobalRole, ProjectRoleType, LifeCycleStatus, StackType } from '@prisma/client'
import prisma from '@/lib/prisma'
import { reconcileDeletingEnvironment, teardownEnvironmentSafely } from '@/lib/services/delete-workflow-service'

const NODE_VERSION_OPTIONS = ['18', '20', '22', '24'] as const

function isNodeStack(stackType: unknown) {
    return stackType === StackType.NEXTJS || stackType === StackType.NODEJS
}

function sanitizeNodeVersion(value: unknown, fallback: string) {
    if (typeof value === 'string' && NODE_VERSION_OPTIONS.includes(value as (typeof NODE_VERSION_OPTIONS)[number])) {
        return value
    }

    return fallback
}

type DeleteEnvironmentWorkflowDeps = {
    prisma: typeof prisma;
    reconcileDeletingEnvironment: typeof reconcileDeletingEnvironment;
    teardownEnvironmentSafely: typeof teardownEnvironmentSafely;
}

const defaultDeleteEnvironmentWorkflowDeps: DeleteEnvironmentWorkflowDeps = {
    prisma,
    reconcileDeletingEnvironment,
    teardownEnvironmentSafely,
}

async function checkEnvironmentAuthorization(
    userId: string,
    role: GlobalRole,
    projectId: string,
    requireEditorOrOwner: boolean
) {
    if (role === GlobalRole.SYSADMIN) {
        return null
    }

    const membership = await prisma.projectRole.findUnique({
        where: { userId_projectId: { userId, projectId } }
    })

    if (!membership) {
        return { error: 'Forbidden.', status: 403 }
    }

    if (requireEditorOrOwner && membership.role === ProjectRoleType.VIEWER) {
        return { error: 'Forbidden. Only Project Owners and Editors can modify environment.', status: 403 }
    }

    if (!requireEditorOrOwner && ['VIEWER', 'DEVELOPER'].includes(membership.role)) {
        return { error: 'Forbidden. Only Admins can delete environments.', status: 403 }
    }

    return null
}

export async function deleteEnvironmentWorkflow(
    projectId: string,
    environmentId: string,
    userId: string,
    deps: DeleteEnvironmentWorkflowDeps = defaultDeleteEnvironmentWorkflowDeps
) {
    const environment = await deps.prisma.environment.findUnique({
        where: { id: environmentId, projectId, deletedAt: null },
        select: {
            id: true,
            name: true,
            lifecycle: true,
            assignedPort: true,
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
        }
    })

    if (!environment) {
        return {
            status: 404,
            body: { error: 'Environment not found or already deleted.' },
        }
    }

    if (environment.lifecycle === LifeCycleStatus.DELETING) {
        try {
            await deps.reconcileDeletingEnvironment(environmentId, userId)
            return {
                status: 200,
                body: {
                    message: 'Environment deletion was already in progress and has now been finalized.',
                    lifecycle: LifeCycleStatus.DELETED,
                    retryable: false,
                },
            }
        } catch (error) {
            console.error('[TEARDOWN WARNING] Failed to reconcile deleting environment:', error)
            return {
                status: 502,
                body: {
                    error: 'Failed to resume pending environment deletion.',
                    lifecycle: LifeCycleStatus.DELETING,
                    retryable: true,
                },
            }
        }
    }

    try {
        const deleteResult = await deps.teardownEnvironmentSafely(environment, userId)

        return {
            status: 200,
            body: {
                message: deleteResult.stopped
                    ? 'Environment container was stopped and resources were destroyed.'
                    : 'Environment completely destroyed and removed.',
                lifecycle: LifeCycleStatus.DELETED,
                retryable: false,
            },
        }
    } catch (error) {
        console.error('Environment deletion error:', error)
        return {
            status: 502,
            body: {
                error: 'Failed to destroy infrastructure on the server.',
                lifecycle: LifeCycleStatus.DELETING,
                retryable: true,
            },
        }
    }
}

export async function authorizeEnvironmentModification(
    userId: string,
    role: GlobalRole,
    projectId: string
) {
    return checkEnvironmentAuthorization(userId, role, projectId, true)
}

export async function authorizeEnvironmentDeletion(
    userId: string,
    role: GlobalRole,
    projectId: string
) {
    return checkEnvironmentAuthorization(userId, role, projectId, false)
}

export { isNodeStack, sanitizeNodeVersion, NODE_VERSION_OPTIONS }
