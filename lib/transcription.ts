// ============================================================================
// Transcription Service - Deepgram integration for live meeting transcription
// ============================================================================

import { createClient, LiveTranscriptionEvents, ListenLiveClient } from '@deepgram/sdk';
import OpenAI from 'openai';
import { createAdminClient } from './supabase/server';

// Deepgram client initialization
const deepgram = createClient(process.env.DEEPGRAM_API_KEY || '');

// OpenAI client for action extraction
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export type RecordingStatus = 'idle' | 'connecting' | 'recording' | 'paused' | 'processing' | 'completed' | 'error';

export interface TranscriptSegment {
  id: string;
  text: string;
  is_final: boolean;
  speaker?: number;
  start: number; // seconds
  end: number; // seconds
  confidence: number;
  created_at: string;
}

export interface MeetingAction {
  action: string;
  assignee?: string;
  priority: 'high' | 'medium' | 'low';
  due?: string | null;
}

export interface ProcessingResult {
  actions: MeetingAction[];
  summary?: string;
}

// Active transcription connections store
const activeConnections = new Map<string, {
  connection: ListenLiveClient;
  transcript: string;
  segments: TranscriptSegment[];
  startTime: Date;
}>();

// ----------------------------------------------------------------------------
// Start Live Transcription
// ----------------------------------------------------------------------------
export async function startTranscription(meetingId: string): Promise<{
  success: boolean;
  error?: string;
  wsUrl?: string;
}> {
  try {
    // Create a Deepgram live transcription connection
    const connection = deepgram.listen.live({
      model: 'nova-2',
      language: 'en-AU',
      smart_format: true,
      interim_results: true,
      punctuate: true,
      diarize: true, // Speaker identification
      endpointing: 500,
    });

    let transcript = '';
    const segments: TranscriptSegment[] = [];

    connection.on(LiveTranscriptionEvents.Open, () => {
      console.log(`[Transcription] Connection opened for meeting ${meetingId}`);
    });

    connection.on(LiveTranscriptionEvents.Transcript, async (data) => {
      const alternative = data.channel?.alternatives?.[0];
      if (!alternative) return;

      const text = alternative.transcript;
      const isFinal = data.is_final;
      const words = alternative.words || [];
      
      const start = words[0]?.start || 0;
      const end = words[words.length - 1]?.end || start;
      const confidence = alternative.confidence || 0;

      // Get speaker from diarization
      const speaker = words[0]?.speaker;

      const segment: TranscriptSegment = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text,
        is_final: isFinal,
        speaker,
        start,
        end,
        confidence,
        created_at: new Date().toISOString(),
      };

      if (isFinal) {
        transcript += text + ' ';
        segments.push(segment);
        
        // Save transcript chunk to database
        await saveTranscriptChunk(meetingId, text, segment);
      }

      // Broadcast to connected clients via Supabase realtime
      await broadcastTranscriptUpdate(meetingId, segment);
    });

    connection.on(LiveTranscriptionEvents.Error, (error) => {
      console.error(`[Transcription] Error for meeting ${meetingId}:`, error);
    });

    connection.on(LiveTranscriptionEvents.Close, async () => {
      console.log(`[Transcription] Connection closed for meeting ${meetingId}`);
      
      // Final save of complete transcript
      await finalizeTranscript(meetingId, transcript);
      
      // Clean up
      activeConnections.delete(meetingId);
    });

    // Store the connection
    activeConnections.set(meetingId, {
      connection,
      transcript,
      segments,
      startTime: new Date(),
    });

    // Update meeting status in database
    const supabase = createAdminClient();
    await supabase
      .from('meetings')
      .update({
        status: 'recording',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', meetingId);

    return { success: true };
  } catch (error) {
    console.error('[Transcription] Failed to start:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start transcription',
    };
  }
}

// ----------------------------------------------------------------------------
// Stop Transcription
// ----------------------------------------------------------------------------
export async function stopTranscription(meetingId: string): Promise<{
  success: boolean;
  error?: string;
  duration?: number;
}> {
  try {
    const activeConnection = activeConnections.get(meetingId);
    
    if (!activeConnection) {
      return {
        success: false,
        error: 'No active transcription found for this meeting',
      };
    }

    // Close the connection
    activeConnection.connection.requestClose();

    // Calculate duration
    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - activeConnection.startTime.getTime()) / 1000);

    // Update meeting status
    const supabase = createAdminClient();
    await supabase
      .from('meetings')
      .update({
        status: 'completed',
        ended_at: endTime.toISOString(),
        duration_seconds: duration,
        updated_at: new Date().toISOString(),
      })
      .eq('id', meetingId);

    return { success: true, duration };
  } catch (error) {
    console.error('[Transcription] Failed to stop:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to stop transcription',
    };
  }
}

// ----------------------------------------------------------------------------
// Send Audio Data
// ----------------------------------------------------------------------------
export function sendAudioData(meetingId: string, audioData: Uint8Array): boolean {
  const activeConnection = activeConnections.get(meetingId);
  
  if (!activeConnection) {
    console.error(`[Transcription] No active connection for meeting ${meetingId}`);
    return false;
  }

  try {
    activeConnection.connection.send(audioData);
    return true;
  } catch (error) {
    console.error(`[Transcription] Failed to send audio data:`, error);
    return false;
  }
}

