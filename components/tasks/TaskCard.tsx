// ============================================================================
// Task Card Component - Clean, swipeable task card
// ============================================================================

'use client';

import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Trash2, MapPin, AlertCircle, Clock, Edit2, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Task, TaskPriority, SCHOOL_LOCATIONS } from '@/types';
import { Celebration, XpPopup } from '@/components/gamification/Celebration';


interface TaskCardProps {
  task: Task;
  onComplete: (id: string) => Promise<void>;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
  compact?: boolean;
}

const priorityConfig: Record<TaskPriority, { color: string; bg: string; icon: React.ReactNode }> = {
  urgent: {
    color: 'text-red-600',
    bg: 'bg-red-50 border-red-200',
    icon: <AlertCircle className="w-3 h-3" />,
  },
  high: {
    color: 'text-orange-600',
    bg: 'bg-orange-50 border-orange-200',
    icon: <AlertCircle className="w-3 h-3" />,
  },
  medium: {
    color: 'text-yellow-600',
    bg: 'bg-yellow-50 border-yellow-200',
    icon: null,
  },
  low: {
    color: 'text-green-600',
    bg: 'bg-green-50 border-green-200',
    icon: null,
  },
};

export const TaskCard = memo(function TaskCard({
  task,
  onComplete,
  onDelete,
  onEdit,
  compact = false,
}: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showXpPopup, setShowXpPopup] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const priority = priorityConfig[task.priority];
  const location = SCHOOL_LOCATIONS.find((l) => l.id === task.location_id);

  const handleComplete = async () => {
    if (isCompleting || task.status === 'completed') return;
    setIsCompleting(true);

    try {
      // Show celebration (XP is awarded by the API route)
      setShowCelebration(true);
      setShowXpPopup(true);

      // Call parent's onComplete and WAIT for it
      await onComplete(task.id);

      // Hide XP popup after animation
      setTimeout(() => setShowXpPopup(false), 1500);
    } catch (error) {
      console.error('Failed to complete task:', error);
      // Reset celebration state on error
      setShowCelebration(false);
      setShowXpPopup(false);
    } finally {
      setIsCompleting(false);
    }
  };

  if (compact) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -100 }}
        className={`flex items-center justify-between p-3 rounded-lg border ${
          task.status === 'completed'
            ? 'bg-slate-50 border-slate-100 opacity-60'
            : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <button
            onClick={handleComplete}
            disabled={task.status === 'completed' || isCompleting}
            aria-label={`Mark task ${task.title} as complete`}
            className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
              task.status === 'completed'
                ? 'bg-green-500 border-green-500'
                : 'border-slate-300 hover:border-green-500'
            }`}
          >
            {task.status === 'completed' && (
              <Check className="w-4 h-4 text-white" />
            )}
          </button>
          <span
            className={`truncate ${
              task.status === 'completed'
                ? 'line-through text-slate-400'
                : 'text-slate-700'
            }`}
          >
            {task.title}
          </span>
        </div>
        {task.priority !== 'low' && (
          <Badge
            variant="secondary"
            className={`flex-shrink-0 ${priority.bg} ${priority.color}`}
          >
            {priority.icon}
          </Badge>
        )}
      </motion.div>
    );
  }

  return (
    <>
      <Celebration
        isActive={showCelebration}
        xpAmount={task.priority === 'high' || task.priority === 'urgent' ? 20 : 10}
        onComplete={() => setShowCelebration(false)}
      />

      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -100 }}
        className={`relative bg-white dark:bg-slate-800 rounded-xl border transition-all ${
          task.status === 'completed'
            ? 'border-slate-100 dark:border-slate-700 opacity-60'
            : 'border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md'
        }`}
      >
        <div className="p-4">
          <div className="flex items-start space-x-3">
            {/* Checkbox */}
            <div className="relative">
              <button
                onClick={handleComplete}
                disabled={task.status === 'completed' || isCompleting}
                aria-label={`Mark task ${task.title} as complete`}
                aria-pressed={task.status === 'completed'}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  task.status === 'completed'
                    ? 'bg-green-500 border-green-500'
                    : 'border-slate-300 hover:border-green-500 hover:bg-green-50'
                }`}
              >
                {task.status === 'completed' && (
                  <Check className="w-4 h-4 text-white" />
                )}
              </button>
              <XpPopup amount={10} isVisible={showXpPopup} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
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
                <h3
                  className={`font-medium ${
                    task.status === 'completed'
                      ? 'line-through text-slate-400'
                      : 'text-slate-800 dark:text-slate-100'
                  }`}
                >
                  {task.title}
                </h3>

                {/* Badges row */}
                <div className="flex items-center space-x-2 mt-2 flex-wrap gap-y-1">
                  <Badge
                    variant="secondary"
                    className={`${priority.bg} ${priority.color}`}
                  >
                    {priority.icon && <span className="mr-1">{priority.icon}</span>}
                    {task.priority}
                  </Badge>

                  {task.energy_required && (
                    <Badge 
                      variant="outline" 
                      className={`${
                        task.energy_required === 'low' 
                          ? 'text-green-600 border-green-200' 
                          : task.energy_required === 'high'
                          ? 'text-red-600 border-red-200'
                          : 'text-yellow-600 border-yellow-200'
                      }`}
                    >
                      <Zap className="w-3 h-3 mr-1" />
                      {task.energy_required}
                    </Badge>
                  )}

                  {location && (
                    <Badge variant="outline" className="text-slate-500">
                      <MapPin className="w-3 h-3 mr-1" />
                      {location.name}
                    </Badge>
                  )}

                  {task.due_date && (
                    <Badge
                      variant="outline"
                      className={`${
                        new Date(task.due_date) < new Date()
                          ? 'text-red-500 border-red-200'
                          : 'text-slate-500'
                      }`}
                    >
                      <Clock className="w-3 h-3 mr-1" />
                      {new Date(task.due_date).toLocaleDateString()}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Expanded content */}
              <AnimatePresence>
                {isExpanded && task.description && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="mt-3 text-sm text-slate-600">
                      {task.description}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-blue-600"
                onClick={() => onEdit(task)}
                aria-label={`Edit task ${task.title}`}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-red-600"
                onClick={() => onDelete(task.id)}
                aria-label={`Delete task ${task.title}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
});
