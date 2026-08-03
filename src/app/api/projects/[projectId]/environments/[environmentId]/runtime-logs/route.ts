import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import {
  assertProjectAccess,
  requireEnvironmentInProject,
} from '@/lib/project-access'
import { DeployStatus } from '@prisma/client'
import { revealWorkerAuthToken } from '@/lib/crypto/sealed-secrets'

export async function GET(
  request: NextRequest,
  ctx: RouteContext<'/api/projects/[projectId]/environments/[environmentId]/runtime-logs'>
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

    const lastSuccess = await prisma.deployment.findFirst({
      where: { environmentId, status: DeployStatus.SUCCESS },
      orderBy: { createdAt: 'desc' },
      include: { workerNode: true },
    })

    if (!lastSuccess?.workerNode) {
      return NextResponse.json(
        { error: 'No successful deployment with an assigned worker was found.' },
        { status: 404 }
      )
    }

    const worker = lastSuccess.workerNode
    const follow = request.nextUrl.searchParams.get('follow') === '1'
    const tail = request.nextUrl.searchParams.get('tail') || '200'
    const agentUrl = new URL(
      `http://${worker.ipAddress}:4000/api/environment/${environmentId}/logs`
    )
    agentUrl.searchParams.set('tail', tail)
    if (follow) {
      agentUrl.searchParams.set('follow', '1')
    }

    const agentResponse = await fetch(agentUrl, {
      headers: {
        Authorization: `Bearer ${revealWorkerAuthToken(worker)}`,
        Accept: follow ? 'text/event-stream' : 'application/json',
      },
      signal: follow ? undefined : AbortSignal.timeout(15_000),
    })

    if (!agentResponse.ok) {
      const body = await agentResponse.json().catch(() => ({}))
      return NextResponse.json(
        {
          error:
            (body as { error?: string }).error ||
            `Agent rejected runtime logs request (${agentResponse.status}).`,
        },
        { status: agentResponse.status === 404 ? 404 : 502 }
      )
    }

    if (follow) {
      if (!agentResponse.body) {
        return NextResponse.json(
          { error: 'Agent returned an empty log stream.' },
          { status: 502 }
        )
      }

      return new Response(agentResponse.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      })
    }

    const payload = await agentResponse.json()
    return NextResponse.json(payload, { status: 200 })
  } catch (error: unknown) {
    console.error(
      'Runtime logs proxy error:',
      error instanceof Error ? error.message : error
    )
    return NextResponse.json(
      { error: 'Failed to fetch runtime logs from the worker agent.' },
      { status: 500 }
    )
  }
}
