// ============================================================================
// Profile Page - User settings and preferences
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import { User, Settings, Bell, LogOut, Award, Target, Zap, Moon, Sun, Monitor } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { XpBar } from '@/components/gamification/XpBar';
import { StreakCounter } from '@/components/gamification/StreakCounter';
import { AchievementsList } from '@/components/gamification/AchievementsList';
import { createBrowserClient } from '@/lib/supabase/client';
import { getGamificationStats } from '@/lib/gamification';
import { User as UserType } from '@/types';

export default function ProfilePage() {
  const [user, setUser] = useState<UserType | null>(null);
  const [stats, setStats] = useState({
    totalXP: 0,
    currentLevel: 1,
    levelTitle: 'Novice',
    xpToNext: 100,
    xpProgress: 0,
    dailyStreak: 0,
    longestStreak: 0,
  });
  const [notifications, setNotifications] = useState(true);
  const [locationAlerts, setLocationAlerts] = useState(true);
  
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const supabase = createBrowserClient();

  useEffect(() => {
    setMounted(true);
    const fetchUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();
        setUser(data as UserType);
        
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

  const isDark = resolvedTheme === 'dark';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Profile</h1>

      {/* User Info Card */}
      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                {user?.display_name || user?.email?.split('@')[0] || 'User'}
              </h2>
              <p className="text-slate-500 dark:text-slate-400">{user?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gamification Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <XpBar
          currentXP={stats.totalXP}
          level={stats.currentLevel}
          levelTitle={stats.levelTitle}
          xpToNext={stats.xpToNext}
          progress={stats.xpProgress}
        />
        <StreakCounter
          streak={stats.dailyStreak}
          longestStreak={stats.longestStreak}
        />
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="dark:bg-slate-800 dark:border-slate-700">
          <CardContent className="pt-6 text-center">
            <Target className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{user?.tasks_completed_count || 0}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Tasks Done</p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-800 dark:border-slate-700">
          <CardContent className="pt-6 text-center">
            <Zap className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.totalXP}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total XP</p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-800 dark:border-slate-700">
          <CardContent className="pt-6 text-center">
            <Award className="w-6 h-6 text-purple-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.currentLevel}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Level</p>
          </CardContent>
        </Card>
      </div>

      {/* Settings */}
      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center text-lg text-slate-800 dark:text-slate-100">
            <Settings className="w-5 h-5 mr-2" />
            Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme Selection */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {mounted && isDark ? (
                <Moon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              ) : (
                <Sun className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              )}
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-100">Theme</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {mounted ? (theme === 'system' ? 'System' : theme === 'dark' ? 'Dark' : 'Light') : 'Loading...'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('light')}
                className="px-3"
              >
                <Sun className="w-4 h-4 mr-1" />
                Light
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('dark')}
                className="px-3"
              >
                <Moon className="w-4 h-4 mr-1" />
                Dark
              </Button>
              <Button
                variant={theme === 'system' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('system')}
                className="px-3"
              >
                <Monitor className="w-4 h-4 mr-1" />
                Auto
              </Button>
            </div>
          </div>

          {/* Notifications Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-100">Push Notifications</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Task reminders and updates</p>
              </div>
            </div>
            <Switch
              checked={notifications}
              onCheckedChange={setNotifications}
            />
          </div>

          {/* Location Alerts Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-100">Location Alerts</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Show tasks when arriving at locations</p>
              </div>
            </div>
            <Switch
              checked={locationAlerts}
              onCheckedChange={setLocationAlerts}
            />
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      <AchievementsList />

      {/* Logout */}
      <Button
        variant="outline"
        className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
        onClick={handleLogout}
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sign Out
      </Button>

      {/* Version */}
      <p className="text-center text-sm text-slate-400 dark:text-slate-500">
        ADHD Assistant v1.0.0
      </p>
    </motion.div>
  );
}
