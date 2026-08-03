import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { DeployStatus, GlobalRole } from '@prisma/client'
import { buildDeployStatusFingerprint } from '@/lib/deploy-status-fingerprint'

/**
 * Lightweight Activity status for polling — ids/status/commit only.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.response || !auth.session) return auth.response

    const { userId, role } = auth.session

    const deployments = await prisma.deployment.findMany({
      where:
        role === GlobalRole.SYSADMIN
          ? undefined
          : {
              environment: {
                project: {
                  members: {
                    some: { userId },
                  },
                },
              },
            },
      orderBy: { createdAt: 'desc' },
      take: 50,
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
    console.error('Activity status error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
