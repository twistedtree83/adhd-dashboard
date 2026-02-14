// ============================================================================
// useEmails Hook - Email management with real-time updates
// ============================================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Email, EmailStatus, ActionItem } from '@/types';

export interface EmailFilters {
  status?: EmailStatus;
  search?: string;
}

export interface UseEmailsReturn {
  emails: Email[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateEmailStatus: (id: string, status: EmailStatus) => Promise<boolean>;
  deleteEmail: (id: string) => Promise<boolean>;
  processEmailToTasks: (emailId: string, actionItems: ActionItem[]) => Promise<boolean>;
}

export function useEmails(filters?: EmailFilters): UseEmailsReturn {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createBrowserClient();

  const fetchEmails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setEmails([]);
        return;
      }

      let query = supabase
        .from('emails')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Apply search filter client-side
      let filteredData = (data || []) as Email[];
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        filteredData = filteredData.filter(
          (email: Email) =>
            email.subject?.toLowerCase().includes(searchLower) ||
            email.from_address?.toLowerCase().includes(searchLower) ||
            email.body_text?.toLowerCase().includes(searchLower)
        );
      }

      setEmails(filteredData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch emails');
    } finally {
      setLoading(false);
    }
  }, [supabase, filters]);

  // Initial fetch
  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  // Real-time subscription
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupSubscription = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      channel = supabase
        .channel('emails_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'emails',
            filter: `user_id=eq.${userData.user.id}`,
          },
          (payload) => {
            console.log('Email realtime update:', payload);
            fetchEmails();
          }
        )
        .subscribe((status) => {
          console.log('Emails realtime subscription status:', status);
        });
    };

    setupSubscription();

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [supabase, fetchEmails]);

  const updateEmailStatus = async (
    id: string,
    status: EmailStatus
  ): Promise<boolean> => {
    try {
      const updateData = {
        status,
        updated_at: new Date().toISOString(),
        ...(status === 'processed' ? { processed_at: new Date().toISOString() } : {}),
      };

      const { error: updateError } = await supabase
        .from('emails')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;

      // Optimistically update local state
      setEmails((prev) =>
        prev.map((email) =>
          email.id === id ? { ...email, ...updateData } : email
        )
      );

      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update email status';
      console.error('updateEmailStatus error:', errorMessage);
      setError(errorMessage);
      throw err;
    }
  };

  const deleteEmail = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('emails')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      // Optimistically update local state
      setEmails((prev) => prev.filter((email) => email.id !== id));

      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete email';
      console.error('deleteEmail error:', errorMessage);
      setError(errorMessage);
      throw err;
    }
  };

  const processEmailToTasks = async (
    emailId: string,
    actionItems: ActionItem[]
  ): Promise<boolean> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Get the email details
      const { data: email, error: emailError } = await supabase
        .from('emails')
        .select('*')
        .eq('id', emailId)
        .single();

      if (emailError) throw emailError;
      if (!email) throw new Error('Email not found');

      // Create tasks from action items
      const tasksToCreate = actionItems.map((item) => ({
        user_id: userData.user.id,
        title: item.title,
        description: item.description || `From email: ${email.subject}`,
        priority: item.priority || 'medium',
        status: 'todo' as const,
        source_type: 'email' as const,
        source_id: emailId,
        due_date: item.due_date || null,
        estimated_duration_minutes: item.estimated_time_minutes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      // Insert tasks
      const { error: taskError } = await supabase.from('tasks').insert(tasksToCreate);

      if (taskError) throw taskError;

      // Update email status to processed
      await updateEmailStatus(emailId, 'processed');

      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to process email to tasks';
      console.error('processEmailToTasks error:', errorMessage);
      setError(errorMessage);
      throw err;
    }
  };

  return {
    emails,
    loading,
    error,
    refetch: fetchEmails,
    updateEmailStatus,
    deleteEmail,
    processEmailToTasks,
  };
}
