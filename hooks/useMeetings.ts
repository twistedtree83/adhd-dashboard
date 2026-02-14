// ============================================================================
// useMeetings Hook - Meeting management with real-time updates
// ============================================================================

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Meeting, MeetingStatus, TranscriptSegment, MeetingActionItem } from '@/types';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export interface UseMeetingsReturn {
  meetings: Meeting[];
  currentMeeting: Meeting | null;
  loading: boolean;
  error: string | null;
  recordingStatus: MeetingStatus;
  currentTranscript: string;
  transcriptSegments: TranscriptSegment[];
  isRecording: boolean;
  
  // Actions
  fetchMeetings: () => Promise<void>;
  fetchMeeting: (id: string) => Promise<Meeting | null>;
  createMeeting: (title?: string) => Promise<Meeting | null>;
  updateMeeting: (id: string, updates: Partial<Meeting>) => Promise<Meeting | null>;
  deleteMeeting: (id: string) => Promise<boolean>;
  
  // Recording
  startRecording: (meetingId: string) => Promise<boolean>;
  stopRecording: (meetingId: string) => Promise<boolean>;
  
  // Processing
  processTranscript: (meetingId: string) => Promise<{
    success: boolean;
    actionItems?: MeetingActionItem[];
    tasksCreated?: number;
    summary?: string;
  }>;
  
  // Real-time
  subscribeToMeeting: (meetingId: string) => void;
  unsubscribeFromMeeting: () => void;
}

