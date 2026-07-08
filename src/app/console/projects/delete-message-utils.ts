type ProjectDeleteErrorPayload = {
  error?: string;
  runningEnvironments?: Array<{ name: string }>;
  deletedEnvironments?: Array<{ name: string }>;
  failedTeardowns?: Array<{ name: string; error: string }>;
  retryable?: boolean;
};

type ProjectDeleteSuccessPayload = {
  message?: string;
  deletedEnvironments?: Array<{ name: string }>;
  autoStoppedEnvironments?: Array<{ name: string }>;
};

export function formatProjectDeleteErrorMessage(data: ProjectDeleteErrorPayload) {
  const deletedSummary = Array.isArray(data.deletedEnvironments) && data.deletedEnvironments.length > 0
    ? ` Already deleted: ${data.deletedEnvironments.map((env) => env.name).join(', ')}.`
    : '';
  const runningSummary = Array.isArray(data.runningEnvironments) && data.runningEnvironments.length > 0
    ? ` Running: ${data.runningEnvironments.map((env) => env.name).join(', ')}.`
    : '';
  const failedSummary = Array.isArray(data.failedTeardowns) && data.failedTeardowns.length > 0
    ? ` Failed: ${data.failedTeardowns.map((item) => `${item.name} (${item.error})`).join(', ')}.`
    : '';
  const retrySummary = data.retryable ? ' You can retry after the worker is reachable again.' : '';

  return `${data.error || 'Failed to delete project'}${deletedSummary}${runningSummary}${failedSummary}${retrySummary}`.trim();
}

export function formatProjectDeleteSuccessMessage(data: ProjectDeleteSuccessPayload) {
  const deletedSummary = Array.isArray(data.deletedEnvironments) && data.deletedEnvironments.length > 0
    ? ` Deleted: ${data.deletedEnvironments.map((env) => env.name).join(', ')}.`
    : '';
  const autoStopped = Array.isArray(data.autoStoppedEnvironments) && data.autoStoppedEnvironments.length > 0
    ? ` Auto-stopped: ${data.autoStoppedEnvironments.map((env) => env.name).join(', ')}.`
    : '';

  return `${data.message || 'Project deleted successfully.'}${deletedSummary}${autoStopped}`;
}
