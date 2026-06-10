import { NextResponse } from 'next/server'
import { jwtVerify, SignJWT } from 'jose'
import { GlobalRole } from '@prisma/client'

export interface JwtPayload {
    userId: string
    firstName: string
    email: string
    role: GlobalRole
}

export type AuthenticatedSession = JwtPayload

const getJwtSecretKey = () => {
    const secret = process.env.JWT_SECRET
    if (!secret || secret.length === 0) {
        throw new Error('FATAL: JWT SECRET not configured in environment variables')
    }
    return new TextEncoder().encode(secret)
}

export const signToken = async (payload: JwtPayload) => {
    return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(getJwtSecretKey())
}

export const verifyToken = async (token: string) => {
    try {
        const { payload } = await jwtVerify(token, getJwtSecretKey())
        return payload as unknown as JwtPayload
    } catch {
        return null
    }
}

const getCookieValue = (cookieHeader: string | null, cookieName: string) => {
    if (!cookieHeader) return null
    const cookies = cookieHeader.split(';')
    for (const cookie of cookies) {
        const [rawName, ...rawValue] = cookie.trim().split('=')
        if (rawName === cookieName) {
            return decodeURIComponent(rawValue.join('='))
        }
    }
    return null
}

export const getAuthTokenFromRequest = (request: Request) => {
    return getCookieValue(request.headers.get('cookie'), 'auth_token')
}

export const getSessionFromRequest = async (
    request: Request
): Promise<AuthenticatedSession | null> => {
    const token = getAuthTokenFromRequest(request)

    if (!token) {
        return null
    }

    return verifyToken(token)
}

export const createUnauthorizedResponse = (
    message = 'Access denied. Invalid or missing token'
) => {
    return NextResponse.json({ error: message }, { status: 401 })
}

export const createForbiddenResponse = (
    message = 'Forbidden. You do not have sufficient privileges.'
) => {
    return NextResponse.json({ error: message }, { status: 403 })
}

export const createClearedAuthResponse = (response: NextResponse) => {
    response.cookies.delete('auth_token')
    return response
}

export const requireAuth = async (request: Request) => {
    const session = await getSessionFromRequest(request)

    if (!session) {
        return {
            session: null,
            response: createUnauthorizedResponse(),
        }
    }

    return {
        session,
        response: null,
    }
}

export const requireRole = async (
    request: Request,
    role: GlobalRole,
    forbiddenMessage = 'Forbidden. You do not have sufficient privileges.'
) => {
    const auth = await requireAuth(request)

    if (auth.response || !auth.session) {
        return auth
    }

    if (auth.session.role !== role) {
        return {
            session: null,
            response: createForbiddenResponse(forbiddenMessage),
        }
    }

    return auth
}