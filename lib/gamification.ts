// ============================================================================
// Gamification System - XP, Levels, Streaks, Achievements, Quests
// ============================================================================

import { createBrowserClient } from './supabase/client';
import { notifyLevelUp, notifyAchievementUnlocked, notifyStreakAtRisk } from './notifications';

// Admin client creation - for server-side use only
function createAdminClient() {
  const { createClient } = require('@supabase/supabase-js');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ----------------------------------------------------------------------------
// XP Rewards Configuration
// ----------------------------------------------------------------------------
export const XP_REWARDS = {
  TASK_COMPLETE: 10,
  TASK_COMPLETE_HIGH_PRIORITY: 20,
  TASK_ON_TIME: 5,
  TASK_EARLY: 5,
  TASK_CAPTURE: 2,
  TASK_CAPTURE_WITH_ESTIMATE: 5,
  EMAIL_PROCESSED: 5,
  DAILY_LOGIN: 5,
  STREAK_3_DAY: 25,
  STREAK_7_DAY: 100,
  STREAK_30_DAY: 200,
  FOCUS_SESSION_START: 3,
  FOCUS_SESSION_COMPLETE: 15,
  FOCUS_SESSION_EXTENDED: 5, // per 15 min over 25 min
  SUBTASK_BREAKDOWN: 3,
  AI_SUGGESTION_USED: 2,
  ENERGY_LOGGED: 1,
  MORNING_PLANNING: 5,
  QUEST_COMPLETE: 50,
  WEEKLY_CHALLENGE_COMPLETE: 200,
} as const;

export type XPRewardKey = keyof typeof XP_REWARDS;

// ----------------------------------------------------------------------------
// XP Multiplier Configuration
// ----------------------------------------------------------------------------
export interface XPMultipliers {
  energyMatch: number;
  focusMode: number;
  backToBack: number;
}

export const XP_MULTIPLIERS: XPMultipliers = {
  energyMatch: 1.5,  // High energy task during high energy
  focusMode: 1.2,    // Task completed in focus mode
  backToBack: 1.3,   // Within 30 min of last completion
};

// Store last completion time for back-to-back detection
let lastCompletionTime: number | null = null;

// ----------------------------------------------------------------------------
// Calculate XP with multipliers and variable rewards
// ----------------------------------------------------------------------------
export interface XPCalculationResult {
  baseXP: number;
  multipliers: {
    energyMatch: boolean;
    focusMode: boolean;
    backToBack: boolean;
  };
  multiplierValue: number;
  bonusXP: number;
  totalXP: number;
  isLucky: boolean;
}

export function calculateXPWithMultipliers(
  baseXP: number,
  options: {
    energyMatches?: boolean;
    inFocusMode?: boolean;
    checkBackToBack?: boolean;
  } = {}
): XPCalculationResult {
  const { energyMatches = false, inFocusMode = false, checkBackToBack = true } = options;
  
  // Check for back-to-back completion (within 30 min)
  let isBackToBack = false;
  if (checkBackToBack && lastCompletionTime) {
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
    isBackToBack = lastCompletionTime > thirtyMinutesAgo;
  }
  
  // Calculate multiplier
  let multiplierValue = 1.0;
  if (energyMatches) multiplierValue += 0.5;
  if (inFocusMode) multiplierValue += 0.2;
  if (isBackToBack) multiplierValue += 0.3;
  
  // Apply multiplier
  let totalXP = Math.floor(baseXP * multiplierValue);
  
  // Variable reward: 20% chance of bonus XP (1-10)
  let bonusXP = 0;
  let isLucky = false;
  if (Math.random() < 0.2) {
    bonusXP = Math.floor(Math.random() * 10) + 1;
    totalXP += bonusXP;
    isLucky = true;
  }
  
  return {
    baseXP,
    multipliers: {
      energyMatch: energyMatches,
      focusMode: inFocusMode,
      backToBack: isBackToBack,
    },
    multiplierValue,
    bonusXP,
    totalXP,
    isLucky,
  };
}

// Update last completion time
export function recordCompletion(): void {
  lastCompletionTime = Date.now();
}

// ----------------------------------------------------------------------------
// Level Configuration
// ----------------------------------------------------------------------------
export const LEVEL_THRESHOLDS = [
  { level: 1, xp: 0, title: 'Novice' },
  { level: 2, xp: 100, title: 'Organized' },
  { level: 3, xp: 300, title: 'Focused' },
  { level: 4, xp: 600, title: 'Productive' },
  { level: 5, xp: 1000, title: 'Master' },
  { level: 6, xp: 1500, title: 'Guru I' },
  { level: 7, xp: 2000, title: 'Guru II' },
  { level: 8, xp: 2500, title: 'Guru III' },
  { level: 9, xp: 3000, title: 'Elite' },
  { level: 10, xp: 4000, title: 'Champion' },
];

// ----------------------------------------------------------------------------
// Calculate Level from XP
// ----------------------------------------------------------------------------
export function calculateLevel(xp: number): { level: number; title: string; xpToNext: number } {
  let currentLevel = 1;
  let title = 'Novice';
  let xpToNext = 100;

  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i].xp) {
      currentLevel = LEVEL_THRESHOLDS[i].level;
      title = LEVEL_THRESHOLDS[i].title;
      
      // Calculate XP to next level
      const nextLevel = LEVEL_THRESHOLDS[i + 1];
      xpToNext = nextLevel ? nextLevel.xp - xp : 0;
      break;
    }
  }

  return { level: currentLevel, title, xpToNext };
}

