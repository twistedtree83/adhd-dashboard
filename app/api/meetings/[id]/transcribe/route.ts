// ============================================================================
// Meeting Transcription API Route - Start/stop transcription
// ============================================================================

import { createRouteHandlerClient } from '@/lib/supabase/server';
import { startTranscription, stopTranscription } from '@/lib/transcription';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/meetings/[id]/transcribe - Start transcription
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

    // Check if already recording
    if (meeting.status === 'recording') {
      return NextResponse.json(
        { error: 'Transcription already in progress' },
        { status: 409 }
      );
    }

    // Start transcription
    const result = await startTranscription(meetingId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to start transcription' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      status: 'recording',
      message: 'Transcription started',
    });
  } catch (error) {
    console.error('Error starting transcription:', error);
    return NextResponse.json(
      { error: 'Failed to start transcription' },
      { status: 500 }
    );
  }
}

// PUT /api/meetings/[id]/transcribe - Stop transcription
export async function PUT(
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

    // Check if recording
    if (meeting.status !== 'recording') {
      return NextResponse.json(
        { error: 'No active transcription' },
        { status: 409 }
      );
    }

    // Stop transcription
    const result = await stopTranscription(meetingId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to stop transcription' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      status: 'completed',
      duration: result.duration,
      message: 'Transcription stopped',
    });
  } catch (error) {
    console.error('Error stopping transcription:', error);
    return NextResponse.json(
      { error: 'Failed to stop transcription' },
      { status: 500 }
    );
  }
}
