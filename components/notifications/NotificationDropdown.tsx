// ============================================================================
// NotificationDropdown - Dropdown panel for notifications
// ============================================================================

'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCheck, Trash2, Settings, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { NotificationItem } from './NotificationItem';
import { Notification, NotificationType } from '@/types/notifications';
import { cn } from '@/lib/utils';

interface NotificationDropdownProps {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  isOpen: boolean;
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearRead: () => void;
}

export function NotificationDropdown({
  notifications,
  unreadCount,
  loading,
  isOpen,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearRead,
}: NotificationDropdownProps) {
  const [activeFilter, setActiveFilter] = useState<NotificationType | 'all'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Filter notifications
  const filteredNotifications = activeFilter === 'all' 
    ? notifications 
    : notifications.filter(n => n.type === activeFilter);

  // Group notifications by date
  const groupedNotifications = groupNotificationsByDate(filteredNotifications);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={cn(
            'absolute right-0 top-full mt-2 w-96 z-50',
            'bg-white dark:bg-slate-900 rounded-xl shadow-2xl',
            'border border-slate-200 dark:border-slate-800',
            'overflow-hidden'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-medium rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onMarkAllAsRead}
                  className="h-8 px-2 text-xs"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-4 h-4 mr-1" />
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
            <FilterTab
              label="All"
              count={notifications.length}
              isActive={activeFilter === 'all'}
              onClick={() => setActiveFilter('all')}
            />
            <FilterTab
              label="Unread"
              count={unreadCount}
              isActive={activeFilter === 'unread'}
              onClick={() => setActiveFilter('unread' as NotificationType)}
            />
            {(['task_reminder', 'achievement_unlocked', 'streak_at_risk'] as NotificationType[]).map(type => {
              const count = notifications.filter(n => n.type === type).length;
              if (count === 0) return null;
              return (
                <FilterTab
                  key={type}
                  label={getTypeLabel(type)}
                  count={count}
                  isActive={activeFilter === type}
                  onClick={() => setActiveFilter(type)}
                />
              );
            })}
          </div>

          {/* Notification List */}
          <ScrollArea className="h-96">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                <Bell className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  {activeFilter === 'all' 
                    ? "You're all caught up!" 
                    : `No ${getTypeLabel(activeFilter).toLowerCase()} notifications`}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {Object.entries(groupedNotifications).map(([date, items]) => (
                  <div key={date}>
                    <div className="px-4 py-2 bg-slate-50/50 dark:bg-slate-800/30">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {date}
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {items.map(notification => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onMarkAsRead={onMarkAsRead}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearRead}
                className="h-8 px-2 text-xs text-slate-500 hover:text-red-600"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Clear old
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                disabled
              >
                <Settings className="w-3.5 h-3.5 mr-1" />
                Settings
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Filter tab component
interface FilterTabProps {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

function FilterTab({ label, count, isActive, onClick }: FilterTabProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
        isActive
          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
      )}
    >
      {label}
      {count > 0 && (
        <span className={cn(
          'ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]',
          isActive
            ? 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200'
            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
        )}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}

// Helper: Get type label
function getTypeLabel(type: NotificationType | 'all' | 'unread'): string {
  const labels: Record<string, string> = {
    all: 'All',
    unread: 'Unread',
    task_reminder: 'Tasks',
    location_reminder: 'Location',
    achievement_unlocked: 'Achievements',
    level_up: 'Level Up',
    quest_completed: 'Quests',
    streak_at_risk: 'Streaks',
    daily_summary: 'Daily',
  };
  return labels[type] || type;
}

// Helper: Group notifications by date
function groupNotificationsByDate(notifications: Notification[]): Record<string, Notification[]> {
  const groups: Record<string, Notification[]> = {};
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  notifications.forEach(notification => {
    const date = new Date(notification.created_at).toDateString();
    let label: string;

    if (date === today) {
      label = 'Today';
    } else if (date === yesterday) {
      label = 'Yesterday';
    } else {
      label = new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }

    if (!groups[label]) {
      groups[label] = [];
    }
    groups[label].push(notification);
  });

  return groups;
}
