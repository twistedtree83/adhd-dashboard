// ============================================================================
// Capture Page - Dedicated quick capture page
// ============================================================================

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, Keyboard, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CaptureModal } from '@/components/capture/CaptureModal';
import { TaskForm } from '@/components/tasks/TaskForm';
import { useTasks } from '@/hooks/useTasks';
import { createBrowserClient } from '@/lib/supabase/client';
import { awardXP, updateStreak } from '@/lib/gamification';
import { Task } from '@/types';

const quickTemplates = [
  { icon: '📧', label: 'Check email from...', priority: 'medium' },
  { icon: '📋', label: 'Behavior document for...', priority: 'high' },
  { icon: '📞', label: 'Call parent about...', priority: 'medium' },
  { icon: '📚', label: 'Review program for...', priority: 'low' },
  { icon: '📍', label: 'Visit location...', priority: 'medium' },
  { icon: '📝', label: 'Meeting notes for...', priority: 'medium' },
];

export default function CapturePage() {
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [templateTask, setTemplateTask] = useState<Partial<Task> | null>(null);
  
  const supabase = createBrowserClient();
  const { createTask, refetch } = useTasks();

  const handleCapture = async (taskData: { title: string; priority: string }) => {
    await createTask({
      title: taskData.title,
      priority: taskData.priority as Task['priority'],
      source: 'manual',
    });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await awardXP(user.id, 'TASK_CAPTURE', {});
      await updateStreak(user.id, 'capture');
    }
    
    refetch();
  };

  const handleTemplateClick = (template: typeof quickTemplates[0]) => {
    setTemplateTask({
      title: template.label,
      priority: template.priority as Task['priority'],
    });
    setIsTaskFormOpen(true);
  };

  const handleTaskFormSubmit = async (taskData: Partial<Task>) => {
    await createTask(taskData);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await awardXP(user.id, 'TASK_CAPTURE', {});
      await updateStreak(user.id, 'capture');
    }
    
    setIsTaskFormOpen(false);
    setTemplateTask(null);
    refetch();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-slate-800">Quick Capture</h1>
        <p className="text-slate-500">Capture tasks before you forget them!</p>
      </div>

      {/* Quick Capture Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <Button
          size="lg"
          className="h-24 text-lg flex flex-col items-center justify-center space-y-2"
          onClick={() => setIsCaptureOpen(true)}
        >
          <Keyboard className="w-8 h-8" />
          <span>Type Task</span>
        </Button>
        <Button
          size="lg"
          variant="secondary"
          className="h-24 text-lg flex flex-col items-center justify-center space-y-2"
          onClick={() => alert('Voice capture coming soon!')}
        >
          <Mic className="w-8 h-8" />
          <span>Voice Task</span>
        </Button>
      </div>

      {/* Quick Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Sparkles className="w-5 h-5 mr-2 text-yellow-500" />
            Quick Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quickTemplates.map((template, index) => (
              <motion.button
                key={index}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleTemplateClick(template)}
                className="flex items-center space-x-3 p-4 rounded-lg border border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all text-left"
              >
                <span className="text-2xl">{template.icon}</span>
                <div className="flex-1">
                  <p className="font-medium text-slate-700">{template.label}</p>
                  <p className="text-xs text-slate-400 capitalize">{template.priority} priority</p>
                </div>
              </motion.button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-blue-800 mb-2">💡 ADHD Tip</h3>
          <p className="text-blue-700 text-sm">
            Capture tasks immediately when they come to mind. Don't trust your memory! 
            The 2-minute rule: if it takes less than 2 minutes to capture, do it now.
          </p>
        </CardContent>
      </Card>

      {/* Modals */}
      <CaptureModal
        isOpen={isCaptureOpen}
        onClose={() => setIsCaptureOpen(false)}
        onCapture={handleCapture}
      />

      <TaskForm
        isOpen={isTaskFormOpen}
        onClose={() => {
          setIsTaskFormOpen(false);
          setTemplateTask(null);
        }}
        onSubmit={handleTaskFormSubmit}
        initialTask={templateTask || undefined}
        mode="create"
      />
    </motion.div>
  );
}
