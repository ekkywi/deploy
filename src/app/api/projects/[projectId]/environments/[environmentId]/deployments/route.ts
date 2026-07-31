import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import {
  assertProjectAccess,
  requireEnvironmentInProject,
} from '@/lib/project-access'
import { executeDeploymentService } from '@/lib/services/deployment-service'
import {
  deploymentBlockedMessage,
  isDeploymentBlockedByLifecycle,
} from '@/lib/services/environment-lifecycle'

export async function GET(
  request: NextRequest,
  ctx: RouteContext<'/api/projects/[projectId]/environments/[environmentId]/deployments'>
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
      include: {
        workerNode: { select: { name: true, ipAddress: true } },
      },
      take: 20,
    })

    return NextResponse.json({ deployments }, { status: 200 })
  } catch (error) {
    console.error('Fetch deployments error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  ctx: RouteContext<'/api/projects/[projectId]/environments/[environmentId]/deployments'>
) {
  try {
    const auth = await requireAuth(request)
    if (auth.response || !auth.session) return auth.response

    const { projectId, environmentId } = await ctx.params

    const access = await assertProjectAccess({
      userId: auth.session.userId,
      globalRole: auth.session.role,
      projectId,
      minimumRole: 'EDITOR',
    })
    if (!access.ok) return access.response

    const envCheck = await requireEnvironmentInProject(projectId, environmentId)
    if (!envCheck.ok) return envCheck.response

    let body: { branch?: unknown } = {}
    try {
      body = await request.json()
    } catch {
      // empty body is fine
    }

    if (isDeploymentBlockedByLifecycle(envCheck.environment.lifecycle)) {
      return NextResponse.json(
        { error: deploymentBlockedMessage(envCheck.environment.lifecycle) },
        { status: 409 }
      )
    }

    const finalBranch =
      typeof body.branch === 'string' && body.branch.trim().length > 0
        ? body.branch
        : envCheck.environment.branchName || 'main'

    const result = await executeDeploymentService(
      environmentId,
      finalBranch,
      auth.session.userId,
      request
    )

    if (!result.success) {
      const status = result.error?.includes('already') ? 409 : 502
      return NextResponse.json({ error: result.error }, { status })
    }

    return NextResponse.json(
      {
        message: 'Deployment triggered and building.',
        deployment: result.deployment,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Trigger deployment error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
