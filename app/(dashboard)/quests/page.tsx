// ============================================================================
// Quests Page - Full quest management view
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ScrollText, Trophy, Target, ChevronLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Quest {
  id: string;
  questId?: string;
  title: string;
  description?: string;
  targetCount: number;
  currentCount: number;
  xpReward: number;
  isCompleted: boolean;
  icon?: string;
  color?: string;
  questType: 'daily' | 'weekly' | 'challenge';
}

export default function QuestsPage() {
  const [quests, setQuests] = useState<{ daily: Quest[]; weekly: Quest | null }>({
    daily: [],
    weekly: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuests();
  }, []);

  const fetchQuests = async () => {
    try {
      const response = await fetch('/api/gamification/quests');
      if (!response.ok) throw new Error('Failed to fetch quests');
      
      const data = await response.json();
      setQuests({
        daily: data.daily || [],
        weekly: data.weekly || null,
      });
    } catch (error) {
      console.error('Error fetching quests:', error);
    } finally {
      setLoading(false);
    }
  };

  const completedDaily = quests.daily.filter(q => q.isCompleted).length;
  const totalDaily = quests.daily.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Quests & Challenges
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Complete quests to earn XP and rewards
          </p>
        </div>
      </motion.div>

      {/* Daily Quests */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="w-5 h-5 text-blue-500" />
              Daily Quests
              <span className="text-sm font-normal text-slate-500 ml-auto">
                {completedDaily}/{totalDaily} Completed
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : quests.daily.length === 0 ? (
              <p className="text-center text-slate-500 py-8">
                No active daily quests. Check back tomorrow!
              </p>
            ) : (
              quests.daily.map((quest, index) => (
                <motion.div
                  key={quest.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 rounded-lg border ${
                    quest.isCompleted
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                      style={{ backgroundColor: quest.color || '#3B82F6' }}
                    >
                      {quest.icon || '🎯'}
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-medium ${quest.isCompleted ? 'line-through text-slate-400' : ''}`}>
                        {quest.title}
                      </h3>
                      <p className="text-sm text-slate-500">{quest.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${Math.min(100, (quest.currentCount / quest.targetCount) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">
                          {quest.currentCount}/{quest.targetCount}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-amber-500">+{quest.xpReward} XP</span>
                      {quest.isCompleted && (
                        <div className="text-xs text-green-500">✓ Complete</div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Weekly Challenge */}
      {quests.weekly && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                Weekly Challenge
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`p-4 rounded-lg border ${
                  quests.weekly.isCompleted
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center text-2xl">
                    🏆
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-lg">{quests.weekly.title}</h3>
                    <p className="text-slate-500">{quests.weekly.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all"
                          style={{ width: `${Math.min(100, (quests.weekly.currentCount / quests.weekly.targetCount) * 100)}%` }}
                        />
                      </div>
                      <span className="text-sm text-slate-600">
                        {quests.weekly.currentCount}/{quests.weekly.targetCount}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-amber-500">+{quests.weekly.xpReward} XP</span>
                    {quests.weekly.isCompleted && (
                      <div className="text-sm text-green-500">✓ Complete</div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Tips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4"
      >
        <h3 className="font-medium text-blue-800 dark:text-blue-200 flex items-center gap-2">
          <Target className="w-4 h-4" />
          Quest Tips
        </h3>
        <ul className="mt-2 space-y-1 text-sm text-blue-700 dark:text-blue-300">
          <li>• Complete daily quests before midnight</li>
          <li>• Weekly challenges reset every Sunday</li>
          <li>• Earn bonus XP for completing all daily quests</li>
          <li>• Some quests have hidden bonuses!</li>
        </ul>
      </motion.div>
    </div>
  );
}
