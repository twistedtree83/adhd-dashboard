// ============================================================================
// Dashboard Header - Top navigation with location, XP, streak, and notifications
// ============================================================================

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Brain, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LocationBadge } from '@/components/location/LocationBadge';
import { XpBar } from '@/components/gamification/XpBar';
import { StreakCounter } from '@/components/gamification/StreakCounter';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useLocation } from '@/hooks/useLocation';
import { createBrowserClient } from '@/lib/supabase/client';
import { getGamificationStats } from '@/lib/gamification';
import { User } from '@/types';

export function DashboardHeader() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState({
    totalXP: 0,
    currentLevel: 1,
    levelTitle: 'Novice',
    xpToNext: 100,
    xpProgress: 0,
    dailyStreak: 0,
    longestStreak: 0,
  });
  const { currentLocation, isAtSchool, loading: locationLoading } = useLocation(user?.id);
  const supabase = createBrowserClient();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();
        setUser(data as User);
        
        // Fetch gamification stats
        const gamificationStats = await getGamificationStats(authUser.id);
        setStats(gamificationStats);
      }
    };
    fetchUser();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-800 dark:text-slate-100 hidden sm:block">ADHD Assistant</span>
          </Link>

          {/* Center - Location */}
          <div className="flex-1 flex justify-center">
            <LocationBadge 
              location={currentLocation} 
              isAtSchool={isAtSchool} 
              loading={locationLoading}
            />
          </div>

          {/* Right - Stats & Menu */}
          <div className="flex items-center space-x-4">
            {/* XP & Streak - Desktop only */}
            <div className="hidden md:flex items-center space-x-3">
              <XpBar
                currentXP={stats.totalXP}
                level={stats.currentLevel}
                levelTitle={stats.levelTitle}
                xpToNext={stats.xpToNext}
                progress={stats.xpProgress}
                compact
              />
              <StreakCounter
                streak={stats.dailyStreak}
                longestStreak={stats.longestStreak}
                compact
              />
            </div>

            {/* Notifications */}
            <NotificationBell userId={user?.id} />

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Logout */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
