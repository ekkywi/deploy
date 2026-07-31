import { NextResponse } from 'next/server'
import * as bcrypt from 'bcrypt'
import prisma from '@/lib/prisma'
import { createClearedAuthResponse, requireAuth, signToken } from '@/lib/auth'
import { logAudit } from '@/lib/audit-logger'
import { profileUpdateSchema } from '@/lib/validations/auth'

function toPublicUser(user: {
  id: string
  email: string
  firstName: string
  lastName: string | null
  globalRole: 'SYSADMIN' | 'MANAGER' | 'DEVELOPER'
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED'
}) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.globalRole,
    status: user.status,
  }
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request)

    if (auth.response || !auth.session) {
      if (!auth.response) {
        return NextResponse.json({ error: 'Invalid session.' }, { status: 401 })
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
      return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    if (user.status !== 'ACTIVE') {
      const response = NextResponse.json(
        { error: 'Your account is inactive' },
        { status: 403 }
      )

      response.cookies.delete('auth_token')
      return response
    }

    return NextResponse.json({ user: toPublicUser(user) }, { status: 200 })
  } catch (error) {
    console.error('Authentication error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAuth(request)

    if (auth.response || !auth.session) {
      return auth.response
    }

    const body = await request.json()
    const parsed = profileUpdateSchema.safeParse(body)

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]
      return NextResponse.json(
        { error: firstIssue?.message || 'Invalid profile payload.' },
        { status: 400 }
      )
    }

    const { firstName, lastName, email, currentPassword, newPassword } = parsed.data

    const userId = auth.session.userId
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        passwordHash: true,
        globalRole: true,
        status: true,
      },
    })

    if (!existing || existing.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    const nextFirstName = firstName.trim()
    const nextLastName = lastName?.trim() ? lastName.trim() : null
    const nextEmail = email.trim().toLowerCase()

    if (nextEmail !== existing.email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email: nextEmail },
        select: { id: true },
      })

      if (emailTaken) {
        return NextResponse.json(
          { error: 'That email is already in use.' },
          { status: 409 }
        )
      }
    }

    const data: {
      firstName: string
      lastName: string | null
      email: string
      passwordHash?: string
    } = {
      firstName: nextFirstName,
      lastName: nextLastName,
      email: nextEmail,
    }

    let passwordChanged = false
    if (currentPassword || newPassword) {
      const isCurrentValid = await bcrypt.compare(
        currentPassword || '',
        existing.passwordHash
      )

      if (!isCurrentValid) {
        return NextResponse.json(
          { error: 'Current password is incorrect.' },
          { status: 400 }
        )
      }

      data.passwordHash = await bcrypt.hash(newPassword || '', 10)
      passwordChanged = true
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        globalRole: true,
        status: true,
      },
    })

    if (
      existing.firstName !== updated.firstName ||
      existing.lastName !== updated.lastName ||
      existing.email !== updated.email
    ) {
      logAudit({
        userId,
        action: 'UPDATE_OWN_PROFILE',
        targetType: 'USER',
        targetId: userId,
        request,
      })
    }

    if (passwordChanged) {
      logAudit({
        userId,
        action: 'CHANGE_OWN_PASSWORD',
        targetType: 'USER',
        targetId: userId,
        request,
      })
    }

    const token = await signToken({
      userId: updated.id,
      email: updated.email,
      firstName: updated.firstName,
      role: updated.globalRole,
    })

    const response = NextResponse.json(
      {
        message: passwordChanged
          ? 'Profile and password updated successfully.'
          : 'Profile updated successfully.',
        user: toPublicUser(updated),
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
    console.error('Update own profile error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
