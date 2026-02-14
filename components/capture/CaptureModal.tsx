// ============================================================================
// Capture Modal - Ultra-fast task capture (< 5 seconds target)
// ============================================================================

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Keyboard, X, Send, Loader2, RotateCcw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface CaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (task: { title: string; priority: string; location_id?: string }) => void;
}

type RecordingState = 'idle' | 'requesting' | 'recording' | 'transcribing' | 'preview' | 'error';

export function CaptureModal({ isOpen, onClose, onCapture }: CaptureModalProps) {
  const [mode, setMode] = useState<'text' | 'voice'>('text');
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Voice recording states
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Refs for recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Reset state when modal closes
  const resetState = useCallback(() => {
    setTitle('');
    setPriority('medium');
    setRecordingState('idle');
    setRecordingTime(0);
    setAudioLevel(0);
    setErrorMessage('');
    stopRecordingCleanup();
  }, []);

  // Cleanup function for recording
  const stopRecordingCleanup = useCallback(() => {
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // Ignore errors when stopping
      }
    }
    mediaRecorderRef.current = null;

    // Stop all tracks in the stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    analyserRef.current = null;
  }, []);

  // Handle modal close
  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen && mode === 'text') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, mode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecordingCleanup();
    };
  }, [stopRecordingCleanup]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        handleClose();
      }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, title, priority, handleClose]);

  // Audio visualization
  const visualizeAudio = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate average volume
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    setAudioLevel(average / 255); // Normalize to 0-1

    animationFrameRef.current = requestAnimationFrame(visualizeAudio);
  }, []);

  // Start recording
  const startRecording = async () => {
    setRecordingState('requesting');
    setErrorMessage('');

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      streamRef.current = stream;

      // Set up audio context for visualization
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        await transcribeAudio(audioBlob);
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setRecordingState('recording');

      // Start timer
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Start visualization
      visualizeAudio();

    } catch (error: any) {
      console.error('Failed to start recording:', error);
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setErrorMessage('Microphone access denied. Please allow microphone access and try again.');
        toast.error('Microphone access denied', {
          description: 'Please allow microphone access in your browser settings.',
        });
      } else if (error.name === 'NotFoundError') {
        setErrorMessage('No microphone found. Please connect a microphone and try again.');
        toast.error('No microphone found');
      } else {
        setErrorMessage('Failed to access microphone. Please try again.');
        toast.error('Recording failed');
      }
      
      setRecordingState('error');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    stopRecordingCleanup();
  };

  // Transcribe audio
  const transcribeAudio = async (audioBlob: Blob) => {
    setRecordingState('transcribing');

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Transcription failed');
      }

      if (data.text) {
        setTitle(data.text);
        setRecordingState('preview');
        toast.success('Transcription complete');
      } else {
        throw new Error('No transcription received');
      }
    } catch (error: any) {
      console.error('Transcription error:', error);
      setErrorMessage(error.message || 'Failed to transcribe audio');
      setRecordingState('error');
      toast.error('Transcription failed', {
        description: error.message || 'Please try again',
      });
    }
  };

  // Retry recording
  const retryRecording = () => {
    setTitle('');
    setErrorMessage('');
    setRecordingState('idle');
  };

  // Format recording time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    
    setIsSubmitting(true);
    onCapture({ title: title.trim(), priority });
    
    // Reset and close
    resetState();
    onClose();
  };

  const priorityButtons = [
    { value: 'low', label: 'Low', color: 'bg-green-500' },
    { value: 'medium', label: 'Med', color: 'bg-yellow-500' },
    { value: 'high', label: 'High', color: 'bg-orange-500' },
    { value: 'urgent', label: 'Urgent', color: 'bg-red-500' },
  ];

  // Generate waveform bars
  const renderWaveform = () => {
    const bars = 20;
    return (
      <div className="flex items-center justify-center gap-1 h-16">
        {Array.from({ length: bars }).map((_, i) => {
          // Create a dynamic height based on audio level and position
          const baseHeight = 20;
          const dynamicHeight = audioLevel * 80;
          const positionFactor = Math.sin((Date.now() / 200) + (i * 0.5)) * 0.5 + 0.5;
          const height = Math.max(4, baseHeight + dynamicHeight * positionFactor);
          
          return (
            <motion.div
              key={i}
              className="w-1.5 bg-red-500 rounded-full"
              animate={{
                height: recordingState === 'recording' ? height : 8,
                opacity: recordingState === 'recording' ? 1 : 0.5,
              }}
              transition={{
                duration: 0.1,
                ease: 'easeInOut',
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        <DialogTitle className="sr-only">Quick Capture Task</DialogTitle>
        {/* Header with mode toggle */}
        <div className="flex items-center justify-between p-4 border-b bg-slate-50">
          <div className="flex space-x-2">
            <button
              onClick={() => setMode('text')}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                mode === 'text'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Keyboard className="w-4 h-4" />
              <span>Type</span>
            </button>
            <button
              onClick={() => setMode('voice')}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                mode === 'voice'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Mic className="w-4 h-4" />
              <span>Voice</span>
            </button>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <AnimatePresence mode="wait">
            {mode === 'text' ? (
              <motion.div
                key="text"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {/* Quick text input */}
                <textarea
                  ref={inputRef}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What do you need to do?"
                  className="w-full h-24 p-3 text-lg border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-0 resize-none"
                />

                {/* Priority selector */}
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Priority
                  </label>
                  <div className="flex space-x-2 mt-1">
                    {priorityButtons.map((btn) => (
                      <button
                        key={btn.value}
                        onClick={() => setPriority(btn.value)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                          priority === btn.value
                            ? `${btn.color} text-white shadow-md`
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit button */}
                <Button
                  onClick={handleSubmit}
                  disabled={!title.trim() || isSubmitting}
                  className="w-full h-12 text-lg font-semibold"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Create Task
                      <span className="ml-2 text-xs opacity-70">(Ctrl+Enter)</span>
                    </>
                  )}
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="voice"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Recording States */}
                {recordingState === 'idle' && (
                  <div className="text-center py-8 space-y-6">
                    <div className="flex flex-col items-center">
                      <button
                        onClick={startRecording}
                        className="w-20 h-20 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95"
                      >
                        <Mic className="w-8 h-8" />
                      </button>
                      <p className="mt-4 text-slate-600 font-medium">
                        Tap to start recording
                      </p>
                      <p className="text-sm text-slate-400">
                        Speak clearly to capture your task
                      </p>
                    </div>
                  </div>
                )}

                {recordingState === 'requesting' && (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
                    <p className="mt-4 text-slate-600">Requesting microphone access...</p>
                  </div>
                )}

                {recordingState === 'recording' && (
                  <div className="text-center py-4 space-y-4">
                    {/* Timer */}
                    <div className="text-3xl font-mono font-bold text-slate-800">
                      {formatTime(recordingTime)}
                    </div>

                    {/* Waveform visualization */}
                    {renderWaveform()}

                    {/* Recording indicator */}
                    <div className="flex items-center justify-center gap-2 text-red-500">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      </span>
                      <span className="text-sm font-medium">Recording...</span>
                    </div>

                    {/* Stop button */}
                    <button
                      onClick={stopRecording}
                      className="w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95"
                    >
                      <div className="w-6 h-6 bg-white rounded-sm" />
                    </button>
                    <p className="text-sm text-slate-400">Tap to stop</p>
                  </div>
                )}

                {recordingState === 'transcribing' && (
                  <div className="text-center py-12 space-y-4">
                    <Loader2 className="w-10 h-10 animate-spin mx-auto text-blue-500" />
                    <p className="text-slate-600 font-medium">Transcribing your voice...</p>
                    <p className="text-sm text-slate-400">Using AI to convert speech to text</p>
                  </div>
                )}

                {recordingState === 'preview' && (
                  <div className="space-y-4">
                    {/* Transcription preview */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Transcribed Text
                      </label>
                      <textarea
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full h-24 p-3 text-lg border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-0 resize-none"
                        placeholder="Your transcribed text will appear here..."
                      />
                    </div>

                    {/* Priority selector */}
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Priority
                      </label>
                      <div className="flex space-x-2 mt-1">
                        {priorityButtons.map((btn) => (
                          <button
                            key={btn.value}
                            onClick={() => setPriority(btn.value)}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                              priority === btn.value
                                ? `${btn.color} text-white shadow-md`
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={retryRecording}
                        className="flex-1 h-12"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Re-record
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        disabled={!title.trim() || isSubmitting}
                        className="flex-1 h-12"
                      >
                        {isSubmitting ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Create Task
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {recordingState === 'error' && (
                  <div className="text-center py-8 space-y-4">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto">
                      <AlertCircle className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-slate-800 font-medium">Recording Failed</p>
                      <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
                        {errorMessage}
                      </p>
                    </div>
                    <div className="flex gap-2 justify-center">
                      <Button
                        variant="outline"
                        onClick={() => setMode('text')}
                      >
                        Use Text
                      </Button>
                      <Button onClick={retryRecording}>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Try Again
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