// ----------------------------------------------------------------------------
// Save Transcript Chunk
// ----------------------------------------------------------------------------
async function saveTranscriptChunk(
  meetingId: string,
  text: string,
  segment: TranscriptSegment
): Promise<void> {
  const supabase = createAdminClient();

  try {
    // Get current transcript
    const { data: meeting } = await supabase
      .from('meetings')
      .select('transcript, transcript_segments')
      .eq('id', meetingId)
      .single();

    const currentTranscript = meeting?.transcript || '';
    const currentSegments = (meeting?.transcript_segments as TranscriptSegment[]) || [];

    // Update meeting with new transcript
    await supabase
      .from('meetings')
      .update({
        transcript: currentTranscript + text + ' ',
        transcript_segments: [...currentSegments, segment],
        updated_at: new Date().toISOString(),
      })
      .eq('id', meetingId);
  } catch (error) {
    console.error('[Transcription] Failed to save chunk:', error);
  }
}

// ----------------------------------------------------------------------------
// Broadcast Transcript Update
// ----------------------------------------------------------------------------
async function broadcastTranscriptUpdate(meetingId: string, segment: TranscriptSegment): Promise<void> {
  const supabase = createAdminClient();

  try {
    await supabase.channel(`meeting-${meetingId}`)
      .send({
        type: 'broadcast',
        event: 'transcript',
        payload: segment,
      });
  } catch (error) {
    console.error('[Transcription] Failed to broadcast:', error);
  }
}

// ----------------------------------------------------------------------------
// Finalize Transcript
// ----------------------------------------------------------------------------
async function finalizeTranscript(meetingId: string, transcript: string): Promise<void> {
  const supabase = createAdminClient();

  try {
    await supabase
      .from('meetings')
      .update({
        transcript: transcript.trim(),
        status: 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', meetingId);
  } catch (error) {
    console.error('[Transcription] Failed to finalize:', error);
  }
}

// ----------------------------------------------------------------------------
// Process Full Transcript with OpenAI
// ----------------------------------------------------------------------------
export async function processTranscript(meetingId: string): Promise<{
  success: boolean;
  error?: string;
  result?: ProcessingResult;
  tasksCreated?: number;
}> {
  const supabase = createAdminClient();

  try {
    // Get the meeting and transcript
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', meetingId)
      .single();

    if (meetingError || !meeting) {
      return {
        success: false,
        error: 'Meeting not found',
      };
    }

    const transcript = meeting.transcript;
    if (!transcript || transcript.trim().length === 0) {
      return {
        success: false,
        error: 'No transcript to process',
      };
    }

    // Generate a title if not set
    let title = meeting.title;
    if (!title || title.startsWith('Meeting')) {
      title = await generateMeetingTitle(transcript);
      
      await supabase
        .from('meetings')
        .update({ title })
        .eq('id', meetingId);
    }

    // Extract action items using OpenAI
    const prompt = `Analyze this meeting transcript and extract all action items. Return a JSON object with:
1. "actions": An array of action items, each with:
   - "action": What needs to be done (clear, actionable description)
   - "assignee": Who should do it (person name or "me" if unclear)
   - "priority": "high", "medium", or "low" based on urgency
   - "due": Due date if mentioned (ISO format) or null
2. "summary": A brief 2-3 sentence summary of the meeting

Meeting Transcript:
${transcript}

Respond with valid JSON only.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      return {
        success: false,
        error: 'No response from AI',
      };
    }

    const result = JSON.parse(content) as ProcessingResult;

    // Update meeting with extracted actions
    await supabase
      .from('meetings')
      .update({
        action_items: result.actions,
        summary: result.summary,
        processed: true,
        processed_at: new Date().toISOString(),
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', meetingId);

    // Create tasks from action items
    let tasksCreated = 0;
    for (const action of result.actions || []) {
      const { error: taskError } = await supabase.from('tasks').insert({
        user_id: meeting.user_id,
        title: action.action,
        description: `From meeting: ${title}\nAssignee: ${action.assignee || 'me'}`,
        priority: action.priority || 'medium',
        status: 'todo',
        source_type: 'meeting',
        source_id: meetingId,
        due_date: action.due,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (!taskError) {
        tasksCreated++;
      }
    }

    return {
      success: true,
      result,
      tasksCreated,
    };
  } catch (error) {
    console.error('[Transcription] Failed to process transcript:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process transcript',
    };
  }
}

// ----------------------------------------------------------------------------
// Generate Meeting Title
// ----------------------------------------------------------------------------
async function generateMeetingTitle(transcript: string): Promise<string> {
  try {
    const prompt = `Based on this meeting transcript, generate a short, descriptive title (5 words or less).

Transcript excerpt: ${transcript.slice(0, 1000)}

Return only the title, nothing else.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 30,
    });

    const title = response.choices[0].message.content?.trim() || 'Meeting';
    return title.replace(/["']/g, '');
  } catch (error) {
    console.error('[Transcription] Failed to generate title:', error);
    
    // Fallback: Use date
    return `Meeting ${new Date().toLocaleDateString()}`;
  }
}

// ----------------------------------------------------------------------------
// Get Active Connection
// ----------------------------------------------------------------------------
export function getActiveConnection(meetingId: string): {
  connection: ListenLiveClient;
  transcript: string;
  segments: TranscriptSegment[];
  startTime: Date;
} | undefined {
  return activeConnections.get(meetingId);
}

// ----------------------------------------------------------------------------
// Check if Transcription is Active
// ----------------------------------------------------------------------------
export function isTranscriptionActive(meetingId: string): boolean {
  return activeConnections.has(meetingId);
}
