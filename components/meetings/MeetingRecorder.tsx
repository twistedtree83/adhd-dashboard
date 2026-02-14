// ============================================================================
// Meeting Recorder Component - Recording interface with live transcription
// ============================================================================

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Pause, Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Meeting, MeetingStatus, TranscriptSegment } from '@/types';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
interface MeetingRecorderProps {
  meeting: Meeting;
  onStartRecording: (meetingId: string) => Promise<boolean>;
  onStopRecording: (meetingId: string) => Promise<boolean>;
  onProcessTranscript: (meetingId: string) => Promise<{
    success: boolean;
    actionItems?: Array<{
      action: string;
      assignee?: string;
      priority: 'high' | 'medium' | 'low';
      due?: string | null;
    }>;
    tasksCreated?: number;
    summary?: string;
  }>;
  recordingStatus: MeetingStatus;
  transcriptSegments: TranscriptSegment[];
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export function MeetingRecorder({
  meeting,
  onStartRecording,
  onStopRecording,
  onProcessTranscript,
  recordingStatus,
  transcriptSegments,
}: MeetingRecorderProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll transcript
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcriptSegments, liveTranscript]);

  // Timer for recording duration
  useEffect(() => {
    if (recordingStatus === 'recording') {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (recordingStatus === 'idle') {
        setElapsedTime(0);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [recordingStatus]);

  // Format elapsed time
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Handle start recording
  const handleStart = async () => {
    setIsStarting(true);
    try {
      await onStartRecording(meeting.id);
    } finally {
      setIsStarting(false);
    }
  };

  // Handle stop recording
  const handleStop = async () => {
    setIsStopping(true);
    try {
      await onStopRecording(meeting.id);
    } finally {
      setIsStopping(false);
    }
  };

  // Handle process transcript
  const handleProcess = async () => {
    setIsProcessing(true);
    try {
      await onProcessTranscript(meeting.id);
    } finally {
      setIsProcessing(false);
    }
  };

  // Get status color
  const getStatusColor = () => {
    switch (recordingStatus) {
      case 'recording':
        return 'text-red-500';
      case 'processing':
        return 'text-yellow-500';
      case 'completed':
        return 'text-green-500';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-slate-400';
    }
  };

  // Get status text
  const getStatusText = () => {
    switch (recordingStatus) {
      case 'recording':
        return 'Recording...';
      case 'processing':
        return 'Processing...';
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Error';
      default:
        return 'Ready to record';
    }
  };

  return (
    <div className="space-y-4">
      {/* Recording Control Card */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-6">
            {/* Status Indicator */}
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${getStatusColor()} ${
                recordingStatus === 'recording' ? 'animate-pulse' : ''
              }`} />
              <span className={`font-medium ${getStatusColor()}`}>
                {getStatusText()}
              </span>
              {recordingStatus === 'recording' && (
                <span className="text-slate-500 font-mono">
                  {formatTime(elapsedTime)}
                </span>
              )}
            </div>

            {/* Main Control Button */}
            <AnimatePresence mode="wait">
              {recordingStatus === 'idle' && (
                <motion.div
                  key="start"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                >
                  <Button
                    size="lg"
                    onClick={handleStart}
                    disabled={isStarting}
                    className="w-24 h-24 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg"
                  >
                    {isStarting ? (
                      <Loader2 className="w-8 h-8 animate-spin" />
                    ) : (
                      <Mic className="w-10 h-10" />
                    )}
                  </Button>
                </motion.div>
              )}

              {recordingStatus === 'recording' && (
                <motion.div
                  key="stop"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                >
                  <Button
                    size="lg"
                    onClick={handleStop}
                    disabled={isStopping}
                    className="w-24 h-24 rounded-full bg-slate-800 hover:bg-slate-900 text-white shadow-lg"
                  >
                    {isStopping ? (
                      <Loader2 className="w-8 h-8 animate-spin" />
                    ) : (
                      <Square className="w-10 h-10 fill-current" />
                    )}
                  </Button>
                </motion.div>
              )}

              {(recordingStatus === 'completed' || recordingStatus === 'processing') && (
                <motion.div
                  key="complete"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex flex-col items-center space-y-4"
                >
                  <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200 }}
                    >
                      <svg
                        className="w-12 h-12 text-green-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </motion.div>
                  </div>
                  
                  {!meeting.processed && recordingStatus === 'completed' && (
                    <Button
                      onClick={handleProcess}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Extract Action Items'
                      )}
                    </Button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Instructions */}
            <p className="text-sm text-slate-500 text-center max-w-xs">
              {recordingStatus === 'idle' && 'Tap the microphone to start recording'}
              {recordingStatus === 'recording' && 'Recording in progress. Tap stop when finished.'}
              {recordingStatus === 'completed' && !meeting.processed && 'Recording complete. Extract action items to create tasks.'}
              {recordingStatus === 'completed' && meeting.processed && 'Meeting processed. Action items have been extracted.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Live Transcript */}
      {(recordingStatus === 'recording' || transcriptSegments.length > 0) && (
        <Card>
          <CardContent className="pt-4">
            <h3 className="text-sm font-medium text-slate-700 mb-3">
              Live Transcript
            </h3>
            <div
              ref={scrollRef}
              className="h-48 overflow-y-auto space-y-2 p-2 bg-slate-50 rounded-lg"
            >
              {transcriptSegments.length === 0 ? (
                <p className="text-slate-400 text-center py-8">
                  Waiting for speech...
                </p>
              ) : (
                transcriptSegments.map((segment, index) => (
                  <motion.div
                    key={segment.id || index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm"
                  >
                    {segment.speaker !== undefined && (
                      <span className="text-xs font-medium text-blue-600 mr-2">
                        Speaker {segment.speaker + 1}
                      </span>
                    )}
                    <span className="text-xs text-slate-400 mr-2">
                      {formatTime(Math.floor(segment.start))}
                    </span>
                    <span className="text-slate-700">{segment.text}</span>
                  </motion.div>
                ))
              )}
              {liveTranscript && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.6 }}
                  className="text-sm text-slate-500 italic"
                >
                  {liveTranscript}...
                </motion.p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
