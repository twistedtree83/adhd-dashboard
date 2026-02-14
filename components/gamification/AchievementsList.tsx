// ============================================================================
// Achievements List - Display user achievements with proper progress
// ============================================================================

'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Award, Trophy, Star, Zap, Target, CheckCircle2, Flame, MapPin, Mail, Mic, Clock, TrendingUp, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  iconType: 'emoji' | 'lucide';
  criteria: { type: string; threshold: number };
  earned: boolean;
  earnedAt?: string;
  progress: number;
  progressValue: number; // Current value toward threshold
  rarity: 'common' | 'uncommon' | 'rare' | 'epic';
}

const ACHIEVEMENTS_DEF: Omit<Achievement, 'earned' | 'earnedAt' | 'progress' | 'progressValue'>[] = [
  // Effort Badges (Common)
  {
    id: 'first_capture',
    name: 'First Capture',
    description: 'Capture your first task',
    icon: 'Target',
    iconType: 'lucide',
    criteria: { type: 'task_capture', threshold: 1 },
    rarity: 'common',
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Complete 10 tasks before noon',
    icon: 'Clock',
    iconType: 'lucide',
    criteria: { type: 'early_completion', threshold: 10 },
    rarity: 'common',
  },
  {
    id: 'planner',
    name: 'Planner',
    description: 'Plan 3 days in a row',
    icon: 'Calendar',
    iconType: 'lucide',
    criteria: { type: 'daily_planning', threshold: 3 },
    rarity: 'common',
  },
  // Skill Badges (Uncommon/Rare)
  {
    id: 'task_master',
    name: 'Task Master',
    description: 'Complete 50 tasks',
    icon: 'CheckCircle2',
    iconType: 'lucide',
    criteria: { type: 'task_complete', threshold: 50 },
    rarity: 'uncommon',
  },
  {
    id: 'task_warrior',
    name: 'Task Warrior',
    description: 'Complete 100 tasks',
    icon: 'Trophy',
    iconType: 'lucide',
    criteria: { type: 'task_complete', threshold: 100 },
    rarity: 'rare',
  },
  {
    id: 'email_ninja',
    name: 'Email Ninja',
    description: 'Process 20 emails into tasks',
    icon: 'Mail',
    iconType: 'lucide',
    criteria: { type: 'email_process', threshold: 20 },
    rarity: 'uncommon',
  },
  {
    id: 'location_explorer',
    name: 'Location Explorer',
    description: 'Visit all 5 school locations',
    icon: 'MapPin',
    iconType: 'lucide',
    criteria: { type: 'location_visit', threshold: 5 },
    rarity: 'uncommon',
  },
  {
    id: 'meeting_hero',
    name: 'Meeting Hero',
    description: 'Extract actions from 10 meetings',
    icon: 'Mic',
    iconType: 'lucide',
    criteria: { type: 'meeting_actions', threshold: 10 },
    rarity: 'uncommon',
  },
  {
    id: 'meeting_master',
    name: 'Meeting Master',
    description: 'Extract actions from 50 meetings',
    icon: 'Mic',
    iconType: 'lucide',
    criteria: { type: 'meeting_actions', threshold: 50 },
    rarity: 'rare',
  },
  {
    id: 'time_estimator',
    name: 'Time Estimator',
    description: 'Complete 10 tasks within estimated time',
    icon: 'Clock',
    iconType: 'lucide',
    criteria: { type: 'on_time_completion', threshold: 10 },
    rarity: 'uncommon',
  },
  {
    id: 'focus_master',
    name: 'Focus Master',
    description: 'Complete 50 hours in focus mode',
    icon: 'Zap',
    iconType: 'lucide',
    criteria: { type: 'focus_time', threshold: 50 },
    rarity: 'rare',
  },
  // Milestone Badges (Epic/Rare)
  {
    id: 'streak_starter',
    name: 'Streak Starter',
    description: 'Maintain a 3-day streak',
    icon: 'Flame',
    iconType: 'lucide',
    criteria: { type: 'streak_maintain', threshold: 3 },
    rarity: 'common',
  },
  {
    id: 'streak_champion',
    name: 'Streak Champion',
    description: 'Maintain a 14-day streak',
    icon: 'Star',
    iconType: 'lucide',
    criteria: { type: 'streak_maintain', threshold: 14 },
    rarity: 'rare',
  },
  {
    id: 'streak_legend',
    name: 'Streak Legend',
    description: 'Maintain a 30-day streak',
    icon: 'Flame',
    iconType: 'lucide',
    criteria: { type: 'streak_maintain', threshold: 30 },
    rarity: 'epic',
  },
  {
    id: 'xp_collector',
    name: 'XP Collector',
    description: 'Earn 1000 XP',
    icon: 'Zap',
    iconType: 'lucide',
    criteria: { type: 'xp_earn', threshold: 1000 },
    rarity: 'uncommon',
  },
  {
    id: 'xp_millionaire',
    name: 'XP Millionaire',
    description: 'Earn 5000 XP',
    icon: 'TrendingUp',
    iconType: 'lucide',
    criteria: { type: 'xp_earn', threshold: 5000 },
    rarity: 'epic',
  },
  {
    id: 'level_5',
    name: 'Rising Star',
    description: 'Reach level 5',
    icon: 'Award',
    iconType: 'lucide',
    criteria: { type: 'level_reach', threshold: 5 },
    rarity: 'uncommon',
  },
  {
    id: 'level_10',
    name: 'Champion',
    description: 'Reach level 10',
    icon: 'Trophy',
    iconType: 'lucide',
    criteria: { type: 'level_reach', threshold: 10 },
    rarity: 'epic',
  },
];

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Target,
  CheckCircle2,
  Trophy,
  Mail,
  MapPin,
  Flame,
  Star,
  Mic,
  Zap,
  Award,
  Clock,
  TrendingUp,
  Calendar,
};

