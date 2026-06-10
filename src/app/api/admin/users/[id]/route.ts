import { NextResponse } from "next/server"
import prisma from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

const VALID_ROLES = ['SYSADMIN', 'MANAGER', 'DEVELOPER']

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> | {id: string} }
) {
    try {
        const auth = await requireRole(
            request,
            'SYSADMIN',
            'Access denied. This action requires Administrator privileges.'
        )

        if (auth.response) {
            return auth.response
        }

        const body = await request.json()
        const { firstName, lastName, globalRole } = body

        if (!firstName || firstName.trim() === '') {
            return NextResponse.json(
                { error: 'First name cannot be empty.'},
                { status: 400 }
            )
        }

        if (globalRole && !VALID_ROLES.includes(globalRole)) {
            return NextResponse.json(
                { error: 'Invalid role format.'},
                { status: 400 }
            )
        }

        const resolvedParams = await params

        const updateUser = await prisma.user.update({
            where: { id: resolvedParams.id },
            data: {
                firstName: firstName.trim(),
                lastName: lastName ? lastName.trim() : null,
                globalRole
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                globalRole: true,
                email: true,
                status: true,
                createdAt: true
            }
        })

        return NextResponse.json(
            {
                message: 'User profile updated successfully.',
                user: updateUser
            },
            { status: 200 }
        )
    } catch (error) {
        console.error('Update user profile error:', error)
        const knownError = error as { code?: string; message?: string }

        if (knownError.code === 'P2025') {
            return NextResponse.json(
                { error: 'User not found.' },
                { status: 404 }
            )
        }

        if (knownError.code === 'P2023' || knownError.message?.includes('malformed')) {
            return NextResponse.json(
                { error: 'Invalid User ID format. UUID expected'},
                { status: 400 }
            )
        }

        return NextResponse.json(
            { error: 'Internal server error.'},
            { status: 500 }
        )
    }
}
