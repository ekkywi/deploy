import type { EnvironmentVariable, WorkerNode } from '@prisma/client'
import prisma from '@/lib/prisma'
import {
  hashToken,
  openSecret,
  sealSecret,
  sealSecretIfNeeded,
} from '@/lib/crypto/secret-box'

export function sealEnvVarValue(value: string, isSecret: boolean): string {
  if (!isSecret) return value
  return sealSecret(value)
}

export function revealEnvVarValue(variable: Pick<EnvironmentVariable, 'value' | 'isSecret'>): string {
  if (!variable.isSecret) return variable.value
  return openSecret(variable.value)
}

export function mapVariablesForUse<T extends Pick<EnvironmentVariable, 'key' | 'value' | 'isSecret'>>(
  variables: T[]
): Array<T & { value: string }> {
  return variables.map((variable) => ({
    ...variable,
    value: revealEnvVarValue(variable),
  }))
}

export function prepareWorkerTokenForStorage(plaintextToken: string): {
  authToken: string
  authTokenHash: string
} {
  return {
    authToken: sealSecret(plaintextToken),
    authTokenHash: hashToken(plaintextToken),
  }
}

export function revealWorkerAuthToken(
  worker: Pick<WorkerNode, 'authToken'> | { authToken: string }
): string {
  return openSecret(worker.authToken)
}

/** Resolve an inbound agent Bearer token to a worker row (hash first, plaintext legacy fallback). */
export async function findWorkerByAgentToken(token: string, activeOnly = true) {
  const hash = hashToken(token)
  const activeFilter = activeOnly ? { isActive: true as const } : {}

  const byHash = await prisma.workerNode.findFirst({
    where: { authTokenHash: hash, ...activeFilter },
  })
  if (byHash) return byHash

  // Legacy rows stored the plaintext token before encryption.
  const byPlain = await prisma.workerNode.findFirst({
    where: { authToken: token, ...activeFilter },
  })
  return byPlain
}

export async function upgradeWorkerTokenStorage(worker: WorkerNode, plaintextToken: string) {
  const sealed = prepareWorkerTokenForStorage(plaintextToken)
  if (
    worker.authToken === sealed.authToken &&
    worker.authTokenHash === sealed.authTokenHash
  ) {
    return worker
  }

  return prisma.workerNode.update({
    where: { id: worker.id },
    data: sealed,
  })
}

export function sealWorkerTokenRecord(worker: Pick<WorkerNode, 'authToken' | 'authTokenHash'>): {
  authToken: string
  authTokenHash: string
} {
  const plaintext = openSecret(worker.authToken)
  return {
    authToken: sealSecretIfNeeded(worker.authToken),
    authTokenHash: worker.authTokenHash || hashToken(plaintext),
  }
}
