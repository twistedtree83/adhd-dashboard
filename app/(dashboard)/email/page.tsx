// ============================================================================
// Email Page - Email management and task extraction
// ============================================================================

'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Sparkles, ArrowLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEmails } from '@/hooks/useEmails';
import { EmailList } from '@/components/email/EmailList';
import {
  ActionItemExtractor,
  ActionItemExtractorSkeleton,
} from '@/components/email/ActionItemExtractor';
import { Email, ActionItem } from '@/types';
import { toast } from 'sonner';
import OpenAI from 'openai';

// Initialize OpenAI client for client-side processing
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: true,
});

export default function EmailPage() {
  const { emails, loading, error, refetch, updateEmailStatus, deleteEmail, processEmailToTasks } =
    useEmails();
  
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [isProcessingEmail, setIsProcessingEmail] = useState(false);
  const [extractedItems, setExtractedItems] = useState<ActionItem[]>([]);

  // Handle delete email
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteEmail(id);
        toast.success('Email deleted');
      } catch (err) {
        toast.error('Failed to delete email');
      }
    },
    [deleteEmail]
  );

  // Handle archive email
  const handleArchive = useCallback(
    async (id: string) => {
      try {
        await updateEmailStatus(id, 'archived');
        toast.success('Email archived');
      } catch (err) {
        toast.error('Failed to archive email');
      }
    },
    [updateEmailStatus]
  );

  // Extract action items from email using AI
  const extractActionItems = async (email: Email): Promise<ActionItem[]> => {
    const prompt = `Extract actionable tasks from this email. 

Return a JSON object with an "actions" array containing objects with these fields:
- title: A clear, concise task title (required)
- description: Additional details about the task (optional)
- priority: "high", "medium", or "low" based on urgency (default: "medium")
- due_date: ISO date string if a deadline is mentioned, otherwise null (optional)
- estimated_time_minutes: Estimated time to complete if mentioned, otherwise null (optional)

If no actionable tasks are found, return an empty actions array.

Email Subject: ${email.subject}
Email Body: ${email.body_text?.substring(0, 4000) || 'No content'}

Respond with JSON only in this format:
{
  "actions": [
    {
      "title": "Task title",
      "description": "Task details",
      "priority": "high",
      "due_date": "2026-02-20T00:00:00Z",
      "estimated_time_minutes": 30
    }
  ]
}`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const content = response.choices[0].message.content;
      if (!content) return [];

      const parsed = JSON.parse(content);
      
      return (parsed.actions || []).map((action: any, index: number) => ({
        id: `extracted-${index}`,
        title: action.title?.trim() || 'Untitled Task',
        description: action.description?.trim(),
        priority: ['high', 'medium', 'low'].includes(action.priority) 
          ? action.priority 
          : 'medium',
        due_date: action.due_date || null,
        estimated_time_minutes: action.estimated_time_minutes || null,
      }));
    } catch (error) {
      console.error('Error extracting action items:', error);
      return [];
    }
  };

  // Process single email
  const handleProcess = useCallback(
    async (email: Email) => {
      setSelectedEmail(email);
      setIsProcessingEmail(true);
      setExtractedItems([]);

      try {
        // Update status to processing
        await updateEmailStatus(email.id, 'processing');

        // Extract action items
        const items = await extractActionItems(email);
        setExtractedItems(items);

        // Save extracted items to email
        await fetch('/api/emails', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ids: [email.id],
            status: items.length > 0 ? 'processing' : 'pending',
            action_items: items,
          }),
        });

        if (items.length > 0) {
          toast.success(`Found ${items.length} action item${items.length !== 1 ? 's' : ''}`);
        } else {
          toast.info('No action items found in this email');
        }
      } catch (err) {
        toast.error('Failed to process email');
        console.error(err);
      } finally {
        setIsProcessingEmail(false);
        refetch();
      }
    },
    [updateEmailStatus, refetch]
  );

  // Batch process all pending emails
  const handleBatchProcess = useCallback(async () => {
    const pendingEmails = emails.filter(
      (e) => e.status === 'pending' || e.status === 'processing'
    );

    if (pendingEmails.length === 0) {
      toast.info('No pending emails to process');
      return;
    }

    toast.info(`Processing ${pendingEmails.length} emails...`);

    let totalExtracted = 0;
    
    for (const email of pendingEmails) {
      try {
        await updateEmailStatus(email.id, 'processing');
        const items = await extractActionItems(email);
        
        if (items.length > 0) {
          await fetch('/api/emails', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ids: [email.id],
              action_items: items,
            }),
          });
          totalExtracted += items.length;
        } else {
          await updateEmailStatus(email.id, 'pending');
        }
      } catch (err) {
        console.error(`Failed to process email ${email.id}:`, err);
      }
    }

    toast.success(`Extracted ${totalExtracted} action items from ${pendingEmails.length} emails`);
    refetch();
  }, [emails, updateEmailStatus, refetch]);

  // Create single task from action item
  const handleCreateTask = useCallback(
    async (emailId: string, actionItem: ActionItem) => {
      try {
        await processEmailToTasks(emailId, [actionItem]);
        toast.success('Task created from email');
      } catch (err) {
        toast.error('Failed to create task');
      }
    },
    [processEmailToTasks]
  );

  // Create all tasks from extracted items
  const handleCreateAllTasks = useCallback(async () => {
    if (!selectedEmail || extractedItems.length === 0) return;

    try {
      await processEmailToTasks(selectedEmail.id, extractedItems);
      toast.success(`Created ${extractedItems.length} tasks from email`);
      setSelectedEmail(null);
      setExtractedItems([]);
    } catch (err) {
      toast.error('Failed to create tasks');
    }
  }, [selectedEmail, extractedItems, processEmailToTasks]);

  // Update extracted items (for editing)
  const handleUpdateExtractedItems = useCallback((items: ActionItem[]) => {
    setExtractedItems(items);
  }, []);

  // Close action item extractor
  const handleCloseExtractor = useCallback(() => {
    setSelectedEmail(null);
    setExtractedItems([]);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                Email Inbox
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Manage emails and convert to tasks
              </p>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4"
          >
            <p className="text-red-700">{error}</p>
            <Button variant="outline" size="sm" onClick={refetch} className="mt-2">
              Retry
            </Button>
          </motion.div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Email List */}
          <div className={selectedEmail ? 'lg:col-span-2' : 'lg:col-span-3'}>
            <EmailList
              emails={emails}
              loading={loading}
              onDelete={handleDelete}
              onArchive={handleArchive}
              onProcess={handleProcess}
              onCreateTask={handleCreateTask}
              onBatchProcess={handleBatchProcess}
            />
          </div>

          {/* Action Item Extractor Panel */}
          <AnimatePresence>
            {selectedEmail && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="lg:col-span-1"
              >
                <div className="sticky top-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
                  {/* Panel Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-5 h-5 text-blue-500" />
                      <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                        Extracted Tasks
                      </h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleCloseExtractor}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Processing State */}
                  {isProcessingEmail ? (
                    <ActionItemExtractorSkeleton />
                  ) : (
                    <ActionItemExtractor
                      actionItems={extractedItems}
                      onChange={handleUpdateExtractedItems}
                      onCreateAll={handleCreateAllTasks}
                      onCreateOne={(item) => handleCreateTask(selectedEmail.id, item)}
                      emailSubject={selectedEmail.subject}
                    />
                  )}

                  {/* Back to List (Mobile) */}
                  <Button
                    variant="outline"
                    className="w-full mt-4 lg:hidden"
                    onClick={handleCloseExtractor}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Emails
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
