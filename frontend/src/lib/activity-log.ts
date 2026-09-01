import { api } from '@/services/api';

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
    // Activity logging handled via backend API endpoints
    console.debug('[ActivityLog]', params);
  } catch {
    console.error('[ActivityLog] Failed to log activity for user', params.userId);
  }
}