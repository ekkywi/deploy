import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, GlobalRole, AccountStatus } from '@prisma/client'
import * as bcrypt from 'bcrypt'

if (!process.env.DATABASE_URL) {
  console.error('FATAL ERROR: DATABASE_URL not set in environment')
  process.exit(1)
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@localhost').trim().toLowerCase()
  const password = process.env.SEED_ADMIN_PASSWORD || 'changeme'
  const firstName = process.env.SEED_ADMIN_FIRST_NAME || 'System'
  const lastName = process.env.SEED_ADMIN_LAST_NAME || 'Administrator'

  if (password.length < 8) {
    throw new Error('SEED_ADMIN_PASSWORD must be at least 8 characters')
  }

  console.log('Seeding database...')

  const hashedPassword = await bcrypt.hash(password, 10)

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      firstName,
      lastName,
      globalRole: GlobalRole.SYSADMIN,
      status: AccountStatus.ACTIVE,
    },
    create: {
      firstName,
      lastName,
      email,
      passwordHash: hashedPassword,
      globalRole: GlobalRole.SYSADMIN,
      status: AccountStatus.ACTIVE,
    },
  })

  console.log(`Admin user ready: ${admin.email}`)
}

main()
  .catch((e) => {
    console.error('Failed to seed database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
