import { jwtVerify, SignJWT } from 'jose'
import { GlobalRole } from '@prisma/client'

export interface JwtPayload {
    userId: string
    firstName: string
    email: string
    role: GlobalRole
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
    } catch (error) {
        return null
    }
}