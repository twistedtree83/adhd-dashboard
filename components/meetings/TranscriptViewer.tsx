// ============================================================================
// Transcript Viewer Component - Full transcript with timestamps and speakers
// ============================================================================

'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, User, Download, Copy, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TranscriptSegment } from '@/types';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
interface TranscriptViewerProps {
  transcript: string;
  segments?: TranscriptSegment[];
  meetingTitle?: string;
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export function TranscriptViewer({
  transcript,
  segments,
  meetingTitle,
}: TranscriptViewerProps) {
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new segments
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [segments]);

  // Format timestamp
  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(transcript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Handle download
  const handleDownload = () => {
    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meetingTitle || 'meeting'}-transcript.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Get speaker color
  const getSpeakerColor = (speaker?: number) => {
    const colors = [
      'bg-blue-100 text-blue-700 border-blue-200',
      'bg-green-100 text-green-700 border-green-200',
      'bg-purple-100 text-purple-700 border-purple-200',
      'bg-orange-100 text-orange-700 border-orange-200',
      'bg-pink-100 text-pink-700 border-pink-200',
    ];
    return colors[(speaker || 0) % colors.length];
  };

  // Filter segments based on search
  const filteredSegments = segments?.filter(segment =>
    segment.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Simple transcript view (no segments)
  const SimpleTranscript = () => (
    <div className="prose prose-slate max-w-none">
      <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
        {transcript}
      </p>
    </div>
  );

  // Segmented transcript view
  const SegmentedTranscript = () => (
    <div className="space-y-4">
      {filteredSegments?.map((segment, index) => (
        <motion.div
          key={segment.id || index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.02 }}
          className="flex items-start space-x-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
        >
          {/* Timestamp */}
          <div className="flex-shrink-0 w-14 text-xs font-mono text-slate-400 pt-1">
            {formatTimestamp(segment.start)}
          </div>

          {/* Speaker & Content */}
          <div className="flex-1 min-w-0">
            {segment.speaker !== undefined && (
              <Badge
                variant="outline"
                className={`mb-2 ${getSpeakerColor(segment.speaker)}`}
              >
                <User className="w-3 h-3 mr-1" />
                Speaker {segment.speaker + 1}
              </Badge>
            )}
            <p className="text-slate-700 leading-relaxed">
              {highlightSearch(segment.text)}
            </p>
            {segment.confidence && (
              <p className="text-xs text-slate-400 mt-1">
                Confidence: {Math.round(segment.confidence * 100)}%
              </p>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );

  // Highlight search matches
  const highlightSearch = (text: string) => {
    if (!searchQuery) return text;
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CardTitle className="text-lg">Transcript</CardTitle>
            {segments && (
              <Badge variant="secondary">
                {segments.length} segment{segments.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="text-slate-600"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="text-slate-600"
            >
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
          </div>
        </div>

        {/* Search */}
        {segments && segments.length > 0 && (
          <div className="mt-3">
            <input
              type="text"
              placeholder="Search transcript..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div
          ref={scrollRef}
          className="max-h-[500px] overflow-y-auto pr-2"
        >
          {segments && segments.length > 0 ? (
            <SegmentedTranscript />
          ) : (
            <SimpleTranscript />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
