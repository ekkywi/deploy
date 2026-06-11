import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(request: Request) {
    try {
        const auth = await requireAuth(request);

        if (auth.response || !auth.session) return auth.response;

        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');

        if (!query || query.trim().length < 3) {
            return NextResponse.json(
                { users: [] },
                { status: 200 }
            );
        }

        const sanitizedQuery = query.trim();

        const users = await prisma.user.findMany({
            where: {
                status: 'ACTIVE',
                OR: [
                    { email: { contains: sanitizedQuery, mode: 'insensitive' } },
                    { firstName: { contains: sanitizedQuery, mode: 'insensitive' } },
                    { lastName: { contains: sanitizedQuery, mode: 'insensitive' } }
                ]
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true
            },
            take: 5,
        });

        return NextResponse.json(
            { users },
            { status: 200}
        );

    } catch (error) {
        console.error('Search users error:', error);
        return NextResponse.json(
            { error: 'Internal server error.' },
            { status: 500 }
        );
    }
}