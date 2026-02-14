// ============================================================================
// Level Up Modal - Shows when user levels up
// ============================================================================

'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface LevelUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  newLevel: number;
  levelTitle: string;
}

export function LevelUpModal({
  isOpen,
  onClose,
  newLevel,
  levelTitle,
}: LevelUpModalProps) {
  // Auto-close after 5 seconds
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-0 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white">
        <div className="relative overflow-hidden">
          {/* Background animations */}
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-white/20 rounded-full"
                initial={{
                  x: Math.random() * 400 - 200,
                  y: Math.random() * 400 - 200,
                  scale: 0,
                }}
                animate={{
                  y: [null, -400],
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 3,
                  delay: i * 0.1,
                  repeat: Infinity,
                }}
              />
            ))}
          </div>

          <DialogHeader className="relative z-10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 10, delay: 0.2 }}
              className="mx-auto mb-4"
            >
              <div className="relative inline-block">
                <motion.div
                  className="p-6 bg-white/20 rounded-full backdrop-blur-sm"
                  animate={{
                    boxShadow: [
                      '0 0 0 0 rgba(255,255,255,0)',
                      '0 0 40px 20px rgba(255,255,255,0.3)',
                      '0 0 0 0 rgba(255,255,255,0)',
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Trophy className="w-16 h-16 text-yellow-300 fill-yellow-300" />
                </motion.div>
                
                {/* Orbiting stars */}
                <motion.div
                  className="absolute -top-2 -right-2"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                >
                  <Star className="w-6 h-6 text-yellow-300 fill-yellow-300" />
                </motion.div>
                <motion.div
                  className="absolute -bottom-1 -left-3"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles className="w-5 h-5 text-white" />
                </motion.div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <DialogTitle className="text-center text-3xl font-bold">
                Level Up!
              </DialogTitle>
            </motion.div>
          </DialogHeader>

          <motion.div
            className="text-center py-6 relative z-10"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <p className="text-5xl font-bold mb-2">{newLevel}</p>
            <p className="text-xl opacity-90">{levelTitle}</p>
            
            <motion.div
              className="mt-4 flex justify-center space-x-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <div className="flex items-center space-x-1 bg-white/20 px-3 py-1 rounded-full">
                <Zap className="w-4 h-4 text-yellow-300" />
                <span className="text-sm">New powers unlocked!</span>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            className="mt-4 relative z-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Button
              onClick={onClose}
              className="w-full bg-white text-purple-600 hover:bg-white/90 font-semibold"
            >
              Awesome! 🎉
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
