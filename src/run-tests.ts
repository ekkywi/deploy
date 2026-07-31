/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'node:assert/strict';
import test from 'node:test';

import { LifeCycleStatus } from '@prisma/client';
import { deleteEnvironmentWorkflow } from '@/lib/services/environment-delete-workflow';
import { deleteProjectWorkflow } from '@/lib/services/project-delete-workflow';
import {
  isDeploymentBlockedByLifecycle,
  isRuntimeMutationBlockedByLifecycle,
} from '@/lib/services/environment-lifecycle';
import {
  formatEnvironmentDeleteErrorMessage,
  formatEnvironmentDeleteSuccessMessage,
} from '@/app/console/projects/environment-delete-message-utils';
import {
  formatProjectDeleteErrorMessage,
  formatProjectDeleteSuccessMessage,
} from '@/app/console/projects/delete-message-utils';
import {
  enqueueProjectDeleteJob,
  isRedisUnavailableError,
  type TeardownJobPayload,
} from '@/lib/queue/teardown-queue';
import {
  reconcileDeletingEnvironment,
  teardownEnvironmentSafely,
  type DeleteWorkflowDeps,
  type EnvironmentToDelete,
} from '@/lib/services/delete-workflow-service';

function createWorkflowDeps(overrides: Record<string, any> = {}) {
  const calls: string[] = [];

  const prisma: any = {
    environment: {
      update: async (args: unknown) => {
        calls.push(`environment.update:${JSON.stringify(args)}`);
        return args;
      },
      findUnique: async () => null,
    },
    auditLog: {
      create: async (args: unknown) => {
        calls.push(`auditLog.create:${JSON.stringify(args)}`);
        return args;
      },
    },
    $transaction: async (fn: (tx: any) => Promise<void>) => {
      calls.push('transaction:start');
      await fn({
        project: {
          update: async (args: unknown) => {
            calls.push(`tx.project.update:${JSON.stringify(args)}`);
            return args;
          },
        },
        environment: {
          update: async (args: unknown) => {
            calls.push(`tx.environment.update:${JSON.stringify(args)}`);
            return args;
          },
        },
        auditLog: {
          create: async (args: unknown) => {
            calls.push(`tx.auditLog.create:${JSON.stringify(args)}`);
            return args;
          },
        },
      });
      calls.push('transaction:end');
    },
  };

  const deps: DeleteWorkflowDeps & { calls: string[] } = {
    prisma,
    getEnvironmentRuntimeStatus: async () => ({
      exists: true,
      running: false,
      containerName: 'env-123',
      imageName: 'env-123:latest',
      port: 3000,
      deletedResources: [],
      missingResources: [],
    }),
    stopEnvironmentContainer: async () => ({ message: 'stopped' }),
    destroyEnvironmentResources: async () => ({
      exists: true,
      running: false,
      containerName: 'env-123',
      imageName: 'env-123:latest',
      port: 3000,
      deletedResources: ['container', 'image'],
      missingResources: [],
    }),
    now: () => 1700000000000,
    calls,
  };

  return Object.assign(deps, overrides);
}

function makeEnvironment(overrides: Partial<EnvironmentToDelete> = {}): EnvironmentToDelete {
  return {
    id: 'env-123',
    name: 'Environment One',
    assignedPort: 3000,
    lifecycle: LifeCycleStatus.ACTIVE,
    deployments: [
      {
        workerNode: {
          ipAddress: '127.0.0.1',
          authToken: 'token',
        },
      },
    ],
    ...overrides,
  };
}

test('delete workflow marks DELETING before cleanup and finalizes a running environment', async () => {
  const deps = createWorkflowDeps({
    getEnvironmentRuntimeStatus: async () => ({
      exists: true,
      running: true,
      containerName: 'env-123',
      imageName: 'env-123:latest',
      port: 3000,
      deletedResources: [],
      missingResources: [],
    }),
  });

  const result = await teardownEnvironmentSafely(makeEnvironment(), 'user-1', deps);

  assert.equal(result.status, 'DELETED');
  assert.equal(result.stopped, true);
  assert.ok(deps.calls[0]?.includes('environment.update'));
  assert.ok(deps.calls.some((entry: string) => entry.startsWith('tx.environment.update')));
  assert.ok(deps.calls.some((entry: string) => entry.startsWith('tx.auditLog.create')));
});

