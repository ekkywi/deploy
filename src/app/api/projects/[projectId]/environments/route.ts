import { NextResponse } from "next/server";
import { GlobalRole, ProjectRoleType, EnvironmentTier, StackType } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

const NODE_VERSION_OPTIONS = ['18', '20', '22', '24'] as const;

function isNodeStack(stackType: unknown) {
    return stackType === StackType.NEXTJS || stackType === StackType.NODEJS;
}

function sanitizeNodeVersion(value: unknown) {
    if (typeof value === 'string' && NODE_VERSION_OPTIONS.includes(value as (typeof NODE_VERSION_OPTIONS)[number])) {
        return value;
    }

    return '22';
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const auth = await requireAuth(request);

        if (auth.response || !auth.session) return auth.response;

        const resolvedParams = await params;
        const { projectId } = resolvedParams;
        const { userId, role } = auth.session;

        if (role !== GlobalRole.SYSADMIN) {
            const membership = await prisma.projectRole.findUnique({
                where: { userId_projectId: { userId, projectId } }
            });

            if (!membership) {
                return NextResponse.json(
                    { error: 'Forbidden. You do not have access to this project.' },
                    { status: 403 }
                );
            }
        }

        const environments = await prisma.environment.findMany({
            where: { projectId, deletedAt: null },
            include: {
                _count: {
                    select: { deployments: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

                return NextResponse.json({ environments }, { status:200 });
            
            } catch (error) {
                console.error('Fetch environment error:', error);
                return NextResponse.json(
                    { error: 'Internal server error.' },
                    { status: 500 }
                )
            }
        }

export async function POST(
    request: Request,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const auth = await requireAuth(request);
        if (auth.response || !auth.session) return auth.response;

        const resolvedParams = await params;
        const { projectId } = resolvedParams;
        const { userId, role: globalRole } = auth.session;

        if (globalRole !== GlobalRole.SYSADMIN) {
            const membership = await prisma.projectRole.findUnique({
                where: { userId_projectId: { userId, projectId } }
            });

            if (!membership || membership.role === ProjectRoleType.VIEWER) {
                return NextResponse.json({ 
                    error: 'Forbidden. Only Project Owners and Editors can create environments.' 
                }, { status: 403 });
            }
        }

        const body = await request.json();
        const { name, domain, stackType, tier, nodeVersion } = body;

        if (!name || name.trim().length < 2) {
            return NextResponse.json({ error: 'Environment name must be at least 2 characters long.' }, { status: 400 });
        }

        if (!stackType || !Object.values(StackType).includes(stackType)) {
            return NextResponse.json({ error: 'Invalid stack type.' }, { status: 400 });
        }

        if (!tier || !Object.values(EnvironmentTier).includes(tier)) {
            return NextResponse.json({ error: 'Invalid environment tier.' }, { status: 400 });
        }

        if (isNodeStack(stackType) && nodeVersion && !NODE_VERSION_OPTIONS.includes(nodeVersion)) {
            return NextResponse.json({ error: 'Invalid node version.' }, { status: 400 });
        }

        const sanitizedName = name.trim();
        const sanitizedDomain = domain ? domain.trim().toLowerCase() : null;
        const duplicateFilters = [
            { projectId, name: sanitizedName },
            ...(sanitizedDomain ? [{ domain: sanitizedDomain }] : [])
        ];

        const existingEnv = await prisma.environment.findFirst({
            where: {
                deletedAt: null,
                OR: duplicateFilters
            }
        });

        if (existingEnv) {
            if (existingEnv.name === sanitizedName && existingEnv.projectId === projectId) {
                return NextResponse.json({ error: 'An environment with this name already exists in this project.' }, { status: 409 });
            }
            if (existingEnv.domain === sanitizedDomain) {
                return NextResponse.json({ error: 'This domain is already in use by another environment.' }, { status: 409 });
            }
        }

        const newEnvironment = await prisma.environment.create({
            data: {
                projectId,
                name: sanitizedName,
                domain: sanitizedDomain,
                stackType: stackType as StackType,
                tier: tier as EnvironmentTier,
                nodeVersion: sanitizeNodeVersion(nodeVersion)
            },
            include: {
                _count: {
                    select: {
                        deployments: true
                    }
                }
            }
        });

        return NextResponse.json(
            { message: 'Environment created successfully.', environment: newEnvironment },
            { status: 201 }
        );

    } catch (error) {
        console.error('Create environment error:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
