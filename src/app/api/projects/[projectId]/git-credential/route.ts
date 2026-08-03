import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { assertProjectAccess } from '@/lib/project-access'
import { logAudit } from '@/lib/audit-logger'
import { sealGitHttpsToken } from '@/lib/git/project-git-credential'
import { isHttpsOrHttpRepoUrl } from '@/lib/git/authenticated-url'

/** Status only — never returns the token value. */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<'/api/projects/[projectId]/git-credential'>
) {
  try {
    const auth = await requireAuth(request)
    if (auth.response || !auth.session) return auth.response

    const { projectId } = await ctx.params
    const access = await assertProjectAccess({
      userId: auth.session.userId,
      globalRole: auth.session.role,
      projectId,
      minimumRole: 'VIEWER',
    })
    if (!access.ok) return access.response

    const project = await prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: { gitHttpsToken: true, repoUrl: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
    }

    return NextResponse.json({
      configured: Boolean(project.gitHttpsToken),
      authType: project.gitHttpsToken ? 'HTTPS_TOKEN' : null,
      repoSupportsHttpsToken: project.repoUrl
        ? isHttpsOrHttpRepoUrl(project.repoUrl)
        : false,
    })
  } catch (error) {
    console.error('Git credential GET error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

/** Set or replace the HTTPS git token (encrypted at rest). */
export async function PUT(
  request: NextRequest,
  ctx: RouteContext<'/api/projects/[projectId]/git-credential'>
) {
  try {
    const auth = await requireAuth(request)
    if (auth.response || !auth.session) return auth.response

    const { projectId } = await ctx.params
    const access = await assertProjectAccess({
      userId: auth.session.userId,
      globalRole: auth.session.role,
      projectId,
      minimumRole: 'EDITOR',
    })
    if (!access.ok) return access.response

    const project = await prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: { id: true, repoUrl: true },
    })
    if (!project) {
      return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
    }

    if (project.repoUrl && !isHttpsOrHttpRepoUrl(project.repoUrl)) {
      return NextResponse.json(
        {
          error:
            'This project uses a non-HTTP(S) repository URL. Use an https:// repo URL to attach an HTTPS token.',
        },
        { status: 400 }
      )
    }

    const body: { token?: unknown } = await request.json().catch(() => ({}))
    const token = typeof body.token === 'string' ? body.token.trim() : ''
    if (token.length < 8) {
      return NextResponse.json(
        { error: 'Token is required (minimum 8 characters).' },
        { status: 400 }
      )
    }

    await prisma.project.update({
      where: { id: projectId },
      data: { gitHttpsToken: sealGitHttpsToken(token) },
    })

    logAudit({
      userId: auth.session.userId,
      action: 'SET_GIT_HTTPS_TOKEN',
      targetType: 'PROJECT',
      targetId: projectId,
      request,
    })

    return NextResponse.json({
      message: 'Git HTTPS token saved.',
      configured: true,
      authType: 'HTTPS_TOKEN',
    })
  } catch (error: unknown) {
    console.error('Git credential PUT error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error.'
    if (message.includes('ENCRYPTION_KEY')) {
      return NextResponse.json({ error: message }, { status: 500 })
    }
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

/** Remove the stored HTTPS git token. */
export async function DELETE(
  request: NextRequest,
  ctx: RouteContext<'/api/projects/[projectId]/git-credential'>
) {
  try {
    const auth = await requireAuth(request)
    if (auth.response || !auth.session) return auth.response

    const { projectId } = await ctx.params
    const access = await assertProjectAccess({
      userId: auth.session.userId,
      globalRole: auth.session.role,
      projectId,
      minimumRole: 'EDITOR',
    })
    if (!access.ok) return access.response

    const project = await prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: { id: true },
    })
    if (!project) {
      return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
    }

    await prisma.project.update({
      where: { id: projectId },
      data: { gitHttpsToken: null },
    })

    logAudit({
      userId: auth.session.userId,
      action: 'CLEAR_GIT_HTTPS_TOKEN',
      targetType: 'PROJECT',
      targetId: projectId,
      request,
    })

    return NextResponse.json({
      message: 'Git HTTPS token removed.',
      configured: false,
      authType: null,
    })
  } catch (error) {
    console.error('Git credential DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
