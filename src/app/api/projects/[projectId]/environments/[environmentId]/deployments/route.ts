import { NextResponse } from "next/server";
import { GlobalRole, ProjectRoleType, DeployStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

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

        const environment = await prisma.environment.findUnique({
            where: { id: environmentId, projectId, deletedAt: null },
            include: { project: true }
        });

        if (!environment) {
            return NextResponse.json(
                { error: 'Environment not found.' },
                { status: 404 }
            )
        }

        if (!environment.project.repoUrl) {
            return NextResponse.json(
                { error: 'Project repository URL is missing. Cannot deploy.' },
                { status: 400 }
            );
        }

        const availableWorker = await prisma.workerNode.findFirst({
            where: { isActive: true },
            orderBy: { createdAt: 'asc' }
        });

        if (!availableWorker) {
            return NextResponse.json(
                { error: 'No active Worker Nodes available. Contact Sysadmin.' },
                { status: 503 }
            );
        }

        const newDeployment = await prisma.deployment.create({
            data: {
                environmentId,
                workerNodeId: availableWorker.id,
                status: DeployStatus.PENDING,
                logFilePath: `/logs/${environmentId}-${Date.now()}.log`,
            }
        });

        const agentUrl = `http://${availableWorker.ipAddress}:4000/api/deploy`;

        const payload = {
            deploymentId : newDeployment.id,
            repoUrl: environment.project.repoUrl,
            stackType: environment.stackType,
            environmentName: environment.name,
        };

        try {
            const agentResponse = await fetch(agentUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${availableWorker.authToken}`
                },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(5000)
            });

            if (!agentResponse.ok) {
                const errorData = await agentResponse.json().catch(() => ({}));
                throw new Error(errorData.error || 'Agent rejected the deployment request.');
            }

            await prisma.deployment.update({
                where: { id: newDeployment.id },
                data: { status: DeployStatus.BUILDING }
            });

            return NextResponse.json(
                { message: 'Deployment triggered and building.', deployment: newDeployment },
                { status: 201 }
            );

        } catch (agentError: any) {
            console.error('Agent communication failed:', agentError.message);

            await prisma.deployment.update({
                where: { id: newDeployment.id },
                data: {
                    status: DeployStatus.FAILED,
                    errorMessage: 'Failed to contact Worker Node: ${agentError.message}'
                }
            });

            return NextResponse.json({
                error: 'Control plane failed to reach the execution node. The deployment was aborted.',
                details: agentError.message
            }, { status: 502 });
        }

    } catch (error) {
        console.error('Trigger deployment error:', error);
        return NextResponse.json(
            { error: 'Internal server error.' },
            { status: 500 }
        );
    }
}