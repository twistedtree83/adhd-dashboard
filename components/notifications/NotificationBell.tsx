// ============================================================================
// NotificationBell - Bell icon with badge and dropdown
// ============================================================================

'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationDropdown } from './NotificationDropdown';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

interface NotificationBellProps {
  userId?: string;
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    clearReadNotifications,
    refreshNotifications,
  } = useNotifications(userId);

  // Track new notifications for animation
  useEffect(() => {
    if (unreadCount > 0) {
      setHasNewNotification(true);
      const timer = setTimeout(() => setHasNewNotification(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [unreadCount, notifications.length]);

  const handleToggle = useCallback(() => {
    if (!isOpen) {
      refreshNotifications();
    }
    setIsOpen(prev => !prev);
  }, [isOpen, refreshNotifications]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <div className="relative">
      {/* Bell Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggle}
        className={cn(
          'relative h-10 w-10 rounded-full transition-all',
          'hover:bg-slate-100 dark:hover:bg-slate-800',
          isOpen && 'bg-slate-100 dark:bg-slate-800',
          hasNewNotification && 'animate-pulse'
        )}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        <AnimatePresence mode="wait">
          {hasNewNotification && unreadCount > 0 ? (
            <motion.div
              key="ringing"
              initial={{ rotate: 0 }}
              animate={{ rotate: [0, -15, 15, -10, 10, -5, 5, 0] }}
              transition={{ duration: 0.5 }}
            >
              <BellRing className="w-5 h-5 text-blue-500" />
            </motion.div>
          ) : (
            <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          )}
        </AnimatePresence>

        {/* Unread Badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className={cn(
                'absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5',
                'flex items-center justify-center',
                'bg-red-500 text-white text-xs font-bold rounded-full',
                'border-2 border-white dark:border-slate-900',
                unreadCount > 9 && 'px-2'
              )}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Online indicator when real-time is connected */}
        <div className="absolute bottom-1 right-1 w-2 h-2 bg-green-500 rounded-full border-2 border-white dark:border-slate-900" />
      </Button>

      {/* Dropdown */}
      <NotificationDropdown
        notifications={notifications}
        unreadCount={unreadCount}
        loading={loading}
        isOpen={isOpen}
        onClose={handleClose}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onClearRead={clearReadNotifications}
      />
    </div>
  );
}

// Compact version for mobile
export function NotificationBellCompact({ userId }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { unreadCount, loading, markAsRead, markAllAsRead, clearReadNotifications, refreshNotifications } = useNotifications(userId);

  const handleToggle = useCallback(() => {
    if (!isOpen) {
      refreshNotifications();
    }
    setIsOpen(prev => !prev);
  }, [isOpen, refreshNotifications]);

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        className={cn(
          'relative flex items-center justify-center w-12 h-12 rounded-xl',
          'bg-slate-100 dark:bg-slate-800',
          'active:scale-95 transition-transform'
        )}
      >
        <Bell className="w-6 h-6 text-slate-700 dark:text-slate-300" />
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>

      {/* Full screen overlay for mobile */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 top-20 z-50 lg:hidden"
            >
              <div className="bg-white dark:bg-slate-900 rounded-t-2xl h-full overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="font-semibold text-lg">Notifications</h3>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {/* Mobile notification list would go here */}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
