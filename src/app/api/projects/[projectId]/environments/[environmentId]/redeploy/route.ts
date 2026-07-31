import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  assertProjectAccess,
  requireEnvironmentInProject,
} from '@/lib/project-access'
import { requireAuth } from '@/lib/auth'
import { redeployEnvironmentService } from '@/lib/services/deployment-service'
import {
  deploymentBlockedMessage,
  isDeploymentBlockedByLifecycle,
} from '@/lib/services/environment-lifecycle'

export async function POST(
  request: NextRequest,
  ctx: RouteContext<'/api/projects/[projectId]/environments/[environmentId]/redeploy'>
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

    if (isDeploymentBlockedByLifecycle(envCheck.environment.lifecycle)) {
      return NextResponse.json(
        { error: deploymentBlockedMessage(envCheck.environment.lifecycle) },
        { status: 409 }
      )
    }

    const result = await redeployEnvironmentService(
      environmentId,
      auth.session.userId,
      request
    )

    if (!result.success) {
      const status = result.error?.includes('already')
        ? 409
        : result.error?.includes('No branch')
          ? 400
          : 502
      return NextResponse.json({ error: result.error }, { status })
    }

    return NextResponse.json(
      {
        message: 'Redeploy triggered and building.',
        deployment: result.deployment,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Redeploy error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
