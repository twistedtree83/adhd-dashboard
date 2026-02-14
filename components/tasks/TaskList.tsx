// ============================================================================
// Task List Component - List of tasks with filtering and sorting
// ============================================================================

'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Inbox, CheckCircle2, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskCard } from './TaskCard';
import { EnergyFilter } from './EnergyFilter';
import { Task, TaskPriority, TaskStatus, EnergyLevel } from '@/types';

interface TaskListProps {
  tasks: Task[];
  loading: boolean;
  onComplete: (id: string) => Promise<void>;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
  showFilters?: boolean;
  emptyMessage?: string;
}

type FilterType = 'all' | 'today' | 'active' | 'completed';
type SortType = 'priority' | 'due_date' | 'created' | 'energy';

export function TaskList({
  tasks,
  loading,
  onComplete,
  onDelete,
  onEdit,
  showFilters = true,
  emptyMessage = "No tasks yet. Capture your first task!",
}: TaskListProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('priority');
  const [energyFilter, setEnergyFilter] = useState<EnergyLevel | null>(null);

  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // Apply status filter
    switch (filter) {
      case 'today':
        const today = new Date().toISOString().split('T')[0];
        result = result.filter((t) => t.due_date === today || t.status === 'todo' || t.status === 'in_progress');
        break;
      case 'active':
        result = result.filter((t) => t.status !== 'completed' && t.status !== 'archived');
        break;
      case 'completed':
        result = result.filter((t) => t.status === 'completed');
        break;
    }

    // Apply energy filter
    if (energyFilter) {
      result = result.filter((t) => t.energy_required === energyFilter || !t.energy_required);
    }

    // Apply search
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(searchLower) ||
          t.description?.toLowerCase().includes(searchLower)
      );
    }

    // Apply sort
    result.sort((a, b) => {
      switch (sort) {
        case 'priority':
          const priorityOrder: Record<TaskPriority, number> = {
            urgent: 0,
            high: 1,
            medium: 2,
            low: 3,
          };
          if (a.status === 'completed' && b.status !== 'completed') return 1;
          if (a.status !== 'completed' && b.status === 'completed') return -1;
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        case 'energy':
          const energyOrder: Record<string, number> = { high: 0, medium: 1, low: 2, '': 3 };
          return energyOrder[a.energy_required || ''] - energyOrder[b.energy_required || ''];
        case 'due_date':
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        case 'created':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return result;
  }, [tasks, filter, search, sort, energyFilter]);

  const taskCounts = useMemo(() => {
    return {
      all: tasks.length,
      today: tasks.filter((t) => {
        const today = new Date().toISOString().split('T')[0];
        return t.due_date === today || t.status === 'todo' || t.status === 'in_progress';
      }).length,
      pending: tasks.filter((t) => t.status !== 'completed').length,
      completed: tasks.filter((t) => t.status === 'completed').length,
    };
  }, [tasks]);

  // Memoized callbacks to prevent unnecessary re-renders
  const handleComplete = useCallback(async (id: string) => {
    await onComplete(id);
  }, [onComplete]);

  const handleDelete = useCallback((id: string) => {
    onDelete(id);
  }, [onDelete]);

  const handleEdit = useCallback((task: Task) => {
    onEdit(task);
  }, [onEdit]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showFilters && (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-2">
            {(['all', 'today', 'active', 'completed'] as FilterType[]).map(
              (f) => (
                <Button
                  key={f}
                  variant={filter === f ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(f)}
                  className="capitalize whitespace-nowrap"
                >
                  {f}
                  <Badge variant="secondary" className="ml-2">
                    {taskCounts[f]}
                  </Badge>
                </Button>
              )
            )}
          </div>

          {/* Energy Filter */}
          <EnergyFilter selected={energyFilter} onChange={setEnergyFilter} />

          {/* Sort dropdown */}
          <div className="flex items-center space-x-2 text-sm text-slate-500">
            <Filter className="w-4 h-4" />
            <span>Sort by:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortType)}
              className="bg-transparent border-none focus:ring-0 cursor-pointer dark:text-slate-300"
            >
              <option value="priority">Priority</option>
              <option value="energy">Energy Level</option>
              <option value="due_date">Due Date</option>
              <option value="created">Created</option>
            </select>
          </div>
        </>
      )}

      {/* Task list */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={handleComplete}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              {filter === 'completed' ? (
                <>
                  <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 dark:text-slate-400">No completed tasks yet</p>
                </>
              ) : energyFilter ? (
                <>
                  <Zap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 dark:text-slate-400">
                    No {energyFilter} energy tasks found
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    Try a different energy level or clear the filter
                  </p>
                </>
              ) : (
                <>
                  <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 dark:text-slate-400">{emptyMessage}</p>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Summary */}
      {filteredTasks.length > 0 && (
        <p className="text-center text-sm text-slate-400 pt-4">
          Showing {filteredTasks.length} of {tasks.length} tasks
        </p>
      )}
    </div>
  );
}
