import { NextResponse } from 'next/server'
import { Prisma, GlobalRole, ProjectRoleType } from '@prisma/client'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { logAudit } from '@/lib/audit-logger'

export async function GET(request: Request) {
    try {
        const auth = await requireAuth(request)

        if (auth.response || !auth.session) {
            return auth.response
        }

        const { userId, role } = auth.session

        const whereClause: Prisma.ProjectWhereInput = {
            deletedAt: null
        }

        if (role !== GlobalRole.SYSADMIN) {
            whereClause.members = {
                some: {
                    userId: userId
                }
            }
        }

        const projects = await prisma.project.findMany({
            where: whereClause,
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true
                            }
                        }
                    }
                },
                _count: {
                    select: { environments: true }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return NextResponse.json(
            { projects },
            { status: 200 }
        )
    
    } catch (error) {
        console.error('Fetch projects error:', error)
        return NextResponse.json(
            { error: 'Internal server error.' },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const auth = await requireAuth(request)

        if (auth.response || !auth.session) {
            return auth.response
        }

        const { userId } = auth.session
        const body = await request.json()
        const payload = parseProjectPayload(body)

        if (!payload.name || payload.name.length < 3) {
            return NextResponse.json(
                { error: 'Project name is required and must be at least 3 characters long.' },
                { status: 400 }
            )
        }

        if (payload.repoUrl && !isHttpUrl(payload.repoUrl)) {
            return NextResponse.json(
                { error: 'Repository URL must be a valid HTTP/HTTPS URL.' },
                { status: 400 }
            )
        }

        const existingProject = await prisma.project.findUnique({
            where: { name: payload.name }
        })

        if (existingProject) {
            return NextResponse.json(
                { error: 'A project with this exact name already exists.' },
                { status: 409 }
            )
        }

        const result = await prisma.$transaction(async (tx) => {
            const newProject = await tx.project.create({
                data: {
                    name: payload.name,
                    description: payload.description,
                    repoUrl: payload.repoUrl,
                }
            })

            await tx.projectRole.create({
                data: {
                    userId: userId,
                    projectId: newProject.id,
                    role: ProjectRoleType.OWNER
                }
            })

            const completeProject = await tx.project.findUnique({
                where: { id: newProject.id },
                include: {
                    members: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    email: true
                                }
                            }
                        }
                    },
                    _count: {
                        select: { environments: true }
                    }
                }
            })

            return completeProject
        })

        if (result) {
            logAudit({
                userId: userId,
                action: 'CREATE_PROJECT',
                targetType: 'PROJECT',
                targetId: result.id,
                request: request
            })
        }

        return NextResponse.json(
            {
                message: 'Project created and ownership assigned successfully.',
                project: result
            },
            { status: 201 }
        )

    } catch (error) {
        console.error('Create project error:', error)
        return NextResponse.json(
            { error: 'Internal server error.'},
            { status: 500 }
        )
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
