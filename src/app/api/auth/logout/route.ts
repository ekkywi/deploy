import { NextResponse } from "next/server";
import { requireAuth } from '@/lib/auth';
import { logAudit } from '@/lib/audit-logger';

export async function POST(request: Request) {
    try {
        const auth = await requireAuth(request)

        if (auth.session) {
            logAudit({
                userId: auth.session.userId,
                action: 'USER_LOGOUT',
                targetType: 'USER',
                targetId: auth.session.userId,
                request: request
            })
        }

        const response = NextResponse.json(
            { message: 'Logged out successfully.' },
            { status: 200 }
        )

        response.cookies.set({
            name: 'auth_token',
            value: '',
            httpOnly: true,
            expires: new Date(0),
            path: '/',
        })

        return response
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to log out' },
            { status: 500 }
        )
    }
}