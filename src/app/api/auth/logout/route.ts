import { NextResponse } from "next/server"

export async function POST() {
    try {
        const response = NextResponse.json(
            { message: 'Logged out successfully.' },
            { status: 200 }
        )

        response.cookies.set({
            name: 'auth_token',
            value: '',
            httpOnly: true,
            expires: new Date(0),
            path:'/',
        })

        return response
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to log out.'},
            { status: 500 }
        )
    }
}