import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  assertProjectAccess,
  requireEnvironmentInProject,
} from '@/lib/project-access'
import { requireAuth } from '@/lib/auth'
import { cancelDeploymentService } from '@/lib/services/cancel-deployment-service'
import prisma from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  ctx: RouteContext<'/api/projects/[projectId]/environments/[environmentId]/deployments/[deploymentId]/cancel'>
) {
  try {
    const auth = await requireAuth(request)
    if (auth.response || !auth.session) return auth.response

    const { projectId, environmentId, deploymentId } = await ctx.params

    const access = await assertProjectAccess({
      userId: auth.session.userId,
      globalRole: auth.session.role,
      projectId,
      minimumRole: 'EDITOR',
    })
    if (!access.ok) return access.response

    const envCheck = await requireEnvironmentInProject(projectId, environmentId)
    if (!envCheck.ok) return envCheck.response

    const deployment = await prisma.deployment.findFirst({
      where: { id: deploymentId, environmentId },
      select: { id: true },
    })
    if (!deployment) {
      return NextResponse.json({ error: 'Deployment not found.' }, { status: 404 })
    }

    const result = await cancelDeploymentService(
      deploymentId,
      auth.session.userId,
      request
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status ?? 400 }
      )
    }

    return NextResponse.json(
      {
        message: 'Deployment cancelled.',
        deployment: result.deployment,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Cancel deployment error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
