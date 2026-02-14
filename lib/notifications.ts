// ============================================================================
// Notification Service - Helper functions for creating notifications
// ============================================================================

import { createBrowserClient } from './supabase/client';
import { NotificationType, NotificationCreateData } from '@/types/notifications';

// Notification creation result
export interface CreateNotificationResult {
  success: boolean;
  notificationId?: string;
  error?: string;
}

// ============================================================================
// Create Notification (Client-side)
// ============================================================================
export async function createNotification(
  type: NotificationType,
  title: string,
  message?: string,
  data?: Record<string, unknown>
): Promise<CreateNotificationResult> {
  try {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, title, message, data }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create notification');
    }

    const result = await response.json();
    return { success: true, notificationId: result.notification?.id };
  } catch (error) {
    console.error('Error creating notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Pre-built Notification Helpers
// ============================================================================

// Task reminder notification
export async function notifyTaskReminder(
  taskTitle: string,
  dueTime?: string,
  taskId?: string
): Promise<CreateNotificationResult> {
  const timeText = dueTime ? ` due ${dueTime}` : '';
  return createNotification(
    'task_reminder',
    `Task reminder${timeText}`,
    `"${taskTitle}" is waiting for you`,
    { task_id: taskId, task_title: taskTitle }
  );
}

// Location reminder notification
export async function notifyLocationReminder(
  locationName: string,
  taskCount: number,
  locationId?: string
): Promise<CreateNotificationResult> {
  return createNotification(
    'location_reminder',
    `You're at ${locationName}`,
    taskCount > 0 
      ? `${taskCount} task${taskCount > 1 ? 's' : ''} waiting here!`
      : 'No tasks at this location',
    { location_id: locationId, location_name: locationName, task_count: taskCount }
  );
}

// Achievement unlocked notification
export async function notifyAchievementUnlocked(
  achievementName: string,
  description?: string,
  achievementId?: string
): Promise<CreateNotificationResult> {
  return createNotification(
    'achievement_unlocked',
    '🏆 Achievement Unlocked!',
    description || `You earned "${achievementName}"!`,
    { achievement_id: achievementId, achievement_name: achievementName }
  );
}

// Level up notification
export async function notifyLevelUp(
  level: number,
  levelTitle: string
): Promise<CreateNotificationResult> {
  return createNotification(
    'level_up',
    '🎉 Level Up!',
    `Congratulations! You've reached Level ${level} - ${levelTitle}!`,
    { level, level_title: levelTitle }
  );
}

// Quest completed notification
export async function notifyQuestCompleted(
  questName: string,
  xpReward: number
): Promise<CreateNotificationResult> {
  return createNotification(
    'quest_completed',
    '✅ Quest Complete!',
    `"${questName}" completed! +${xpReward} XP`,
    { quest_name: questName, xp_reward: xpReward }
  );
}

// Streak at risk notification
export async function notifyStreakAtRisk(
  streakType: string,
  hoursRemaining: number,
  tasksNeeded: number
): Promise<CreateNotificationResult> {
  return createNotification(
    'streak_at_risk',
    '🔥 Streak at Risk!',
    `Complete ${tasksNeeded} task${tasksNeeded > 1 ? 's' : ''} in the next ${hoursRemaining} hours to keep your ${streakType} streak!`,
    { streak_type: streakType, hours_remaining: hoursRemaining, tasks_needed: tasksNeeded }
  );
}

// Daily summary notification
export async function notifyDailySummary(
  tasksCompleted: number,
  xpEarned: number,
  streakDays: number
): Promise<CreateNotificationResult> {
  return createNotification(
    'daily_summary',
    '📊 Your Daily Summary',
    `Today: ${tasksCompleted} tasks completed, +${xpEarned} XP. Streak: ${streakDays} days!`,
    { tasks_completed: tasksCompleted, xp_earned: xpEarned, streak_days: streakDays }
  );
}

// ============================================================================
// Server-side Notification Creation (for use in API routes)
// ============================================================================
export async function createNotificationServer(
  supabase: any,
  data: NotificationCreateData
): Promise<CreateNotificationResult> {
  try {
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: data.user_id,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data || {},
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, notificationId: notification.id };
  } catch (error) {
    console.error('Error creating notification (server):', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Location Notification Triggers
// ============================================================================

// Check and notify when arriving at location with tasks
export async function checkLocationNotifications(
  userId: string,
  locationId: string,
  locationName: string
): Promise<void> {
  const supabase = createBrowserClient();

  try {
    // Count tasks at this location
    const { count, error } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('location_id', locationId)
      .eq('status', 'todo');

    if (error) throw error;

    // Only notify if there are tasks
    if (count && count > 0) {
      await notifyLocationReminder(locationName, count, locationId);
    }
  } catch (error) {
    console.error('Error checking location notifications:', error);
  }
}

// ============================================================================
// Gamification Notification Triggers
// ============================================================================

// Notify on XP gain with level up detection
export async function notifyXPGain(
  userId: string,
  xpGained: number,
  newTotalXP: number,
  oldLevel: number,
  newLevel: number,
  levelTitle: string
): Promise<void> {
  // If leveled up, show level up notification
  if (newLevel > oldLevel) {
    await notifyLevelUp(newLevel, levelTitle);
  }
}

// Check and notify streak status
export async function checkStreakNotifications(
  userId: string,
  streakType: string,
  currentStreak: number,
  hoursSinceLastTask: number
): Promise<void> {
  // Warn if approaching 24 hours without activity
  if (hoursSinceLastTask > 20 && hoursSinceLastTask < 24) {
    const hoursRemaining = Math.ceil(24 - hoursSinceLastTask);
    await notifyStreakAtRisk(streakType, hoursRemaining, 1);
  }
}

// ============================================================================
// Notification Preferences
// ============================================================================

export interface NotificationPreferences {
  task_reminders: boolean;
  location_reminders: boolean;
  achievements: boolean;
  level_ups: boolean;
  streak_warnings: boolean;
  daily_summary: boolean;
  quiet_hours_start: string; // 24h format "22:00"
  quiet_hours_end: string; // 24h format "08:00"
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  task_reminders: true,
  location_reminders: true,
  achievements: true,
  level_ups: true,
  streak_warnings: true,
  daily_summary: true,
  quiet_hours_start: '22:00',
  quiet_hours_end: '08:00',
};

// Check if currently in quiet hours
export function isQuietHours(preferences: NotificationPreferences): boolean {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  const { quiet_hours_start, quiet_hours_end } = preferences;
  
  if (quiet_hours_start < quiet_hours_end) {
    // Same day (e.g., 08:00 to 22:00)
    return currentTime >= quiet_hours_start && currentTime <= quiet_hours_end;
  } else {
    // Overnight (e.g., 22:00 to 08:00)
    return currentTime >= quiet_hours_start || currentTime <= quiet_hours_end;
  }
}
