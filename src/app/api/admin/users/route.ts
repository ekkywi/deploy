import { NextResponse } from "next/server"
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
    try {
        const userRole = request.headers.get('x-user-role')

        if (userRole !== 'SYSADMIN') {
            return NextResponse.json(
                { error: 'Forbidden. You do not have sufficient privileges.'},
                { status: 403 }
            )
        }

        const { searchParams } = new URL(request.url)
        const statusFilter = searchParams.get('status')
        const searchQuery = searchParams.get('search')

        const whereClause: any = {}

        if (statusFilter) {
            whereClause.status = statusFilter
        }

        if (searchQuery) {
            whereClause.OR = [
                { firstName: { contains: searchQuery, mode: 'insensitive'} },
                { lastName: { contains: searchQuery, mode: 'insensitive'} },
                { email: { contains: searchQuery, mode: 'insensitive'} },
            ]
        }

        const users = await prisma.user.findMany({
            where: whereClause,
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                globalRole: true,
                status: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return NextResponse.json(
            { users },
            { status: 200}
        )
    } catch (error) {
        console.error('Fetch user error:', error)
        return NextResponse.json(
            { error: 'Internal server error.' },
            { status: 500 }
        )
    }
}