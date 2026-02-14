// ============================================================================
// useLocationNotifications Hook - Location-aware notification triggers
// ============================================================================

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { notifyLocationReminder } from '@/lib/notifications';
import { Location } from '@/types';

interface UseLocationNotificationsProps {
  userId?: string;
  currentLocation: Location | null;
  enabled?: boolean;
}

// Track which locations we've already notified about
const notifiedLocations = new Set<string>();

export function useLocationNotifications({
  userId,
  currentLocation,
  enabled = true,
}: UseLocationNotificationsProps) {
  const supabase = createBrowserClient();
  const lastLocationRef = useRef<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const checkAndNotify = useCallback(async () => {
    if (!userId || !currentLocation || !enabled) return;

    // Don't notify if we just notified about this location
    if (lastLocationRef.current === currentLocation.id) return;

    // Debounce to prevent multiple notifications
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      try {
        // Count tasks at this location
        const { count, error } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('location_id', currentLocation.id)
          .eq('status', 'todo');

        if (error) throw error;

        // Only notify if there are tasks
        if (count && count > 0) {
          await notifyLocationReminder(currentLocation.name, count, currentLocation.id);
          lastLocationRef.current = currentLocation.id;
        }
      } catch (error) {
        console.error('Error checking location notifications:', error);
      }
    }, 3000); // 3 second debounce
  }, [userId, currentLocation, enabled, supabase]);

  // Check for location changes and notify
  useEffect(() => {
    checkAndNotify();

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [checkAndNotify]);

  // Reset notification state when user changes
  useEffect(() => {
    if (!userId) {
      lastLocationRef.current = null;
      notifiedLocations.clear();
    }
  }, [userId]);

  // Clear notification history when leaving a location
  useEffect(() => {
    if (!currentLocation) {
      lastLocationRef.current = null;
    }
  }, [currentLocation]);
}

// Reset notification state (useful for testing)
export function resetLocationNotifications() {
  notifiedLocations.clear();
}
