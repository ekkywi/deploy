import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import {
  assertProjectAccess,
  requireEnvironmentInProject,
} from '@/lib/project-access'
import { requireAuth } from '@/lib/auth'
import { rollbackDeploymentService } from '@/lib/services/deployment-service'
import {
  deploymentBlockedMessage,
  isDeploymentBlockedByLifecycle,
} from '@/lib/services/environment-lifecycle'

export async function POST(
  request: NextRequest,
  ctx: RouteContext<'/api/projects/[projectId]/environments/[environmentId]/deployments/[deploymentId]/rollback'>
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

    if (isDeploymentBlockedByLifecycle(envCheck.environment.lifecycle)) {
      return NextResponse.json(
        { error: deploymentBlockedMessage(envCheck.environment.lifecycle) },
        { status: 409 }
      )
    }

    const deployment = await prisma.deployment.findFirst({
      where: { id: deploymentId, environmentId },
      select: { id: true },
    })
    if (!deployment) {
      return NextResponse.json({ error: 'Deployment not found.' }, { status: 404 })
    }

    const result = await rollbackDeploymentService(
      environmentId,
      deploymentId,
      auth.session.userId,
      request
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 'status' in result && result.status ? result.status : 400 }
      )
    }

    return NextResponse.json(
      {
        message: 'Rollback deployment triggered and building.',
        deployment: result.deployment,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Rollback deployment error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
