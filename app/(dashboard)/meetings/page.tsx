// ============================================================================
// Meetings Page - Full meeting management with transcription
// ============================================================================

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Mic, ChevronLeft, Sparkles, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Meeting } from '@/types';
import { useMeetings } from '@/hooks/useMeetings';
import { MeetingCard } from '@/components/meetings/MeetingCard';
import { MeetingRecorder } from '@/components/meetings/MeetingRecorder';
import { TranscriptViewer } from '@/components/meetings/TranscriptViewer';
import { ActionItemsList } from '@/components/meetings/ActionItemsList';

// ----------------------------------------------------------------------------
// Meetings List View
// ----------------------------------------------------------------------------
function MeetingsListView({
  meetings,
  loading,
  onSelectMeeting,
  onCreateMeeting,
}: {
  meetings: Meeting[];
  loading: boolean;
  onSelectMeeting: (meeting: Meeting) => void;
  onCreateMeeting: () => void;
}) {
  // Filter meetings by status
  const recordingMeetings = meetings.filter(m => m.status === 'recording');
  const completedMeetings = meetings.filter(m => 
    m.status === 'completed' || m.status === 'processing'
  );
  const otherMeetings = meetings.filter(m => 
    m.status !== 'recording' && m.status !== 'completed' && m.status !== 'processing'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Meetings</h1>
          <p className="text-slate-500">Record and transcribe your meetings</p>
        </div>
        <Button onClick={onCreateMeeting}>
          <Plus className="w-4 h-4 mr-2" />
          New Meeting
        </Button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-24 bg-slate-200 rounded-lg animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && meetings.length === 0 && (
        <Card className="border-dashed border-2 border-slate-300">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mic className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">
              No Meetings Yet
            </h2>
            <p className="text-slate-500 max-w-md mx-auto mb-6">
              Start recording your meetings to automatically transcribe them
              and extract action items.
            </p>
            <Button onClick={onCreateMeeting}>
              <Plus className="w-4 h-4 mr-2" />
              Start Your First Meeting
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Active Recordings */}
      {!loading && recordingMeetings.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center">
            <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse" />
            Recording Now
          </h2>
          <div className="space-y-3">
            {recordingMeetings.map(meeting => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                onClick={onSelectMeeting}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed Meetings */}
      {!loading && completedMeetings.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-3">
            Recent Meetings
          </h2>
          <div className="space-y-3">
            {completedMeetings.map(meeting => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                onClick={onSelectMeeting}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other Meetings */}
      {!loading && otherMeetings.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-3">
            Draft Meetings
          </h2>
          <div className="space-y-3">
            {otherMeetings.map(meeting => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                onClick={onSelectMeeting}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Meeting Detail View
// ----------------------------------------------------------------------------
function MeetingDetailView({
  meeting,
  onBack,
  recordingStatus,
  transcriptSegments,
  onStartRecording,
  onStopRecording,
  onProcessTranscript,
}: {
  meeting: Meeting;
  onBack: () => void;
  recordingStatus: string;
  transcriptSegments: TranscriptSegment[];
  onStartRecording: (id: string) => Promise<boolean>;
  onStopRecording: (id: string) => Promise<boolean>;
  onProcessTranscript: (id: string) => Promise<{
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
}) {
  const [activeTab, setActiveTab] = useState<'record' | 'transcript' | 'actions'>('record');

  // Determine default tab based on meeting state
  const getDefaultTab = () => {
    if (meeting.status === 'idle') return 'record';
    if (meeting.transcript && meeting.processed) return 'actions';
    if (meeting.transcript) return 'transcript';
    return 'record';
  };

  // Set initial tab
  if (activeTab === 'record' && meeting.status !== 'idle') {
    const defaultTab = getDefaultTab();
    if (defaultTab !== 'record') {
      setActiveTab(defaultTab);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              {meeting.title || 'Untitled Meeting'}
            </h1>
            <p className="text-sm text-slate-500">
              {new Date(meeting.created_at).toLocaleDateString('en-AU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('record')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            activeTab === 'record'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <Mic className="w-4 h-4 inline mr-2" />
          Record
        </button>
        <button
          onClick={() => setActiveTab('transcript')}
          disabled={!meeting.transcript}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            activeTab === 'transcript'
              ? 'bg-white text-slate-800 shadow-sm'
              : meeting.transcript
              ? 'text-slate-600 hover:text-slate-800'
              : 'text-slate-400 cursor-not-allowed'
          }`}
        >
          <FileText className="w-4 h-4 inline mr-2" />
          Transcript
        </button>
        <button
          onClick={() => setActiveTab('actions')}
          disabled={!meeting.processed}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            activeTab === 'actions'
              ? 'bg-white text-slate-800 shadow-sm'
              : meeting.processed
              ? 'text-slate-600 hover:text-slate-800'
              : 'text-slate-400 cursor-not-allowed'
          }`}
        >
          <Sparkles className="w-4 h-4 inline mr-2" />
          Actions
        </button>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'record' && (
          <motion.div
            key="record"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <MeetingRecorder
              meeting={meeting}
              onStartRecording={onStartRecording}
              onStopRecording={onStopRecording}
              onProcessTranscript={onProcessTranscript}
              recordingStatus={recordingStatus as Meeting['status']}
              transcriptSegments={transcriptSegments}
            />
          </motion.div>
        )}

        {activeTab === 'transcript' && meeting.transcript && (
          <motion.div
            key="transcript"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <TranscriptViewer
              transcript={meeting.transcript}
              segments={meeting.transcript_segments || undefined}
              meetingTitle={meeting.title || undefined}
            />
          </motion.div>
        )}

        {activeTab === 'actions' && (
          <motion.div
            key="actions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {meeting.summary && (
              <Card className="mb-4 border-blue-200 bg-blue-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-blue-800">
                    Meeting Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-blue-700">{meeting.summary}</p>
                </CardContent>
              </Card>
            )}

            <ActionItemsList
              actionItems={meeting.action_items || []}
              showCreateButtons={false}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Main Meetings Page
// ----------------------------------------------------------------------------
export default function MeetingsPage() {
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const {
    meetings,
    loading,
    currentMeeting,
    recordingStatus,
    transcriptSegments,
    fetchMeeting,
    createMeeting,
    startRecording,
    stopRecording,
    processTranscript,
    subscribeToMeeting,
    unsubscribeFromMeeting,
  } = useMeetings();

  // Handle create meeting
  const handleCreateMeeting = async () => {
    setIsCreating(true);
    try {
      const meeting = await createMeeting();
      if (meeting) {
        setSelectedMeeting(meeting);
      }
    } finally {
      setIsCreating(false);
    }
  };

  // Handle select meeting
  const handleSelectMeeting = async (meeting: Meeting) => {
    // Fetch full meeting details
    const fullMeeting = await fetchMeeting(meeting.id);
    if (fullMeeting) {
      setSelectedMeeting(fullMeeting);
      // Subscribe to real-time updates
      subscribeToMeeting(meeting.id);
    }
  };

  // Handle back
  const handleBack = () => {
    setSelectedMeeting(null);
    unsubscribeFromMeeting();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <AnimatePresence mode="wait">
        {selectedMeeting ? (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <MeetingDetailView
              meeting={selectedMeeting}
              onBack={handleBack}
              recordingStatus={recordingStatus}
              transcriptSegments={transcriptSegments}
              onStartRecording={startRecording}
              onStopRecording={stopRecording}
              onProcessTranscript={processTranscript}
            />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <MeetingsListView
              meetings={meetings}
              loading={loading}
              onSelectMeeting={handleSelectMeeting}
              onCreateMeeting={handleCreateMeeting}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
