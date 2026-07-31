import { NextResponse } from 'next/server'
import { GlobalRole } from '@prisma/client'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { probeWorkersHealth } from '@/lib/services/worker-health'

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request)
    if (auth.response || !auth.session) return auth.response

    if (auth.session.role !== GlobalRole.SYSADMIN) {
      return NextResponse.json(
        { error: 'Forbidden. Sysadmin access required.' },
        { status: 403 }
      )
    }

    const workers = await prisma.workerNode.findMany({
      select: { id: true, ipAddress: true, authToken: true },
      orderBy: { createdAt: 'desc' },
    })

    const results = await probeWorkersHealth(workers)

    return NextResponse.json(
      {
        checkedAt: new Date().toISOString(),
        results,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Workers health probe error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
