import { NextResponse } from 'next/server';
import { GlobalRole, ProjectRoleType, EnvironmentTier, StackType, LifeCycleStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { reconcileDeletingEnvironment, teardownEnvironmentSafely } from '@/lib/services/delete-workflow-service';

const NODE_VERSION_OPTIONS = ['18', '20', '22', '24'] as const;

function isNodeStack(stackType: unknown) {
    return stackType === StackType.NEXTJS || stackType === StackType.NODEJS;
}

function sanitizeNodeVersion(value: unknown, fallback: string) {
    if (typeof value === 'string' && NODE_VERSION_OPTIONS.includes(value as (typeof NODE_VERSION_OPTIONS)[number])) {
        return value;
    }

    return fallback;
}

type DeleteEnvironmentWorkflowDeps = {
    prisma: typeof prisma;
    reconcileDeletingEnvironment: typeof reconcileDeletingEnvironment;
    teardownEnvironmentSafely: typeof teardownEnvironmentSafely;
};

const defaultDeleteEnvironmentWorkflowDeps: DeleteEnvironmentWorkflowDeps = {
    prisma,
    reconcileDeletingEnvironment,
    teardownEnvironmentSafely,
};

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ projectId: string, environmentId: string }> }
) {
    try {
        const auth = await requireAuth(request);

        if (auth.response || !auth.session) return auth.response;

        const resolvedParams = await params;
        const { projectId, environmentId } = resolvedParams;
        const { userId, role: globalRole } = auth.session;

        if (globalRole !== GlobalRole.SYSADMIN) {
            const membership = await prisma.projectRole.findUnique({
                where: { userId_projectId: { userId, projectId } }
            });

            if (!membership || membership.role === ProjectRoleType.VIEWER ) {
                return  NextResponse.json(
                    { error: 'Forbidden. Only Project Owners and Editors can modify environment.' },
                    { status: 403 }
                );
            }
        }

        const targetEnv = await prisma.environment.findUnique({
            where: { id: environmentId, projectId }
        });

        if (!targetEnv || targetEnv.deletedAt) {
            return NextResponse.json(
                { error: 'Environment not found.' },
                { status: 404 }
            );
        }

        const body = await request.json();
        const { name, domain, stackType, tier, nodeVersion } = body;
        const sanitizedName = name?.trim();
        const sanitizedDomain = domain ? domain.trim().toLowerCase() : null;

        if (sanitizedName !== targetEnv.name || sanitizedDomain !== targetEnv.domain) {
            const duplicateFilters = [
                ...(sanitizedName ? [{ projectId, name: sanitizedName }] : []),
                ...(sanitizedDomain ? [{ domain: sanitizedDomain }] : [])
            ];
            const existingEnv = duplicateFilters.length > 0
                ? await prisma.environment.findFirst({
                    where: {
                        deletedAt: null,
                        id: { not: environmentId },
                        OR: duplicateFilters
                    }
                })
                : null;

            if (existingEnv) {
                if (existingEnv.name === sanitizedName && existingEnv.projectId === projectId) {
                    return NextResponse.json(
                        { error: 'An environment with this name already exists.' },
                        { status: 409 }
                    );
                }
                if (existingEnv.domain === sanitizedDomain) {
                    return NextResponse.json(
                        { error: 'This domain is already is use.' },
                        { status: 409 }
                    );
                }
            }
        }

        if (stackType && isNodeStack(stackType) && nodeVersion && !NODE_VERSION_OPTIONS.includes(nodeVersion)) {
            return NextResponse.json(
                { error: 'Invalid node version.' },
                { status: 400 }
            );
        }

        const updatedEnv = await prisma.environment.update({
            where: { id: environmentId },
            data: {
                ...(sanitizedName && { name: sanitizedName }),
                domain: sanitizedDomain,
                ...(stackType && { stackType: stackType as StackType }),
                ...(tier && { tier: tier as EnvironmentTier }),
                ...(stackType
                    ? { nodeVersion: isNodeStack(stackType) ? sanitizeNodeVersion(nodeVersion, targetEnv.nodeVersion) : targetEnv.nodeVersion }
                    : nodeVersion
                        ? { nodeVersion: sanitizeNodeVersion(nodeVersion, targetEnv.nodeVersion) }
                        : {})
            }
        });

        return NextResponse.json(
            { message: 'Environment updated successfully.', environment: updatedEnv },
            { status: 200 }
        )

    } catch (error) {
        console.error('Update environment error:', error);
        return NextResponse.json(
            { error: 'Internal server error.' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ projectId: string, environmentId: string }> }
) {
    try {
        const auth = await requireAuth(request);
        
        if (auth.response || !auth.session) return auth.response

        const { projectId, environmentId } = await params;
        const { userId, role:globalRole } = auth.session;

        if (globalRole !== GlobalRole.SYSADMIN) {
            const membership = await prisma.projectRole.findUnique({
                where: { userId_projectId: { userId, projectId } }
            });

            if (!membership || ['VIEWER', 'DEVELOPER'].includes(membership.role)) {
                return NextResponse.json(
                    { error: 'Forbidden. Only Admins can delete environments.' },
                    { status: 403 }
                );
            }
        }

        const result = await deleteEnvironmentWorkflow(projectId, environmentId, userId);
        return NextResponse.json(result.body, { status: result.status });
    } catch (error) {
        console.error('Environment deletion error:', error);
        return NextResponse.json(
            { error: 'Internal server error.' },
            { status: 500 }
        );
    }
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
    });

    if (!environment) {
        return {
            status: 404,
            body: { error: 'Environment not found or already deleted.' },
        };
    }

    if (environment.lifecycle === LifeCycleStatus.DELETING) {
        try {
            await deps.reconcileDeletingEnvironment(environmentId, userId);
            return {
                status: 200,
                body: {
                    message: 'Environment deletion was already in progress and has now been finalized.',
                    lifecycle: LifeCycleStatus.DELETED,
                    retryable: false,
                },
            };
        } catch (error) {
            console.error('[TEARDOWN WARNING] Failed to reconcile deleting environment:', error);
                return {
                    status: 502,
                    body: {
                        error: 'Failed to resume pending environment deletion.',
                        lifecycle: LifeCycleStatus.DELETING,
                        retryable: true,
                    },
                };
        }
    }

    try {
        const deleteResult = await deps.teardownEnvironmentSafely(environment, userId);

        return {
            status: 200,
            body: {
                message: deleteResult.stopped
                    ? 'Environment container was stopped and resources were destroyed.'
                    : 'Environment completely destroyed and removed.',
                lifecycle: LifeCycleStatus.DELETED,
                retryable: false,
            },
        };
    } catch (error) {
        console.error('Environment deletion error:', error);
            return {
                status: 502,
                body: {
                    error: 'Failed to destroy infrastructure on the server.',
                    lifecycle: LifeCycleStatus.DELETING,
                    retryable: true,
                },
            };
    }
}
