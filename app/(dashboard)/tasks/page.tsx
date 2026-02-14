// ============================================================================
// Tasks Page - Full task list with filtering
// ============================================================================

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TaskList } from '@/components/tasks/TaskList';
import { TaskForm } from '@/components/tasks/TaskForm';
import { QuickCapture } from '@/components/capture/QuickCapture';
import { useTasks } from '@/hooks/useTasks';
import { createBrowserClient } from '@/lib/supabase/client';
import { awardXP, updateStreak } from '@/lib/gamification';
import { Task } from '@/types';

export default function TasksPage() {
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  const supabase = createBrowserClient();
  const { tasks, loading, refetch, createTask, updateTask, completeTask, deleteTask } = useTasks();

  const handleComplete = async (id: string) => {
    await completeTask(id);
    refetch();
  };

  const handleDelete = async (id: string) => {
    await deleteTask(id);
    refetch();
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setIsTaskFormOpen(true);
  };

  const handleTaskFormSubmit = async (taskData: Partial<Task>) => {
    if (editingTask) {
      await updateTask(editingTask.id, taskData);
    } else {
      await createTask(taskData);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await awardXP(user.id, 'TASK_CAPTURE', {});
        await updateStreak(user.id, 'capture');
      }
    }
    setIsTaskFormOpen(false);
    setEditingTask(null);
    refetch();
  };

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">All Tasks</h1>
        <Button onClick={() => setIsTaskFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Task
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <TaskList
            tasks={tasks}
            loading={loading}
            onComplete={handleComplete}
            onDelete={handleDelete}
            onEdit={handleEdit}
          />
        </CardContent>
      </Card>

      {/* Quick Capture */}
      <QuickCapture onCapture={handleCapture} />

      {/* Task Form */}
      <TaskForm
        isOpen={isTaskFormOpen}
        onClose={() => {
          setIsTaskFormOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleTaskFormSubmit}
        initialTask={editingTask || undefined}
        mode={editingTask ? 'edit' : 'create'}
      />
    </motion.div>
  );
}
