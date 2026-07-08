import { NextResponse } from 'next/server'
import { GlobalRole, ProjectRoleType } from '@prisma/client'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { getProjectDeleteCandidates, teardownEnvironmentSafely } from '@/lib/services/delete-workflow-service'

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
    });

    if (!project) {
        return { error: 'Project not found or has been deleted.', status: 404 };
    }

    if (role !== GlobalRole.SYSADMIN) {
        const projectRole = await prisma.projectRole.findUnique({
            where: {
                userId_projectId: {
                    userId: userId,
                    projectId: projectId
                }
            }
        });

        if (!projectRole || projectRole.role !== ProjectRoleType.OWNER) {
            return { error: 'Forbidden. Only Project Owners can modify this project.', status:403 };
        }
    }

    return { project, error: null };
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const auth = await requireAuth(request);
        if (auth.response || !auth.session) return auth.response;

        const resolvedParams = await params;
        const { projectId } = resolvedParams;
        const { userId, role } = auth.session;

        const authCheck = await checkProjectAuthorization(userId, role, projectId);
        if (authCheck.error) {
            return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
        }

        const body = await request.json();
        const payload = parseProjectPayload(body);

        if (!payload.name || payload.name.length < 3) {
            return NextResponse.json(
                { error: 'Project name must be at least 3 characters long.' },
                { status: 400 }
            );
        }

        if (payload.repoUrl && !isHttpUrl(payload.repoUrl)) {
            return NextResponse.json(
                { error: 'Repository URL must be a valid HTTP/HTTPS URL.' },
                { status: 400 }
            );
        }

        const targetProject = authCheck.project!;

        if (payload.name !== authCheck.project?.name) {
            const existingProject = await prisma.project.findUnique({
                where: { name: payload.name }
            });

            if (existingProject) {
                return NextResponse.json(
                    { error: 'A project with this exact name already exists.' },
                    { status: 409 }
                );
            }
        }

        const updatedProject = await prisma.project.update({
            where: { id: projectId },
            data: {
                name: payload.name,
                description: payload.description,
                repoUrl: payload.repoUrl,
            },
            select: {
                id: true,
                name: true,
                description: true,
                repoUrl: true,
                createdAt: true,
                updatedAt: true,
            }
        });

        const isDataChanged = 
            payload.name !== targetProject.name ||
            payload.description !== targetProject.description ||
            payload.repoUrl !== targetProject.repoUrl;

        if (isDataChanged) {
            await prisma.auditLog.create({
                data: {
                    userId,
                    action: 'UPDATE_PROJECT',
                    targetType: 'PROJECT',
                    targetId: projectId,
                }
            });
        }

        return NextResponse.json(
            { message: 'Project updated successfully.', project: updatedProject },
            { status: 200 }
        );

    } catch (error) {
        console.error('Update project error:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const auth = await requireAuth(request);
        if (auth.response || !auth.session) return auth.response;

        const resolvedParams = await params;
        const { projectId } = resolvedParams;
        const { userId, role } = auth.session;

        const authCheck = await checkProjectAuthorization(userId, role, projectId);
        if (authCheck.error || !authCheck.project) {
            return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
        }

        const deletedEnvironments: Array<{
            id: string;
            name: string;
            stopped: boolean;
        }> = [];
        const result = await deleteProjectWorkflow(projectId, userId, authCheck.project.name);
        return NextResponse.json(result.body, { status: result.status });

    } catch (error) {
        console.error('Delete project error:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
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
    }> = [];
    const failedTeardowns: Array<{
        id: string;
        name: string;
        error: string;
    }> = [];
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

function parseProjectPayload(body: unknown) {
    const payload = typeof body === 'object' && body !== null ? body as Record<string, unknown> : {}

    return {
        name: typeof payload.name === 'string' ? payload.name.trim() : '',
        description: normalizeOptionalString(payload.description),
        repoUrl: normalizeOptionalString(payload.repoUrl),
    }
}

function normalizeOptionalString(value: unknown) {
    if (typeof value !== 'string') {
        return null
    }

    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
}

function isHttpUrl(value: string) {
    try {
        const url = new URL(value)
        return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
        return false
    }
}
