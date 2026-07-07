import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { GlobalRole, ProjectRoleType } from '@prisma/client';
import { logAudit } from '@/lib/audit-logger';

async function canManageWebhookSecret(userId: string, globalRole: GlobalRole, projectId: string) {
    const project = await prisma.project.findFirst({
        where: { id: projectId, deletedAt: null },
        select: { id: true, webhookSecret: true }
    });

    if (!project) {
        return { allowed: false, status: 404, error: 'Project not found or has been deleted.', project: null };
    }

    if (globalRole === GlobalRole.SYSADMIN) {
        return { allowed: true, status: 200, error: null, project };
    }

    const membership = await prisma.projectRole.findUnique({
        where: { userId_projectId: { userId, projectId } }
    });

    if (!membership || membership.role === ProjectRoleType.VIEWER) {
        return {
            allowed: false,
            status: 403,
            error: 'Forbidden. You do not have permission to manage keys.',
            project: null
        };
    }

    return { allowed: true, status: 200, error: null, project };
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const auth = await requireAuth(request);
        if (auth.response || !auth.session) return auth.response;

        const { projectId } = await params;
        const { userId, role: globalRole } = auth.session;
        const authCheck = await canManageWebhookSecret(userId, globalRole, projectId);

        if (!authCheck.allowed || !authCheck.project) {
            return NextResponse.json(
                { error: authCheck.error },
                { status: authCheck.status }
            );
        }

        return NextResponse.json({
            webhookSecret: authCheck.project.webhookSecret
        }, { status: 200 });
    } catch (error) {
        console.error('Fetch webhook secret error:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const auth = await requireAuth(request);
        if (auth.response || !auth.session) return auth.response;

        const { projectId } = await params;
        const { userId, role: globalRole } = auth.session;
        const authCheck = await canManageWebhookSecret(userId, globalRole, projectId);

        if (!authCheck.allowed) {
            return NextResponse.json(
                { error: authCheck.error },
                { status: authCheck.status }
            );
        }

        const newSecret = crypto.randomBytes(32).toString('hex');

        const updatedProject = await prisma.project.update({
            where: { id: projectId, deletedAt: null },
            data: { webhookSecret: newSecret },
            select: { id: true, name: true, webhookSecret: true }
        });

        logAudit({
            userId: userId,
            action: 'ROTATE_WEBHOOK_SECRET',
            targetType: 'PROJECT',
            targetId: projectId,
            request: request
        });

        return NextResponse.json({
            message: 'Webhook secret rotated successfully.',
            webhookSecret: updatedProject.webhookSecret
        }, { status: 200 });

    } catch (error) {
        console.error('Rotate webhook secret error:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
