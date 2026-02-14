// ============================================================================
// Action Items List Component - Display and manage extracted action items
// ============================================================================

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  User,
  Calendar,
  AlertCircle,
  Plus,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MeetingActionItem } from '@/types';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
interface ActionItemsListProps {
  actionItems: MeetingActionItem[];
  onCreateTask?: (action: MeetingActionItem) => void;
  onCreateAllTasks?: () => void;
  tasksCreated?: number;
  showCreateButtons?: boolean;
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export function ActionItemsList({
  actionItems,
  onCreateTask,
  onCreateAllTasks,
  tasksCreated = 0,
  showCreateButtons = true,
}: ActionItemsListProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [createdItems, setCreatedItems] = useState<Set<number>>(new Set());

  // Toggle expanded state
  const toggleExpanded = (index: number) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // Handle create task
  const handleCreateTask = (action: MeetingActionItem, index: number) => {
    if (onCreateTask) {
      onCreateTask(action);
      setCreatedItems(prev => new Set(prev).add(index));
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  // Format due date
  const formatDueDate = (due?: string | null) => {
    if (!due) return null;
    const date = new Date(due);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
      });
    }
  };

  if (!actionItems || actionItems.length === 0) {
    return (
      <Card className="border-slate-200">
        <CardContent className="pt-6 pb-6 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-700">
            No Action Items Found
          </h3>
          <p className="text-slate-500 mt-1">
            The AI didn&apos;t detect any specific action items in this meeting.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CardTitle className="text-lg">Action Items</CardTitle>
            <Badge variant="secondary">
              {actionItems.length} item{actionItems.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          {showCreateButtons && onCreateAllTasks && (
            <Button
              size="sm"
              onClick={onCreateAllTasks}
              disabled={createdItems.size === actionItems.length}
            >
              <Plus className="w-4 h-4 mr-1" />
              Create All Tasks
            </Button>
          )}
        </div>
        {tasksCreated > 0 && (
          <p className="text-sm text-green-600 mt-1">
            {tasksCreated} task{tasksCreated !== 1 ? 's' : ''} created from this meeting
          </p>
        )}
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          <AnimatePresence>
            {actionItems.map((action, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 rounded-lg border transition-all ${
                  createdItems.has(index)
                    ? 'bg-green-50 border-green-200'
                    : 'bg-white border-slate-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* Action Text */}
                    <p className="font-medium text-slate-800">
                      {action.action}
                    </p>

                    {/* Meta Info */}
                    <div className="flex items-center space-x-2 mt-2 flex-wrap gap-y-1">
                      {action.priority && (
                        <Badge
                          variant="outline"
                          className={getPriorityColor(action.priority)}
                        >
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {action.priority.charAt(0).toUpperCase() +
                            action.priority.slice(1)}
                        </Badge>
                      )}

                      {action.assignee && (
                        <Badge variant="outline" className="text-slate-600">
                          <User className="w-3 h-3 mr-1" />
                          {action.assignee}
                        </Badge>
                      )}

                      {action.due && (
                        <Badge variant="outline" className="text-blue-600">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDueDate(action.due)}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Create Task Button */}
                  {showCreateButtons && onCreateTask && (
                    <div className="ml-3">
                      {createdItems.has(index) ? (
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Created
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCreateTask(action, index)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Task
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
