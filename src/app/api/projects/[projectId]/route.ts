import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { GlobalRole, ProjectRoleType } from '@prisma/client'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { enqueueProjectDeleteJob } from '@/lib/queue/teardown-queue'

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
    request: NextRequest,
    ctx: RouteContext<'/api/projects/[projectId]'>
) {
    try {
        const auth = await requireAuth(request);
        if (auth.response || !auth.session) return auth.response;

        const { projectId } = await ctx.params;
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
    request: NextRequest,
    ctx: RouteContext<'/api/projects/[projectId]'>
) {
    try {
        const auth = await requireAuth(request);
        if (auth.response || !auth.session) return auth.response;

        const { projectId } = await ctx.params;
        const { userId, role } = auth.session;

        const authCheck = await checkProjectAuthorization(userId, role, projectId);
        if (authCheck.error || !authCheck.project) {
            return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
        }

        const deleteQueueResult = await enqueueProjectDeleteJob({
            projectId: projectId,
            userId: userId,
            projectName: authCheck.project.name
        })

        return NextResponse.json(deleteQueueResult.body, { status: deleteQueueResult.status })

    } catch (error) {
        console.error('Delete project error:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
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
