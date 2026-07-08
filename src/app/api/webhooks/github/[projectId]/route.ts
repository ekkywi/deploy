import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { executeDeploymentService } from "@/lib/services/deployment-service";

export async function POST(
    request: NextRequest,
    ctx: RouteContext<'/api/webhooks/github/[projectId]'>
) {
    try {
        const { projectId } = await ctx.params;
        const signature = request.headers.get('x-hub-signature-256');
        const event = request.headers.get('x-github-event');

        if (!signature || !event) {
            return NextResponse.json(
                { error: 'Missing Github headers.' },
                { status: 400 }   
            );
        }

        if (event !== 'push') {
            return NextResponse.json(
                { message: 'Event ignored.' },
                { status: 200 }
            );
        }

        const project = await prisma.project.findUnique({
            where: {
                id: projectId,
                deletedAt: null
            },
            select: {
                id: true,
                webhookSecret: true,
                name: true
            }
        });

        if (!project || !project.webhookSecret) {
            return NextResponse.json(
                { error: 'Project or webhook secret not found.' },
                { status: 404 }
            );
        }

        const rawBody = await request.text();
        const hmac = crypto.createHmac('sha256', project.webhookSecret);
        const expectedSignature = 'sha256=' + hmac.update(rawBody).digest('hex');
        const signatureBuffer = Buffer.from(signature);
        const expectedSignatureBuffer = Buffer.from(expectedSignature);
        const hasComparableSignature = signatureBuffer.length === expectedSignatureBuffer.length;
        const isSignatureValid = crypto.timingSafeEqual(
            hasComparableSignature ? signatureBuffer : expectedSignatureBuffer,
            expectedSignatureBuffer
        );

        if (!hasComparableSignature || !isSignatureValid) {
            return NextResponse.json(
                { error: 'Invalid payload signature.' },
                { status: 401 }
            );
        }

        const payload = JSON.parse(rawBody);
        const branchMatch = payload.ref?.match(/refs\/heads\/(.*)/);

        if (!branchMatch) {
            return NextResponse.json(
                { message: 'Not a branch push.' },
                { status: 200 }
            );
        }

        const pushedBranch = branchMatch[1];
        const environments = await prisma.environment.findMany({
            where: {
                projectId: project.id,
                branchName: pushedBranch,
                deletedAt: null
            },
            select: { id: true }
        });

        if (environments.length === 0) {
            return NextResponse.json(
                { message: `No environments track branch: ${pushedBranch}` },
                { status: 200 }
            );
        }

        const deployPromises = environments.map((env) =>
            executeDeploymentService(
                env.id,
                pushedBranch,
                'SYSTEM',
                request
            )
        );

        const settledResults = await Promise.allSettled(deployPromises);
        const deploymentResults = settledResults.map((res, index) => {
            if (res.status === 'fulfilled') {
                return {
                    environmentId: environments[index].id,
                    status: res.value.success ? 'TRIGGERED' : 'FAILED',
                    error: res.value.success ? null : res.value.error
                };
            } else {
                return {
                    environmentId: environments[index].id,
                    status: `CRASHED`,
                    error: res.reason
                };
            }
        });

        return NextResponse.json(
            {
                message: 'Webhook processed successfully.',
                deployments: deploymentResults
            },
            { status: 202 }
        );

    } catch (error) {
        console.error('Webhook error:', error);
        return NextResponse.json(
            { error: 'Internal server error.' },
            { status: 500 }
        );
    }
}
