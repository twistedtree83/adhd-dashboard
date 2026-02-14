// ============================================================================
// Notifications Module - Export all notification components and hooks
// ============================================================================

// Components
export { NotificationBell, NotificationBellCompact } from './NotificationBell';
export { NotificationDropdown } from './NotificationDropdown';
export { NotificationItem } from './NotificationItem';
export { NotificationTriggers } from './NotificationTriggers';

// Hooks
export { useNotifications, createNotification } from '@/hooks/useNotifications';
export { useLocationNotifications } from '@/hooks/useLocationNotifications';
export { usePushNotifications, registerServiceWorker } from '@/hooks/usePushNotifications';

// Utilities
export {
  createNotification as notify,
  notifyTaskReminder,
  notifyLocationReminder,
  notifyAchievementUnlocked,
  notifyLevelUp,
  notifyQuestCompleted,
  notifyStreakAtRisk,
  notifyDailySummary,
  checkLocationNotifications,
  notifyXPGain,
  checkStreakNotifications,
  isQuietHours,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from '@/lib/notifications';

// Types
export type {
  Notification,
  NotificationType,
  NotificationCreateData,
  NotificationFilter,
  NotificationStats,
} from '@/types/notifications';
export { NOTIFICATION_META } from '@/types/notifications';
