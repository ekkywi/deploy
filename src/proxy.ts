import { NextResponse, type NextRequest } from 'next/server'
import { getAuthTokenFromRequest, verifyToken } from '@/lib/auth'

const publicRoutes = [
    '/api/auth/login',
    '/login',
    '/api/auth/register',
    '/register',
]

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl
    const isPublicRoute = publicRoutes.includes(pathname)

    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon.ico')
    ) {
        return NextResponse.next()
    }

    const token = getAuthTokenFromRequest(request)
    const session = token ? await verifyToken(token) : null

    if (session && (pathname === '/login' || pathname === '/register')) {
        return NextResponse.redirect(new URL('/console', request.url))
    }

    if (isPublicRoute) {
        const response = NextResponse.next()

        if (token && !session) {
            response.cookies.delete('auth_token')
        }

        return response
    }

    if (!session) {
        return handleUnauthorized(request, Boolean(token))
    }

    return NextResponse.next()
}

function handleUnauthorized(request: NextRequest, clearCookie: boolean) {
    const { pathname } = request.nextUrl

    if (pathname.startsWith('/api/')) {
        const response = NextResponse.json(
            { error: 'Access denied. Invalid or missing token' },
            { status: 401 }
        )

        if (clearCookie) {
            response.cookies.delete('auth_token')
        }

        return response
    }

    const response = NextResponse.redirect(new URL('/login', request.url))

    if (clearCookie) {
        response.cookies.delete('auth_token')
    }

    return response
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
}
