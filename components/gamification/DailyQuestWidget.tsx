// ============================================================================
// Daily Quest Widget - Dashboard widget showing daily quests
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollText, ChevronRight, Sparkles, Target, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QuestCard, Quest, QuestCompletePopup } from './QuestCard';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface DailyQuestWidgetProps {
  maxQuests?: number;
  showWeekly?: boolean;
}

interface QuestsData {
  daily: Quest[];
  weekly: Quest | null;
}

export function DailyQuestWidget({ maxQuests = 3, showWeekly = true }: DailyQuestWidgetProps) {
  const [quests, setQuests] = useState<QuestsData>({ daily: [], weekly: null });
  const [loading, setLoading] = useState(true);
  const [completedQuest, setCompletedQuest] = useState<{ title: string; reward: number } | null>(null);

  useEffect(() => {
    fetchQuests();
  }, []);

  const fetchQuests = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/gamification/quests');
      
      if (!response.ok) {
        throw new Error('Failed to fetch quests');
      }
      
      const data = await response.json();
      setQuests({
        daily: data.daily.map((q: any) => ({
          id: q.id,
          questId: q.quest_id,
          title: q.title,
          description: q.description,
          questType: q.quest_type_detail,
          target: q.target_count,
          progress: q.progress_current,
          reward: q.xp_reward,
          completed: q.status === 'completed',
          expiresAt: q.expires_at,
          icon: q.icon || '📝',
        })),
        weekly: data.weekly ? {
          id: data.weekly.id,
          questId: data.weekly.quest_id,
          title: data.weekly.title,
          description: data.weekly.description,
          questType: data.weekly.quest_type_detail,
          target: data.weekly.target_count,
          progress: data.weekly.progress_current,
          reward: data.weekly.xp_reward,
          completed: data.weekly.status === 'completed',
          expiresAt: data.weekly.expires_at,
          icon: data.weekly.icon || '⚔️',
        } : null,
      });
    } catch (error) {
      console.error('Error fetching quests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteQuest = async (questId: string) => {
    try {
      const response = await fetch('/api/gamification/quests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questId, action: 'complete' }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete quest');
      }

      const result = await response.json();
      
      if (result.success) {
        setCompletedQuest({ title: result.questTitle, reward: result.reward });
        
        // Refresh quests
        await fetchQuests();
        
        // Auto-hide popup after 3 seconds
        setTimeout(() => {
          setCompletedQuest(null);
        }, 3000);
      }
    } catch (error) {
      console.error('Error completing quest:', error);
    }
  };

  const completedCount = quests.daily.filter(q => q.completed).length;
  const totalCount = quests.daily.length;
  const allCompleted = completedCount === totalCount && totalCount > 0;

  if (loading) {
    return (
      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayQuests = quests.daily.slice(0, maxQuests);

  return (
    <>
      <Card className={cn(
        'dark:bg-slate-800 dark:border-slate-700 overflow-hidden',
        allCompleted && 'border-green-200 dark:border-green-800'
      )}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center space-x-2">
              <div className={cn(
                'p-2 rounded-lg',
                allCompleted 
                  ? 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400'
                  : 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
              )}>
                <ScrollText className="w-4 h-4" />
              </div>
              <span className="text-slate-800 dark:text-slate-100">Daily Quests</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={cn(
                'text-sm font-medium',
                allCompleted ? 'text-green-600 dark:text-green-400' : 'text-slate-500'
              )}>
                {completedCount}/{totalCount}
              </span>
              <Link href="/quests">
                <Button variant="ghost" size="sm" className="h-8 px-2">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-3 pt-0">
          {/* Progress overview */}
          {totalCount > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-500 dark:text-slate-400">Daily Progress</span>
                <span className={cn(
                  'font-medium',
                  allCompleted ? 'text-green-600' : 'text-slate-700 dark:text-slate-300'
                )}>
                  {Math.round((completedCount / totalCount) * 100)}%
                </span>
              </div>
              <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  className={cn(
                    'h-full rounded-full',
                    allCompleted 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                      : 'bg-gradient-to-r from-blue-500 to-purple-500'
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${(completedCount / totalCount) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          )}

          {/* Quest list */}
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {displayQuests.map((quest, index) => (
                <motion.div
                  key={quest.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <QuestCard
                    quest={quest}
                    onComplete={handleCompleteQuest}
                    compact
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Weekly Challenge (if enabled) */}
          {showWeekly && quests.weekly && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700"
            >
              <div className="flex items-center space-x-2 mb-2">
                <Target className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Weekly Challenge
                </span>
              </div>
              <QuestCard
                quest={quests.weekly}
                onComplete={handleCompleteQuest}
                compact
              />
            </motion.div>
          )}

          {/* All completed message */}
          {allCompleted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center"
            >
              <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                🎉 All daily quests completed! Great job!
              </p>
              <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-1">
                New quests available tomorrow
              </p>
            </motion.div>
          )}

          {/* Empty state */}
          {totalCount === 0 && (
            <div className="text-center py-4 text-slate-400">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No active quests</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completion Popup */}
      <AnimatePresence>
        {completedQuest && (
          <QuestCompletePopup
            questTitle={completedQuest.title}
            reward={completedQuest.reward}
            isVisible={!!completedQuest}
            onClose={() => setCompletedQuest(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// Extended version for full quests page
export function DailyQuestList() {
  const [quests, setQuests] = useState<QuestsData>({ daily: [], weekly: null });
  const [loading, setLoading] = useState(true);
  const [completedQuest, setCompletedQuest] = useState<{ title: string; reward: number } | null>(null);

  useEffect(() => {
    fetchQuests();
  }, []);

  const fetchQuests = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/gamification/quests');
      
      if (!response.ok) {
        throw new Error('Failed to fetch quests');
      }
      
      const data = await response.json();
      setQuests({
        daily: data.daily.map((q: any) => ({
          id: q.id,
          questId: q.quest_id,
          title: q.title,
          description: q.description,
          questType: q.quest_type_detail,
          target: q.target_count,
          progress: q.progress_current,
          reward: q.xp_reward,
          completed: q.status === 'completed',
          expiresAt: q.expires_at,
          icon: q.icon || '📝',
        })),
        weekly: data.weekly ? {
          id: data.weekly.id,
          questId: data.weekly.quest_id,
          title: data.weekly.title,
          description: data.weekly.description,
          questType: data.weekly.quest_type_detail,
          target: data.weekly.target_count,
          progress: data.weekly.progress_current,
          reward: data.weekly.xp_reward,
          completed: data.weekly.status === 'completed',
          expiresAt: data.weekly.expires_at,
          icon: data.weekly.icon || '⚔️',
        } : null,
      });
    } catch (error) {
      console.error('Error fetching quests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteQuest = async (questId: string) => {
    try {
      const response = await fetch('/api/gamification/quests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questId, action: 'complete' }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete quest');
      }

      const result = await response.json();
      
      if (result.success) {
        setCompletedQuest({ title: result.questTitle, reward: result.reward });
        await fetchQuests();
        
        setTimeout(() => {
          setCompletedQuest(null);
        }, 3000);
      }
    } catch (error) {
      console.error('Error completing quest:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  const dailyCompletedCount = quests.daily.filter(q => q.completed).length;
  const allDailyCompleted = dailyCompletedCount === quests.daily.length && quests.daily.length > 0;

  return (
    <>
      <div className="space-y-6">
        {/* Daily Quests Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 flex items-center">
              <ScrollText className="w-5 h-5 mr-2 text-blue-500" />
              Daily Quests
            </h2>
            {quests.daily.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className={cn(
                  'text-sm font-medium px-3 py-1 rounded-full',
                  allDailyCompleted
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400'
                )}>
                  {dailyCompletedCount}/{quests.daily.length} Complete
                </span>
              </div>
            )}
          </div>
          
          <div className="space-y-3">
            {quests.daily.map((quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                onComplete={handleCompleteQuest}
              />
            ))}
            
            {quests.daily.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No active daily quests</p>
                <p className="text-sm mt-1">Check back tomorrow!</p>
              </div>
            )}
          </div>
        </div>

        {/* Weekly Challenge Section */}
        {quests.weekly && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 flex items-center">
                <Target className="w-5 h-5 mr-2 text-purple-500" />
                Weekly Challenge
              </h2>
              <div className="flex items-center space-x-2 text-amber-500">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">+{quests.weekly.reward} XP</span>
              </div>
            </div>
            
            <QuestCard
              quest={quests.weekly}
              onComplete={handleCompleteQuest}
            />
          </div>
        )}
      </div>

      {/* Completion Popup */}
      <AnimatePresence>
        {completedQuest && (
          <QuestCompletePopup
            questTitle={completedQuest.title}
            reward={completedQuest.reward}
            isVisible={!!completedQuest}
            onClose={() => setCompletedQuest(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
