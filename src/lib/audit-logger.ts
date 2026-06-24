import prisma from '@/lib/prisma';
import { headers } from 'next/headers';

type AuditLogParams = {
    userId?: string;
    action: string;
    targetType: string;
    targetId: string;
    request?: Request;
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

        prisma.auditLog.create({
            data: {
                userId: params.userId,
                action: params.action.toUpperCase(),
                targetType: params.targetType.toUpperCase(),
                targetId: params.targetId,
                ipAddress: ipAddress !== 'UNKNOWN' ? ipAddress : null,
            }
        }).catch(err => {
            console.error('[AUDIT LOG ERROR] Failed to write audit log to DB:', err);
        });

    } catch (error) {
        console.error('[AUDIT LOG FATAL] Unexpected error in audit logger:', error);
    }
}