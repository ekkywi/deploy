import { NextResponse } from "next/server"
import prisma from '@/lib/prisma'
import * as bcrypt from 'bcrypt'
import { signToken } from '@/lib/auth'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { email, password } = body

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email or password cannot be empty.'},
                { status: 400 }
            )
        }

        const user = await prisma.user.findUnique({
            where: { email },
        })

        if (!user) {
            return NextResponse.json(
                { error: 'Invalid credentials.' },
                { status: 401}
            )
        }

        if (user.status !== 'ACTIVE') {
            return NextResponse.json(
                { error: 'Your account has not been approved or is currently suspended.'},
                { status: 403}
            )
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash)

        if (!isPasswordValid) {
            return NextResponse.json(
                { error: 'Invalid credentials.'},
                { status: 401}
            )
        }

        const token = await signToken({
            userId: user.id,
            email: user.email,
            firstName: user.firstName,
            role: user.globalRole,
        })

        const response = NextResponse.json(
            { 
              message: 'Login berhasil.', 
              role: user.globalRole,
              firstName: user.firstName,
              lastName: user.lastName 
            },
            { status: 200 }
          )

        response.cookies.set({
            name: 'auth_token',
            value: token,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 8,
        })

        return response
    } catch (error) {
        console.error('Login error:', error)
        return NextResponse.json(
            { error: 'Internal server error.'},
            { status: 500}
        )
    }
}