import { execFile } from 'child_process'
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export type DeployKeyPair = {
  publicKey: string
  privateKey: string
}

/** Generate an OpenSSH ed25519 deploy key pair via ssh-keygen. */
export async function generateDeployKeyPair(
  comment = 'deploy-paas-deploy-key'
): Promise<DeployKeyPair> {
  const dir = await mkdtemp(path.join(tmpdir(), 'deploy-ssh-keygen-'))
  const keyPath = path.join(dir, 'id_ed25519')

  try {
    await execFileAsync(
      'ssh-keygen',
      ['-t', 'ed25519', '-N', '', '-C', comment, '-f', keyPath, '-q'],
      { timeout: 15_000 }
    )

    const [privateKeyRaw, publicKeyRaw] = await Promise.all([
      readFile(keyPath, 'utf8'),
      readFile(`${keyPath}.pub`, 'utf8'),
    ])

    const privateKey = privateKeyRaw.endsWith('\n') ? privateKeyRaw : `${privateKeyRaw}\n`
    const publicKey = publicKeyRaw.trim()

    if (!privateKey.includes('PRIVATE KEY') || !publicKey.startsWith('ssh-')) {
      throw new Error('ssh-keygen produced an unexpected key format.')
    }

    return { publicKey, privateKey }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

/**
 * Write a private key to a temp dir and run `fn` with GIT_SSH_COMMAND set.
 * Always deletes the temp material afterward.
 */
export async function withTempSshIdentity<T>(
  privateKey: string,
  fn: (env: NodeJS.ProcessEnv) => Promise<T>
): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), 'deploy-git-ssh-'))
  const keyPath = path.join(dir, 'id_ed25519')
  const knownHostsPath = path.join(dir, 'known_hosts')
  const normalized = privateKey.endsWith('\n') ? privateKey : `${privateKey}\n`

  await writeFile(keyPath, normalized, { mode: 0o600 })

  const gitSshCommand = [
    'ssh',
    '-i',
    keyPath,
    '-o',
    'IdentitiesOnly=yes',
    '-o',
    'StrictHostKeyChecking=accept-new',
    '-o',
    `UserKnownHostsFile=${knownHostsPath}`,
  ].join(' ')

  try {
    return await fn({
      ...process.env,
      GIT_SSH_COMMAND: gitSshCommand,
      GIT_TERMINAL_PROMPT: '0',
    })
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}
