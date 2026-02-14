// ============================================================================
// Daily Quests API Route - Get and complete daily quests
// ============================================================================

import { createRouteHandlerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { awardXPServer } from '@/lib/gamification';

// GET /api/gamification/quests - Get today's quests
export async function GET(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get or generate today's daily quests
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if user has quests for today
    let { data: existingQuests, error: questError } = await supabase
      .from('user_quests')
      .select('*')
      .eq('user_id', user.id)
      .eq('quest_type', 'daily')
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())
      .order('created_at', { ascending: true });

    if (questError) throw questError;

    // If no quests exist, generate them
    if (!existingQuests || existingQuests.length === 0) {
      const dailyQuests = await generateDailyQuests(supabase, user.id);
      existingQuests = dailyQuests;
    }

    // Also get weekly challenge
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const { data: weeklyChallenge } = await supabase
      .from('user_quests')
      .select('*')
      .eq('user_id', user.id)
      .eq('quest_type', 'weekly')
      .gte('created_at', startOfWeek.toISOString())
      .single();

    // If no weekly challenge, generate one
    let weeklyQuest = weeklyChallenge;
    if (!weeklyChallenge) {
      weeklyQuest = await generateWeeklyChallenge(supabase, user.id);
    }

    return NextResponse.json({
      daily: existingQuests || [],
      weekly: weeklyQuest || null,
    });
  } catch (error) {
    console.error('Error fetching quests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quests' },
      { status: 500 }
    );
  }
}

// POST /api/gamification/quests - Complete a quest or update progress
export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { questId, action, progressType, increment = 1 } = body;

    if (action === 'complete' && questId) {
      // Complete a specific quest
      const result = await completeQuest(supabase, user.id, questId);
      return NextResponse.json(result);
    }

    if (action === 'progress' && progressType) {
      // Update progress for quests of a certain type
      const result = await updateQuestProgress(supabase, user.id, progressType, increment);
      return NextResponse.json(result);
    }

    if (action === 'update_weekly' && progressType) {
      // Update weekly challenge progress
      const result = await updateWeeklyProgress(supabase, user.id, progressType, increment);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating quest:', error);
    return NextResponse.json(
      { error: 'Failed to update quest' },
      { status: 500 }
    );
  }
}

// Helper function to generate daily quests
async function generateDailyQuests(supabase: any, userId: string) {
  const DAILY_QUESTS = [
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

  // Select 3 random quests
  const shuffled = [...DAILY_QUESTS].sort(() => 0.5 - Math.random());
  const selectedQuests = shuffled.slice(0, 3);

  const expiresAt = new Date();
  expiresAt.setHours(23, 59, 59, 999);

  const insertedQuests = [];

  for (const quest of selectedQuests) {
    const { data: inserted, error } = await supabase
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
      })
      .select()
      .single();

    if (!error && inserted) {
      insertedQuests.push(inserted);
    }
  }

  return insertedQuests;
}

// Helper function to generate weekly challenge
async function generateWeeklyChallenge(supabase: any, userId: string) {
  const WEEKLY_CHALLENGES = [
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

  const challenge = WEEKLY_CHALLENGES[Math.floor(Math.random() * WEEKLY_CHALLENGES.length)];

  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const expiresAt = new Date(startOfWeek);
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data: inserted, error } = await supabase
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
    })
    .select()
    .single();

  return error ? null : inserted;
}

// Helper function to complete a quest
async function completeQuest(supabase: any, userId: string, questId: string) {
  const { data: quest, error } = await supabase
    .from('user_quests')
    .select('*')
    .eq('id', questId)
    .eq('user_id', userId)
    .single();

  if (error || !quest) {
    return { error: 'Quest not found' };
  }

  if (quest.status === 'completed') {
    return { success: true, alreadyCompleted: true };
  }

  // Update quest status
  await supabase
    .from('user_quests')
    .update({
      progress_current: quest.target_count,
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', questId);

  // Award XP
  const xpResult = await awardXPServer(
    userId,
    quest.quest_type === 'weekly' ? 'WEEKLY_CHALLENGE_COMPLETE' : 'QUEST_COMPLETE',
    { quest_id: questId, quest_title: quest.title }
  );

  // Create notification
  await supabase.from('notifications').insert({
    user_id: userId,
    type: quest.quest_type === 'weekly' ? 'weekly_challenge_completed' : 'quest_completed',
    title: quest.quest_type === 'weekly' ? 'Weekly Challenge Complete!' : 'Quest Complete!',
    message: `You completed "${quest.title}" and earned ${quest.xp_reward} XP!`,
    data: { quest_id: questId, xp_reward: quest.xp_reward },
  });

  return {
    success: true,
    questTitle: quest.title,
    reward: quest.xp_reward,
    xp: xpResult,
  };
}

// Helper function to update quest progress
async function updateQuestProgress(
  supabase: any,
  userId: string,
  progressType: string,
  increment: number
) {
  // Find active daily quests of this type
  const { data: quests, error } = await supabase
    .from('user_quests')
    .select('*')
    .eq('user_id', userId)
    .eq('quest_type', 'daily')
    .eq('quest_type_detail', progressType)
    .eq('status', 'active');

  if (error || !quests || quests.length === 0) {
    return { success: true, updated: false, reason: 'No active quest of this type' };
  }

  const results = [];

  for (const quest of quests) {
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

    if (isCompleted) {
      // Award XP
      await awardXPServer(userId, 'QUEST_COMPLETE', {
        quest_id: quest.id,
        quest_title: quest.title,
      });

      // Create notification
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'quest_completed',
        title: 'Quest Complete!',
        message: `You completed "${quest.title}" and earned ${quest.xp_reward} XP!`,
        data: { quest_id: quest.id, xp_reward: quest.xp_reward },
      });
    }

    results.push({
      questId: quest.id,
      completed: isCompleted,
      progress: newProgress,
      target: quest.target_count,
    });
  }

  return { success: true, updated: true, results };
}

// Helper function to update weekly challenge progress
async function updateWeeklyProgress(
  supabase: any,
  userId: string,
  progressType: string,
  increment: number
) {
  const { data: challenge, error } = await supabase
    .from('user_quests')
    .select('*')
    .eq('user_id', userId)
    .eq('quest_type', 'weekly')
    .eq('quest_type_detail', progressType)
    .eq('status', 'active')
    .single();

  if (error || !challenge) {
    return { success: true, updated: false, reason: 'No active weekly challenge' };
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
    await awardXPServer(userId, 'WEEKLY_CHALLENGE_COMPLETE', {
      challenge_id: challenge.id,
      challenge_title: challenge.title,
    });

    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'weekly_challenge_completed',
      title: 'Weekly Challenge Complete!',
      message: `You completed "${challenge.title}" and earned ${challenge.xp_reward} XP! 🎉`,
      data: { challenge_id: challenge.id, xp_reward: challenge.xp_reward },
    });
  }

  return {
    success: true,
    updated: true,
    completed: isCompleted,
    progress: newProgress,
    target: challenge.target_count,
  };
}
