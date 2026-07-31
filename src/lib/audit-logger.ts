import prisma from '@/lib/prisma';
import { headers } from 'next/headers';
import type { Prisma } from '@prisma/client';

type AuditLogParams = {
    userId?: string | null;
    action: string;
    targetType: string;
    targetId: string;
    request?: Request;
    metadata?: Prisma.InputJsonValue;
};

export async function logAudit(params: AuditLogParams) {
    try {
        let ipAddress = 'UNKNOWN';

        if (params.request) {
            const reqHeaders = await headers();
            ipAddress = 
                reqHeaders.get('x-forwarded-for')?.split(',')[0] || 
                reqHeaders.get('x-real-ip') || 
                'UNKNOWN';
        }

        const isSystemActor = params.userId === 'SYSTEM';
        const finalUserId = isSystemActor ? null : (params.userId ?? null);
        const finalActorName = isSystemActor ? 'System/Webhook' : null;

        prisma.auditLog.create({
            data: {
                userId: finalUserId,
                actorName: finalActorName,
                action: params.action.toUpperCase(),
                targetType: params.targetType.toUpperCase(),
                targetId: params.targetId,
                ipAddress: ipAddress !== 'UNKNOWN' ? ipAddress : null,
                metadata: params.metadata ?? undefined,
            }
        }).catch(err => {
            console.error('[AUDIT LOG ERROR] Failed to write audit log to DB:', err);
        });

    } catch (error) {
        console.error('[AUDIT LOG FATAL] Unexpected error in audit logger:', error);
    }
}