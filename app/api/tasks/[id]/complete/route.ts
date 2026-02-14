// ============================================================================
// Complete Task API Route - Marks task complete and awards XP
// ============================================================================

import { createRouteHandlerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { awardXP, updateStreak } from '@/lib/gamification';
import { Task } from '@/types';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = await createRouteHandlerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the task first
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const typedTask = task as Task;

    if (typedTask.status === 'completed') {
      return NextResponse.json({ error: 'Task already completed' }, { status: 400 });
    }

    // Mark task as complete
    const { error: updateError } = await supabase
      .from('tasks')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // Award XP
    const xpKey = typedTask.priority === 'high' || typedTask.priority === 'urgent'
      ? 'TASK_COMPLETE_HIGH_PRIORITY'
      : 'TASK_COMPLETE';
    
    const xpResult = await awardXP(user.id, xpKey, { task_id: typedTask.id });

    // Update streak
    const streakResult = await updateStreak(user.id, 'daily_tasks');

    return NextResponse.json({
      success: true,
      xp: xpResult,
      streak: streakResult,
    });
  } catch (error) {
    console.error('Error completing task:', error);
    return NextResponse.json(
      { error: 'Failed to complete task' },
      { status: 500 }
    );
  }
}
