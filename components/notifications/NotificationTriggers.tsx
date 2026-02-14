// ============================================================================
// NotificationTriggers - Component that listens for events and triggers notifications
// ============================================================================

'use client';

import { useEffect, useRef } from 'react';
import { useLocation } from '@/hooks/useLocation';
import { useNotifications } from '@/hooks/useNotifications';
import { useLocationNotifications } from '@/hooks/useLocationNotifications';
import { usePushNotifications, registerServiceWorker } from '@/hooks/usePushNotifications';
import { createBrowserClient } from '@/lib/supabase/client';

interface NotificationTriggersProps {
  userId?: string;
}

export function NotificationTriggers({ userId }: NotificationTriggersProps) {
  const { currentLocation } = useLocation(userId);
  const { notifications } = useNotifications(userId);
  const supabase = createBrowserClient();
  const lastNotificationCount = useRef(0);

  // Register service worker on mount
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // Location-based notifications
  useLocationNotifications({
    userId,
    currentLocation,
    enabled: true,
  });

  // Listen for gamification events
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('gamification-events')
      .on(
        'broadcast',
        { event: 'level_up' },
        (payload) => {
          // Level up event handled by notification system
          console.log('Level up event:', payload);
        }
      )
      .on(
        'broadcast',
        { event: 'achievement_unlocked' },
        (payload) => {
          console.log('Achievement unlocked:', payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  // Track new notifications
  useEffect(() => {
    if (notifications.length > lastNotificationCount.current) {
      // New notifications arrived
      const newNotifications = notifications.slice(0, notifications.length - lastNotificationCount.current);
      
      // Play sound for important notifications
      newNotifications.forEach(notification => {
        if (['achievement_unlocked', 'level_up', 'streak_at_risk'].includes(notification.type)) {
          playNotificationSound(notification.type);
        }
      });
    }
    
    lastNotificationCount.current = notifications.length;
  }, [notifications]);

  return null; // This is an invisible component
}

// Play notification sound (ADHD-friendly - short and pleasant)
function playNotificationSound(type: string) {
  // Only play sounds if user hasn't disabled them
  const soundEnabled = localStorage.getItem('notification_sounds') !== 'false';
  if (!soundEnabled) return;

  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  const sounds: Record<string, { frequency: number; duration: number; type: OscillatorType }> = {
    achievement_unlocked: { frequency: 880, duration: 0.3, type: 'sine' }, // High pleasant note
    level_up: { frequency: 523.25, duration: 0.5, type: 'triangle' }, // C5 - celebratory
    streak_at_risk: { frequency: 440, duration: 0.2, type: 'sine' }, // A4 - attention
  };

  const sound = sounds[type];
  if (!sound) return;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = sound.frequency;
  oscillator.type = sound.type;

  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + sound.duration);
}