const rarityColors = {
  common: {
    bg: 'bg-slate-100 dark:bg-slate-700',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-200 dark:border-slate-600',
    earned: 'bg-gradient-to-br from-slate-50 to-gray-50 border-slate-300 dark:from-slate-800 dark:to-slate-700 dark:border-slate-600',
  },
  uncommon: {
    bg: 'bg-blue-100 dark:bg-blue-900/50',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-700',
    earned: 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300 dark:from-blue-900/30 dark:to-indigo-900/30 dark:border-blue-600',
  },
  rare: {
    bg: 'bg-purple-100 dark:bg-purple-900/50',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-700',
    earned: 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-300 dark:from-purple-900/30 dark:to-pink-900/30 dark:border-purple-600',
  },
  epic: {
    bg: 'bg-amber-100 dark:bg-amber-900/50',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-700',
    earned: 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300 dark:from-amber-900/30 dark:to-orange-900/30 dark:border-amber-600',
  },
};

export function AchievementsList() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserClient();

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get user's stats
        const { data: userData } = await supabase
          .from('users')
          .select('tasks_completed_count, tasks_created_count, total_xp, current_level, emails_processed, meetings_processed, focus_hours_total')
          .eq('id', user.id)
          .single();

        // Get user's earned achievements
        const { data: earnedAchievements } = await supabase
          .from('user_achievements')
          .select('*')
          .eq('user_id', user.id);

        // Get streak data
        const { data: streakData } = await supabase
          .from('streaks')
          .select('current_count, longest_count, streak_type')
          .eq('user_id', user.id);

        // Get location visits count
        const { data: uniqueLocations } = await supabase
          .from('location_visits')
          .select('location_id')
          .eq('user_id', user.id);
        
        const uniqueLocationCount = new Set(uniqueLocations?.map(l => l.location_id)).size;

        // Get early completions (before noon) - simplified query
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        
        const { data: earlyCompletions } = await supabase
          .from('tasks')
          .select('id, completed_at')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('completed_at', thirtyDaysAgo.toISOString());
        
        // Filter for before noon locally
        const beforeNoonCount = earlyCompletions?.filter(t => {
          if (!t.completed_at) return false;
          const hour = new Date(t.completed_at).getHours();
          return hour < 12;
        }).length || 0;

        const earnedIds = new Set((earnedAchievements as { achievement_id: string; earned_at: string }[])?.map((ua) => ua.achievement_id) || []);
        const earnedMap = new Map(
          (earnedAchievements as { achievement_id: string; earned_at: string }[])?.map((ua) => [ua.achievement_id, ua.earned_at]) || []
        );

        // Calculate progress for each achievement with proper criteria handling
        const achievementsWithProgress = ACHIEVEMENTS_DEF.map((ach) => {
          let progress = 0;
          let progressValue = 0;
          const stats = userData as { 
            tasks_completed_count?: number; 
            tasks_created_count?: number;
            total_xp?: number; 
            current_level?: number;
            emails_processed?: number;
            meetings_processed?: number;
            focus_hours_total?: number;
          } || {};

          switch (ach.criteria.type) {
            case 'task_capture':
              progressValue = stats.tasks_created_count || 0;
              progress = Math.min(100, (progressValue / ach.criteria.threshold) * 100);
              break;
              
            case 'task_complete':
              progressValue = stats.tasks_completed_count || 0;
              progress = Math.min(100, (progressValue / ach.criteria.threshold) * 100);
              break;
              
            case 'email_process':
              progressValue = stats.emails_processed || 0;
              progress = Math.min(100, (progressValue / ach.criteria.threshold) * 100);
              break;
              
            case 'location_visit':
              progressValue = uniqueLocationCount;
              progress = Math.min(100, (progressValue / ach.criteria.threshold) * 100);
              break;
              
            case 'streak_maintain': {
              const maxStreak = Math.max(
                ...(streakData?.map(s => s.longest_count) || [0]),
                0
              );
              progressValue = maxStreak;
              progress = Math.min(100, (maxStreak / ach.criteria.threshold) * 100);
              break;
            }
            
            case 'meeting_actions':
              progressValue = stats.meetings_processed || 0;
              progress = Math.min(100, (progressValue / ach.criteria.threshold) * 100);
              break;
              
            case 'xp_earn':
              progressValue = stats.total_xp || 0;
              progress = Math.min(100, (progressValue / ach.criteria.threshold) * 100);
              break;
              
            case 'level_reach':
              progressValue = stats.current_level || 1;
              progress = Math.min(100, (progressValue / ach.criteria.threshold) * 100);
              break;
              
            case 'focus_time':
              progressValue = Math.floor(stats.focus_hours_total || 0);
              progress = Math.min(100, (progressValue / ach.criteria.threshold) * 100);
              break;
              
            case 'early_completion':
              progressValue = beforeNoonCount;
              progress = Math.min(100, (progressValue / ach.criteria.threshold) * 100);
              break;
              
            case 'on_time_completion':
              // Use completed tasks as proxy
              progressValue = Math.floor((stats.tasks_completed_count || 0) / 2);
              progress = Math.min(100, (progressValue / ach.criteria.threshold) * 100);
              break;
              
            case 'daily_planning': {
              const captureStreak = streakData?.find(s => s.streak_type === 'capture');
              progressValue = captureStreak?.longest_count || 0;
              progress = Math.min(100, (progressValue / ach.criteria.threshold) * 100);
              break;
            }
              
            default:
              progressValue = earnedIds.has(ach.id) ? ach.criteria.threshold : 0;
              progress = earnedIds.has(ach.id) ? 100 : 0;
          }

          return {
            ...ach,
            earned: earnedIds.has(ach.id) || progress >= 100,
            earnedAt: earnedMap.get(ach.id),
            progress,
            progressValue,
          };
        });

        setAchievements(achievementsWithProgress);
      } catch (error) {
        console.error('Error fetching achievements:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();
  }, [supabase]);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const earnedCount = achievements.filter((a) => a.earned).length;
  const totalCount = achievements.length;
  const epicEarned = achievements.filter((a) => a.earned && a.rarity === 'epic').length;

  return (
    <Card className="dark:bg-slate-800 dark:border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg text-slate-800 dark:text-slate-100">
          <div className="flex items-center">
            <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
            Achievements
          </div>
          <div className="flex items-center space-x-2">
            {epicEarned > 0 && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full dark:bg-amber-900/50 dark:text-amber-400">
                {epicEarned} Epic
              </span>
            )}
            <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
              {earnedCount}/{totalCount}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Overall Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-600 dark:text-slate-400">Overall Progress</span>
            <span className="font-medium text-slate-800 dark:text-slate-100">
              {Math.round((earnedCount / totalCount) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-yellow-400 to-orange-500"
              initial={{ width: 0 }}
              animate={{ width: `${(earnedCount / totalCount) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Achievements Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {achievements.map((achievement, index) => {
            const Icon = iconMap[achievement.icon] || Star;
            const colors = rarityColors[achievement.rarity];
            
            return (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'relative p-4 rounded-lg border transition-all',
                  achievement.earned
                    ? colors.earned
                    : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                )}
              >
                <div className="flex items-start space-x-3">
                  <div
                    className={cn(
                      'p-2 rounded-lg shrink-0',
                      achievement.earned
                        ? colors.bg
                        : 'bg-slate-200 dark:bg-slate-700'
                    )}
                  >
                    {achievement.earned ? (
                      <Icon className={cn('w-5 h-5', colors.text)} />
                    ) : (
                      <Lock className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3
                        className={cn(
                          'font-medium text-sm',
                          achievement.earned
                            ? 'text-slate-800 dark:text-slate-100'
                            : 'text-slate-500 dark:text-slate-400'
                        )}
                      >
                        {achievement.name}
                      </h3>
                      {/* Rarity indicator */}
                      <span className={cn(
                        'text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded',
                        achievement.rarity === 'epic' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/50',
                        achievement.rarity === 'rare' && 'bg-purple-100 text-purple-700 dark:bg-purple-900/50',
                        achievement.rarity === 'uncommon' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/50',
                        achievement.rarity === 'common' && 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
                      )}>
                        {achievement.rarity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {achievement.description}
                    </p>
                    
                    {/* Progress bar for unearned achievements */}
                    {!achievement.earned && achievement.progress > 0 && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-400">
                            {achievement.progressValue} / {achievement.criteria.threshold}
                          </span>
                          <span className="text-slate-400">{Math.round(achievement.progress)}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-500',
                              achievement.rarity === 'epic' && 'bg-amber-500',
                              achievement.rarity === 'rare' && 'bg-purple-500',
                              achievement.rarity === 'uncommon' && 'bg-blue-500',
                              achievement.rarity === 'common' && 'bg-slate-400'
                            )}
                            style={{ width: `${achievement.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    
                    {achievement.earned && achievement.earnedAt && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Earned {new Date(achievement.earnedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Compact version for dashboard
export function AchievementsWidget() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserClient();

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: earnedAchievements } = await supabase
          .from('user_achievements')
          .select('*')
          .eq('user_id', user.id)
          .order('earned_at', { ascending: false })
          .limit(4);

        // Get achievement details
        const earnedIds = earnedAchievements?.map(ea => ea.achievement_id) || [];
        const earnedWithDetails = earnedIds.map(id => {
          const def = ACHIEVEMENTS_DEF.find(a => a.id === id);
          const earned = earnedAchievements?.find(ea => ea.achievement_id === id);
          return def ? { ...def, earned: true, earnedAt: earned?.earned_at, progress: 100, progressValue: def.criteria.threshold } : null;
        }).filter(Boolean) as Achievement[];

        setAchievements(earnedWithDetails);
      } catch (error) {
        console.error('Error fetching achievements:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex space-x-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (achievements.length === 0) {
    return (
      <div className="text-center py-4 text-slate-400 text-sm">
        No achievements yet. Complete tasks to earn them!
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {achievements.map((achievement) => {
        const Icon = iconMap[achievement.icon] || Star;
        const colors = rarityColors[achievement.rarity];
        
        return (
          <div
            key={achievement.id}
            className={cn(
              'w-12 h-12 rounded-lg flex items-center justify-center',
              colors.bg,
              colors.text
            )}
            title={`${achievement.name} - ${achievement.description}`}
          >
            <Icon className="w-5 h-5" />
          </div>
        );
      })}
    </div>
  );
}
