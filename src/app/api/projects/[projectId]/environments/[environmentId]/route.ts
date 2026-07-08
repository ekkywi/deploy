import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { EnvironmentTier, StackType } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
    authorizeEnvironmentDeletion,
    authorizeEnvironmentModification,
    deleteEnvironmentWorkflow,
    isNodeStack,
    sanitizeNodeVersion,
    NODE_VERSION_OPTIONS,
} from '@/lib/services/environment-delete-workflow';

export async function PATCH(
    request: NextRequest,
    ctx: RouteContext<'/api/projects/[projectId]/environments/[environmentId]'>
) {
    try {
        const auth = await requireAuth(request);

        if (auth.response || !auth.session) return auth.response;

        const { projectId, environmentId } = await ctx.params;
        const { userId, role: globalRole } = auth.session;

        const authResult = await authorizeEnvironmentModification(userId, globalRole, projectId);
        if (authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
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
                        { error: 'This domain is already in use.' },
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
    request: NextRequest,
    ctx: RouteContext<'/api/projects/[projectId]/environments/[environmentId]'>
) {
    try {
        const auth = await requireAuth(request);
        
        if (auth.response || !auth.session) return auth.response

        const { projectId, environmentId } = await ctx.params;
        const { userId, role:globalRole } = auth.session;

        const authResult = await authorizeEnvironmentDeletion(userId, globalRole, projectId);
        if (authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
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
