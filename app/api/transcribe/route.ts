// ============================================================================
// Audio Upload API Route - Handle audio file uploads for transcription
// ============================================================================

import { createRouteHandlerClient } from '@/lib/supabase/server';
import { createClient } from '@deepgram/sdk';
import { NextRequest, NextResponse } from 'next/server';

// Lazy initialization of Deepgram client
function getDeepgramClient() {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPGRAM_API_KEY is not configured');
  }
  return createClient(apiKey);
}

// POST /api/transcribe - Transcribe uploaded audio
export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the audio file from the request
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File | null;
    const meetingId = formData.get('meetingId') as string | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Convert File to ArrayBuffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Send to Deepgram for transcription
    const deepgram = getDeepgramClient();
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      buffer,
      {
        model: 'nova-2',
        language: 'en-AU',
        smart_format: true,
        punctuate: true,
        diarize: true,
      }
    );

    if (error) {
      console.error('Deepgram transcription error:', error);
      return NextResponse.json(
        { error: 'Transcription failed' },
        { status: 500 }
      );
    }

    // Extract transcript text
    const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
    const confidence = result.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0;
    const words = result.results?.channels?.[0]?.alternatives?.[0]?.words || [];
    const duration = result.metadata?.duration || 0;

    // Build transcript segments with timestamps
    const segments = words.reduce((acc: Array<{
      text: string;
      start: number;
      end: number;
      speaker: number;
    }>, word, index, allWords) => {
      // Group words by speaker
      const currentSpeaker = word.speaker || 0;
      const prevSpeaker = index > 0 ? allWords[index - 1].speaker : currentSpeaker;
      
      if (index === 0 || currentSpeaker !== prevSpeaker) {
        acc.push({
          text: word.word,
          start: word.start,
          end: word.end,
          speaker: currentSpeaker,
        });
      } else {
        const current = acc[acc.length - 1];
        current.text += ' ' + word.word;
        current.end = word.end;
      }
      
      return acc;
    }, []);

    // If meetingId is provided, update the meeting record
    if (meetingId) {
      await supabase
        .from('meetings')
        .update({
          transcript: transcript,
          transcript_segments: segments,
          duration_seconds: Math.round(duration),
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', meetingId)
        .eq('user_id', user.id);
    }

    return NextResponse.json({
      success: true,
      transcript,
      confidence,
      duration,
      segments,
      wordCount: words.length,
    });
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}

// GET /api/transcribe - Get transcription status or result
export async function GET(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const meetingId = searchParams.get('meetingId');

    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID required' },
        { status: 400 }
      );
    }

    const { data: meeting, error } = await supabase
      .from('meetings')
      .select('id, status, transcript, transcript_segments, processed, action_items')
      .eq('id', meetingId)
      .eq('user_id', user.id)
      .single();

    if (error || !meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      meetingId: meeting.id,
      status: meeting.status,
      transcript: meeting.transcript,
      segments: meeting.transcript_segments,
      processed: meeting.processed,
      actionItems: meeting.action_items,
    });
  } catch (error) {
    console.error('Error fetching transcription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transcription' },
      { status: 500 }
    );
  }
}
