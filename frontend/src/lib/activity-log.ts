import { db } from '@/lib/db';

/**
 * Log an activity for a user. Fire-and-forget (async, no await needed).
 */
export async function logActivity(params: {
  userId: number;
  action: string;
  entity: string;
  entityId?: number;
  details?: string;
}): Promise<void> {
  try {
    await db.activityLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        details: params.details,
      },
    });
  } catch {
    // Log failures should not break the main operation
    console.error('[ActivityLog] Failed to log activity for user', params.userId);
  }
}
