// ============================================================================
// Email Card Component - Display email with action items
// ============================================================================

'use client';

import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Trash2,
  Archive,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Plus,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Email, EmailStatus, ActionItem } from '@/types';
import { formatDistanceToNow } from 'date-fns';

interface EmailCardProps {
  email: Email;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onProcess: (email: Email) => void;
  onCreateTask: (emailId: string, actionItem: ActionItem) => void;
}

const statusConfig: Record<EmailStatus, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  pending: {
    color: 'text-yellow-600',
    bg: 'bg-yellow-50 border-yellow-200',
    icon: <Clock className="w-3 h-3" />,
    label: 'Pending',
  },
  processing: {
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200',
    icon: <Sparkles className="w-3 h-3" />,
    label: 'Processing',
  },
  processed: {
    color: 'text-green-600',
    bg: 'bg-green-50 border-green-200',
    icon: <CheckCircle className="w-3 h-3" />,
    label: 'Processed',
  },
  archived: {
    color: 'text-slate-600',
    bg: 'bg-slate-50 border-slate-200',
    icon: <Archive className="w-3 h-3" />,
    label: 'Archived',
  },
  ignored: {
    color: 'text-gray-600',
    bg: 'bg-gray-50 border-gray-200',
    icon: <AlertCircle className="w-3 h-3" />,
    label: 'Ignored',
  },
};

export const EmailCard = memo(function EmailCard({
  email,
  onDelete,
  onArchive,
  onProcess,
  onCreateTask,
}: EmailCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showActionItems, setShowActionItems] = useState(true);

  const status = statusConfig[email.status];
  const hasActionItems = email.action_items && email.action_items.length > 0;

  // Truncate body text for preview
  const previewText = email.body_text
    ? email.body_text.substring(0, 200).replace(/\s+/g, ' ').trim() + (email.body_text.length > 200 ? '...' : '')
    : 'No content';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={`relative bg-white dark:bg-slate-800 rounded-xl border transition-all ${
        email.status === 'processed' || email.status === 'archived'
          ? 'border-slate-100 dark:border-slate-700 opacity-75'
          : 'border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start space-x-3">
          {/* Status Icon */}
          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${status.bg}`}>
            <Mail className={`w-5 h-5 ${status.color}`} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div
              className="cursor-pointer"
              onClick={() => setIsExpanded(!isExpanded)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setIsExpanded(!isExpanded);
                }
              }}
              aria-expanded={isExpanded}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-slate-800 dark:text-slate-100 truncate pr-2">
                  {email.subject}
                </h3>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <Badge
                    variant="secondary"
                    className={`${status.bg} ${status.color} whitespace-nowrap`}
                  >
                    {status.icon && <span className="mr-1">{status.icon}</span>}
                    {status.label}
                  </Badge>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {/* From & Date */}
              <div className="flex items-center justify-between mt-1 text-sm text-slate-500">
                <span className="truncate">
                  {email.from_name ? `${email.from_name} <${email.from_address}>` : email.from_address}
                </span>
                <span className="flex-shrink-0 ml-2">
                  {formatDistanceToNow(new Date(email.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>

            {/* Preview Text (when collapsed) */}
            {!isExpanded && (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                {previewText}
              </p>
            )}

            {/* Expanded Content */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  {/* Full Body */}
                  <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                      {email.body_text || 'No text content'}
                    </p>
                  </div>

                  {/* Action Items */}
                  {hasActionItems && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center">
                          <Sparkles className="w-4 h-4 mr-1 text-blue-500" />
                          AI-Extracted Action Items
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowActionItems(!showActionItems)}
                        >
                          {showActionItems ? 'Hide' : 'Show'}
                        </Button>
                      </div>

                      <AnimatePresence>
                        {showActionItems && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="space-y-2"
                          >
                            {email.action_items?.map((item, index) => (
                              <div
                                key={item.id || index}
                                className="flex items-start justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-slate-800 dark:text-slate-200 text-sm">
                                    {item.title}
                                  </p>
                                  {item.description && (
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                      {item.description}
                                    </p>
                                  )}
                                  <div className="flex items-center space-x-2 mt-2">
                                    {item.priority && (
                                      <Badge
                                        variant="outline"
                                        className={`text-xs ${
                                          item.priority === 'high'
                                            ? 'text-red-600 border-red-200'
                                            : item.priority === 'medium'
                                            ? 'text-yellow-600 border-yellow-200'
                                            : 'text-green-600 border-green-200'
                                        }`}
                                      >
                                        {item.priority}
                                      </Badge>
                                    )}
                                    {item.due_date && (
                                      <Badge variant="outline" className="text-xs text-slate-500">
                                        Due: {new Date(item.due_date).toLocaleDateString()}
                                      </Badge>
                                    )}
                                    {item.estimated_time_minutes && (
                                      <Badge variant="outline" className="text-xs text-slate-500">
                                        ~{item.estimated_time_minutes} min
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="flex-shrink-0 ml-2"
                                  onClick={() => onCreateTask(email.id, item)}
                                  title="Convert to task"
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Process Button (for pending emails) */}
                  {email.status === 'pending' && !hasActionItems && (
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onProcess(email)}
                        className="w-full"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Extract Action Items with AI
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
          {email.status !== 'archived' && email.status !== 'processed' && (
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-500 hover:text-slate-700"
              onClick={() => onArchive(email.id)}
            >
              <Archive className="w-4 h-4 mr-1" />
              Archive
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-red-600"
            onClick={() => onDelete(email.id)}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>
    </motion.div>
  );
});
