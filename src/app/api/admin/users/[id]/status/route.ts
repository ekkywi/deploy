import { NextResponse } from "next/server"
import prisma from '@/lib/prisma'
import { AccountStatus } from "@prisma/client"
import { requireRole } from '@/lib/auth'
import { logAudit } from "@/lib/audit-logger"

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> | { id:string } }
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
        const { status } = body

        if (!status || !Object.values(AccountStatus).includes(status as AccountStatus)) {
            return NextResponse.json(
                { error: 'Invalid status format.' },
                { status: 400 }
            )
        }

        const resolvedParams = await params;
        
        const targetUser = await prisma.user.findUnique({
            where: { id: resolvedParams.id },
            select: { status: true }
        })

        if (!targetUser) {
            return NextResponse.json(
                { error: 'User not found.' },
                { status: 404 }
            )
        }

        if (targetUser.status === status) {
            return NextResponse.json(
                { message: `User is already in ${status} status.` },
                { status: 200 }
            )
        }

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

        let actionName = 'UPDATE_USER_STATUS';

        if (targetUser.status === 'PENDING' && status === 'ACTIVE') {
            actionName = 'APPROVE_ACCOUNT';
        } else if (status === 'SUSPENDED') {
            actionName = 'SUSPEND_ACCOUNT';
        } else if (targetUser.status === 'SUSPENDED' && status === 'ACTIVE') {
            actionName = 'REACTIVATE_ACCOUNT';
        }

        logAudit({
            userId: auth.session.userId,
            action: actionName,
            targetType: 'USER',
            targetId: updatedUser.id,
            request:request
        })

        return NextResponse.json(
            {
                message: 'User status updated successfully.',
                user: updatedUser
            },
            { status: 200 }
        )
    
    } catch (error) {
        console.error('Update staus error:', error)
        const knownError = error as { code?: string; message?: string }

        if (knownError.code === 'p2023' || knownError.message?.includes('malformed')) {
            return NextResponse.json(
                { error: 'Invalid User ID format. UUID expected.' },
                { status: 400 }
            )
        }

        return NextResponse.json(
            { error: 'Internal server error.' },
            { status: 500 }
        )
    }
}