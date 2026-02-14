// ============================================================================
// NotificationProvider - Provides notification services to the app
// ============================================================================

'use client';

import { useEffect, useState } from 'react';
import { NotificationTriggers } from '@/components/notifications/NotificationTriggers';
import { createBrowserClient } from '@/lib/supabase/client';

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [userId, setUserId] = useState<string | undefined>();
  const supabase = createBrowserClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };

    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
      } else {
        setUserId(undefined);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <>
      {children}
      <NotificationTriggers userId={userId} />
    </>
  );
}
