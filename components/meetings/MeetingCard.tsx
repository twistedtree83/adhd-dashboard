// ============================================================================
// Meeting Card Component - Display meeting in list
// ============================================================================

'use client';

import { motion } from 'framer-motion';
import { Mic, Calendar, Clock, ChevronRight, FileText, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Meeting, MeetingStatus } from '@/types';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
interface MeetingCardProps {
  meeting: Meeting;
  onClick: (meeting: Meeting) => void;
  compact?: boolean;
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export function MeetingCard({ meeting, onClick, compact = false }: MeetingCardProps) {
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const getStatusConfig = (status: MeetingStatus) => {
    switch (status) {
      case 'recording':
        return {
          color: 'bg-red-100 text-red-700 border-red-200',
          icon: <Mic className="w-3 h-3" />,
          label: 'Recording',
        };
      case 'processing':
        return {
          color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
          icon: <Clock className="w-3 h-3 animate-spin" />,
          label: 'Processing',
        };
      case 'completed':
        return meeting.processed
          ? {
              color: 'bg-green-100 text-green-700 border-green-200',
              icon: <CheckCircle2 className="w-3 h-3" />,
              label: 'Processed',
            }
          : {
              color: 'bg-blue-100 text-blue-700 border-blue-200',
              icon: <FileText className="w-3 h-3" />,
              label: 'Completed',
            };
      case 'error':
        return {
          color: 'bg-red-100 text-red-700 border-red-200',
          icon: <FileText className="w-3 h-3" />,
          label: 'Error',
        };
      default:
        return {
          color: 'bg-slate-100 text-slate-600 border-slate-200',
          icon: <Mic className="w-3 h-3" />,
          label: 'Ready',
        };
    }
  };

  const statusConfig = getStatusConfig(meeting.status);

  // Get transcript preview
  const getTranscriptPreview = () => {
    if (!meeting.transcript) return null;
    const preview = meeting.transcript.slice(0, 120);
    return preview.length < meeting.transcript.length ? preview + '...' : preview;
  };

  // Get action items count
  const getActionItemsCount = () => {
    if (!meeting.action_items || meeting.action_items.length === 0) return null;
    return meeting.action_items.length;
  };

  if (compact) {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onClick(meeting)}
        className="cursor-pointer"
      >
        <Card className="border-slate-200 hover:border-blue-300 hover:shadow-md transition-all">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Mic className="w-5 h-5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium text-slate-800 truncate">
                    {meeting.title || 'Untitled Meeting'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {formatDate(meeting.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 flex-shrink-0">
                <Badge variant="outline" className={statusConfig.color}>
                  {statusConfig.icon}
                  <span className="ml-1">{statusConfig.label}</span>
                </Badge>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onClick(meeting)}
      className="cursor-pointer"
    >
      <Card className="border-slate-200 hover:border-blue-300 hover:shadow-md transition-all">
        <CardContent className="p-4">
          <div className="flex items-start space-x-4">
            {/* Icon */}
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Mic className="w-6 h-6 text-blue-600" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800">
                    {meeting.title || 'Untitled Meeting'}
                  </h3>
                  <div className="flex items-center space-x-3 mt-1 text-sm text-slate-500">
                    <span className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {formatDate(meeting.created_at)}
                    </span>
                    {meeting.duration_seconds && (
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatDuration(meeting.duration_seconds)}
                      </span>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className={statusConfig.color}>
                  {statusConfig.icon}
                  <span className="ml-1">{statusConfig.label}</span>
                </Badge>
              </div>

              {/* Transcript Preview */}
              {getTranscriptPreview() && (
                <p className="mt-3 text-sm text-slate-600 line-clamp-2">
                  {getTranscriptPreview()}
                </p>
              )}

              {/* Action Items Badge */}
              {getActionItemsCount() && (
                <div className="mt-3">
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {getActionItemsCount()} action item{getActionItemsCount() !== 1 ? 's' : ''}
                  </Badge>
                </div>
              )}
            </div>

            {/* Arrow */}
            <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0 self-center" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
