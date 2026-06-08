import { NextResponse } from "next/server"
import prisma from '@/lib/prisma'
import bcrypt from 'bcrypt'
import { toLowerCase } from "zod"

const VALID_ROLES = ['SYSADMIN', 'MANAGER', 'DEVELOPER']

export async function GET(request: Request) {
    try {
        const userRole = request.headers.get('x-user-role')

        if (userRole !== 'SYSADMIN') {
            return NextResponse.json(
                { error: 'Forbidden. You do not have sufficient privileges.'},
                { status: 403 }
            )
        }

        const { searchParams } = new URL(request.url)
        const statusFilter = searchParams.get('status')
        const searchQuery = searchParams.get('search')

        const whereClause: any = {}

        if (statusFilter) {
            whereClause.status = statusFilter
        }

        if (searchQuery) {
            whereClause.OR = [
                { firstName: { contains: searchQuery, mode: 'insensitive'} },
                { lastName: { contains: searchQuery, mode: 'insensitive'} },
                { email: { contains: searchQuery, mode: 'insensitive'} },
            ]
        }

        const users = await prisma.user.findMany({
            where: whereClause,
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                globalRole: true,
                status: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return NextResponse.json(
            { users },
            { status: 200}
        )
    } catch (error) {
        console.error('Fetch user error:', error)
        return NextResponse.json(
            { error: 'Internal server error.' },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const requesterRole = request.headers.get('x-user-role')

        if (requesterRole !== 'SYSADMIN') {
            return NextResponse.json(
                { error: 'Access denied. This action requires Administrator Privileges.'},
                { status: 403 }
            )
        }

        const body = await request.json()
        const { firstName, lastName, email, password, globalRole } = body

        if(!firstName || firstName.trim() === '') {
            return NextResponse.json(
                { error: 'First name is required.' },
                { status: 400 }
            )
        }

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json(
                { error: 'Valid email is required.' },
                { status: 400 }
            )
        }

        if (!password || password.length < 8) {
            return NextResponse.json(
                { error: 'Password be at least 8 characters long.' },
                { status: 400 }
            )
        }

        if (!globalRole || !VALID_ROLES.includes(globalRole)) {
            return NextResponse.json(
                { error: 'Invalid role format.' },
                { status: 400 }
            )
        }

        const sanitizedEmail = String(email).toLowerCase()

        const existingUser = await prisma.user.findUnique({
            where: { email: sanitizedEmail }
        })

        if (existingUser) {
            return NextResponse.json(
                { error: 'A user with this email already exists.'},
                { status: 409 }
            )
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const newUser = await prisma.user.create({
            data: {
                firstName: firstName.trim(),
                lastName: lastName ? lastName.trim() : null,
                email: sanitizedEmail,
                passwordHash: hashedPassword,
                globalRole,
                status: 'ACTIVE'
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                globalRole: true,
                status: true,
                createdAt: true
            }
        })

        return NextResponse.json(
            {
                message: 'User created successfully.',
                user: newUser
            },
            { status: 201 }
        )
    } catch (error: any) {
        console.error('Create user error:', error)
        return NextResponse.json(
            { error: 'Internal server error.' },
            { status: 500 }
        )
    }
}