// ============================================================================
// useLevelUp Hook - Detect and show level up notifications
// ============================================================================

'use client';

import { useState, useCallback } from 'react';

interface LevelUpState {
  show: boolean;
  newLevel: number;
  levelTitle: string;
}

export function useLevelUp() {
  const [levelUp, setLevelUp] = useState<LevelUpState>({
    show: false,
    newLevel: 0,
    levelTitle: '',
  });

  const triggerLevelUp = useCallback((newLevel: number, levelTitle: string) => {
    setLevelUp({
      show: true,
      newLevel,
      levelTitle,
    });
  }, []);

  const dismissLevelUp = useCallback(() => {
    setLevelUp((prev) => ({ ...prev, show: false }));
  }, []);

  return {
    levelUp,
    triggerLevelUp,
    dismissLevelUp,
  };
}
