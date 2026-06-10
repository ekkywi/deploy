import { NextResponse } from "next/server";
import { GlobalRole, ProjectRoleType } from '@prisma/client'
import prisma from '@/lib/prisma'
import { requireAuth } from "@/lib/auth";

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
        const { name, description, repoUrl } = body;

        if (name && name.trim().length < 3) {
            return NextResponse.json(
                { error: 'Project name must be at least 3 characters long.' },
                { status: 400 }
            );
        }

        if (repoUrl && !/^https?:\/\/.+/.test(repoUrl)) {
            return NextResponse.json(
                { error: 'Repository URL must be a valid HTTP/HTTPS URL.' },
                { status: 400 }
            );
        }

        const sanitizedName = name ? name.trim() : undefined;

        if (sanitizedName && sanitizedName !== authCheck.project?.name) {
            const existingProject = await prisma.project.findUnique({
                where: { name: sanitizedName }
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
                ...(sanitizedName && { name: sanitizedName }),
                ...(description !== undefined && { description: description ? description.trim() : null }),
                ...(repoUrl !== undefined && { repoUrl: repoUrl ? repoUrl.trim() : null }),
            }
        });

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

        const timestamp = Date.now();
        const releasedName = `${authCheck.project.name}_deleted_${timestamp}`;

        await prisma.project.update({
            where: { id: projectId },
            data: { 
                deletedAt: new Date(),
                name: releasedName
            }
        });

        return NextResponse.json(
            { message: 'Project deleted successfully and name has been released.' },
            { status: 200 }
        );

    } catch (error) {
        console.error('Delete project error:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
