import { NextResponse } from "next/server";
import { GlobalRole, LifeCycleStatus, EnvironmentTier } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { logAudit } from '@/lib/audit-logger';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ workerId: string }> }
) {
    try {
        const auth = await requireAuth(request);

        if (auth.response || !auth.session) return auth.response;

        if (auth.session.role !== GlobalRole.SYSADMIN) {
            return NextResponse.json(
                { error: 'Forbidden. Sysadmin access required.' },
                { status: 403 }
            );
        }

        const { workerId } = await params;
        const body = await request.json();
        const { name, ipAddress, isActive, supportedTiers } = body;

        const targetNode = await prisma.workerNode.findUnique({
            where: { id: workerId }
        });

        if (!targetNode) return NextResponse.json(
            { error: 'Worker Node not found.' },
            { status: 404 }   
        );

        if ((name && name !== targetNode.name) || (ipAddress && ipAddress !== targetNode.ipAddress)) {
            const existingNode = await prisma.workerNode.findFirst({
                where: {
                    id: { not: workerId },
                    OR: [
                        name ? { name: name.trim() } : {},
                        ipAddress ? { ipAddress: ipAddress.trim() } : {}
                    ]
                }
            });

            if (existingNode) {
                return NextResponse.json(
                    { error: 'Conflict: Name or IP address is already used by another node.' },
                    { status: 409 }
                );
            }
        }

        if (supportedTiers && (!Array.isArray(supportedTiers) || supportedTiers.length === 0 )) {
            return NextResponse.json(
                { error: 'At least one supported tier must be selected.' },
                { status: 400 }
            );
        }

        const updatedNode = await prisma.workerNode.update({
            where: { id: workerId },
            data: {
                ...(name && { name: name.trim() }),
                ...(ipAddress && { ipAddress: ipAddress.trim() }),
                ...(isActive !== undefined && { isActive }),
                ...(supportedTiers && { supportedTiers: supportedTiers as EnvironmentTier[] })
            }
        });

        logAudit({
            userId: auth.session.userId,
            action: 'UPDATE_WORKER_NODE',
            targetType: 'INFRASTRUCTURE',
            targetId: workerId,
            request: request
        });

        return NextResponse.json(
            { message: 'Worker node updated successfully.', worker:updatedNode }
        );
    } catch (error) {
        console.error('Update worker error:', error);
        return NextResponse.json(
            { error: 'Internal server error.' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ workerId: string }> }
) {
    try {
        const auth = await requireAuth(request);

        if (auth.response || !auth.session) return auth.response;

        if (auth.session.role !== GlobalRole.SYSADMIN) {
            return NextResponse.json(
                { error: 'Forbidden. Sysadmin access required.' },
                { status: 403 }
            );
        }

        const { workerId } = await params;

        const targetNode = await prisma.workerNode.findUnique({
            where: { id: workerId }
        });

        if (!targetNode) return NextResponse.json(
            { error: 'Worker Node not found.' },
            { status: 404 }
        );

        const dependentEnvironments = await prisma.environment.findMany({
            where: {
                lifecycle: { not: LifeCycleStatus.DELETED },
                deployments: {
                    some: {
                        workerNodeId: workerId,
                        status: 'SUCCESS'
                    }
                }
            },
            select: { name: true, project: { select: { name: true } } }
        });

        if (dependentEnvironments.length > 0) {
            const envList = dependentEnvironments.map(env => `${env.project.name}/${env.name}`).join(', ');
            return NextResponse.json({ 
                error: 'Deletion blocked. This node is actively hosting environments.',
                details: `Please delete or migrate: ${envList}`
            }, { status: 409 }); 
        }

        await prisma.workerNode.delete({
            where: { id: workerId }
        });

        logAudit({
            userId: auth.session.userId,
            action: 'DELETE_WORKER_NODE',
            targetType: 'INFRASTRUCTURE',
            targetId: workerId,
            request: request
        });

        return NextResponse.json(
            { message: 'Worker Node has been securely removed.' },
        );
    
    } catch (error: any) {
        if (error.code === 'P2003') {
            return NextResponse.json(
                { error: 'Cannot delete this node because it has historical deployment logs attached to it. Please deactivate is instead.' },
                { status: 409 }
            );
        }
        console.error('Delete worker error:', error);
        return NextResponse.json(
            { error: 'Internal server error.' },
            { status: 500 }
        );
    }
}