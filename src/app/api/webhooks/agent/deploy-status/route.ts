import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { DeployStatus } from '@prisma/client'

const TERMINAL_STATUSES = new Set<DeployStatus>([
  DeployStatus.SUCCESS,
  DeployStatus.FAILED,
  DeployStatus.CANCELLED,
])

const isDeployStatus = (status: string): status is DeployStatus => {
  return Object.values(DeployStatus).includes(status as DeployStatus)
}

function parseCommitHash(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!/^[0-9a-f]{7,40}$/i.test(trimmed)) return null
  return trimmed.toLowerCase()
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing token.' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]

    const worker = await prisma.workerNode.findFirst({
      where: { authToken: token, isActive: true },
    })

    if (!worker) {
      return NextResponse.json(
        { error: 'Forbidden: Invalid or disabled agent token.' },
        { status: 403 }
      )
    }

    const body: {
      deploymentId?: unknown
      status?: unknown
      port?: unknown
      message?: unknown
      commitHash?: unknown
    } = await request.json()
    const { deploymentId, status, port, message, commitHash } = body

    const deploymentIdText = typeof deploymentId === 'string' ? deploymentId : ''
    const statusText = typeof status === 'string' ? status : ''
    const portValue = typeof port === 'number' ? port : null
    const messageText = typeof message === 'string' ? message : undefined
    const commitHashValue = parseCommitHash(commitHash)

    if (!deploymentIdText || !statusText) {
      return NextResponse.json(
        { error: 'Bad Request: Missing deploymentId or status.' },
        { status: 400 }
      )
    }

    if (!isDeployStatus(statusText)) {
      return NextResponse.json(
        { error: 'Bad Request: Invalid deployment status.' },
        { status: 400 }
      )
    }

    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentIdText },
    })

    if (!deployment) {
      return NextResponse.json(
        { error: 'Deployment record not found.' },
        { status: 404 }
      )
    }

    if (deployment.workerNodeId && deployment.workerNodeId !== worker.id) {
      return NextResponse.json(
        { error: 'Forbidden: This deployment belongs to another worker.' },
        { status: 403 }
      )
    }

    if (TERMINAL_STATUSES.has(deployment.status)) {
      return NextResponse.json(
        {
          message: 'Deployment already finished; status unchanged.',
          status: deployment.status,
        },
        { status: 200 }
      )
    }

    if (
      statusText !== DeployStatus.SUCCESS &&
      statusText !== DeployStatus.FAILED &&
      statusText !== DeployStatus.BUILDING &&
      statusText !== DeployStatus.CANCELLED
    ) {
      return NextResponse.json(
        {
          error:
            'Bad Request: Agents may only report BUILDING, SUCCESS, FAILED, or CANCELLED.',
        },
        { status: 400 }
      )
    }

    const updateData: {
      status: DeployStatus
      errorMessage?: string | null
      assignedPort?: number
      workerNodeId?: string
      commitHash?: string
    } = {
      status: statusText,
      workerNodeId: worker.id,
    }

    if (commitHashValue) {
      updateData.commitHash = commitHashValue
    }

    if (statusText === DeployStatus.FAILED || statusText === DeployStatus.CANCELLED) {
      updateData.errorMessage =
        messageText ??
        (statusText === DeployStatus.CANCELLED
          ? 'Cancelled by user.'
          : 'Deployment failed.')
    }

    if (statusText === DeployStatus.SUCCESS) {
      updateData.errorMessage = null
      if (portValue !== null) {
        updateData.assignedPort = portValue
      }
    }

    await prisma.deployment.update({
      where: { id: deploymentIdText },
      data: updateData,
    })

    if (statusText === DeployStatus.SUCCESS && portValue !== null) {
      await prisma.environment.update({
        where: { id: deployment.environmentId },
        data: { assignedPort: portValue },
      })
    }

    console.log(
      `[WEBHOOK] Deployment ${deploymentIdText} updated to ${statusText} (Port: ${portValue || 'N/A'}${commitHashValue ? `, Commit: ${commitHashValue.slice(0, 7)}` : ''})`
    )

    return NextResponse.json(
      { message: 'Webhook processed successfully.' },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error(
      'Webhook processing error:',
      error instanceof Error ? error.message : error
    )
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