test('delete workflow keeps DELETING when destroy fails after a stop', async () => {
  const deps = createWorkflowDeps({
    getEnvironmentRuntimeStatus: async () => ({
      exists: true,
      running: true,
      containerName: 'env-123',
      imageName: 'env-123:latest',
      port: 3000,
      deletedResources: [],
      missingResources: [],
    }),
    destroyEnvironmentResources: async () => {
      throw new Error('agent exploded');
    },
  });

  await assert.rejects(
    teardownEnvironmentSafely(makeEnvironment(), 'user-1', deps),
    /agent exploded/
  );

  assert.ok(deps.calls.some((entry: string) => entry.startsWith('environment.update')));
  assert.equal(deps.calls.some((entry: string) => entry.includes('"lifecycle":"ACTIVE"')), false);
  assert.equal(deps.calls.some((entry: string) => entry.includes('"lifecycle":"SUSPENDED"')), false);
  assert.equal(deps.calls.some((entry: string) => entry.startsWith('tx.environment.update')), false);
});

test('delete workflow skips already deleted environments', async () => {
  const deps = createWorkflowDeps();
  const result = await teardownEnvironmentSafely(
    makeEnvironment({ lifecycle: LifeCycleStatus.DELETED }),
    'user-1',
    deps
  );

  assert.deepEqual(result, {
    id: 'env-123',
    name: 'Environment One',
    status: 'SKIPPED',
  });
  assert.equal(deps.calls.length, 0);
});

test('delete workflow reconciles an environment already marked deleting', async () => {
  const deps = createWorkflowDeps();
  (deps.prisma.environment as any).findUnique = async () => ({
    id: 'env-123',
    name: 'Environment One',
    assignedPort: 3000,
    lifecycle: LifeCycleStatus.DELETING,
    deployments: [
      {
        workerNode: {
          ipAddress: '127.0.0.1',
          authToken: 'token',
        },
      },
    ],
  } as any);

  const result = await reconcileDeletingEnvironment('env-123', 'user-1', deps);

  assert.deepEqual(result, {
    id: 'env-123',
    name: 'Environment One',
  });
  assert.ok(deps.calls.some((entry: string) => entry.startsWith('tx.environment.update')));
});

test('project delete workflow retries all environments and reports partial failures', async () => {
  const deps: any = createWorkflowDeps({
    getProjectDeleteCandidates: async () => ({
      environments: [
        {
          id: 'env-1',
          name: 'Env 1',
          assignedPort: 3000,
          lifecycle: 'ACTIVE',
          deployments: [],
        },
        {
          id: 'env-2',
          name: 'Env 2',
          assignedPort: 3001,
          lifecycle: 'ACTIVE',
          deployments: [],
        },
        {
          id: 'env-3',
          name: 'Env 3',
          assignedPort: 3002,
          lifecycle: 'ACTIVE',
          deployments: [],
        },
      ],
      runningEnvironments: [
        { id: 'env-2', name: 'Env 2', containerName: 'env-env-2', imageName: 'env-env-2:latest', port: 3001 },
      ],
    }),
    teardownEnvironmentSafely: async (environment: { id: string; name: string }) => {
      if (environment.id === 'env-2') {
        throw new Error('worker down');
      }

      return {
        id: environment.id,
        name: environment.name,
        status: 'DELETED' as const,
        stopped: environment.id === 'env-1',
      };
    },
  });

  const result = await deleteProjectWorkflow('project-1', 'user-1', 'Project One', deps);

  assert.equal(result.status, 502);
  assert.equal(deps.calls.some((entry: string) => entry.startsWith('transaction:start')), false);
  assert.deepEqual(result.body.runningEnvironments, [
    { id: 'env-2', name: 'Env 2', containerName: 'env-env-2', imageName: 'env-env-2:latest', port: 3001 },
  ]);
  assert.equal(result.body.deletedEnvironments.length, 2);
  assert.equal(result.body.autoStoppedEnvironments.length, 1);
  assert.equal(result.body.failedTeardowns.length, 1);
  assert.equal(result.body.retryable, true);
});

