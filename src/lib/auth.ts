import { NextResponse } from 'next/server'
import { jwtVerify, SignJWT } from 'jose'
import { AccountStatus, GlobalRole } from '@prisma/client'
import prisma from '@/lib/prisma'

export interface JwtPayload {
    userId: string
    firstName: string
    email: string
    role: GlobalRole
}

export type AuthenticatedSession = JwtPayload

type AuthUserRecord = {
    id: string
    email: string
    firstName: string
    globalRole: GlobalRole
    status: AccountStatus
}

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
    message = 'Access denied. Invalid or missing token',
    clearCookie = false
) => {
    const response = NextResponse.json({ error: message }, { status: 401 })
    if (clearCookie) {
        response.cookies.delete('auth_token')
    }
    return response
}

export const createForbiddenResponse = (
    message = 'Forbidden. You do not have sufficient privileges.',
    clearCookie = false
) => {
    const response = NextResponse.json({ error: message }, { status: 403 })
    if (clearCookie) {
        response.cookies.delete('auth_token')
    }
    return response
}

export const createClearedAuthResponse = (response: NextResponse) => {
    response.cookies.delete('auth_token')
    return response
}

export const requireAuth = async (request: Request) => {
    const token = getAuthTokenFromRequest(request)
    const session = await getSessionFromRequest(request)

    if (!session) {
        return {
            session: null,
            response: createUnauthorizedResponse(
                'Access denied. Invalid or missing token',
                Boolean(token)
            ),
        }
    }

    const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: {
            id: true,
            email: true,
            firstName: true,
            globalRole: true,
            status: true,
        },
    })

    if (!user) {
        return {
            session: null,
            response: createUnauthorizedResponse(
                'Access denied. Account no longer exists.',
                true
            ),
        }
    }

    if (user.status !== AccountStatus.ACTIVE) {
        return {
            session: null,
            response: createForbiddenResponse(
                'Your account is inactive.',
                true
            ),
        }
    }

    return {
        session: mapUserToSession(user),
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

const mapUserToSession = (user: AuthUserRecord): AuthenticatedSession => {
    return {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        role: user.globalRole,
    }
}
