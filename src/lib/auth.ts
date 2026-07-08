import { NextResponse } from 'next/server'
import { AccountStatus, GlobalRole } from '@prisma/client'
import prisma from '@/lib/prisma'
import {
    getAuthTokenFromRequest,
    getSessionFromRequest,
    signToken,
    verifyToken,
    type JwtPayload,
} from '@/lib/auth-token'

export type AuthenticatedSession = JwtPayload

type AuthUserRecord = {
    id: string
    email: string
    firstName: string
    globalRole: GlobalRole
    status: AccountStatus
}

export { getAuthTokenFromRequest, getSessionFromRequest, signToken, verifyToken }

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