// ----------------------------------------------------------------------------
// useMeetings Hook
// ----------------------------------------------------------------------------
export function useMeetings(): UseMeetingsReturn {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [currentMeeting, setCurrentMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recordingStatus, setRecordingStatus] = useState<MeetingStatus>('idle');
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  
  const supabase = createBrowserClient();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ----------------------------------------------------------------------------
  // Fetch all meetings
  // ----------------------------------------------------------------------------
  const fetchMeetings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const response = await fetch('/api/meetings');
      if (!response.ok) throw new Error('Failed to fetch meetings');

      const data = await response.json();
      setMeetings(data.meetings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch meetings');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // ----------------------------------------------------------------------------
  // Fetch single meeting
  // ----------------------------------------------------------------------------
  const fetchMeeting = useCallback(async (id: string): Promise<Meeting | null> => {
    try {
      setError(null);

      const response = await fetch(`/api/meetings/${id}`);
      if (!response.ok) throw new Error('Failed to fetch meeting');

      const data = await response.json();
      const meeting = data.meeting as Meeting;
      
      setCurrentMeeting(meeting);
      setRecordingStatus(meeting.status);
      setCurrentTranscript(meeting.transcript || '');
      setTranscriptSegments(meeting.transcript_segments || []);
      
      return meeting;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch meeting');
      return null;
    }
  }, []);

  // ----------------------------------------------------------------------------
  // Create meeting
  // ----------------------------------------------------------------------------
  const createMeeting = useCallback(async (title?: string): Promise<Meeting | null> => {
    try {
      setError(null);

      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) throw new Error('Failed to create meeting');

      const data = await response.json();
      const newMeeting = data.meeting as Meeting;
      
      setMeetings(prev => [newMeeting, ...prev]);
      setCurrentMeeting(newMeeting);
      
      return newMeeting;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create meeting');
      return null;
    }
  }, []);

  // ----------------------------------------------------------------------------
  // Update meeting
  // ----------------------------------------------------------------------------
  const updateMeeting = useCallback(async (
    id: string,
    updates: Partial<Meeting>
  ): Promise<Meeting | null> => {
    try {
      setError(null);

      const response = await fetch(`/api/meetings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update meeting');

      const data = await response.json();
      const updatedMeeting = data.meeting as Meeting;
      
      setMeetings(prev =>
        prev.map(m => (m.id === id ? updatedMeeting : m))
      );
      
      if (currentMeeting?.id === id) {
        setCurrentMeeting(updatedMeeting);
      }
      
      return updatedMeeting;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update meeting');
      return null;
    }
  }, [currentMeeting]);

  // ----------------------------------------------------------------------------
  // Delete meeting
  // ----------------------------------------------------------------------------
  const deleteMeeting = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);

      const response = await fetch(`/api/meetings/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete meeting');

      setMeetings(prev => prev.filter(m => m.id !== id));
      
      if (currentMeeting?.id === id) {
        setCurrentMeeting(null);
      }
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete meeting');
      return false;
    }
  }, [currentMeeting]);

  // ----------------------------------------------------------------------------
  // Start recording
  // ----------------------------------------------------------------------------
  const startRecording = useCallback(async (meetingId: string): Promise<boolean> => {
    try {
      setError(null);
      setRecordingStatus('recording');
      setIsRecording(true);

      // Call API to start transcription
      const response = await fetch(`/api/meetings/${meetingId}/transcribe`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start recording');
      }

      // Start browser audio recording
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      mediaRecorderRef.current = mediaRecorder;

      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        
        // Upload audio for transcription
        const formData = new FormData();
        formData.append('audio', audioBlob);
        formData.append('meetingId', meetingId);

        try {
          await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          });
        } catch (err) {
          console.error('Failed to upload audio:', err);
        }
      };

      mediaRecorder.start(1000); // Collect data every second

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      setRecordingStatus('error');
      setIsRecording(false);
      return false;
    }
  }, []);

  // ----------------------------------------------------------------------------
  // Stop recording
  // ----------------------------------------------------------------------------
  const stopRecording = useCallback(async (meetingId: string): Promise<boolean> => {
    try {
      setError(null);
      setRecordingStatus('processing');
      setIsRecording(false);

      // Stop media recorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }

      // Stop audio stream
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }

      // Clear recording interval
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }

      // Call API to stop transcription
      const response = await fetch(`/api/meetings/${meetingId}/transcribe`, {
        method: 'PUT',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to stop recording');
      }

      setRecordingStatus('completed');
      
      // Refresh meeting data
      await fetchMeeting(meetingId);
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop recording');
      setRecordingStatus('error');
      return false;
    }
  }, [fetchMeeting]);

  // ----------------------------------------------------------------------------
  // Process transcript
  // ----------------------------------------------------------------------------
  const processTranscript = useCallback(async (
    meetingId: string
  ): Promise<{
    success: boolean;
    actionItems?: MeetingActionItem[];
    tasksCreated?: number;
    summary?: string;
  }> => {
    try {
      setError(null);
      setRecordingStatus('processing');

      const response = await fetch(`/api/meetings/${meetingId}/process`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process transcript');
      }

      const data = await response.json();
      
      setRecordingStatus('completed');
      
      // Refresh meeting data
      await fetchMeeting(meetingId);
      
      return {
        success: true,
        actionItems: data.actionItems,
        tasksCreated: data.tasksCreated,
        summary: data.summary,
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process transcript');
      setRecordingStatus('error');
      return { success: false };
    }
  }, [fetchMeeting]);

  // ----------------------------------------------------------------------------
  // Subscribe to real-time updates
  // ----------------------------------------------------------------------------
  const subscribeToMeeting = useCallback((meetingId: string) => {
    // Unsubscribe from any existing subscription
    unsubscribeFromMeeting();

    const channel = supabase
      .channel(`meeting-${meetingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'meetings',
          filter: `id=eq.${meetingId}`,
        },
        (payload) => {
          const updatedMeeting = payload.new as Meeting;
          
          setCurrentMeeting(prev => {
            if (!prev) return updatedMeeting;
            return { ...prev, ...updatedMeeting };
          });
          
          setRecordingStatus(updatedMeeting.status);
          
          if (updatedMeeting.transcript) {
            setCurrentTranscript(updatedMeeting.transcript);
          }
          
          if (updatedMeeting.transcript_segments) {
            setTranscriptSegments(updatedMeeting.transcript_segments);
          }
        }
      )
      .subscribe();

    subscriptionRef.current = channel;
  }, [supabase]);

  // ----------------------------------------------------------------------------
  // Unsubscribe from real-time updates
  // ----------------------------------------------------------------------------
  const unsubscribeFromMeeting = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
  }, []);

  // ----------------------------------------------------------------------------
  // Cleanup on unmount
  // ----------------------------------------------------------------------------
  useEffect(() => {
    return () => {
      unsubscribeFromMeeting();
      
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [unsubscribeFromMeeting]);

  // ----------------------------------------------------------------------------
  // Initial fetch
  // ----------------------------------------------------------------------------
  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  return {
    meetings,
    currentMeeting,
    loading,
    error,
    recordingStatus,
    currentTranscript,
    transcriptSegments,
    isRecording,
    fetchMeetings,
    fetchMeeting,
    createMeeting,
    updateMeeting,
    deleteMeeting,
    startRecording,
    stopRecording,
    processTranscript,
    subscribeToMeeting,
    unsubscribeFromMeeting,
  };
}
