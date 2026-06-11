import { NextResponse } from 'next/server'
import { GlobalRole, ProjectRoleType } from '@prisma/client'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ projectId: string, userId: string }> }
) {
    try {
        const auth = await requireAuth(request);

        if (auth.response || !auth.session) return auth.response;

        const resolvedParams = await params;
        const { projectId, userId: targetUserId } = resolvedParams;
        const { userId: requesterId, role: globalRole } = auth.session;

        if (globalRole !== GlobalRole.SYSADMIN) {
            const requesterMembership = await prisma.projectRole.findUnique({
                where: { userId_projectId: { userId: requesterId, projectId } }
            });

            if (!requesterMembership || requesterMembership.role !== ProjectRoleType.OWNER) {
                return NextResponse.json(
                    { error: 'Forbidden. Only Project Owner can modify member roles.' },
                    { status: 403 }
                );
            }
        }

        const body = await request.json();
        const { role: newRole } = body;

        if (!newRole || !Object.values(ProjectRoleType).includes(newRole as ProjectRoleType)) {
            return NextResponse.json(
                { error: 'Invalid project role.' },
                { status: 400 }
            );
        }

        const targetMembership = await prisma.projectRole.findUnique({
            where: { userId_projectId: { userId: targetUserId, projectId } }
        });

        if (!targetMembership) {
            return NextResponse.json(
                { error: 'Target member not found in this project.' },
                { status: 404 }
            );
        }

        if (targetMembership.role === ProjectRoleType.OWNER && newRole !== ProjectRoleType.OWNER) {
            const ownerCount = await prisma.projectRole.count({
                where: { projectId, role: ProjectRoleType.OWNER }
            });

            if (ownerCount <= 1) {
                return NextResponse.json(
                    {error: 'Cannot downgrade the last owner. Assign a new owner beforce changing this role.'},
                    { status: 400 }
                );
            }
        }

        const updatedMember = await prisma.projectRole.update({
            where: { userId_projectId: { userId: targetUserId, projectId } },
            data: { role: newRole as ProjectRoleType }
        });

        return NextResponse.json(
            { message: 'Member role updated successfully.', member: updatedMember },
            { status: 200 }
        );

    } catch (error) {
        console.error('Update member role error:', error);
        return NextResponse.json(
            { error: 'Internal server error.' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ projectId: string, userId: string }> }
) {
    try {
        const auth = await requireAuth(request);
        
        if (auth.response || !auth.session) return auth.response;

        const resolvedParams = await params;
        const { projectId, userId: targetUserId } = resolvedParams;
        const { userId: requesterId, role: globalRole } = auth.session;
        const isSelfRemoval = requesterId === targetUserId;

        if (!isSelfRemoval && globalRole !== GlobalRole.SYSADMIN) {
            const requesterMembership = await prisma.projectRole.findUnique({
                where: { userId_projectId: { userId: requesterId, projectId } }
            });

            if (!requesterMembership || requesterMembership.role !== ProjectRoleType.OWNER) {
                return NextResponse.json(
                    { error: 'Forbidden. Only Project Owner can kick other members.' },
                    { status: 401 }
                );
            }
        }

        const targetMembership = await prisma.projectRole.findUnique({
            where: { userId_projectId: { userId: targetUserId, projectId } }
        });

        if (!targetMembership) {
            return NextResponse.json(
                { error: 'Target member not found in this project.' },
                { status: 404 }
            );
        }

        if (targetMembership.role === ProjectRoleType.OWNER) {
            const ownerCount = await prisma.projectRole.count({
                where: { projectId, role: ProjectRoleType.OWNER }
            });

            if (ownerCount <= 1) {
                return NextResponse.json(
                    { error: 'Cannot remove the last owner. Delete the project or assign a new owner first.' },
                    { status: 400 }
                );
            }
        }

        await prisma.projectRole.delete({
            where: { userId_projectId: { userId: targetUserId, projectId } }
        });

        return NextResponse.json(
            { message: 'Member removed from project successfully.' },
            { status: 200 }
        );

    } catch (error) {
        console.error('Remove member error:', error);
        return NextResponse.json(
            { error: 'Internal server error.' },
            { status: 500 }
        );
    }
}