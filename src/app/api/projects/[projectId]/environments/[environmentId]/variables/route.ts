import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ projectId: string, environmentId: string }> }
) {
    try {
        const { environmentId } = await params;
        const body = await request.json();
        const { key, value, isSecret } = body;

        if (!key || !value) {
            return NextResponse.json({ error: 'Key and Value are required.' }, { status: 400 });
        }

        const lowerValue = value.toLowerCase();
        if (lowerValue.includes('localhost') || lowerValue.includes('127.0.0.1')) {
            return NextResponse.json(
                { error: "Invalid parameter. 'localhost' or '127.0.0.1' points to the inside of the isolated Docker container. Please use your server's actual IP address (e.g., 192.168.x.x)." },
                { status: 400 }
            );
        }

        const newVar = await prisma.environmentVariable.create({
            data: {
                environmentId,
                key: key.trim().toUpperCase(),
                value: value.trim(),
                isSecret: Boolean(isSecret)
            }
        });

        return NextResponse.json({ message: 'Variable added successfully.', variable: newVar }, { status: 201 });
    } catch (error: any) {
        console.error('Env Var POST Error:', error.message);
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'This key already exists in this environment.' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ projectId: string, environmentId: string }> }
) {
    try {
        const { searchParams } = new URL(request.url);
        const varId = searchParams.get('varId');

        if (!varId) {
            return NextResponse.json({ error: 'Variable ID is required.' }, { status: 400 });
        }

        await prisma.environmentVariable.delete({
            where: { id: varId }
        });

        return NextResponse.json({ message: 'Variable deleted successfully.' }, { status: 200 });
    } catch (error: any) {
        console.error('Env Var DELETE Error:', error.message);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}