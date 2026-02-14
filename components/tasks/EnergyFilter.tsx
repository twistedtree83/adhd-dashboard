// ============================================================================
// Energy Filter - Filter tasks by energy level
// ============================================================================

'use client';

import { motion } from 'framer-motion';
import { Zap, BatteryLow, BatteryMedium, BatteryFull, X } from 'lucide-react';
import { EnergyLevel } from '@/types';

interface EnergyFilterProps {
  selected: EnergyLevel | null;
  onChange: (energy: EnergyLevel | null) => void;
}

const energyOptions: { value: EnergyLevel; label: string; icon: React.ReactNode; color: string; bg: string }[] = [
  {
    value: 'low',
    label: 'Low Energy',
    icon: <BatteryLow className="w-4 h-4" />,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50',
  },
  {
    value: 'medium',
    label: 'Medium',
    icon: <BatteryMedium className="w-4 h-4" />,
    color: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-100 dark:bg-yellow-900/30 hover:bg-yellow-200 dark:hover:bg-yellow-900/50',
  },
  {
    value: 'high',
    label: 'High Energy',
    icon: <BatteryFull className="w-4 h-4" />,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50',
  },
];

export function EnergyFilter({ selected, onChange }: EnergyFilterProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center">
          <Zap className="w-4 h-4 mr-1.5" />
          Energy Level
        </p>
        {selected && (
          <button
            onClick={() => onChange(null)}
            className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center"
          >
            <X className="w-3 h-3 mr-0.5" />
            Clear
          </button>
        )}
      </div>
      <div className="flex space-x-2">
        {energyOptions.map((option) => (
          <motion.button
            key={option.value}
            onClick={() => onChange(selected === option.value ? null : option.value)}
            className={`flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              selected === option.value
                ? `${option.bg} ${option.color} ring-2 ring-offset-1 ring-slate-300 dark:ring-slate-600`
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            whileTap={{ scale: 0.95 }}
          >
            {option.icon}
            <span className="hidden sm:inline">{option.label}</span>
          </motion.button>
        ))}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {selected 
          ? `Showing tasks that require ${selected} energy`
          : 'Filter by energy level - match tasks to your current energy'}
      </p>
    </div>
  );
}
