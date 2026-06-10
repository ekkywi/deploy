import { NextResponse } from "next/server"
import prisma from '@/lib/prisma'
import { AccountStatus } from "@prisma/client"
import { requireRole } from '@/lib/auth'

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> | { id: string } } 
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
        const { status } = body

        if (!status || !Object.values(AccountStatus).includes(status as AccountStatus)) {
            return NextResponse.json(
                { error: 'Invalid status format.'},
                { status: 400 }
            )
        }

        const resolvedParams = await params;

        const updatedUser = await prisma.user.update({
            where: { id: resolvedParams.id },
            data: { status: status as AccountStatus },
            select: {
                id: true,
                email: true,
                status: true,
                globalRole: true,
            }
        })

        return NextResponse.json(
            {
                message: 'User status updated successfully.',
                user: updatedUser
            },
            { status: 200 }
        )

    } catch (error) {
        console.error('Update status error:', error)
        const knownError = error as { code?: string; message?: string }

        if (knownError.code === 'P2025') {
            return NextResponse.json(
                { error: 'User not found.' },
                { status: 404 }
            )
        }

        if (knownError.code === 'P2023' || knownError.message?.includes('malformed')) {
            return NextResponse.json(
                { error: 'Invalid User ID format. UUID expected.' },
                { status: 400 }
            )
        }

        return NextResponse.json(
            { error: 'Internal server error.'},
            { status: 500 }
        )
    }
}
