// ============================================================================
// Location Badge - Shows current location
// ============================================================================

'use client';

import { motion } from 'framer-motion';
import { MapPin, Navigation } from 'lucide-react';
import { Location } from '@/types';

interface LocationBadgeProps {
  location: Location | null;
  isAtSchool: boolean;
  loading?: boolean;
}

export function LocationBadge({ location, isAtSchool, loading }: LocationBadgeProps) {
  if (loading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-100 rounded-full animate-pulse">
        <div className="w-2 h-2 bg-slate-300 rounded-full" />
        <span className="text-sm text-slate-400">Locating...</span>
      </div>
    );
  }

  if (!isAtSchool || !location) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-100 rounded-full">
        <Navigation className="w-4 h-4 text-slate-400" />
        <span className="text-sm text-slate-500">Traveling</span>
      </div>
    );
  }

  // Get color based on location
  const getLocationColor = (locationId: string) => {
    const colors: Record<string, string> = {
      st_thomas: 'bg-blue-100 text-blue-700 border-blue-200',
      trinity: 'bg-green-100 text-green-700 border-green-200',
      st_josephs: 'bg-purple-100 text-purple-700 border-purple-200',
      jpii: 'bg-orange-100 text-orange-700 border-orange-200',
      wetherill: 'bg-red-100 text-red-700 border-red-200',
    };
    return colors[locationId] || 'bg-slate-100 text-slate-700';
  };

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border ${getLocationColor(location.id)}`}
    >
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
        }}
      >
        <MapPin className="w-4 h-4" />
      </motion.div>
      <span className="text-sm font-medium">{location.name}</span>
    </motion.div>
  );
}
