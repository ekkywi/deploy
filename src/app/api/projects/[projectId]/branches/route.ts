import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { exec } from 'child_process';
import util from 'util';
import prisma from '@/lib/prisma';

const execAsync = util.promisify(exec);

export async function GET(
    request: NextRequest,
    ctx: RouteContext<'/api/projects/[projectId]/branches'>
) {
    try {
        const { projectId } = await ctx.params;

        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { repoUrl: true }
        });

        if (!project || !project.repoUrl) {
            return NextResponse.json(
                { error: 'Repository URL not found' },
                { status: 404 }
            );
        }

        const { stdout } = await execAsync(`git ls-remote --heads ${project.repoUrl}`);

        const branches = stdout
            .split('\n')
            .filter((line) => line.trim() !== '')
            .map((line) => {
                const parts = line.split('refs/heads/');
                return parts.length > 1 ? parts[1].trim() : null;
            })
            .filter(Boolean) as string[];
        
        if (branches.length === 0) {
            branches.push('main');
        }

        return NextResponse.json({ branches });
    } catch (error: unknown) {
        console.error('[API] Failed to fetch branches:', error instanceof Error ? error.message : error);
        return NextResponse.json(
            { error: 'Failed to fetch branches. Check repository access.' },
            { status: 500 }
        );
    }
}
