// ============================================================================
// Streak Counter Component - Shows daily streak with fire animation
// ============================================================================

'use client';

import { motion } from 'framer-motion';
import { Flame, Trophy } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface StreakCounterProps {
  streak: number;
  longestStreak?: number;
  compact?: boolean;
}

export function StreakCounter({
  streak,
  longestStreak,
  compact = false,
}: StreakCounterProps) {
  // Determine flame intensity based on streak length
  const getFlameIntensity = () => {
    if (streak >= 14) return { scale: 1.2, color: 'from-purple-500 to-pink-500', glow: 'shadow-purple-500/50' };
    if (streak >= 7) return { scale: 1.1, color: 'from-orange-500 to-red-500', glow: 'shadow-orange-500/50' };
    if (streak >= 3) return { scale: 1, color: 'from-orange-400 to-red-500', glow: 'shadow-orange-400/50' };
    return { scale: 0.9, color: 'from-yellow-400 to-orange-500', glow: 'shadow-yellow-400/50' };
  };

  const intensity = getFlameIntensity();

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              className="flex items-center space-x-1 bg-orange-100 px-2 py-1 rounded-full cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                animate={{
                  scale: [1, intensity.scale, 1],
                  rotate: [0, -5, 5, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <Flame className={`w-3 h-3 text-orange-600 ${streak > 0 ? 'fill-orange-600' : ''}`} />
              </motion.div>
              <span className="text-xs font-semibold text-orange-700">{streak}</span>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-sm">
              {streak > 0 
                ? `${streak} day streak! Keep it up!` 
                : 'Start a streak by completing a task today'}
            </p>
            {longestStreak && longestStreak > streak && (
              <p className="text-xs text-slate-400">Longest: {longestStreak} days</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <motion.div
            className={`p-3 bg-gradient-to-br ${intensity.color} rounded-xl shadow-lg ${intensity.glow}`}
            animate={{
              scale: [1, intensity.scale, 1],
              boxShadow: [
                '0 0 0 0 rgba(249, 115, 22, 0)',
                '0 0 20px 5px rgba(249, 115, 22, 0.3)',
                '0 0 0 0 rgba(249, 115, 22, 0)',
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <Flame className="w-6 h-6 text-white fill-white" />
          </motion.div>
          <div>
            <p className="font-bold text-slate-800">{streak} Day Streak</p>
            <p className="text-xs text-slate-500">
              {streak === 0 
                ? 'Complete a task today to start!'
                : streak === 1
                ? 'Great start! Keep going!'
                : streak < 7
                ? 'You\'re building momentum!'
                : streak < 14
                ? 'Amazing consistency!'
                : 'Legendary streak! 🔥'}
            </p>
          </div>
        </div>
        
        {longestStreak && longestStreak > 0 && (
          <div className="flex items-center space-x-1 text-slate-400">
            <Trophy className="w-4 h-4" />
            <span className="text-sm">Best: {longestStreak}</span>
          </div>
        )}
      </div>

      {/* Streak visualization */}
      <div className="mt-4 flex space-x-1">
        {Array.from({ length: Math.min(7, Math.max(streak, 7)) }).map((_, i) => (
          <motion.div
            key={i}
            className={`flex-1 h-2 rounded-full ${
              i < streak % 7 || (streak >= 7 && i < 7)
                ? 'bg-gradient-to-r from-orange-400 to-red-500'
                : 'bg-slate-100'
            }`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.05 }}
          />
        ))}
      </div>
      <p className="text-xs text-slate-400 mt-2 text-center">
        {streak < 7 
          ? `${7 - (streak % 7)} more days for 3-day streak bonus!`
          : streak < 14
          ? `${14 - streak} more days for 7-day streak bonus!`
          : 'You\'re on fire! Keep it up!'}
      </p>
    </div>
  );
}
