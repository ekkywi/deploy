import { NextResponse } from 'next/server';
import { GlobalRole, ProjectRoleType, EnvironmentTier, StackType, LifeCycleStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

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

        const environment = await prisma.environment.findUnique({
            where: { id: environmentId, projectId, deletedAt: null }
        });

        if (!environment) {
            return NextResponse.json(
                { error: 'Environment not found or already deleted.' },
                { status: 404 }
            );
        }

        await prisma.environment.update({
            where: { id: environmentId },
            data: { lifecycle: LifeCycleStatus.DELETING }
        });

        const lastDeploy = await prisma.deployment.findFirst({
            where: { environmentId, status: 'SUCCESS' },
            orderBy: { createdAt: 'desc' },
            include: { workerNode: true }
        });

        if (lastDeploy && lastDeploy.workerNode) {
            const worker = lastDeploy.workerNode;

            try {
                const agentResponse = await fetch(`http://${worker.ipAddress}:4000/api/environment/${environmentId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${worker.authToken}`
                    },
                    signal: AbortSignal.timeout(10000)
                });

                if (!agentResponse.ok) {
                    throw new Error(`Agent responded with ${agentResponse.status}`);
                }
            } catch (agentError: unknown) {
                const message = agentError instanceof Error ? agentError.message : 'Unknown agent teardown error';
                console.error('[TEARDOWN WARNING] Agent unreachable or failed:', message);

                await prisma.environment.update({
                    where: { id: environmentId },
                    data: { lifecycle: LifeCycleStatus.ACTIVE }
                });

                return NextResponse.json(
                    { error: 'Failed to destroy infrastructure on the server. Deletion aborted to prevent orphaned resources.' },
                    { status: 502 }
                )
            };
        }

        const timestamp = Date.now();
        const releasedName = `${environment.name}_deleted_${timestamp}`;

        await prisma.environment.update({
            where: { id: environmentId },
            data: { 
                lifecycle: LifeCycleStatus.DELETED,
                deletedAt: new Date(),
                name: releasedName,
                domain: null,
                assignedPort: null
            }
        });

        await prisma.auditLog.create({
            data: {
                userId,
                action: 'DELETE_ENVIRONMENT',
                targetType: 'ENVIRONMENT',
                targetId: environmentId,
            }
        });

        return NextResponse.json(
            { message: 'Environment completely destroyed and removed.' }
        );
    } catch (error) {
        console.error('Environment deletion error:', error);
        return NextResponse.json(
            { error: 'Internal server error.' },
            { status: 500 }
        );
    }
}
