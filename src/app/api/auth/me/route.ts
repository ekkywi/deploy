import { NextResponse } from "next/server"
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
    try {
        const userId = request.headers.get('x-user-id')

        if (!userId) {
            return NextResponse.json(
                { error: 'Invalid session.'},
                { status: 401}
            )
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                globalRole: true,
                status: true,
            },
        })

        if (!user) {
            return NextResponse.json(
                { error: 'User not found.'},
                { status: 404 }
            )
        }

        if (user.status !== 'ACTIVE') {
            const response = NextResponse.json(
                { error: 'Your account is inactive'},
                { status: 403}
            )

            response.cookies.delete('auth_token')
            return response
        }

        return NextResponse.json(
            { user },
            { status: 200 }
        )
    } catch (error) {
        console.error('Authentication error:', error)
        return NextResponse.json (
            { error: 'Internal server error.'},
            { status: 500 }
        )
    }
}