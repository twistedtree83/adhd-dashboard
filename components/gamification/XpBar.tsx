// ============================================================================
// XP Bar Component - Shows progress to next level
// ============================================================================

'use client';

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

interface XpBarProps {
  currentXP: number;
  level: number;
  levelTitle: string;
  xpToNext: number;
  progress: number; // 0-100
  compact?: boolean;
}

export function XpBar({
  currentXP,
  level,
  levelTitle,
  xpToNext,
  progress,
  compact = false,
}: XpBarProps) {
  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1 bg-blue-100 px-2 py-1 rounded-full">
          <Star className="w-3 h-3 text-blue-600 fill-blue-600" />
          <span className="text-xs font-semibold text-blue-700">Lv {level}</span>
        </div>
        <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
            <Star className="w-5 h-5 text-white fill-white" />
          </div>
          <div>
            <p className="font-bold text-slate-800">Level {level}</p>
            <p className="text-xs text-slate-500">{levelTitle}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-700">{currentXP.toLocaleString()} XP</p>
          {xpToNext > 0 && (
            <p className="text-xs text-slate-400">{xpToNext} to next level</p>
          )}
        </div>
      </div>
      
      <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
      </div>
    </div>
  );
}
