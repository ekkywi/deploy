type EnvironmentDeletePayload = {
  message?: string;
  error?: string;
  retryable?: boolean;
  lifecycle?: string;
};

export function formatEnvironmentDeleteErrorMessage(data: EnvironmentDeletePayload) {
  const retrySummary = data.retryable ? ' Delete is still pending and can be retried.' : '';
  const lifecycleSummary = data.lifecycle ? ` Current state: ${data.lifecycle}.` : '';

  return `${data.error || 'Failed to delete environment'}${retrySummary}${lifecycleSummary}`.trim();
}

export function formatEnvironmentDeleteSuccessMessage(data: EnvironmentDeletePayload) {
  const retrySummary = data.retryable ? ' Finalization can be retried if needed.' : '';
  return `${data.message || 'Environment deleted successfully.'}${retrySummary}`;
}
