// ============================================================================
// Dashboard Home Page - Main view with location-based tasks
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Zap, Target, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TaskList } from '@/components/tasks/TaskList';
import { TaskForm } from '@/components/tasks/TaskForm';
import { QuickCapture } from '@/components/capture/QuickCapture';
import { XpBar } from '@/components/gamification/XpBar';
import { StreakCounter } from '@/components/gamification/StreakCounter';
import { LevelUpModal } from '@/components/gamification/LevelUpModal';
import { DailyQuestWidget } from '@/components/gamification/DailyQuestWidget';
import { LocationBadge } from '@/components/location/LocationBadge';
import { useTasks } from '@/hooks/useTasks';
import { useLocation } from '@/hooks/useLocation';
import { useLevelUp } from '@/hooks/useLevelUp';
import { createBrowserClient } from '@/lib/supabase/client';
import { getGamificationStats, awardXP, updateStreak } from '@/lib/gamification';
import { Task, User } from '@/types';

export default function DashboardPage() {
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
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [greeting, setGreeting] = useState('Hello');
  
  const supabase = createBrowserClient();
  const { tasks, loading, refetch, createTask, updateTask, completeTask, deleteTask } = useTasks();
  const { currentLocation, isAtSchool, tasksAtLocation, loading: locationLoading } = useLocation(user?.id);
  const { levelUp, triggerLevelUp, dismissLevelUp } = useLevelUp();

  // Fetch user on mount
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
        
        const gamificationStats = await getGamificationStats(authUser.id);
        setStats(gamificationStats);
      }
    };
    fetchUser();
  }, [supabase]);

  // Filter tasks by current location
  const locationTasks = tasks.filter(
    (t) => t.location_id === currentLocation?.id && t.status !== 'completed'
  );

  const handleCapture = async (taskData: { title: string; priority: string; location_id?: string }) => {
    if (!user) return;
    
    await createTask({
      title: taskData.title,
      priority: taskData.priority as Task['priority'],
      location_id: currentLocation?.id,
      source: 'manual',
    });
    
    // Award XP for capturing
    await awardXP(user.id, 'TASK_CAPTURE', {});
    await updateStreak(user.id, 'capture');
    
    refetch();
  };

  const handleComplete = async (id: string) => {
    const previousLevel = stats.currentLevel;
    
    await completeTask(id);
    refetch();
    
    // Refresh stats
    if (user) {
      const newStats = await getGamificationStats(user.id);
      setStats(newStats);
      
      // Check for level up
      if (newStats.currentLevel > previousLevel) {
        triggerLevelUp(newStats.currentLevel, newStats.levelTitle);
      }
    }
  };

  const handleDelete = async (id: string) => {
    await deleteTask(id);
    refetch();
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setIsTaskFormOpen(true);
  };

  const handleTaskFormSubmit = async (taskData: Partial<Task>) => {
    try {
      if (editingTask) {
        await updateTask(editingTask.id, taskData);
      } else {
        await createTask(taskData);
        if (user) {
          await awardXP(user.id, 'TASK_CAPTURE', {});
          await updateStreak(user.id, 'capture');
        }
      }
      setIsTaskFormOpen(false);
      setEditingTask(null);
      refetch();
    } catch (error) {
      console.error('Failed to save task:', error);
      // Keep modal open on error so user can retry
      // Error is already set in useTasks hook and can be displayed
    }
  };

  // Greeting based on time - set on client only to avoid hydration mismatch
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          {greeting}, {user?.display_name || 'there'}!
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          {isAtSchool && currentLocation
            ? `You're at ${currentLocation.name}. You have ${locationTasks.length} tasks here.`
            : 'Ready to be productive today?'}
        </p>
      </motion.div>

      {/* Stats Cards - Mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:hidden">
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

      {/* Location-based Tasks */}
      {isAtSchool && locationTasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-900/20 dark:border-blue-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg text-slate-800 dark:text-slate-100">
                <MapPin className="w-5 h-5 mr-2 text-blue-500" />
                Tasks at {currentLocation?.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TaskList
                tasks={locationTasks.slice(0, 5)}
                loading={loading}
                onComplete={handleComplete}
                onDelete={handleDelete}
                onEdit={handleEdit}
                showFilters={false}
              />
              {locationTasks.length > 5 && (
                <Button variant="link" className="mt-2" asChild>
                  <a href="/tasks">View all {locationTasks.length} tasks</a>
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="dark:bg-slate-800 dark:border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {tasks.filter((t) => t.status !== 'completed').length}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Pending Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="dark:bg-slate-800 dark:border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {tasks.filter((t) => t.status === 'completed').length}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-slate-800 dark:border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.totalXP}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total XP</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-slate-800 dark:border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="text-2xl">🔥</div>
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.dailyStreak}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Day Streak</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Quests */}
      <DailyQuestWidget maxQuests={3} showWeekly={true} />

      {/* All Tasks */}
      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-slate-800 dark:text-slate-100">Recent Tasks</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setIsTaskFormOpen(true)}>
            Add Task
          </Button>
        </CardHeader>
        <CardContent>
          <TaskList
            tasks={tasks.slice(0, 5)}
            loading={loading}
            onComplete={handleComplete}
            onDelete={handleDelete}
            onEdit={handleEdit}
            showFilters={false}
          />
          {tasks.length > 10 && (
            <Button variant="link" className="mt-4 w-full" asChild>
              <a href="/tasks">View all tasks</a>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Quick Capture FAB */}
      <QuickCapture onCapture={handleCapture} />

      {/* Task Form Modal */}
      <TaskForm
        isOpen={isTaskFormOpen}
        onClose={() => {
          setIsTaskFormOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleTaskFormSubmit}
        initialTask={editingTask || undefined}
        mode={editingTask ? 'edit' : 'create'}
      />

      {/* Level Up Modal */}
      <LevelUpModal
        isOpen={levelUp.show}
        onClose={dismissLevelUp}
        newLevel={levelUp.newLevel}
        levelTitle={levelUp.levelTitle}
      />
    </div>
  );
}
