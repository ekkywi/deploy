import { NextResponse } from "next/server";
import { GlobalRole } from "@prisma/client";
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { requireAuth } from "@/lib/auth";

export async function GET(request: Request) {
    try {
        const auth = await requireAuth(request);
        
        if (auth.response || !auth.session) return auth.response;

        if (auth.session.role !== GlobalRole.SYSADMIN) {
            return NextResponse.json(
                { error: 'Forbidden. Sysadmin access required' },
                { status: 403 }
            );
        }

        const workers = await prisma.workerNode.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { deployments: true }
                }
            }
        });

        return NextResponse.json(
            { workers },
            { status: 200 }
        );

    } catch (error) {
        console.error('Fetch workers error:', error);
        return NextResponse.json(
            { error: 'Internal server error.' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const auth = await requireAuth(request);

        if (auth.response || !auth.session) return auth.response;

        if (auth.session.role !== GlobalRole.SYSADMIN) {
            return NextResponse.json(
                { error: 'Forbidden. Sysadmin access required.' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { name, ipAddress } = body;

        if (!name || name.trim().length < 2) {
            return NextResponse.json(
                { error: 'Worker name is required (min 2 chars).' },
                { status: 400}
            );
        }

        if (!ipAddress || !/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ipAddress)) {
            return NextResponse.json({ error: 'Valid IPv4 address is required.' }, { status: 400 });
        }

        const sanitizedName = name.trim();

        const existingNode = await prisma.workerNode.findFirst({
            where: {
                OR: [
                    { name: sanitizedName },
                    { ipAddress: ipAddress }
                ]
            }
        });

        if (existingNode) {
            return NextResponse.json({ 
                error: `Conflict: Worker name or IP address is already registered.` 
            }, { status: 409 });
        }

        const generatedToken = crypto.randomBytes(32).toString('hex');

        const newWorker = await prisma.workerNode.create({
            data: {
                name: sanitizedName,
                ipAddress: ipAddress,
                authToken: generatedToken,
                isActive: true
            }
        });

        return NextResponse.json(
            { message: 'Worker node registered successfully.', worker: newWorker },
            { status: 201 }
        );

    } catch (error) {
        console.error('Create worker error:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}