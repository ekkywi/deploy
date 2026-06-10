import { NextResponse } from "next/server";
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

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

        if (role !== 'SYSADMIN') {
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
        const { name, description, repoUrl } = body
        
        if (!name || name.trim().length < 3) {
            return NextResponse.json(
                { error: 'Project name is required and must be at least 3 characters long.' },
                { status: 400 }
            )
        }

        if (repoUrl && !/^https?:\/\/.+/.test(repoUrl)){
            return NextResponse.json(
                { error: 'Repository URL must be a valid HTTP/HTTPS URL.' },
                { status: 400 }
            )
        }

        const sanitizedName = name.trim()

        const existingProject = await prisma.project.findUnique({
            where: { name: sanitizedName }
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
                    name: sanitizedName,
                    description: description ? description.trim() : null,
                    repoUrl: repoUrl ? repoUrl.trim() : null,
                }
            })

            await tx.projectRole.create({
                data: {
                    userId: userId,
                    projectId: newProject.id,
                    role: 'OWNER'
                }
            })

            return newProject
        })

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
