// ============================================================================
// Meeting Processing API Route - Process transcript and extract actions
// ============================================================================

import { createRouteHandlerClient } from '@/lib/supabase/server';
import { processTranscript } from '@/lib/transcription';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/meetings/[id]/process - Process transcript
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: meetingId } = await params;
  try {
    const supabase = await createRouteHandlerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify meeting ownership
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', meetingId)
      .eq('user_id', user.id)
      .single();

    if (meetingError || !meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Check if already processed
    if (meeting.processed) {
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        actionItems: meeting.action_items,
        message: 'Meeting already processed',
      });
    }

    // Check if there's a transcript
    if (!meeting.transcript || meeting.transcript.trim().length === 0) {
      return NextResponse.json(
        { error: 'No transcript available to process' },
        { status: 400 }
      );
    }

    // Update status to processing
    await supabase
      .from('meetings')
      .update({ status: 'processing' })
      .eq('id', meetingId);

    // Process the transcript
    const result = await processTranscript(meetingId);

    if (!result.success) {
      // Revert status on error
      await supabase
        .from('meetings')
        .update({ status: 'completed' })
        .eq('id', meetingId);

      return NextResponse.json(
        { error: result.error || 'Failed to process transcript' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      summary: result.result?.summary,
      actionItems: result.result?.actions,
      tasksCreated: result.tasksCreated,
      message: `Created ${result.tasksCreated} tasks from action items`,
    });
  } catch (error) {
    console.error('Error processing meeting:', error);
    return NextResponse.json(
      { error: 'Failed to process meeting' },
      { status: 500 }
    );
  }
}
