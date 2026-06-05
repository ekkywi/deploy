import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyToken } from "./lib/auth"

// Allowed without token
const publicRoutes = [
    '/api/auth/login', '/login',
    '/api/auth/register', '/register'
]

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon.ico') ||
        publicRoutes.includes(pathname)
    ) {
        return NextResponse.next()
    }

    const token = request.cookies.get('auth_token')?.value

    if (!token) {
        return handleUnauthorized(request)
    }

    const payload = await verifyToken(token)

    if (!payload) {
        const response = handleUnauthorized(request)
        response.cookies.delete('auth_token')
        return response
    }

    const response = NextResponse.next()
    response.headers.set('x-user-id', payload.userId)
    response.headers.set('x-user-role', payload.role)

    return response
}

function handleUnauthorized(request: NextRequest) {
    const { pathname } = request.nextUrl

    if (pathname.startsWith('/api/')) {
        return NextResponse.json(
            { error: 'Access denied. Invalid or missing token'},
            { status: 401 }
        )
    }

    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ]
}