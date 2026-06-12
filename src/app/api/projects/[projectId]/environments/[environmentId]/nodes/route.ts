import { NextResponse } from "next/server";
import { GlobalRole, ProjectRoleType, NodeType } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ projectId: string, environmentId: string }> }
) {
    try {
        const auth = await requireAuth(request);

        if (auth.response || !auth.session) return auth.response;

        const resolvedParams = await params;
        const { projectId, environmentId } = resolvedParams;
        const { userId, role } = auth.session;

        if (role !== GlobalRole.SYSADMIN) {
            const membership = await prisma.projectRole.findUnique({
                where: { userId_projectId: { userId, projectId } }
            });

            if (!membership) {
                return NextResponse.json({ error: 'Forbidden. You do not have access to this project.' }, { status: 403 });
            }
        }

        const environment = await prisma.environment.findUnique({
            where: { id: environmentId, projectId, deletedAt: null }
        });

        if (!environment) {
            return NextResponse.json({ error: 'Environment not found in this project.' }, { status: 404 });
        }

        const nodes = await prisma.executionNode.findMany({
            where: { environmentId },
            orderBy: {
                createdAt: 'asc'
            }
        });

        return NextResponse.json({ nodes }, { status: 200 });

    } catch (error) {
        console.error('Fetch nodes error:', error);
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

        const resolvedParams = await params;
        const { projectId, environmentId } = resolvedParams;
        const { userId, role: globalRole } = auth.session;

        if (globalRole !== GlobalRole.SYSADMIN) {
            const membership = await prisma.projectRole.findUnique({
                where: { userId_projectId: { userId, projectId } }
            });

            if (!membership || membership.role === ProjectRoleType.VIEWER) {
                return NextResponse.json({ 
                    error: 'Forbidden. Only Owners and Editors can register nodes.' 
                }, { status: 403 });
            }
        }

        const environment = await prisma.environment.findUnique({
            where: { id: environmentId, projectId, deletedAt: null }
        });

        if (!environment) {
            return NextResponse.json({ error: 'Environment not found.' }, { status: 404 });
        }

        const body = await request.json();
        const { name, ipAddress, assignedPort, nodeType } = body;

        if (!name || name.trim().length < 2) {
            return NextResponse.json({ error: 'Node name is required (min 2 chars).' }, { status: 400 });
        }

        if (!ipAddress || !/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ipAddress)) {
            return NextResponse.json({ error: 'Valid IPv4 address is required.' }, { status: 400 });
        }

        if (!nodeType || !Object.values(NodeType).includes(nodeType)) {
            return NextResponse.json({ error: 'Invalid node type.' }, { status: 400 });
        }

        const parsedPort = assignedPort ? parseInt(assignedPort, 10) : null;
        if (parsedPort !== null && (isNaN(parsedPort) || parsedPort < 1 || parsedPort > 65535)) {
            return NextResponse.json({ error: 'Invalid port number.' }, { status: 400 });
        }

        const sanitizedName = name.trim();

        const existingName = await prisma.executionNode.findUnique({
            where: { name: sanitizedName }
        });

        if (existingName) {
            return NextResponse.json({ error: 'A node with this name already exists in the system.' }, { status: 409 });
        }

        const existingNetwork = await prisma.executionNode.findFirst({
            where: { 
                ipAddress, 
                assignedPort: parsedPort 
            }
        });

        if (existingNetwork) {
            return NextResponse.json({ 
                error: `Network collision: IP ${ipAddress} on port ${parsedPort || 'default'} is already registered to another node.` 
            }, { status: 409 });
        }

        const newNode = await prisma.executionNode.create({
            data: {
                environmentId,
                name: sanitizedName,
                ipAddress,
                assignedPort: parsedPort,
                nodeType: nodeType as NodeType
            }
        });

        return NextResponse.json(
            { message: 'Execution node registered successfully.', node: newNode },
            { status: 201 }
        );

    } catch (error) {
        console.error('Create node error:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}