// ============================================================================
// useTasks Hook - Task management with real-time updates
// ============================================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Task, TaskStatus, TaskPriority, TaskSource } from '@/types';

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  location_id?: string;
  source?: TaskSource;
  due_date?: string;
  search?: string;
}

export interface UseTasksReturn {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createTask: (task: Partial<Task>) => Promise<Task | null>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task | null>;
  completeTask: (id: string) => Promise<boolean>;
  deleteTask: (id: string) => Promise<boolean>;
}

export function useTasks(filters?: TaskFilters): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createBrowserClient();

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters?.location_id) {
        query = query.eq('location_id', filters.location_id);
      }
      if (filters?.source) {
        query = query.eq('source', filters.source);
      }
      if (filters?.due_date) {
        query = query.eq('due_date', filters.due_date);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Apply search filter client-side
      let filteredData = (data || []) as Task[];
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        filteredData = filteredData.filter(
          (task: Task) =>
            task.title?.toLowerCase().includes(searchLower) ||
            task.description?.toLowerCase().includes(searchLower)
        );
      }

      setTasks(filteredData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, [supabase, filters]);

  // Initial fetch
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Real-time subscription
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    
    const setupSubscription = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      channel = supabase
        .channel('tasks_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasks',
            filter: `user_id=eq.${userData.user.id}`,
          },
          (payload) => {
            console.log('Realtime update:', payload);
            fetchTasks();
          }
        )
        .subscribe((status) => {
          console.log('Realtime subscription status:', status);
        });
    };

    setupSubscription();
    
    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [supabase, fetchTasks]);

  const createTask = async (task: Partial<Task>): Promise<Task | null> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const newTask = {
        user_id: userData.user.id,
        title: task.title || '',
        description: task.description,
        priority: task.priority || 'medium',
        status: 'todo' as const,
        location_id: task.location_id,
        energy_required: task.energy_required,
        estimated_duration_minutes: task.estimated_duration_minutes,
        due_date: task.due_date,
        due_time: task.due_time,
        source_type: task.source || 'manual',
        source_id: task.source_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error: createError } = await supabase
        .from('tasks')
        .insert(newTask)
        .select()
        .single();

      if (createError) {
        console.error('Supabase createTask error:', createError);
        throw createError;
      }
      
      // Optimistically update the list
      if (data) {
        setTasks((prev) => [data as Task, ...prev]);
      }
      
      // Also trigger a refetch to ensure consistency
      fetchTasks();
      
      return data as Task;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create task';
      console.error('createTask error:', errorMessage);
      setError(errorMessage);
      throw err;  // Re-throw so caller knows it failed
    }
  };

  const updateTask = async (
    id: string,
    updates: Partial<Task>
  ): Promise<Task | null> => {
    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { data, error: updateError } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      return data as Task;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update task';
      console.error('updateTask error:', errorMessage);
      setError(errorMessage);
      throw err;
    }
  };

  const completeTask = async (id: string): Promise<boolean> => {
    try {
      const { error: completeError } = await supabase
        .from('tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (completeError) throw completeError;
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete task';
      console.error('completeTask error:', errorMessage);
      setError(errorMessage);
      throw err;
    }
  };

  const deleteTask = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete task';
      console.error('deleteTask error:', errorMessage);
      setError(errorMessage);
      throw err;
    }
  };

  return {
    tasks,
    loading,
    error,
    refetch: fetchTasks,
    createTask,
    updateTask,
    completeTask,
    deleteTask,
  };
}
