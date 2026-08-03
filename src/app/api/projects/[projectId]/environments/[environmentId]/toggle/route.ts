import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { GlobalRole, ProjectRoleType, LifeCycleStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { isRuntimeMutationBlockedByLifecycle } from '@/lib/services/environment-lifecycle';
import { revealWorkerAuthToken } from '@/lib/crypto/sealed-secrets';

export async function POST(
    request: NextRequest,
    ctx: RouteContext<'/api/projects/[projectId]/environments/[environmentId]/toggle'>
) {
    try {
        const auth = await requireAuth(request);
        if (auth.response || !auth.session) return auth.response;

        const { projectId, environmentId } = await ctx.params;
        const { userId, role: globalRole } = auth.session;

        if (globalRole !== GlobalRole.SYSADMIN) {
            const membership = await prisma.projectRole.findUnique({
                where: { userId_projectId: { userId, projectId } }
            });

            if (!membership || membership.role === ProjectRoleType.VIEWER) {
                return NextResponse.json({ error: 'Forbidden. Viewer cannot modify runtime state.' }, { status: 403 });
            }
        }

        const environment = await prisma.environment.findUnique({
            where: { id: environmentId, projectId, deletedAt: null }
        });

        if (!environment) return NextResponse.json({ error: 'Environment not found.' }, { status: 404 });
        if (isRuntimeMutationBlockedByLifecycle(environment.lifecycle)) {
            return NextResponse.json({ error: 'This environment is being deleted and cannot be modified.' }, { status: 409 });
        }

        const lastDeploy = await prisma.deployment.findFirst({
            where: { environmentId, status: 'SUCCESS' },
            orderBy: { createdAt: 'desc' },
            include: { workerNode: true }
        });

        if (!lastDeploy || !lastDeploy.workerNode) {
            return NextResponse.json({ error: 'No active deployment found to suspend/resume.' }, { status: 400 });
        }

        const worker = lastDeploy.workerNode;
        const isCurrentlyActive = environment.lifecycle === LifeCycleStatus.ACTIVE;
        const action = isCurrentlyActive ? 'stop' : 'start';
        const nextStatus = isCurrentlyActive ? LifeCycleStatus.SUSPENDED : LifeCycleStatus.ACTIVE;

        const agentResponse = await fetch(`http://${worker.ipAddress}:4000/api/container/toggle`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${revealWorkerAuthToken(worker)}`
            },
            body: JSON.stringify({ environmentId, action }),
            signal: AbortSignal.timeout(5000)
        });

        if (!agentResponse.ok) throw new Error('Agent failed to toggle container state.');

        await prisma.environment.update({
            where: { id: environmentId },
            data: { lifecycle: nextStatus }
        });

        await prisma.auditLog.create({
            data: {
                userId,
                action: isCurrentlyActive ? 'SUSPEND_ENVIRONMENT' : 'RESUME_ENVIRONMENT',
                targetType: 'ENVIRONMENT',
                targetId: environmentId,
            }
        });

        return NextResponse.json({ message: `Environment is now ${nextStatus.toLowerCase()}` });

    } catch (error: unknown) {
        console.error('Toggle error:', error);
        return NextResponse.json({ error: 'Failed to communicate with worker node.' }, { status: 500 });
    }
}
