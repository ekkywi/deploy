import { NextResponse } from "next/server"
import prisma from '@/lib/prisma'
import * as bcrypt from 'bcrypt'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { firstName, lastName, email, password } = body

        if (!firstName || !email || !password) {
            return NextResponse.json(
                { error: 'Firsname, lastname, and email cannot be empty.'},
                { status: 400 }
            )
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: 'Passwords are not secure. Minimum 8 characters.'},
                {status: 400}
            )
        }

        const existingUser = await prisma.user.findUnique({
            where: { email },
        })

        if (existingUser) {
            return NextResponse.json(
                { error: 'The email is already registered in the system.'},
                { status: 409 }
            )
        }

        const passwordHash = await bcrypt.hash(password, 10)

        const newUser = await prisma.user.create({
            data: {
                firstName,
                lastName: lastName || null,
                email,
                passwordHash
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                globalRole: true,
                status: true,
                createdAt: true,
            }
        })

        return NextResponse.json(
            {
                message: 'Registration successful. Your account is in PENDING status and is awaiting Administrator approval.',
                user: newUser,
            },
            { status: 201 }
        )
    } catch (error) {
        console.error('Register error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500}
        )
    }
}