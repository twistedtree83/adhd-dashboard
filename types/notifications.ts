// ============================================================================
// Notification System Type Definitions
// ============================================================================

export type NotificationType = 
  | 'task_reminder'
  | 'location_reminder'
  | 'achievement_unlocked'
  | 'level_up'
  | 'quest_completed'
  | 'streak_at_risk'
  | 'daily_summary';

export interface Notification {
  id: string;
  user_id: string;
  notification_type: NotificationType;
  title: string;
  body?: string | null;
  action_url?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  channel?: string;
  status?: string;
  scheduled_for?: string | null;
  sent_at?: string | null;
  read_at?: string | null;
  priority?: string;
  created_at: string;
}

// Helper getter for is_read
export const isNotificationRead = (n: Notification): boolean => !!n.read_at;

export interface NotificationCreateData {
  user_id: string;
  type: NotificationType;
  title: string;
  message?: string;
  data?: Record<string, unknown>;
}

export interface NotificationFilter {
  is_read?: boolean;
  type?: NotificationType;
  limit?: number;
  offset?: number;
}

export interface NotificationStats {
  total: number;
  unread: number;
  by_type: Record<NotificationType, number>;
}

// Notification display metadata for UI rendering
export const NOTIFICATION_META: Record<NotificationType, { 
  icon: string; 
  color: string; 
  bgColor: string;
  sound?: string;
}> = {
  task_reminder: {
    icon: '⏰',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
  },
  location_reminder: {
    icon: '📍',
    color: '#3B82F6',
    bgColor: '#DBEAFE',
  },
  achievement_unlocked: {
    icon: '🏆',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    sound: 'achievement',
  },
  level_up: {
    icon: '🎉',
    color: '#8B5CF6',
    bgColor: '#EDE9FE',
    sound: 'levelup',
  },
  quest_completed: {
    icon: '✅',
    color: '#10B981',
    bgColor: '#D1FAE5',
  },
  streak_at_risk: {
    icon: '🔥',
    color: '#EF4444',
    bgColor: '#FEE2E2',
  },
  daily_summary: {
    icon: '📊',
    color: '#6B7280',
    bgColor: '#F3F4F6',
  },
};
