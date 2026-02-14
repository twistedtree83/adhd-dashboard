// ============================================================================
// usePushNotifications Hook - PWA Push Notification support
// ============================================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  subscription: PushSubscription | null;
}

interface UsePushNotificationsReturn extends PushNotificationState {
  requestPermission: () => Promise<void>;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  showLocalNotification: (title: string, options?: NotificationOptions) => void;
}

// VAPID public key (should be from environment)
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

export function usePushNotifications(): UsePushNotificationsReturn {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: 'default',
    isSubscribed: false,
    subscription: null,
  });

  // Check support and current state
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkSupport = () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window;
      const permission = Notification.permission;

      setState(prev => ({
        ...prev,
        isSupported: supported,
        permission,
      }));

      if (supported) {
        checkSubscription();
      }
    };

    checkSupport();
  }, []);

  // Check existing subscription
  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      setState(prev => ({
        ...prev,
        isSubscribed: !!subscription,
        subscription: subscription,
      }));
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  // Request permission
  const requestPermission = useCallback(async () => {
    if (!state.isSupported) {
      toast.error('Push notifications not supported');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));

      if (permission === 'granted') {
        toast.success('Notifications enabled!');
        await subscribe();
      } else if (permission === 'denied') {
        toast.error('Notification permission denied');
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Failed to enable notifications');
    }
  }, [state.isSupported]);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!state.isSupported || !VAPID_PUBLIC_KEY) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Convert VAPID key
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      // Send subscription to server
      await saveSubscription(subscription);

      setState(prev => ({
        ...prev,
        isSubscribed: true,
        subscription,
      }));

      toast.success('Push notifications subscribed!');
    } catch (error) {
      console.error('Error subscribing:', error);
      toast.error('Failed to subscribe to push notifications');
    }
  }, [state.isSupported]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        await deleteSubscription(subscription);
      }

      setState(prev => ({
        ...prev,
        isSubscribed: false,
        subscription: null,
      }));

      toast.success('Push notifications unsubscribed');
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast.error('Failed to unsubscribe');
    }
  }, []);

  // Show local notification (when app is in foreground)
  const showLocalNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!state.isSupported || state.permission !== 'granted') return;

    // Check if app is in foreground
    if (document.visibilityState === 'visible') {
      // Use toast instead for foreground notifications
      toast.info(title, { description: options?.body });
      return;
    }

    // Show native notification when app is in background
    navigator.serviceWorker.ready.then(registration => {
      registration.showNotification(title, {
        ...options,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
      });
    });
  }, [state.isSupported, state.permission]);

  return {
    ...state,
    requestPermission,
    subscribe,
    unsubscribe,
    showLocalNotification,
  };
}

// Helper: Convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

// Helper: Save subscription to server
async function saveSubscription(subscription: PushSubscription): Promise<void> {
  const response = await fetch('/api/notifications/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  });

  if (!response.ok) {
    throw new Error('Failed to save subscription');
  }
}

// Helper: Delete subscription from server
async function deleteSubscription(subscription: PushSubscription): Promise<void> {
  const response = await fetch('/api/notifications/subscribe', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });

  if (!response.ok) {
    throw new Error('Failed to delete subscription');
  }
}

// Register service worker
export async function registerServiceWorker(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered:', registration);
    } catch (error) {
      console.error('SW registration failed:', error);
    }
  }
}
