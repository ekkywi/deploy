import { GlobalRole, ProjectRoleType } from '@prisma/client'
import prisma from '@/lib/prisma'
import { getProjectDeleteCandidates, teardownEnvironmentSafely } from '@/lib/services/delete-workflow-service'

type DeleteProjectWorkflowDeps = {
    prisma: typeof prisma;
    getProjectDeleteCandidates: typeof getProjectDeleteCandidates;
    teardownEnvironmentSafely: typeof teardownEnvironmentSafely;
    now: () => number;
}

const defaultDeleteProjectWorkflowDeps: DeleteProjectWorkflowDeps = {
    prisma,
    getProjectDeleteCandidates,
    teardownEnvironmentSafely,
    now: () => Date.now(),
}

async function checkProjectAuthorization(
    userId: string,
    role: GlobalRole,
    projectId: string
) {
    const project = await prisma.project.findFirst({
        where: {
            id: projectId,
            deletedAt: null,
        }
    })

    if (!project) {
        return { error: 'Project not found or has been deleted.', status: 404 }
    }

    if (role !== GlobalRole.SYSADMIN) {
        const projectRole = await prisma.projectRole.findUnique({
            where: {
                userId_projectId: {
                    userId,
                    projectId,
                }
            }
        })

        if (!projectRole || projectRole.role !== ProjectRoleType.OWNER) {
            return { error: 'Forbidden. Only Project Owners can modify this project.', status: 403 }
        }
    }

    return { project, error: null }
}

export async function deleteProjectWorkflow(
    projectId: string,
    userId: string,
    projectName: string,
    deps: DeleteProjectWorkflowDeps = defaultDeleteProjectWorkflowDeps
) {
    const deletedEnvironments: Array<{
        id: string;
        name: string;
        stopped: boolean;
    }> = []
    const failedTeardowns: Array<{
        id: string;
        name: string;
        error: string;
    }> = []
    const autoStoppedEnvironments: Array<{ id: string; name: string }> = []

    const { environments, runningEnvironments } = await deps.getProjectDeleteCandidates(projectId)

    for (const environment of environments) {
        try {
            const result = await deps.teardownEnvironmentSafely(environment, userId)

            if (result.status === 'DELETED') {
                deletedEnvironments.push({
                    id: environment.id,
                    name: environment.name,
                    stopped: Boolean(result.stopped),
                })
            }

            if (result.stopped) {
                autoStoppedEnvironments.push({ id: environment.id, name: environment.name })
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown teardown error'
            failedTeardowns.push({ id: environment.id, name: environment.name, error: message })
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
        }
    }

    const timestamp = deps.now()
    const releasedName = `${projectName}_deleted_${timestamp}`

    await deps.prisma.$transaction(async (tx) => {
        await tx.project.update({
            where: { id: projectId },
            data: {
                deletedAt: new Date(),
                name: releasedName
            }
        })

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
        })
    })

    return {
        status: 200,
        body: {
            message: 'Project deleted successfully after all environments were torn down.',
            deletedEnvironments,
            autoStoppedEnvironments,
        },
    }
}

export async function authorizeProjectForDeletion(userId: string, role: GlobalRole, projectId: string) {
    return checkProjectAuthorization(userId, role, projectId)
}