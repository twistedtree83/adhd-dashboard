// ============================================================================
// Quick Capture - Floating Action Button for ultra-fast task capture
// ============================================================================

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Mic, X } from 'lucide-react';
import { CaptureModal } from './CaptureModal';

interface QuickCaptureProps {
  onCapture: (task: { title: string; priority: string }) => void;
}

export function QuickCapture({ onCapture }: QuickCaptureProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-16 h-16 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        animate={{
          boxShadow: [
            '0 0 0 0 rgba(59, 130, 246, 0)',
            '0 0 0 10px rgba(59, 130, 246, 0.2)',
            '0 0 0 0 rgba(59, 130, 246, 0)',
          ],
        }}
        transition={{
          boxShadow: {
            duration: 2,
            repeat: Infinity,
          },
        }}
      >
        <Plus className="w-8 h-8" />
      </motion.button>

      {/* Capture Modal */}
      <CaptureModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onCapture={onCapture}
      />
    </>
  );
}
