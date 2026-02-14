// ============================================================================
// Celebration Component - Confetti and XP popup on task completion
// ============================================================================

'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Star, Zap } from 'lucide-react';

interface CelebrationProps {
  isActive: boolean;
  xpAmount: number;
  onComplete?: () => void;
}

export function Celebration({ isActive, xpAmount, onComplete }: CelebrationProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive) {
      setShowConfetti(true);
      timerRef.current = setTimeout(() => {
        setShowConfetti(false);
        onComplete?.();
      }, 3000);
    }
    
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isActive, onComplete]);

  if (!showConfetti) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {/* Confetti pieces */}
      <AnimatePresence>
        {Array.from({ length: 30 }).map((_, i) => (
          <ConfettiPiece key={i} index={i} />
        ))}
      </AnimatePresence>

      {/* XP Popup */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        initial={{ scale: 0, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0, opacity: 0, y: -50 }}
        transition={{ type: 'spring', damping: 12 }}
      >
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-yellow-400 blur-3xl opacity-50" />
          
          <motion.div
            className="relative bg-gradient-to-br from-yellow-400 via-orange-500 to-pink-500 rounded-3xl p-6 shadow-2xl"
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(251, 191, 36, 0)',
                '0 0 60px 20px rgba(251, 191, 36, 0.4)',
                '0 0 0 0 rgba(251, 191, 36, 0)',
              ],
            }}
            transition={{ duration: 1, repeat: 2 }}
          >
            <div className="flex items-center space-x-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <Sparkles className="w-8 h-8 text-white" />
              </motion.div>
              <div className="text-white">
                <p className="text-3xl font-bold">+{xpAmount} XP</p>
                <p className="text-sm opacity-90">Task Complete!</p>
              </div>
            </div>
          </motion.div>

          {/* Floating stars */}
          <motion.div
            className="absolute -top-4 -right-4"
            animate={{ y: [-5, 5, -5], rotate: [0, 15, -15, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Star className="w-6 h-6 text-yellow-300 fill-yellow-300" />
          </motion.div>
          <motion.div
            className="absolute -bottom-2 -left-4"
            animate={{ y: [5, -5, 5], rotate: [0, -10, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Zap className="w-5 h-5 text-orange-300 fill-orange-300" />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

// Individual confetti piece
function ConfettiPiece({ index }: { index: number }) {
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
  const color = colors[index % colors.length];
  const startX = Math.random() * 100;
  const endX = startX + (Math.random() - 0.5) * 40;
  const duration = 2 + Math.random() * 2;
  const delay = Math.random() * 0.5;

  return (
    <motion.div
      className="absolute w-3 h-3 rounded-sm"
      style={{ backgroundColor: color }}
      initial={{
        x: `${startX}vw`,
        y: -20,
        rotate: 0,
        opacity: 1,
      }}
      animate={{
        x: `${endX}vw`,
        y: '100vh',
        rotate: 360 + Math.random() * 720,
        opacity: 0,
      }}
      transition={{
        duration,
        delay,
        ease: 'easeOut',
      }}
    />
  );
}

// Simple XP Popup for inline use
interface XpPopupProps {
  amount: number;
  isVisible: boolean;
}

export function XpPopup({ amount, isVisible }: XpPopupProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.8 }}
          animate={{ opacity: 1, y: -20, scale: 1 }}
          exit={{ opacity: 0, y: -30 }}
          transition={{ duration: 0.5 }}
          className="absolute pointer-events-none"
        >
          <div className="flex items-center space-x-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
            <Star className="w-4 h-4 fill-white" />
            <span>+{amount}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
