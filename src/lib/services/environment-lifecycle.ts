import { LifeCycleStatus } from '@prisma/client'

export function isDeploymentBlockedByLifecycle(lifecycle: string | null | undefined) {
  return (
    lifecycle === LifeCycleStatus.SUSPENDED ||
    lifecycle === LifeCycleStatus.DELETING ||
    lifecycle === LifeCycleStatus.DELETED
  )
}

export function isRuntimeMutationBlockedByLifecycle(
  lifecycle: LifeCycleStatus | string | null | undefined
) {
  return (
    lifecycle === LifeCycleStatus.DELETING || lifecycle === LifeCycleStatus.DELETED
  )
}

export function deploymentBlockedMessage(lifecycle: string | null | undefined) {
  if (lifecycle === LifeCycleStatus.SUSPENDED) {
    return 'This environment is suspended and cannot accept new deployments.'
  }
  if (
    lifecycle === LifeCycleStatus.DELETING ||
    lifecycle === LifeCycleStatus.DELETED
  ) {
    return 'This environment is being deleted and cannot accept new deployments.'
  }
  return 'This environment cannot accept new deployments.'
}
