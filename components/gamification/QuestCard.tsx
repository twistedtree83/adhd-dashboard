// ============================================================================
// Quest Card Component - Display individual quest with progress
// ============================================================================

'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Target, Clock, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface Quest {
  id: string;
  questId: string;
  title: string;
  description: string;
  questType: string;
  target: number;
  progress: number;
  reward: number;
  completed: boolean;
  expiresAt: string;
  icon: string;
}

interface QuestCardProps {
  quest: Quest;
  onComplete?: (questId: string) => void;
  compact?: boolean;
}

export function QuestCard({ quest, onComplete, compact = false }: QuestCardProps) {
  const progressPercent = Math.min(100, (quest.progress / quest.target) * 100);
  const isComplete = quest.completed || quest.progress >= quest.target;
  
  // Calculate time remaining
  const getTimeRemaining = () => {
    const now = new Date();
    const expires = new Date(quest.expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 24) return `${hours}h left`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h left`;
  };

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'relative p-3 rounded-lg border transition-all cursor-pointer',
          isComplete
            ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700'
            : 'bg-white border-slate-200 hover:border-blue-300 dark:bg-slate-800 dark:border-slate-700 dark:hover:border-slate-600'
        )}
        onClick={() => !isComplete && onComplete?.(quest.id)}
      >
        <div className="flex items-center space-x-3">
          {/* Icon */}
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0',
              isComplete
                ? 'bg-green-100 dark:bg-green-900/50'
                : 'bg-blue-100 dark:bg-blue-900/50'
            )}
          >
            {isComplete ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : quest.icon}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className={cn(
                'font-medium text-sm truncate',
                isComplete ? 'text-green-700 dark:text-green-400' : 'text-slate-800 dark:text-slate-200'
              )}>
                {quest.title}
              </h4>
              {isComplete && (
                <span className="text-xs text-green-600 font-medium">Done!</span>
              )}
            </div>
            
            {/* Progress bar */}
            <div className="mt-1.5 flex items-center space-x-2">
              <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  className={cn(
                    'h-full rounded-full',
                    isComplete ? 'bg-green-500' : 'bg-blue-500'
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <span className={cn(
                'text-xs shrink-0',
                isComplete ? 'text-green-600' : 'text-slate-500'
              )}>
                {quest.progress}/{quest.target}
              </span>
            </div>
          </div>
          
          {/* Reward */}
          <div className="flex items-center space-x-1 text-amber-500 shrink-0">
            <Sparkles className="w-3 h-3" />
            <span className="text-xs font-medium">+{quest.reward}</span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <Card
      className={cn(
        'transition-all',
        isComplete
          ? 'border-green-200 bg-green-50/50 dark:bg-green-900/10 dark:border-green-800'
          : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-slate-600'
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start space-x-4">
          {/* Icon */}
          <motion.div
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0',
              isComplete
                ? 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400'
                : 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
            )}
            animate={!isComplete ? {
              scale: [1, 1.05, 1],
            } : {}}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {isComplete ? <CheckCircle2 className="w-6 h-6" /> : quest.icon}
          </motion.div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h3 className={cn(
                  'font-semibold',
                  isComplete ? 'text-green-700 dark:text-green-400' : 'text-slate-800 dark:text-slate-100'
                )}>
                  {quest.title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {quest.description}
                </p>
              </div>
              
              {/* Reward Badge */}
              <div className={cn(
                'flex items-center space-x-1 px-2 py-1 rounded-full shrink-0',
                isComplete
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400'
              )}>
                <Sparkles className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">+{quest.reward} XP</span>
              </div>
            </div>

            {/* Progress Section */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-sm mb-1.5">
                <div className="flex items-center space-x-1 text-slate-500 dark:text-slate-400">
                  <Target className="w-3.5 h-3.5" />
                  <span>Progress</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={cn(
                    'font-medium',
                    isComplete ? 'text-green-600' : 'text-slate-700 dark:text-slate-300'
                  )}>
                    {quest.progress} / {quest.target}
                  </span>
                  {!isComplete && (
                    <div className="flex items-center space-x-1 text-slate-400 text-xs">
                      <Clock className="w-3 h-3" />
                      <span>{getTimeRemaining()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  className={cn(
                    'h-full rounded-full',
                    isComplete
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                      : 'bg-gradient-to-r from-blue-500 to-purple-500'
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>

              {/* Completion message or action button */}
              {isComplete ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 flex items-center space-x-2 text-green-600 dark:text-green-400"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm font-medium">Quest completed! Great job!</span>
                </motion.div>
              ) : (
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    {Math.round(progressPercent)}% complete
                  </p>
                  {onComplete && progressPercent >= 100 && (
                    <Button
                      size="sm"
                      onClick={() => onComplete(quest.id)}
                      className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                    >
                      Claim Reward
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Quest completion celebration component
interface QuestCompletePopupProps {
  questTitle: string;
  reward: number;
  isVisible: boolean;
  onClose: () => void;
}

export function QuestCompletePopup({ questTitle, reward, isVisible, onClose }: QuestCompletePopupProps) {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: -20 }}
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div
        className="relative bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl p-6 shadow-2xl text-white max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sparkle effects */}
        {Array.from({ length: 6 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white rounded-full"
            style={{
              top: `${20 + Math.random() * 60}%`,
              left: `${10 + Math.random() * 80}%`,
            }}
            animate={{
              scale: [0, 1, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 1.5,
              delay: i * 0.1,
              repeat: Infinity,
            }}
          />
        ))}

        <div className="text-center">
          <motion.div
            className="text-5xl mb-3"
            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 0.5, repeat: 2 }}
          >
            🎉
          </motion.div>
          <h3 className="text-2xl font-bold mb-1">Quest Complete!</h3>
          <p className="text-white/90 mb-4">{questTitle}</p>
          
          <div className="bg-white/20 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-center justify-center space-x-2">
              <Sparkles className="w-5 h-5 text-yellow-300" />
              <span className="text-3xl font-bold">+{reward}</span>
              <span className="text-lg">XP</span>
            </div>
          </div>

          <Button
            onClick={onClose}
            className="mt-4 w-full bg-white text-purple-600 hover:bg-white/90 font-semibold"
          >
            Awesome!
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
