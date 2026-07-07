import { NextResponse } from "next/server";
import { GlobalRole, ProjectRoleType } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { executeDeploymentService } from '@/lib/services/deployment-service';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ projectId: string, environmentId: string }> }
) {
    try {
        const auth = await requireAuth(request);
        if (auth.response || !auth.session) return auth.response;

        const { environmentId } = await params;

        const deployments = await prisma.deployment.findMany({
            where: { environmentId },
            orderBy: { createdAt: 'desc' },
            include: {
                workerNode: { select: { name: true, ipAddress: true } }
            },
            take: 20
        });

        return NextResponse.json({ deployments }, { status: 200 });
    } catch (error) {
        console.error('Fetch deployments error:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ projectId: string, environmentId: string }> }
) {
    try {
        const auth = await requireAuth(request);
        if (auth.response || !auth.session) return auth.response;

        const { projectId, environmentId } = await params;
        const { userId, role: globalRole } = auth.session;

        if (globalRole !== GlobalRole.SYSADMIN) {
            const membership = await prisma.projectRole.findUnique({
                where: { userId_projectId: { userId, projectId } }
            });

            if (!membership || membership.role === ProjectRoleType.VIEWER) {
                return NextResponse.json(
                    { error: 'Forbidden. Viewer cannot trigger deployments.' },
                    { status: 403 }
                );
            }
        }

        let body: any = {};
        try {
            body = await request.json();
        } catch (e) {}

        const environment = await prisma.environment.findUnique({
            where: { id: environmentId, deletedAt: null },
            select: { branchName: true }
        });

        if (!environment) {
            return NextResponse.json({ error: 'Environment not found.' }, { status: 404 });
        }

        const finalBranch = body.branch || environment.branchName || 'main';

        const result = await executeDeploymentService(
            environmentId,
            finalBranch,
            userId,
            request
        );

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 502 });
        }

        return NextResponse.json(
            { message: 'Deployment triggered and building.', deployment: result.deployment },
            { status: 201 }
        );

    } catch (error) {
        console.error('Trigger deployment error:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}