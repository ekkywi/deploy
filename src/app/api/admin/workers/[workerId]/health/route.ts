import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { GlobalRole } from '@prisma/client'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { probeWorkerHealth } from '@/lib/services/worker-health'

export async function GET(
  request: NextRequest,
  ctx: RouteContext<'/api/admin/workers/[workerId]/health'>
) {
  try {
    const auth = await requireAuth(request)
    if (auth.response || !auth.session) return auth.response

    if (auth.session.role !== GlobalRole.SYSADMIN) {
      return NextResponse.json(
        { error: 'Forbidden. Sysadmin access required.' },
        { status: 403 }
      )
    }

    const { workerId } = await ctx.params
    const worker = await prisma.workerNode.findUnique({
      where: { id: workerId },
      select: { id: true, ipAddress: true, authToken: true },
    })

    if (!worker) {
      return NextResponse.json({ error: 'Worker Node not found.' }, { status: 404 })
    }

    const health = await probeWorkerHealth(worker)
    return NextResponse.json({ health }, { status: 200 })
  } catch (error) {
    console.error('Worker health probe error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
