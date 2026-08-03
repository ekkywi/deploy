import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { spawn } from 'child_process'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { assertProjectAccess } from '@/lib/project-access'
import {
  buildAuthenticatedHttpsRepoUrl,
  isHttpsOrHttpRepoUrl,
  resolveSshCloneUrl,
} from '@/lib/git/authenticated-url'
import {
  revealGitHttpsToken,
  revealGitSshPrivateKey,
} from '@/lib/git/project-git-credential'
import { withTempSshIdentity } from '@/lib/git/ssh-deploy-key'

function isSafeGitRemoteUrl(repoUrl: string) {
  try {
    const parsed = new URL(repoUrl)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' || parsed.protocol === 'git:'
  } catch {
    return /^git@[\w.-]+:[\w./-]+\.git$/.test(repoUrl)
  }
}

function listRemoteHeads(
  repoUrl: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      'git',
      ['-c', 'credential.helper=', 'ls-remote', '--heads', repoUrl],
      {
        shell: false,
        env: {
          ...env,
          GIT_TERMINAL_PROMPT: '0',
        },
      }
    )
    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
    })
    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code === 0) resolve(stdout)
      else reject(new Error(stderr || `git ls-remote exited with ${code}`))
    })
  })
}

export async function GET(
  request: NextRequest,
  ctx: RouteContext<'/api/projects/[projectId]/branches'>
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
      select: {
        repoUrl: true,
        gitHttpsToken: true,
        gitSshPrivateKey: true,
      },
    })

    if (!project?.repoUrl) {
      return NextResponse.json(
        { error: 'Repository URL not found' },
        { status: 404 }
      )
    }

    if (!isSafeGitRemoteUrl(project.repoUrl)) {
      return NextResponse.json(
        { error: 'Unsupported repository URL format.' },
        { status: 400 }
      )
    }

    const httpsToken = revealGitHttpsToken(project.gitHttpsToken)
    const sshPrivateKey = revealGitSshPrivateKey(project.gitSshPrivateKey)

    let stdout: string

    if (httpsToken && isHttpsOrHttpRepoUrl(project.repoUrl)) {
      const remoteUrl = buildAuthenticatedHttpsRepoUrl(project.repoUrl, httpsToken)
      stdout = await listRemoteHeads(remoteUrl)
    } else if (sshPrivateKey) {
      const remoteUrl = resolveSshCloneUrl(project.repoUrl)
      stdout = await withTempSshIdentity(sshPrivateKey, (env) =>
        listRemoteHeads(remoteUrl, env)
      )
    } else {
      stdout = await listRemoteHeads(project.repoUrl)
    }

    const branches = stdout
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map((line) => {
        const parts = line.split('refs/heads/')
        return parts.length > 1 ? parts[1].trim() : null
      })
      .filter(Boolean) as string[]

    if (branches.length === 0) {
      branches.push('main')
    }

    return NextResponse.json({ branches })
  } catch (error: unknown) {
    console.error(
      '[API] Failed to fetch branches:',
      error instanceof Error ? error.message : error
    )
    return NextResponse.json(
      { error: 'Failed to fetch branches. Check repository access.' },
      { status: 500 }
    )
  }
}
