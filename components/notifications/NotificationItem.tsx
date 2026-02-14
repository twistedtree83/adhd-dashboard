// ============================================================================
// NotificationItem - Single notification display
// ============================================================================

'use client';

import { motion } from 'framer-motion';
import { Check, MapPin, Trophy, Flame, Clock, Star, Target, BarChart3 } from 'lucide-react';
import { Notification, NOTIFICATION_META, NotificationType } from '@/types/notifications';
import { cn } from '@/lib/utils';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
}

const ICON_MAP: Record<NotificationType, React.ReactNode> = {
  task_reminder: <Clock className="w-5 h-5" />,
  location_reminder: <MapPin className="w-5 h-5" />,
  achievement_unlocked: <Trophy className="w-5 h-5" />,
  level_up: <Star className="w-5 h-5" />,
  quest_completed: <Target className="w-5 h-5" />,
  streak_at_risk: <Flame className="w-5 h-5" />,
  daily_summary: <BarChart3 className="w-5 h-5" />,
};

export function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const { id, notification_type, title, body, read_at, created_at } = notification;
  const meta = NOTIFICATION_META[notification_type];
  const is_read = !!read_at;
  
  const formattedTime = formatTimeAgo(created_at);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn(
        'relative flex items-start gap-3 p-3 rounded-lg transition-all cursor-pointer',
        'hover:bg-slate-50 dark:hover:bg-slate-800/50',
        !is_read && 'bg-blue-50/50 dark:bg-blue-900/10',
        'group'
      )}
      onClick={() => !is_read && onMarkAsRead(id)}
    >
      {/* Unread indicator */}
      {!is_read && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-blue-500 rounded-r-full" />
      )}

      {/* Icon */}
      <div
        className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
        style={{ backgroundColor: meta.bgColor, color: meta.color }}
      >
        {ICON_MAP[notification_type]}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            'text-sm font-medium text-slate-900 dark:text-slate-100',
            !is_read && 'font-semibold'
          )}>
            {title}
          </p>
          <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
            {formattedTime}
          </span>
        </div>
        
        {body && (
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">
            {body}
          </p>
        )}

        {/* Action hint for location reminders */}
        {notification_type === 'location_reminder' && (
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            View tasks at this location
          </p>
        )}

        {/* Streak warning */}
        {notification_type === 'streak_at_risk' && (
          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
            Complete a task to keep your streak!
          </p>
        )}
      </div>

      {/* Mark as read button */}
      {!is_read && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMarkAsRead(id);
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"
          title="Mark as read"
        >
          <Check className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        </button>
      )}
    </motion.div>
  );
}

// Format timestamp to relative time
function formatTimeAgo(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