// ----------------------------------------------------------------------------
// Award XP to User
// ----------------------------------------------------------------------------
export interface AwardXPResult {
  success: boolean;
  xpAwarded: number;
  newTotal: number;
  newLevel?: number;
  levelUp?: boolean;
  calculation?: XPCalculationResult;
  error?: string;
}

export async function awardXP(
  userId: string,
  rewardKey: XPRewardKey,
  metadata?: Record<string, unknown>
): Promise<AwardXPResult> {
  const supabase = createBrowserClient();
  const baseXpAmount = XP_REWARDS[rewardKey];

  try {
    // Get current user stats
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('total_xp, current_level')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      throw new Error('User not found');
    }

    // Calculate XP with multipliers
    const calculation = calculateXPWithMultipliers(baseXpAmount, {
      energyMatches: metadata?.energyMatches as boolean,
      inFocusMode: metadata?.inFocusMode as boolean,
    });

    const oldLevel = user.current_level;
    const newTotalXP = user.total_xp + calculation.totalXP;
    const { level: newLevel } = calculateLevel(newTotalXP);
    const levelUp = newLevel > oldLevel;

    // Log the XP award
    await supabase.from('points_log').insert({
      user_id: userId,
      points: calculation.totalXP,
      reason: rewardKey,
      source: 'gamification',
      metadata: {
        ...metadata,
        base_xp: calculation.baseXP,
        multiplier: calculation.multiplierValue,
        bonus_xp: calculation.bonusXP,
        previous_xp: user.total_xp,
        new_xp: newTotalXP,
      },
      created_at: new Date().toISOString(),
    });

    // Update user's total XP and level
    await supabase
      .from('users')
      .update({
        total_xp: newTotalXP,
        current_level: newLevel,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    // Send notification on level up
    if (levelUp) {
      const levelInfo = LEVEL_THRESHOLDS.find(l => l.level === newLevel);
      await notifyLevelUp(newLevel, levelInfo?.title || 'Unknown');
    }

    return {
      success: true,
      xpAwarded: calculation.totalXP,
      newTotal: newTotalXP,
      newLevel,
      levelUp,
      calculation,
    };
  } catch (error) {
    console.error('Error awarding XP:', error);
    return {
      success: false,
      xpAwarded: 0,
      newTotal: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Server-side version of awardXP for API routes
export async function awardXPServer(
  userId: string,
  rewardKey: XPRewardKey,
  metadata?: Record<string, unknown>
): Promise<AwardXPResult> {
  const { createClient } = require('@supabase/supabase-js');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  
  const baseXpAmount = XP_REWARDS[rewardKey];

  try {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('total_xp, current_level')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      throw new Error('User not found');
    }

    const calculation = calculateXPWithMultipliers(baseXpAmount, {
      energyMatches: metadata?.energyMatches as boolean,
      inFocusMode: metadata?.inFocusMode as boolean,
    });

    const oldLevel = user.current_level;
    const newTotalXP = user.total_xp + calculation.totalXP;
    const { level: newLevel } = calculateLevel(newTotalXP);
    const levelUp = newLevel > oldLevel;

    await supabase.from('points_log').insert({
      user_id: userId,
      points: calculation.totalXP,
      reason: rewardKey,
      source: 'gamification',
      metadata: {
        ...metadata,
        base_xp: calculation.baseXP,
        multiplier: calculation.multiplierValue,
        bonus_xp: calculation.bonusXP,
        previous_xp: user.total_xp,
        new_xp: newTotalXP,
      },
      created_at: new Date().toISOString(),
    });

    await supabase
      .from('users')
      .update({
        total_xp: newTotalXP,
        current_level: newLevel,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    return {
      success: true,
      xpAwarded: calculation.totalXP,
      newTotal: newTotalXP,
      newLevel,
      levelUp,
      calculation,
    };
  } catch (error) {
    console.error('Error awarding XP:', error);
    return {
      success: false,
      xpAwarded: 0,
      newTotal: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ----------------------------------------------------------------------------
// Update Streak
// ----------------------------------------------------------------------------
export interface StreakResult {
  streak: number;
  isNew: boolean;
  wasBroken: boolean;
  bonusAwarded?: number;
}

export async function updateStreak(
  userId: string,
  streakType: 'daily_tasks' | 'capture' | 'location_visits'
): Promise<StreakResult> {
  const supabase = createBrowserClient();

  try {
    // Get current streak
    const { data: streak, error: streakError } = await supabase
      .from('streaks')
      .select('*')
      .eq('user_id', userId)
      .eq('streak_type', streakType)
      .single();

    if (streakError && streakError.code !== 'PGRST116') {
      throw streakError;
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Create streak if doesn't exist
    if (!streak) {
      await supabase.from('streaks').insert({
        user_id: userId,
        streak_type: streakType,
        current_count: 1,
        longest_count: 1,
        last_maintained: now.toISOString(),
      });

      return { streak: 1, isNew: true, wasBroken: false };
    }

    const lastMaintained = new Date(streak.last_maintained);
    const lastDate = lastMaintained.toISOString().split('T')[0];
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = yesterday.toISOString().split('T')[0];

    let newCount = streak.current_count;
    let wasBroken = false;
    let bonusAwarded = 0;

    // Check if already maintained today
    if (lastDate === today) {
      // Already maintained today, no change
      return {
        streak: streak.current_count,
        isNew: false,
        wasBroken: false,
      };
    }

    // Check if streak continues (was maintained yesterday)
    if (lastDate === yesterdayDate) {
      newCount = streak.current_count + 1;
    } else {
      // Streak broken - but we don't reset to 0, just show "paused"
      wasBroken = true;
      newCount = 1;
    }

    // Check for streak bonuses
    if (newCount === 3) {
      await awardXP(userId, 'STREAK_3_DAY', { streak_type: streakType });
      bonusAwarded = XP_REWARDS.STREAK_3_DAY;
    } else if (newCount === 7) {
      await awardXP(userId, 'STREAK_7_DAY', { streak_type: streakType });
      bonusAwarded = XP_REWARDS.STREAK_7_DAY;
    } else if (newCount === 30) {
      await awardXP(userId, 'STREAK_30_DAY', { streak_type: streakType });
      bonusAwarded = XP_REWARDS.STREAK_30_DAY;
    }

    // Update streak
    await supabase
      .from('streaks')
      .update({
        current_count: newCount,
        longest_count: Math.max(streak.longest_count, newCount),
        last_maintained: now.toISOString(),
      })
      .eq('id', streak.id);

    return {
      streak: newCount,
      isNew: !wasBroken && newCount === 1,
      wasBroken,
      bonusAwarded,
    };
  } catch (error) {
    console.error('Error updating streak:', error);
    return { streak: 0, isNew: false, wasBroken: false };
  }
}

// ----------------------------------------------------------------------------
// Achievements Configuration
// ----------------------------------------------------------------------------
export const ACHIEVEMENTS = [
  {
    id: 'first_capture',
    name: 'First Capture',
    description: 'Capture your first task',
    icon: '🎯',
    criteria: { type: 'task_capture', threshold: 1 },
    xpReward: 10,
  },
  {
    id: 'task_master',
    name: 'Task Master',
    description: 'Complete 50 tasks',
    icon: '✅',
    criteria: { type: 'task_complete', threshold: 50 },
    xpReward: 100,
  },
  {
    id: 'task_warrior',
    name: 'Task Warrior',
    description: 'Complete 100 tasks',
    icon: '💯',
    criteria: { type: 'task_complete', threshold: 100 },
    xpReward: 200,
  },
  {
    id: 'email_ninja',
    name: 'Email Ninja',
    description: 'Process 20 emails into tasks',
    icon: '📧',
    criteria: { type: 'email_process', threshold: 20 },
    xpReward: 50,
  },
  {
    id: 'location_explorer',
    name: 'Location Explorer',
    description: 'Visit all 5 school locations',
    icon: '📍',
    criteria: { type: 'location_visit', threshold: 5 },
    xpReward: 100,
  },
  {
    id: 'streak_starter',
    name: 'Streak Starter',
    description: 'Maintain a 3-day streak',
    icon: '🔥',
    criteria: { type: 'streak_maintain', threshold: 3 },
    xpReward: 25,
  },
  {
    id: 'streak_champion',
    name: 'Streak Champion',
    description: 'Maintain a 14-day streak',
    icon: '👑',
    criteria: { type: 'streak_maintain', threshold: 14 },
    xpReward: 150,
  },
  {
    id: 'streak_legend',
    name: 'Streak Legend',
    description: 'Maintain a 30-day streak',
    icon: '🏆',
    criteria: { type: 'streak_maintain', threshold: 30 },
    xpReward: 300,
  },
  {
    id: 'meeting_hero',
    name: 'Meeting Hero',
    description: 'Extract actions from 10 meetings',
    icon: '🎤',
    criteria: { type: 'meeting_actions', threshold: 10 },
    xpReward: 100,
  },
  {
    id: 'meeting_master',
    name: 'Meeting Master',
    description: 'Extract actions from 50 meetings',
    icon: '🎙️',
    criteria: { type: 'meeting_actions', threshold: 50 },
    xpReward: 250,
  },
  {
    id: 'xp_collector',
    name: 'XP Collector',
    description: 'Earn 1000 XP',
    icon: '⚡',
    criteria: { type: 'xp_earn', threshold: 1000 },
    xpReward: 50,
  },
  {
    id: 'xp_millionaire',
    name: 'XP Millionaire',
    description: 'Earn 5000 XP',
    icon: '💎',
    criteria: { type: 'xp_earn', threshold: 5000 },
    xpReward: 200,
  },
  {
    id: 'level_5',
    name: 'Rising Star',
    description: 'Reach level 5',
    icon: '⭐',
    criteria: { type: 'level_reach', threshold: 5 },
    xpReward: 100,
  },
  {
    id: 'level_10',
    name: 'Champion',
    description: 'Reach level 10',
    icon: '🏅',
    criteria: { type: 'level_reach', threshold: 10 },
    xpReward: 500,
  },
  {
    id: 'focus_master',
    name: 'Focus Master',
    description: 'Complete 50 hours in focus mode',
    icon: '🧘',
    criteria: { type: 'focus_time', threshold: 50 },
    xpReward: 200,
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Complete 10 tasks before noon',
    icon: '🌅',
    criteria: { type: 'early_completion', threshold: 10 },
    xpReward: 50,
  },
  {
    id: 'planner',
    name: 'Planner',
    description: 'Plan 3 days in a row',
    icon: '📅',
    criteria: { type: 'daily_planning', threshold: 3 },
    xpReward: 30,
  },
  {
    id: 'time_estimator',
    name: 'Time Estimator',
    description: 'Complete 10 tasks within estimated time',
    icon: '⏱️',
    criteria: { type: 'on_time_completion', threshold: 10 },
    xpReward: 75,
  },
];

// ----------------------------------------------------------------------------
// Check and Award Achievements
// ----------------------------------------------------------------------------
export async function checkAchievements(userId: string): Promise<string[]> {
  const supabase = createBrowserClient();
  const newAchievements: string[] = [];

  try {
    // Get user's current stats
    const { data: user } = await supabase
      .from('users')
      .select('tasks_completed_count, tasks_created_count, total_xp, current_level, emails_processed, meetings_processed, focus_hours_total')
      .eq('id', userId)
      .single();

    // Get streak data
    const { data: streakData } = await supabase
      .from('streaks')
      .select('current_count, longest_count, streak_type')
      .eq('user_id', userId);

    // Get location visits count
    const { data: locationVisits } = await supabase
      .from('location_visits')
      .select('location_id', { count: 'exact' })
      .eq('user_id', userId);

    // Get unique location count
    const { data: uniqueLocations } = await supabase
      .from('location_visits')
      .select('location_id')
      .eq('user_id', userId);
    
    const uniqueLocationCount = new Set(uniqueLocations?.map(l => l.location_id)).size;

    // Get early completions (before noon)
    const { data: earlyCompletions } = await supabase
      .from('tasks')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('status', 'completed')
      .lt('completed_at', new Date().setHours(12, 0, 0, 0).toString());

    // Get user's earned achievements
    const { data: userAchievements } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId);

    const earnedIds = new Set((userAchievements as { achievement_id: string }[])?.map((ua) => ua.achievement_id) || []);

    // Check each achievement
    for (const achievement of ACHIEVEMENTS) {
      if (earnedIds.has(achievement.id)) continue;

      let earned = false;

      switch (achievement.criteria.type) {
        case 'task_capture':
          if ((user?.tasks_created_count || 0) >= achievement.criteria.threshold) {
            earned = true;
          }
          break;
        case 'task_complete':
          if ((user?.tasks_completed_count || 0) >= achievement.criteria.threshold) {
            earned = true;
          }
          break;
        case 'email_process':
          if ((user?.emails_processed || 0) >= achievement.criteria.threshold) {
            earned = true;
          }
          break;
        case 'location_visit':
          if (uniqueLocationCount >= achievement.criteria.threshold) {
            earned = true;
          }
          break;
        case 'streak_maintain': {
          const maxStreak = Math.max(...(streakData?.map(s => s.longest_count) || [0]), 0);
          if (maxStreak >= achievement.criteria.threshold) {
            earned = true;
          }
          break;
        }
        case 'meeting_actions':
          if ((user?.meetings_processed || 0) >= achievement.criteria.threshold) {
            earned = true;
          }
          break;
        case 'xp_earn':
          if ((user?.total_xp || 0) >= achievement.criteria.threshold) {
            earned = true;
          }
          break;
        case 'level_reach':
          if ((user?.current_level || 0) >= achievement.criteria.threshold) {
            earned = true;
          }
          break;
        case 'focus_time':
          if ((user?.focus_hours_total || 0) >= achievement.criteria.threshold) {
            earned = true;
          }
          break;
        case 'early_completion':
          if ((earlyCompletions?.length || 0) >= achievement.criteria.threshold) {
            earned = true;
          }
          break;
        case 'daily_planning':
          // This would require a separate planning log table
          // For now, use streak data as proxy
          const planningStreak = streakData?.find(s => s.streak_type === 'capture');
          if ((planningStreak?.longest_count || 0) >= achievement.criteria.threshold) {
            earned = true;
          }
          break;
        case 'on_time_completion':
          // Would require tracking estimated vs actual time
          // Using completed tasks as proxy for now
          if ((user?.tasks_completed_count || 0) >= achievement.criteria.threshold * 2) {
            earned = true;
          }
          break;
      }

      if (earned) {
        await supabase.from('user_achievements').insert({
          user_id: userId,
          achievement_id: achievement.id,
          earned_at: new Date().toISOString(),
        });
        
        // Award bonus XP for achievement
        if (achievement.xpReward > 0) {
          await supabase.from('points_log').insert({
            user_id: userId,
            points: achievement.xpReward,
            reason: 'ACHIEVEMENT_UNLOCKED',
            source: 'gamification',
            metadata: {
              achievement_id: achievement.id,
              achievement_name: achievement.name,
            },
            created_at: new Date().toISOString(),
          });
        }

        // Send achievement notification
        await notifyAchievementUnlocked(
          achievement.name,
          achievement.description,
          achievement.id
        );
        
        newAchievements.push(achievement.id);
      }
    }
  } catch (error) {
    console.error('Error checking achievements:', error);
  }

  return newAchievements;
}

// ----------------------------------------------------------------------------
// Quest System - Daily Quests
// ----------------------------------------------------------------------------
export interface DailyQuest {
  id: string;
  title: string;
  description: string;
  questType: 'tasks_before_noon' | 'focus_session' | 'log_energy' | 'capture_tasks' | 'high_priority_task' | 'complete_tasks' | 'process_emails';
  target: number;
  reward: number;
  icon: string;
}

export const DAILY_QUESTS: DailyQuest[] = [
  {
    id: 'complete_3_morning',
    title: 'Early Bird',
    description: 'Complete 3 tasks before noon',
    questType: 'tasks_before_noon',
    target: 3,
    reward: 50,
    icon: '🌅',
  },
  {
    id: 'focus_session',
    title: 'Focus Time',
    description: 'Complete one focus session',
    questType: 'focus_session',
    target: 1,
    reward: 30,
    icon: '🧘',
  },
  {
    id: 'log_energy',
    title: 'Energy Check',
    description: 'Log your energy level today',
    questType: 'log_energy',
    target: 1,
    reward: 15,
    icon: '🔋',
  },
  {
    id: 'capture_5_tasks',
    title: 'Task Collector',
    description: 'Capture 5 tasks today',
    questType: 'capture_tasks',
    target: 5,
    reward: 25,
    icon: '📝',
  },
  {
    id: 'complete_high_priority',
    title: 'Priority Crusher',
    description: 'Complete a high-priority task',
    questType: 'high_priority_task',
    target: 1,
    reward: 40,
    icon: '⚡',
  },
  {
    id: 'complete_5_tasks',
    title: 'Task Finisher',
    description: 'Complete 5 tasks today',
    questType: 'complete_tasks',
    target: 5,
    reward: 45,
    icon: '✅',
  },
  {
    id: 'process_3_emails',
    title: 'Inbox Hero',
    description: 'Process 3 emails into tasks',
    questType: 'process_emails',
    target: 3,
    reward: 35,
    icon: '📧',
  },
];

// ----------------------------------------------------------------------------
// Weekly Challenges
// ----------------------------------------------------------------------------
export interface WeeklyChallenge {
  id: string;
  title: string;
  description: string;
  challengeType: 'complete_tasks' | 'focus_streak' | 'use_ai_planner' | 'visit_locations' | 'process_emails' | 'deep_work';
  target: number;
  reward: number;
  icon: string;
}

export const WEEKLY_CHALLENGES: WeeklyChallenge[] = [
  {
    id: 'complete_20_week',
    title: 'Weekly Warrior',
    description: 'Complete 20 tasks this week',
    challengeType: 'complete_tasks',
    target: 20,
    reward: 200,
    icon: '⚔️',
  },
  {
    id: 'focus_5_days',
    title: 'Focus Streak',
    description: 'Complete a focus session 5 days this week',
    challengeType: 'focus_streak',
    target: 5,
    reward: 150,
    icon: '🔥',
  },
  {
    id: 'ai_planner_3',
    title: 'AI Assistant',
    description: 'Use the AI planner 3 times',
    challengeType: 'use_ai_planner',
    target: 3,
    reward: 100,
    icon: '🤖',
  },
  {
    id: 'visit_all_locations',
    title: 'Location Explorer',
    description: 'Visit all 5 work locations',
    challengeType: 'visit_locations',
    target: 5,
    reward: 175,
    icon: '📍',
  },
  {
    id: 'process_10_emails',
    title: 'Email Zero',
    description: 'Process 10 emails into tasks',
    challengeType: 'process_emails',
    target: 10,
    reward: 125,
    icon: '📨',
  },
  {
    id: 'deep_work_3_hours',
    title: 'Deep Work',
    description: 'Accumulate 3 hours of focus time',
    challengeType: 'deep_work',
    target: 3,
    reward: 180,
    icon: '🎯',
  },
];

// ----------------------------------------------------------------------------
// Generate Daily Quests for User
// ----------------------------------------------------------------------------
export interface UserQuest {
  id: string;
  questId: string;
  title: string;
  description: string;
  questType: string;
  target: number;
  progress: number;
  reward: number;
  completed: boolean;
  expiresAt: string;
  icon: string;
}

export async function generateDailyQuests(userId: string): Promise<UserQuest[]> {
  const supabase = createBrowserClient();
  
  try {
    // Check if user already has quests for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const { data: existingQuests } = await supabase
      .from('user_quests')
      .select('*')
      .eq('user_id', userId)
      .eq('quest_type', 'daily')
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString());
    
    if (existingQuests && existingQuests.length > 0) {
      // Return existing quests
      return existingQuests.map(q => ({
        id: q.id,
        questId: q.quest_id,
        title: q.title,
        description: q.description,
        questType: q.quest_type_detail,
        target: q.target_count,
        progress: q.progress_current,
        reward: q.xp_reward,
        completed: q.status === 'completed',
        expiresAt: q.expires_at,
        icon: q.icon || '📝',
      }));
    }
    
    // Generate new quests - select 3 random quests
    const shuffled = [...DAILY_QUESTS].sort(() => 0.5 - Math.random());
    const selectedQuests = shuffled.slice(0, 3);
    
    const userQuests: UserQuest[] = [];
    
    for (const quest of selectedQuests) {
      const expiresAt = new Date();
      expiresAt.setHours(23, 59, 59, 999);
      
      const { data: inserted } = await supabase
        .from('user_quests')
        .insert({
          user_id: userId,
          quest_id: quest.id,
          quest_type: 'daily',
          quest_type_detail: quest.questType,
          title: quest.title,
          description: quest.description,
          target_count: quest.target,
          progress_current: 0,
          xp_reward: quest.reward,
          status: 'active',
          expires_at: expiresAt.toISOString(),
          icon: quest.icon,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (inserted) {
        userQuests.push({
          id: inserted.id,
          questId: quest.id,
          title: quest.title,
          description: quest.description,
          questType: quest.questType,
          target: quest.target,
          progress: 0,
          reward: quest.reward,
          completed: false,
          expiresAt: inserted.expires_at,
          icon: quest.icon,
        });
      }
    }
    
    return userQuests;
  } catch (error) {
    console.error('Error generating daily quests:', error);
    return [];
  }
}

// ----------------------------------------------------------------------------
// Get Active Quests
// ----------------------------------------------------------------------------
export async function getActiveQuests(userId: string): Promise<UserQuest[]> {
  const supabase = createBrowserClient();
  
  try {
    const { data: quests } = await supabase
      .from('user_quests')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'completed'])
      .order('created_at', { ascending: false });
    
    return (quests || []).map(q => ({
      id: q.id,
      questId: q.quest_id,
      title: q.title,
      description: q.description,
      questType: q.quest_type_detail,
      target: q.target_count,
      progress: q.progress_current,
      reward: q.xp_reward,
      completed: q.status === 'completed',
      expiresAt: q.expires_at,
      icon: q.icon || '📝',
    }));
  } catch (error) {
    console.error('Error getting active quests:', error);
    return [];
  }
}

// ----------------------------------------------------------------------------
// Update Quest Progress
// ----------------------------------------------------------------------------
export interface QuestUpdateResult {
  success: boolean;
  completed: boolean;
  questTitle?: string;
  reward?: number;
  error?: string;
}

export async function updateQuestProgress(
  userId: string,
  questType: string,
  increment: number = 1
): Promise<QuestUpdateResult> {
  const supabase = createBrowserClient();
  
  try {
    // Find active quest of this type
    const { data: quest } = await supabase
      .from('user_quests')
      .select('*')
      .eq('user_id', userId)
      .eq('quest_type_detail', questType)
      .eq('status', 'active')
      .single();
    
    if (!quest) {
      return { success: true, completed: false }; // No active quest of this type
    }
    
    const newProgress = Math.min(quest.progress_current + increment, quest.target_count);
    const isCompleted = newProgress >= quest.target_count;
    
    await supabase
      .from('user_quests')
      .update({
        progress_current: newProgress,
        status: isCompleted ? 'completed' : 'active',
        completed_at: isCompleted ? new Date().toISOString() : null,
      })
      .eq('id', quest.id);
    
    // Award XP if completed
    if (isCompleted) {
      await awardXP(userId, 'QUEST_COMPLETE', {
        quest_id: quest.id,
        quest_title: quest.title,
      });
    }
    
    return {
      success: true,
      completed: isCompleted,
      questTitle: quest.title,
      reward: isCompleted ? quest.xp_reward : undefined,
    };
  } catch (error) {
    console.error('Error updating quest progress:', error);
    return {
      success: false,
      completed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ----------------------------------------------------------------------------
// Complete Quest (manual completion for edge cases)
// ----------------------------------------------------------------------------
export async function completeQuest(
  userId: string,
  questId: string
): Promise<QuestUpdateResult> {
  const supabase = createBrowserClient();
  
  try {
    const { data: quest } = await supabase
      .from('user_quests')
      .select('*')
      .eq('id', questId)
      .eq('user_id', userId)
      .single();
    
    if (!quest) {
      return { success: false, completed: false, error: 'Quest not found' };
    }
    
    if (quest.status === 'completed') {
      return { success: true, completed: true, questTitle: quest.title, reward: 0 };
    }
    
    await supabase
      .from('user_quests')
      .update({
        progress_current: quest.target_count,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', questId);
    
    await awardXP(userId, 'QUEST_COMPLETE', {
      quest_id: quest.id,
      quest_title: quest.title,
    });
    
    return {
      success: true,
      completed: true,
      questTitle: quest.title,
      reward: quest.xp_reward,
    };
  } catch (error) {
    console.error('Error completing quest:', error);
    return {
      success: false,
      completed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ----------------------------------------------------------------------------
// Generate Weekly Challenge
// ----------------------------------------------------------------------------
export async function generateWeeklyChallenge(userId: string): Promise<UserQuest | null> {
  const supabase = createBrowserClient();
  
  try {
    // Check if user already has a challenge for this week
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const { data: existingChallenge } = await supabase
      .from('user_quests')
      .select('*')
      .eq('user_id', userId)
      .eq('quest_type', 'weekly')
      .gte('created_at', startOfWeek.toISOString())
      .single();
    
    if (existingChallenge) {
      return {
        id: existingChallenge.id,
        questId: existingChallenge.quest_id,
        title: existingChallenge.title,
        description: existingChallenge.description,
        questType: existingChallenge.quest_type_detail,
        target: existingChallenge.target_count,
        progress: existingChallenge.progress_current,
        reward: existingChallenge.xp_reward,
        completed: existingChallenge.status === 'completed',
        expiresAt: existingChallenge.expires_at,
        icon: existingChallenge.icon || '⚔️',
      };
    }
    
    // Generate new challenge - select 1 random challenge
    const challenge = WEEKLY_CHALLENGES[Math.floor(Math.random() * WEEKLY_CHALLENGES.length)];
    
    const expiresAt = new Date(startOfWeek);
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    const { data: inserted } = await supabase
      .from('user_quests')
      .insert({
        user_id: userId,
        quest_id: challenge.id,
        quest_type: 'weekly',
        quest_type_detail: challenge.challengeType,
        title: challenge.title,
        description: challenge.description,
        target_count: challenge.target,
        progress_current: 0,
        xp_reward: challenge.reward,
        status: 'active',
        expires_at: expiresAt.toISOString(),
        icon: challenge.icon,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (inserted) {
      return {
        id: inserted.id,
        questId: challenge.id,
        title: challenge.title,
        description: challenge.description,
        questType: challenge.challengeType,
        target: challenge.target,
        progress: 0,
        reward: challenge.reward,
        completed: false,
        expiresAt: inserted.expires_at,
        icon: challenge.icon,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error generating weekly challenge:', error);
    return null;
  }
}

// ----------------------------------------------------------------------------
// Update Weekly Challenge Progress
// ----------------------------------------------------------------------------
export async function updateWeeklyChallengeProgress(
  userId: string,
  challengeType: string,
  increment: number = 1
): Promise<QuestUpdateResult> {
  const supabase = createBrowserClient();
  
  try {
    const { data: challenge } = await supabase
      .from('user_quests')
      .select('*')
      .eq('user_id', userId)
      .eq('quest_type', 'weekly')
      .eq('quest_type_detail', challengeType)
      .eq('status', 'active')
      .single();
    
    if (!challenge) {
      return { success: true, completed: false };
    }
    
    const newProgress = Math.min(challenge.progress_current + increment, challenge.target_count);
    const isCompleted = newProgress >= challenge.target_count;
    
    await supabase
      .from('user_quests')
      .update({
        progress_current: newProgress,
        status: isCompleted ? 'completed' : 'active',
        completed_at: isCompleted ? new Date().toISOString() : null,
      })
      .eq('id', challenge.id);
    
    if (isCompleted) {
      await awardXP(userId, 'WEEKLY_CHALLENGE_COMPLETE', {
        challenge_id: challenge.id,
        challenge_title: challenge.title,
      });
    }
    
    return {
      success: true,
      completed: isCompleted,
      questTitle: challenge.title,
      reward: isCompleted ? challenge.xp_reward : undefined,
    };
  } catch (error) {
    console.error('Error updating weekly challenge:', error);
    return {
      success: false,
      completed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ----------------------------------------------------------------------------
// Get User Gamification Stats
// ----------------------------------------------------------------------------
export interface GamificationStats {
  totalXP: number;
  currentLevel: number;
  levelTitle: string;
  xpToNext: number;
  xpProgress: number; // percentage to next level
  dailyStreak: number;
  longestStreak: number;
  tasksCompleted: number;
  tasksCreated: number;
}

export async function getGamificationStats(userId: string): Promise<GamificationStats> {
  const supabase = createBrowserClient();

  const { data: user } = await supabase
    .from('users')
    .select('total_xp, current_level, longest_streak_days, tasks_completed_count, tasks_created_count')
    .eq('id', userId)
    .single();

  const { data: streak } = await supabase
    .from('streaks')
    .select('current_count')
    .eq('user_id', userId)
    .eq('streak_type', 'daily_tasks')
    .single();

  const xp = user?.total_xp || 0;
  const { level, title, xpToNext } = calculateLevel(xp);
  
  // Calculate progress percentage
  const currentLevelXP = LEVEL_THRESHOLDS.find(l => l.level === level)?.xp || 0;
  const nextLevelXP = LEVEL_THRESHOLDS.find(l => l.level === level + 1)?.xp || currentLevelXP + 500;
  const xpProgress = ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;

  return {
    totalXP: xp,
    currentLevel: level,
    levelTitle: title,
    xpToNext,
    xpProgress: Math.min(100, Math.max(0, xpProgress)),
    dailyStreak: streak?.current_count || 0,
    longestStreak: user?.longest_streak_days || 0,
    tasksCompleted: user?.tasks_completed_count || 0,
    tasksCreated: user?.tasks_created_count || 0,
  };
}
