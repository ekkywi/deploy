import { NextResponse } from "next/server";
import { GlobalRole, ProjectRoleType } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ projectId: string, environmentId: string, deploymentId: string }> }
) {
    try {
        const auth = await requireAuth(request);
        if (auth.response || !auth.session) return auth.response;

        const { projectId, environmentId, deploymentId } = await params;
        const { userId, role: globalRole } = auth.session;

        if (globalRole !== GlobalRole.SYSADMIN) {
            const membership = await prisma.projectRole.findUnique({
                where: { userId_projectId: { userId, projectId } }
            });
            if (!membership) {
                return NextResponse.json(
                    { error: 'Forbidden.' },
                    { status: 403 }
                );
            }
        }

        const deployment = await prisma.deployment.findUnique({
            where: { id: deploymentId, environmentId },
            include: { workerNode: true }
        });

        if (!deployment || !deployment.workerNode) {
            return NextResponse.json(
                { error: 'Deployment or Worker Node not found.' },
                { status: 404 }
            );
        }

        const worker = deployment.workerNode;

        const agentUrl = `http://${worker.ipAddress}:4000/api/deploy/${deploymentId}/logs`;

        const agentResponse = await fetch(agentUrl, {
            headers: {
                'Authorization': `Bearer ${worker.authToken}`,
                'Accept': 'text/event-stream'
            }
        });

        if (!agentResponse.ok || !agentResponse.body) {
            throw new Error(`Agent rejected stream request with status: ${agentResponse.status}`);
        }

        return new Response(agentResponse.body, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
            }
        });

    } catch (error: any) {
        console.error('Log Streaming Proxy Error:', error.message);
        return NextResponse.json(
            { error: 'Failed to establish log stream connection.' },
            { status: 500 }
        );
    }
}