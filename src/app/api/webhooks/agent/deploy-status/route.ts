import { NextResponse } from "next/server";
import prisma from '@/lib/prisma';
import { DeployStatus } from '@prisma/client';

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('authorization');
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Unauthorized: Missing token.' },
                { status: 401 }
            );
        }

        const token = authHeader.split(' ')[1];

        const worker = await prisma.workerNode.findFirst({
            where: { authToken: token, isActive: true }
        });

        if (!worker) {
            return NextResponse.json(
                { error: 'Forbidden: Invalid or disabled agent token.' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { deploymentId, status, port, message } = body;

        if (!deploymentId || !status) {
            return NextResponse.json(
                { error: 'Bad Request: Missing deploymentId or status.' },
                { status: 400 }
            );
        }

        const deployment = await prisma.deployment.findUnique({
            where: { id: deploymentId }
        });

        if (!deployment) {
            return NextResponse.json(
                { error: 'Deployment record not found.' },
                { status: 404 }
            );
        }

        const updateData: any = {
            status: status as DeployStatus,
        };

        if (status === 'FAILED') {
            updateData.errorMessage = message;
        }

        if (status === 'SUCCESS' && port !== null) {
            updateData.assignedPort = port;
        }

        await prisma.deployment.update({
            where: { id: deploymentId },
            data: updateData
        });

        console.log(`[WEBHOOK] Deployment ${deploymentId} updated to ${status} (Port: ${port || 'N/A'})`);

        return NextResponse.json({ message: 'Webhook processed successfully.' }, { status: 200 });

    } catch (error: any) {
        console.error('Webhook processing error:', error.message);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}