import { NextResponse } from 'next/server'
import { GlobalRole, ProjectRoleType } from '@prisma/client'
import prisma from '@/lib/prisma'

const ROLE_RANK: Record<ProjectRoleType, number> = {
  VIEWER: 1,
  EDITOR: 2,
  OWNER: 3,
}

export type ProjectAccessLevel = ProjectRoleType

export async function getProjectMembership(userId: string, projectId: string) {
  return prisma.projectRole.findUnique({
    where: { userId_projectId: { userId, projectId } },
  })
}

export function hasMinimumProjectRole(
  role: ProjectRoleType,
  minimum: ProjectAccessLevel
) {
  return ROLE_RANK[role] >= ROLE_RANK[minimum]
}

export async function assertProjectAccess(options: {
  userId: string
  globalRole: GlobalRole
  projectId: string
  minimumRole?: ProjectAccessLevel
}) {
  const { userId, globalRole, projectId, minimumRole = 'VIEWER' } = options

  if (globalRole === GlobalRole.SYSADMIN) {
    return { ok: true as const, membership: null }
  }

  const membership = await getProjectMembership(userId, projectId)
  if (!membership) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: 'Forbidden. You are not a member of this project.' },
        { status: 403 }
      ),
    }
  }

  if (!hasMinimumProjectRole(membership.role, minimumRole)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: `Forbidden. Requires ${minimumRole.toLowerCase()} access or higher.`,
        },
        { status: 403 }
      ),
    }
  }

  return { ok: true as const, membership }
}

export async function getEnvironmentInProject(
  projectId: string,
  environmentId: string
) {
  return prisma.environment.findFirst({
    where: { id: environmentId, projectId, deletedAt: null },
  })
}

export async function requireEnvironmentInProject(
  projectId: string,
  environmentId: string
) {
  const environment = await getEnvironmentInProject(projectId, environmentId)
  if (!environment) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: 'Environment not found in this project.' },
        { status: 404 }
      ),
    }
  }
  return { ok: true as const, environment }
}
