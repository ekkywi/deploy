import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import prisma from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { logAudit } from "@/lib/audit-logger"

const VALID_ROLES = ['SYSADMIN', 'MANAGER', 'DEVELOPER']

export async function PATCH(
    request: NextRequest,
    ctx: RouteContext<'/api/admin/users/[id]'>
) {
    try {
        const auth = await requireRole(
            request,
            'SYSADMIN',
            'Access denied. This action requires Administrator privileges.'
        )

        if (auth.response || !auth.session) {
            return auth.response
        }

        const body = await request.json()
        const { firstName, lastName, globalRole } = body

        if (!firstName || firstName.trim() === '') {
            return NextResponse.json(
                { error: 'First name cannot be empty.' },
                { status: 400 }
            )
        }

        if (globalRole && !VALID_ROLES.includes(globalRole)) {
            return NextResponse.json(
                { error: 'Invalid role format.' },
                { status: 400 }
            )
        }

        const { id } = await ctx.params

        const targetUser = await prisma.user.findUnique({
            where: { id },
            select: { firstName: true, lastName: true, globalRole: true }
        })

        if (!targetUser) {
            return NextResponse.json(
                { error: 'User not found.' },
                { status: 404 }
            )
        }

        const parsedFirstName = firstName.trim()
        const parsedLastName = lastName ? lastName.trim() : null

        const updateUser = await prisma.user.update({
            where: { id },
            data: {
                firstName: parsedFirstName,
                lastName: parsedLastName,
                ...(globalRole && { globalRole })
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

        if (targetUser.firstName !== parsedFirstName || targetUser.lastName !== parsedLastName) {
            logAudit({
                userId: auth.session.userId,
                action: 'UPDATE_USER_PROFILE',
                targetType: 'USER',
                targetId: updateUser.id,
                request: request
            })
        }

        if (globalRole && targetUser.globalRole !== globalRole) {
            logAudit({
                userId: auth.session.userId,
                action: `CHANGE_ROLE_TO_${globalRole}`,
                targetType: 'USER',
                targetId: updateUser.id,
                request: request
            })
        }

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

        if (knownError.code === 'P2023' || knownError.message?.includes('malformed')) {
            return NextResponse.json(
                { error: 'Invalid User ID format. UUID expected' },
                { status: 400 }
            )
        }

        return NextResponse.json(
            { error: 'Internal server error.' },
            { status: 500 }
        )
    }
}
