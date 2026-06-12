import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, GlobalRole, AccountStatus } from "@prisma/client"
import * as bcrypt from "bcrypt"

if (!process.env.DATABASE_URL) {
    console.error('FATAL ERROR: DATABASE_URL not set in environment')
    process.exit(1)
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
    console.log("Seeding database...")

    const hashedPassword = await bcrypt.hash("SecurePassword!123", 10)

    const admin = await prisma.user.upsert({
        where: { email: 'admin@office.internal' },
        update: {},
        create: {
            firstName: 'System',
            lastName: 'Administrator',
            email: 'admin@mail.com',
            passwordHash: hashedPassword,
            globalRole: GlobalRole.SYSADMIN,
            status: AccountStatus.ACTIVE,
        },
    })

    console.log(`Admin user created: ${admin.email}`)
}

main().catch((e) => {
    console.error('Failed to seed database:', e)
    process.exit(1)
}).finally(async () => {
    await prisma.$disconnect()
})