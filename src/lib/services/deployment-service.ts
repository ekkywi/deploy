import prisma from '@/lib/prisma';
import { DeployStatus } from '@prisma/client';
import { logAudit } from '@/lib/audit-logger';

export async function executeDeploymentService(
    environmentId: string,
    branch: string,
    actorId: string,
    request?: Request
) {
    let deploymentId: string | null = null;

    try {
        const environment = await prisma.environment.findUnique({
            where: { id: environmentId, deletedAt: null },
            include: { project: true, variables: true }
        });

        if (!environment) throw new Error('Environment not found.');
        if (!environment.project.repoUrl) throw new Error('Project repository URL missing.');

        const candidateWorkers = await prisma.workerNode.findMany({
            where: { isActive: true, supportedTiers: { has: environment.tier } },
            include: { _count: { select: { deployments: { where: { status: { in: ['SUCCESS', 'BUILDING'] } } } } } }
        });

        if (candidateWorkers.length === 0) {
            throw new Error(`No active Worker Nodes availables that support the ${environment.tier} tier`);
        }

        const selectedWorker = candidateWorkers.sort((a, b) => a._count.deployments - b._count.deployments)[0];

        let targetPort = environment.assignedPort;
        if (!targetPort) {
            const highestPortEnv = await prisma.environment.findFirst({
                where: { assignedPort: { not: null } },
                orderBy: { assignedPort: 'desc' }
            });
            targetPort = highestPortEnv && highestPortEnv.assignedPort ? highestPortEnv.assignedPort + 1 : 30000;
        }

        await prisma.environment.update({
            where: { id: environmentId },
            data: { assignedPort: targetPort, branchName: branch }
        });

        const newDeployment = await prisma.deployment.create({
            data: {
                environmentId,
                workerNodeId: selectedWorker.id,
                status: DeployStatus.PENDING,
                assignedPort: targetPort,
                commitHash: branch,
                logFilePath: `/logs/${environmentId}-${Date.now()}.log`,
            }
        });
        deploymentId = newDeployment.id;

        logAudit({
            userId: actorId,
            action: request ? 'TRIGGER_DEPLOYMENT' : 'WEBHOOK_DEPLOYMENT',
            targetType: 'ENVIRONMENT',
            targetId: environmentId,
            request: request
        });

        const agentUrl = `http://${selectedWorker.ipAddress}:4000/api/deploy`;
        const payload = {
            deploymentId: newDeployment.id,
            environmentId: environmentId,
            repoUrl: environment.project.repoUrl,
            stackType: environment.stackType,
            nodeVersion: environment.nodeVersion,
            environmentName: environment.name,
            branch: branch,
            targetPort: targetPort,
            envVars: environment.variables.map(v => ({key: v.key, value: v.value}))
        };

        const agentResponse = await fetch(agentUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${selectedWorker.authToken}` },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(5000)
        });

        if (!agentResponse.ok) {
            const errorData = await agentResponse.json().catch(() => ({}));
            throw new Error(errorData.error || 'Agent rejected the deployment request.');
        }

        const updatedDeployment = await prisma.deployment.update({
            where: { id: newDeployment.id },
            data: { status: DeployStatus.BUILDING }
        });

        return { success: true, deployment: updatedDeployment };
    
    } catch (error: any) {
        console.error(`[Deploy Service]`, error.message);

        if (deploymentId) {
            await prisma.deployment.update({
                where: { id: deploymentId },
                data: {
                    status: DeployStatus.FAILED,
                    errorMessage: `Failed: ${error.message}`
                }
            });
        }

        return { success: false, error: error.message };
    }
}