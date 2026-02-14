// ============================================================================
// useNotifications Hook - Real-time notification management
// ============================================================================

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Notification, NotificationType } from '@/types/notifications';
import { toast } from 'sonner';

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearReadNotifications: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  isSubscribed: boolean;
}

export function useNotifications(userId?: string): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const supabase = createBrowserClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/notifications?limit=50');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch notifications');
      }

      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark single notification as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }

      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === id ? { ...n, read_at: new Date().toISOString() } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
      toast.error('Failed to mark notification as read');
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/clear', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to clear notifications');
      }

      // Update local state
      setNotifications(prev =>
        prev.map(n => ({
          ...n,
          is_read: true,
          read_at: n.read_at || new Date().toISOString(),
        }))
      );
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (err) {
      console.error('Error clearing notifications:', err);
      toast.error('Failed to clear notifications');
    }
  }, []);

  // Clear read notifications older than 7 days
  const clearReadNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/clear', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete notifications');
      }

      const data = await response.json();
      
      // Refresh notifications list
      await fetchNotifications();
      toast.success(`${data.deleted_count} old notifications cleared`);
    } catch (err) {
      console.error('Error deleting notifications:', err);
      toast.error('Failed to delete notifications');
    }
  }, [fetchNotifications]);

  // Setup real-time subscription
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchNotifications();

    // Setup real-time subscription
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          
          // Add to notifications list
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);

          // Show toast for new notification
          showNotificationToast(newNotification);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as Notification;
          setNotifications(prev =>
            prev.map(n => (n.id === updated.id ? updated : n))
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const deleted = payload.old as Notification;
          setNotifications(prev => prev.filter(n => n.id !== deleted.id));
        }
      )
      .subscribe((status) => {
        setIsSubscribed(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [userId, supabase, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    clearReadNotifications,
    refreshNotifications: fetchNotifications,
    isSubscribed,
  };
}

// Show notification toast based on type
function showNotificationToast(notification: Notification) {
  const { type, title, message } = notification;

  switch (type) {
    case 'achievement_unlocked':
      toast.success(title, {
        description: message,
        icon: '🏆',
        duration: 5000,
      });
      break;
    case 'level_up':
      toast.success(title, {
        description: message,
        icon: '🎉',
        duration: 5000,
      });
      break;
    case 'streak_at_risk':
      toast.warning(title, {
        description: message,
        icon: '🔥',
        duration: 10000,
      });
      break;
    case 'location_reminder':
      toast.info(title, {
        description: message,
        icon: '📍',
        duration: 8000,
      });
      break;
    case 'task_reminder':
      toast.info(title, {
        description: message,
        icon: '⏰',
        duration: 6000,
      });
      break;
    case 'quest_completed':
      toast.success(title, {
        description: message,
        icon: '✅',
        duration: 5000,
      });
      break;
    case 'daily_summary':
      toast.info(title, {
        description: message,
        icon: '📊',
        duration: 10000,
      });
      break;
    default:
      toast.info(title, {
        description: message,
      });
  }
}

// Helper function to create notification (for use in other components)
export async function createNotification(
  type: NotificationType,
  title: string,
  message?: string,
  data?: Record<string, unknown>
): Promise<boolean> {
  try {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, title, message, data }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error creating notification:', error);
    return false;
  }
}
