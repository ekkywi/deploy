/**
 * One-shot migration: seal existing secret env vars and worker auth tokens.
 *
 * Usage:
 *   ENCRYPTION_KEY=... DATABASE_URL=... npx tsx scripts/migrate-sealed-secrets.ts
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import {
  hashToken,
  hasEncryptionKey,
  isSealed,
  openSecret,
  sealSecret,
} from '../src/lib/crypto/secret-box'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  if (!hasEncryptionKey()) {
    throw new Error('ENCRYPTION_KEY is required to migrate sealed secrets.')
  }

  let sealedVars = 0
  let sealedWorkers = 0

  const secretVars = await prisma.environmentVariable.findMany({
    where: { isSecret: true },
  })

  for (const variable of secretVars) {
    if (isSealed(variable.value)) continue
    await prisma.environmentVariable.update({
      where: { id: variable.id },
      data: { value: sealSecret(variable.value) },
    })
    sealedVars += 1
  }

  const workers = await prisma.workerNode.findMany()
  for (const worker of workers) {
    const plaintext = openSecret(worker.authToken)
    const nextToken = isSealed(worker.authToken)
      ? worker.authToken
      : sealSecret(plaintext)
    const nextHash = hashToken(plaintext)

    if (worker.authToken === nextToken && worker.authTokenHash === nextHash) {
      continue
    }

    await prisma.workerNode.update({
      where: { id: worker.id },
      data: {
        authToken: nextToken,
        authTokenHash: nextHash,
      },
    })
    sealedWorkers += 1
  }

  console.log(
    `Migration complete. Sealed ${sealedVars} secret env var(s) and ${sealedWorkers} worker token(s).`
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
