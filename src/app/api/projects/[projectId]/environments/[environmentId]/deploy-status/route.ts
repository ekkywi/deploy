import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import {
  assertProjectAccess,
  requireEnvironmentInProject,
} from '@/lib/project-access'
import { DeployStatus } from '@prisma/client'
import { buildDeployStatusFingerprint } from '@/lib/deploy-status-fingerprint'

/**
 * Lightweight deploy status for polling — no env vars, no worker payloads.
 */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<'/api/projects/[projectId]/environments/[environmentId]/deploy-status'>
) {
  try {
    const auth = await requireAuth(request)
    if (auth.response || !auth.session) return auth.response

    const { projectId, environmentId } = await ctx.params
    const access = await assertProjectAccess({
      userId: auth.session.userId,
      globalRole: auth.session.role,
      projectId,
      minimumRole: 'VIEWER',
    })
    if (!access.ok) return access.response

    const envCheck = await requireEnvironmentInProject(projectId, environmentId)
    if (!envCheck.ok) return envCheck.response

    const deployments = await prisma.deployment.findMany({
      where: { environmentId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        status: true,
        commitHash: true,
      },
    })

    const hasLive = deployments.some(
      (d) => d.status === DeployStatus.PENDING || d.status === DeployStatus.BUILDING
    )

    return NextResponse.json(
      {
        fingerprint: buildDeployStatusFingerprint(deployments),
        hasLive,
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  } catch (error) {
    console.error('Deploy status error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
