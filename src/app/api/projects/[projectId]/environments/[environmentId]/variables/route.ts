import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import {
  assertProjectAccess,
  requireEnvironmentInProject,
} from '@/lib/project-access'
import { sealEnvVarValue } from '@/lib/crypto/sealed-secrets'

export async function POST(
  request: NextRequest,
  ctx: RouteContext<'/api/projects/[projectId]/environments/[environmentId]/variables'>
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

    const body: { key?: unknown; value?: unknown; isSecret?: unknown } =
      await request.json()
    const { key, value, isSecret } = body

    const normalizedKey = typeof key === 'string' ? key.trim() : ''
    const normalizedValue = typeof value === 'string' ? value.trim() : ''
    const secret = Boolean(isSecret)

    if (!normalizedKey || !normalizedValue) {
      return NextResponse.json(
        { error: 'Key and Value are required.' },
        { status: 400 }
      )
    }

    const lowerValue = normalizedValue.toLowerCase()
    if (lowerValue.includes('localhost') || lowerValue.includes('127.0.0.1')) {
      return NextResponse.json(
        {
          error:
            "Invalid parameter. 'localhost' or '127.0.0.1' points to the inside of the isolated Docker container. Please use your server's actual IP address (e.g., 192.168.x.x).",
        },
        { status: 400 }
      )
    }

    const storedValue = sealEnvVarValue(normalizedValue, secret)

    const newVar = await prisma.environmentVariable.create({
      data: {
        environmentId,
        key: normalizedKey.toUpperCase(),
        value: storedValue,
        isSecret: secret,
      },
    })

    return NextResponse.json(
      {
        message: 'Variable added successfully.',
        variable: {
          ...newVar,
          value: normalizedValue,
        },
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    console.error(
      'Env Var POST Error:',
      error instanceof Error ? error.message : error
    )
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'This key already exists in this environment.' },
        { status: 409 }
      )
    }
    const message = error instanceof Error ? error.message : 'Internal server error.'
    if (message.includes('ENCRYPTION_KEY')) {
      return NextResponse.json({ error: message }, { status: 500 })
    }
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  ctx: RouteContext<'/api/projects/[projectId]/environments/[environmentId]/variables'>
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

    const { searchParams } = new URL(request.url)
    const varId = searchParams.get('varId')

    if (!varId) {
      return NextResponse.json(
        { error: 'Variable ID is required.' },
        { status: 400 }
      )
    }

    const existing = await prisma.environmentVariable.findFirst({
      where: { id: varId, environmentId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Variable not found in this environment.' },
        { status: 404 }
      )
    }

    await prisma.environmentVariable.delete({
      where: { id: varId },
    })

    return NextResponse.json(
      { message: 'Variable deleted successfully.' },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error(
      'Env Var DELETE Error:',
      error instanceof Error ? error.message : error
    )
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
