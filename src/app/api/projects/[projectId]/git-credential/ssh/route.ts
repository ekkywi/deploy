import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { assertProjectAccess } from '@/lib/project-access'
import { logAudit } from '@/lib/audit-logger'
import { sealGitSshPrivateKey } from '@/lib/git/project-git-credential'
import { isHttpsOrHttpRepoUrl, isSshGitRepoUrl } from '@/lib/git/authenticated-url'
import { generateDeployKeyPair } from '@/lib/git/ssh-deploy-key'

/** Generate (or rotate) an SSH deploy key pair for this project. */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<'/api/projects/[projectId]/git-credential/ssh'>
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
      select: { id: true, name: true, repoUrl: true, gitSshPublicKey: true },
    })
    if (!project) {
      return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
    }

    if (
      project.repoUrl &&
      !isHttpsOrHttpRepoUrl(project.repoUrl) &&
      !isSshGitRepoUrl(project.repoUrl)
    ) {
      return NextResponse.json(
        { error: 'Repository URL format is not supported for SSH deploy keys.' },
        { status: 400 }
      )
    }

    const pair = await generateDeployKeyPair(`deploy:${project.name}`)
    const rotated = Boolean(project.gitSshPublicKey)

    await prisma.project.update({
      where: { id: projectId },
      data: {
        gitSshPrivateKey: sealGitSshPrivateKey(pair.privateKey),
        gitSshPublicKey: pair.publicKey,
      },
    })

    logAudit({
      userId: auth.session.userId,
      action: rotated ? 'ROTATE_GIT_SSH_DEPLOY_KEY' : 'GENERATE_GIT_SSH_DEPLOY_KEY',
      targetType: 'PROJECT',
      targetId: projectId,
      request,
    })

    return NextResponse.json({
      message: rotated
        ? 'SSH deploy key rotated. Update the public key on your git host.'
        : 'SSH deploy key generated. Add the public key as a read-only deploy key on your repository.',
      sshConfigured: true,
      sshPublicKey: pair.publicKey,
      rotated,
    })
  } catch (error: unknown) {
    console.error('Git SSH credential POST error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error.'
    if (message.includes('ENCRYPTION_KEY') || message.includes('ssh-keygen')) {
      return NextResponse.json({ error: message }, { status: 500 })
    }
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

/** Remove the stored SSH deploy key pair. */
export async function DELETE(
  request: NextRequest,
  ctx: RouteContext<'/api/projects/[projectId]/git-credential/ssh'>
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
      data: {
        gitSshPrivateKey: null,
        gitSshPublicKey: null,
      },
    })

    logAudit({
      userId: auth.session.userId,
      action: 'CLEAR_GIT_SSH_DEPLOY_KEY',
      targetType: 'PROJECT',
      targetId: projectId,
      request,
    })

    return NextResponse.json({
      message: 'SSH deploy key removed.',
      sshConfigured: false,
      sshPublicKey: null,
    })
  } catch (error) {
    console.error('Git SSH credential DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
