import { NextResponse } from 'next/server';
import { GlobalRole, ProjectRoleType, EnvironmentTier, StackType } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

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
        const { name, domain, stackType, tier } = body;
        const sanitizedName = name?.trim();
        const sanitizedDomain = domain ? domain.trim().toLowerCase() : null;

        if (sanitizedName !== targetEnv.name || sanitizedDomain !== targetEnv.domain) {
            const existingEnv = await prisma.environment.findFirst({
                where: {
                    id: { not: environmentId },
                    OR: [
                        sanitizedName ? { projectId, name: sanitizedName } : {},
                        sanitizedDomain ? { domain: sanitizedDomain } : {}
                    ]
                }
            });

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

        const updatedEnv = await prisma.environment.update({
            where: { id: environmentId },
            data: {
                ...(sanitizedName && { name: sanitizedName }),
                domain: sanitizedDomain,
                ...(stackType && { stackType: stackType as StackType }),
                ...(tier && { tier: tier as EnvironmentTier })
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
        
        if (auth.response || !auth.session) return auth.response;

        const resolvedParams = await params;
        const { projectId, environmentId } = resolvedParams;
        const { userId, role: globalRole } = auth.session;

        if (globalRole !== GlobalRole.SYSADMIN) {
            const membership = await prisma.projectRole.findUnique({
                where: { userId_projectId: { userId, projectId } }
            });

            if (!membership || membership.role !== ProjectRoleType.OWNER) {
                return NextResponse.json(
                    { error: 'Forbidden. Only Project Owners can delete environments.' },
                    { status: 403 }
                );
            }
        }

        const targetEnv = await prisma.environment.findUnique({
            where: { id: environmentId, projectId }
        });

        if (!targetEnv) {
            return NextResponse.json(
                { error: 'Environment not found.' },
                { status: 404 }
            )
        }

        await prisma.environment.delete({
            where: {id: environmentId }
        });

        return NextResponse.json(
            { message: 'Environment deleted permanently.' },
            { status: 200 }
        );

    } catch (error) {
        console.error('Delete environment error:', error)
        return NextResponse.json(
            { error: 'Internal server error.' },
            { status: 500 }
        );
    }
}