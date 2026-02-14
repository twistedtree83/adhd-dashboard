// ============================================================================
// useLocation Hook - Track user's current location
// ============================================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Location } from '@/types';

interface UseLocationReturn {
  currentLocation: Location | null;
  locationName: string;
  isAtSchool: boolean;
  tasksAtLocation: number;
  loading: boolean;
  error: string | null;
  refreshLocation: () => Promise<void>;
}

export function useLocation(userId?: string): UseLocationReturn {
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [tasksAtLocation, setTasksAtLocation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createBrowserClient();

  const fetchLocation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch current location from API
      const response = await fetch('/api/location/current');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch location');
      }

      setCurrentLocation(data.location);

      // If at a location, fetch task count
      if (data.location?.id && userId) {
        const { count } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('location_id', data.location.id)
          .eq('status', 'todo');

        setTasksAtLocation(count || 0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Location error');
    } finally {
      setLoading(false);
    }
  }, [supabase, userId]);

  // Initial fetch
  useEffect(() => {
    fetchLocation();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchLocation, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchLocation]);

  return {
    currentLocation,
    locationName: currentLocation?.name || 'Unknown Location',
    isAtSchool: !!currentLocation,
    tasksAtLocation,
    loading,
    error,
    refreshLocation: fetchLocation,
  };
}
