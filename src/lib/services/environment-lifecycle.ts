import { LifeCycleStatus } from '@prisma/client'

export function isDeploymentBlockedByLifecycle(lifecycle: string | null | undefined) {
    return lifecycle === LifeCycleStatus.DELETING || lifecycle === LifeCycleStatus.DELETED
}

export function isRuntimeMutationBlockedByLifecycle(lifecycle: LifeCycleStatus | string | null | undefined) {
    return lifecycle === LifeCycleStatus.DELETING || lifecycle === LifeCycleStatus.DELETED
}
