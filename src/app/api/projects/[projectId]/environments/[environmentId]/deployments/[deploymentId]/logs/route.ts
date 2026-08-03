import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import {
  assertProjectAccess,
  requireEnvironmentInProject,
} from '@/lib/project-access'
import { revealWorkerAuthToken } from '@/lib/crypto/sealed-secrets'

export async function GET(
  request: NextRequest,
  ctx: RouteContext<'/api/projects/[projectId]/environments/[environmentId]/deployments/[deploymentId]/logs'>
) {
  try {
    const auth = await requireAuth(request)
    if (auth.response || !auth.session) return auth.response

    const { projectId, environmentId, deploymentId } = await ctx.params

    const access = await assertProjectAccess({
      userId: auth.session.userId,
      globalRole: auth.session.role,
      projectId,
      minimumRole: 'VIEWER',
    })
    if (!access.ok) return access.response

    const envCheck = await requireEnvironmentInProject(projectId, environmentId)
    if (!envCheck.ok) return envCheck.response

    const deployment = await prisma.deployment.findFirst({
      where: { id: deploymentId, environmentId },
      include: { workerNode: true },
    })

    if (!deployment?.workerNode) {
      return NextResponse.json(
        { error: 'Deployment or Worker Node not found.' },
        { status: 404 }
      )
    }

    const worker = deployment.workerNode
    const agentUrl = `http://${worker.ipAddress}:4000/api/deploy/${deploymentId}/logs`

    const agentResponse = await fetch(agentUrl, {
      headers: {
        Authorization: `Bearer ${revealWorkerAuthToken(worker)}`,
        Accept: 'text/event-stream',
      },
    })

    if (!agentResponse.ok || !agentResponse.body) {
      throw new Error(
        `Agent rejected stream request with status: ${agentResponse.status}`
      )
    }

    return new Response(agentResponse.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    })
  } catch (error: unknown) {
    console.error(
      'Log Streaming Proxy Error:',
      error instanceof Error ? error.message : error
    )
    return NextResponse.json(
      { error: 'Failed to establish log stream connection.' },
      { status: 500 }
    )
  }
}
