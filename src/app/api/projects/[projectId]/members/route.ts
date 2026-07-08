import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { GlobalRole, ProjectRoleType } from '@prisma/client'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(
    request: NextRequest,
    ctx: RouteContext<'/api/projects/[projectId]/members'>
) {
    try {
        const auth = await requireAuth(request);

        if (auth.response || !auth.session) return auth.response;

        const { projectId } = await ctx.params;
        const { userId, role } = auth.session;

        const project = await prisma.project.findFirst({
            where: { id: projectId, deletedAt: null }
        });

        if (!project) {
            return NextResponse.json(
                { error: 'Project not found or has been deleted.'},
                { status: 404 }
            )
        }

        if (role !== GlobalRole.SYSADMIN) {
            const membership = await prisma.projectRole.findUnique({
                where: { userId_projectId: { userId, projectId } }
            });

            if (!membership) {
                return NextResponse.json(
                    { error: 'Forbidden.  You do not have access to this project.' },
                    { status: 403}
                );
            }
        }

        const members = await prisma.projectRole.findMany({
            where: { projectId },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email:  true,
                        status: true
                    }
                }
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        return NextResponse.json(
            { members },
            { status: 200}
        );

    } catch (error) {
        console.error('Fetch members error:', error);
        return NextResponse.json(
            { error: 'Internal server error.'},
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    ctx: RouteContext<'/api/projects/[projectId]/members'>
) {
    try {
        const auth = await requireAuth(request);
        
        if (auth.response || !auth.session) return auth.response;

        const { projectId } = await ctx.params;
        const { userId, role: globalRole } = auth.session;

        const project = await prisma.project.findFirst({
            where: { id: projectId, deletedAt: null }
        })

        if (!project) {
            return NextResponse.json(
                { error: 'Project not found or has been deleted.' },
                { status: 404 }
            );
        }

        if (globalRole !== GlobalRole.SYSADMIN) {
            const membership = await prisma.projectRole.findUnique({
                where: { userId_projectId: { userId, projectId } }
            });

            if (!membership || membership.role !== ProjectRoleType.OWNER) {
                return NextResponse.json(
                    { error: 'Forbidden. Only Project Owner can add members.' },
                    { status: 403}
                );
            }
        }

        const body = await request.json();
        const { email, role } = body;

        if (!email || !role) {
            return NextResponse.json(
                { error: 'Email and role are required.' },
                { status: 400 }
            );
        }

        if (!Object.values(ProjectRoleType).includes(role as ProjectRoleType)) {
            return NextResponse.json(
                { error: 'Invalid project role.' },
                { status: 400 }
            );
        }

        const targetUser = await prisma.user.findUnique({
            where: { email }
        });

        if (!targetUser) {
            return NextResponse.json(
                { error: 'User with this email not found in the system.' },
                { status: 404 }
            );
        }

        if (targetUser.status !== 'ACTIVE') {
            return NextResponse.json(
                { error: 'Cannot add an inactive or suspended user.' },
                { status: 400 }
            )
        }

        const existingRole = await prisma.projectRole.findFirst({
            where: {
                userId: targetUser.id,
                projectId: projectId
            }
        });

        if (existingRole) {
            return NextResponse.json(
                { error: 'User is already a member of this project.' }, 
                { status: 409 }
            );
        }

        const newMember = await prisma.projectRole.create({
            data: {
                userId: targetUser.id,
                projectId,
                role: role as ProjectRoleType
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        status: true
                    }
                }
            }
        });

        return NextResponse.json(
            { message: 'Member added successfully.', member: newMember },
            { status: 201 }
        );

    } catch (error) {
        console.error('Add member error:', error);
        return NextResponse.json(
            { error: 'Internal server error.' },
            { status: 500 }
        );
    }
}
