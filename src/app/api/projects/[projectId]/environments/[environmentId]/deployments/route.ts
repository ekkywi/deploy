import { NextResponse } from "next/server";
import { GlobalRole, ProjectRoleType, DeployStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { logAudit } from '@/lib/audit-logger';

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
        return NextResponse.json(
            { error: 'Internal server error.' },
            { status: 500 }
        );
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

        let body: any = {};
        try {
            body = await request.json();
        } catch (e) {}
        const requestedBranch = body.branch;

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
            include: { project: true, variables: true }
        });

        if (!environment) return NextResponse.json(
            { error: 'Environment not found.' },
            { status: 404 }
        );
        
        if (!environment.project.repoUrl) {
            return NextResponse.json(
                { error: 'Project repository URL is missing. Cannot deploy.' },
                { status: 400 });
        }

        const candidateWorkers = await prisma.workerNode.findMany({
            where: { 
                isActive: true,
                supportedTiers: {
                    has: environment.tier
                }
            },
            include: {
                _count: {
                    select: {
                        deployments: {
                            where: { status: { in: ['SUCCESS', 'BUILDING'] } }
                        }
                    }
                }
            }
        });

        if (candidateWorkers.length === 0) {
            return NextResponse.json({ 
                error: `No active Worker Nodes available that support the ${environment.tier} tier. Contact Sysadmin.` 
            }, { status: 503 });
        }

        const selectedWorker = candidateWorkers.sort((a, b) => a._count.deployments - b._count.deployments)[0];


        let targetPort = environment.assignedPort;
        const finalBranch = requestedBranch || environment.branchName || 'main';

        if (!targetPort) {
            const highestPortEnv = await prisma.environment.findFirst({
                where: { assignedPort: { not: null } },
                orderBy: { assignedPort: 'desc' }
            });
            
            targetPort = highestPortEnv && highestPortEnv.assignedPort 
                ? highestPortEnv.assignedPort + 1 
                : 30000;
        }

        await prisma.environment.update({
            where: { id: environmentId },
            data: { assignedPort: targetPort, branchName: finalBranch }
        });

        const newDeployment = await prisma.deployment.create({
            data: {
                environmentId,
                workerNodeId: selectedWorker.id,
                status: DeployStatus.PENDING,
                assignedPort: targetPort,
                commitHash: finalBranch,
                logFilePath: `/logs/${environmentId}-${Date.now()}.log`,
            }
        });

        logAudit({
            userId: auth.session.userId,
            action: 'TRIGGER_DEPLOYMENT',
            targetType: 'ENVIRONMENT',
            targetId: environmentId,
            request: request
        });

        const agentUrl = `http://${selectedWorker.ipAddress}:4000/api/deploy`;

        const payload = {
            deploymentId : newDeployment.id,
            environmentId: environmentId,
            repoUrl: environment.project.repoUrl,
            stackType: environment.stackType,
            nodeVersion: environment.nodeVersion,
            environmentName: environment.name,
            branch: finalBranch,
            targetPort: targetPort,
            envVars: environment.variables.map(v => ({key: v.key, value: v.value}))
        };

        try {
            const agentResponse = await fetch(agentUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${selectedWorker.authToken}`
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
                    errorMessage: `Failed to contact Worker Node: ${agentError.message}`
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
            { status: 500 });
    }
}