test('project delete workflow soft deletes only after all environments are removed', async () => {
  const deps: any = createWorkflowDeps({
    getProjectDeleteCandidates: async () => ({
      environments: [
        {
          id: 'env-1',
          name: 'Env 1',
          assignedPort: 3000,
          lifecycle: 'ACTIVE',
          deployments: [],
        },
      ],
      runningEnvironments: [],
    }),
    teardownEnvironmentSafely: async () => ({
      id: 'env-1',
      name: 'Env 1',
      status: 'DELETED' as const,
      stopped: true,
    }),
  });

  const result = await deleteProjectWorkflow('project-1', 'user-1', 'Project One', deps);

  assert.equal(result.status, 200);
  assert.equal(deps.calls.some((entry: string) => entry.startsWith('transaction:start')), true);
  assert.equal(result.body.deletedEnvironments.length, 1);
  assert.equal(result.body.autoStoppedEnvironments.length, 1);
});

test('environment delete workflow returns DELETED and retryable false when teardown succeeds', async () => {
  const result = await deleteEnvironmentWorkflow(
    'project-1',
    'env-1',
    'user-1',
    {
      prisma: {
        environment: {
          findUnique: async () => ({
            id: 'env-1',
            name: 'Env 1',
            lifecycle: LifeCycleStatus.ACTIVE,
            assignedPort: 3000,
            deployments: [],
          }) as any,
        },
      },
      reconcileDeletingEnvironment: async () => ({ id: 'env-1', name: 'Env 1' }),
      teardownEnvironmentSafely: async () => ({ id: 'env-1', name: 'Env 1', status: 'DELETED' as const, stopped: true }),
    } as any
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.lifecycle, LifeCycleStatus.DELETED);
  assert.equal(result.body.retryable, false);
});

test('environment delete workflow returns DELETING and retryable true when teardown fails', async () => {
  const result = await deleteEnvironmentWorkflow(
    'project-1',
    'env-1',
    'user-1',
    {
      prisma: {
        environment: {
          findUnique: async () => ({
            id: 'env-1',
            name: 'Env 1',
            lifecycle: LifeCycleStatus.ACTIVE,
            assignedPort: 3000,
            deployments: [],
          }) as any,
        },
      },
      reconcileDeletingEnvironment: async () => ({ id: 'env-1', name: 'Env 1' }),
      teardownEnvironmentSafely: async () => {
        throw new Error('agent failed');
      },
    } as any
  );

  assert.equal(result.status, 502);
  assert.equal(result.body.lifecycle, LifeCycleStatus.DELETING);
  assert.equal(result.body.retryable, true);
});

test('environment delete workflow finalizes a pending DELETING environment', async () => {
  const result = await deleteEnvironmentWorkflow(
    'project-1',
    'env-1',
    'user-1',
    {
      prisma: {
        environment: {
          findUnique: async () => ({
            id: 'env-1',
            name: 'Env 1',
            lifecycle: LifeCycleStatus.DELETING,
            assignedPort: 3000,
            deployments: [],
          }) as any,
        },
      },
      reconcileDeletingEnvironment: async () => ({ id: 'env-1', name: 'Env 1' }),
      teardownEnvironmentSafely: async () => ({ id: 'env-1', name: 'Env 1', status: 'DELETED' as const, stopped: false }),
    } as any
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.lifecycle, LifeCycleStatus.DELETED);
  assert.equal(result.body.retryable, false);
});

test('environment delete workflow returns retryable failure when recovery fails', async () => {
  const result = await deleteEnvironmentWorkflow(
    'project-1',
    'env-1',
    'user-1',
    {
      prisma: {
        environment: {
          findUnique: async () => ({
            id: 'env-1',
            name: 'Env 1',
            lifecycle: LifeCycleStatus.DELETING,
            assignedPort: 3000,
            deployments: [],
          }) as any,
        },
      },
      reconcileDeletingEnvironment: async () => {
        throw new Error('agent still busy');
      },
      teardownEnvironmentSafely: async () => ({ id: 'env-1', name: 'Env 1', status: 'DELETED' as const, stopped: false }),
    } as any
  );

  assert.equal(result.status, 502);
  assert.equal(result.body.lifecycle, LifeCycleStatus.DELETING);
  assert.equal(result.body.retryable, true);
});

