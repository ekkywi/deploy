/** True when ref looks like a full or abbreviated git commit SHA. */
export function isGitCommitSha(ref: string) {
  return /^[0-9a-f]{7,40}$/i.test(ref.trim())
}

export function formatDeployRef(commitHash: string | null | undefined) {
  const value = commitHash?.trim() || ''
  if (!value) return 'Manual deploy'
  if (isGitCommitSha(value)) return value.slice(0, 7)
  return value
}
