import { NextResponse } from "next/server"
import prisma from '@/lib/prisma'
import { createClearedAuthResponse, requireAuth } from '@/lib/auth'

export async function GET(request: Request) {
    try {
        const auth = await requireAuth(request)

        if (auth.response || !auth.session) {
            if (!auth.response) {
                return NextResponse.json(
                    { error: 'Invalid session.'},
                    { status: 401}
                )
            }

            return createClearedAuthResponse(auth.response)
        }

        const { userId } = auth.session

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
            { 
              user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.globalRole,
                status: user.status
              } 
            },
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