test('deployment and toggle are blocked while environment is DELETING or DELETED', () => {
  assert.equal(isDeploymentBlockedByLifecycle(LifeCycleStatus.DELETING), true);
  assert.equal(isDeploymentBlockedByLifecycle(LifeCycleStatus.DELETED), true);
  assert.equal(isDeploymentBlockedByLifecycle(LifeCycleStatus.ACTIVE), false);

  assert.equal(isRuntimeMutationBlockedByLifecycle(LifeCycleStatus.DELETING), true);
  assert.equal(isRuntimeMutationBlockedByLifecycle(LifeCycleStatus.DELETED), true);
  assert.equal(isRuntimeMutationBlockedByLifecycle(LifeCycleStatus.SUSPENDED), false);
});

test('formats project delete error messages with running, deleted, and failed teardown details', () => {
  const message = formatProjectDeleteErrorMessage({
    error: 'Project deletion aborted because one or more environments could not be torn down safely.',
    deletedEnvironments: [{ name: 'Env A' }],
    runningEnvironments: [{ name: 'Env B' }],
    failedTeardowns: [{ name: 'Env C', error: 'worker down' }],
    retryable: true,
  });

  assert.equal(
    message,
    'Project deletion aborted because one or more environments could not be torn down safely. Already deleted: Env A. Running: Env B. Failed: Env C (worker down). You can retry after the worker is reachable again.'
  );
});

test('formats project delete success messages with deleted and auto-stopped environment details', () => {
  const message = formatProjectDeleteSuccessMessage({
    message: 'Project deleted successfully after all environments were torn down.',
    deletedEnvironments: [{ name: 'Env A' }],
    autoStoppedEnvironments: [{ name: 'Env B' }],
  });

  assert.equal(
    message,
    'Project deleted successfully after all environments were torn down. Deleted: Env A. Auto-stopped: Env B.'
  );
});

test('project delete queue helper returns 202 when enqueue succeeds', async () => {
  const payload: TeardownJobPayload = {
    projectId: 'project-1',
    userId: 'user-1',
    projectName: 'Project One',
  };

  const result = await enqueueProjectDeleteJob(payload, {
    add: async () => ({ id: 'job-1' } as any),
  });

  assert.equal(result.status, 202);
  assert.deepEqual(result.body, {
    message: 'Project deletion queued successfully. It will be removed in the background.',
    status: 'PROCESSING',
  });
});

test('project delete queue helper maps Redis connection failures to 503', async () => {
  const payload: TeardownJobPayload = {
    projectId: 'project-1',
    userId: 'user-1',
    projectName: 'Project One',
  };

  const result = await enqueueProjectDeleteJob(payload, {
    add: async () => {
      throw new Error('connect ECONNREFUSED 172.31.254.131:6379');
    },
  });

  assert.equal(result.status, 503);
  assert.deepEqual(result.body, {
    error: 'Project deletion is temporarily unavailable because the queue cannot reach Redis. Please try again shortly.',
    retryable: true,
  });
});

test('redis unavailable detection follows connection-level failures', () => {
  assert.equal(isRedisUnavailableError(new Error('connect ECONNREFUSED 172.31.254.131:6379')), true);
  assert.equal(isRedisUnavailableError(new Error('Reached the max retries per request limit (which is 20).')), true);
  assert.equal(isRedisUnavailableError(new Error('WRONGPASS invalid username-password pair')), false);
});

test('formats retryable environment delete errors with lifecycle context', () => {
  const message = formatEnvironmentDeleteErrorMessage({
    error: 'Failed to destroy infrastructure on the server.',
    retryable: true,
    lifecycle: 'DELETING',
  });

  assert.equal(
    message,
    'Failed to destroy infrastructure on the server. Delete is still pending and can be retried. Current state: DELETING.'
  );
});

test('formats environment delete success messages with retry note when provided', () => {
  const message = formatEnvironmentDeleteSuccessMessage({
    message: 'Environment completely destroyed and removed.',
    retryable: true,
  });

  assert.equal(
    message,
    'Environment completely destroyed and removed. Finalization can be retried if needed.'
  );
});

test('teardown queue module does not export the worker bootstrap', async () => {
  const teardownModule = await import('@/lib/queue/teardown-queue');

  assert.equal('teardownWorker' in teardownModule, false);
});
