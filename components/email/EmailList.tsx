// ============================================================================
// Email List Component - List of emails with filtering
// ============================================================================

'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Inbox, Mail, Archive, CheckCircle, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmailCard } from './EmailCard';
import { Email, EmailStatus, ActionItem } from '@/types';

interface EmailListProps {
  emails: Email[];
  loading: boolean;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onProcess: (email: Email) => void;
  onCreateTask: (emailId: string, actionItem: ActionItem) => void;
  onBatchProcess: () => void;
}

type FilterTab = 'all' | 'pending' | 'processed' | 'archived';

export function EmailList({
  emails,
  loading,
  onDelete,
  onArchive,
  onProcess,
  onCreateTask,
  onBatchProcess,
}: EmailListProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const filteredEmails = useMemo(() => {
    let result = [...emails];

    // Apply tab filter
    switch (activeTab) {
      case 'pending':
        result = result.filter((e) => e.status === 'pending' || e.status === 'processing');
        break;
      case 'processed':
        result = result.filter((e) => e.status === 'processed');
        break;
      case 'archived':
        result = result.filter((e) => e.status === 'archived');
        break;
    }

    // Apply search
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.subject.toLowerCase().includes(searchLower) ||
          e.from_address.toLowerCase().includes(searchLower) ||
          e.from_name?.toLowerCase().includes(searchLower) ||
          e.body_text?.toLowerCase().includes(searchLower)
      );
    }

    return result;
  }, [emails, activeTab, search]);

  const counts = useMemo(() => {
    return {
      all: emails.length,
      pending: emails.filter((e) => e.status === 'pending' || e.status === 'processing').length,
      processed: emails.filter((e) => e.status === 'processed').length,
      archived: emails.filter((e) => e.status === 'archived').length,
    };
  }, [emails]);

  const pendingCount = counts.pending;
  const hasPendingEmails = pendingCount > 0;

  // Memoized callbacks
  const handleDelete = useCallback(
    (id: string) => {
      onDelete(id);
    },
    [onDelete]
  );

  const handleArchive = useCallback(
    (id: string) => {
      onArchive(id);
    },
    [onArchive]
  );

  const handleProcess = useCallback(
    (email: Email) => {
      onProcess(email);
    },
    [onProcess]
  );

  const handleCreateTask = useCallback(
    (emailId: string, actionItem: ActionItem) => {
      onCreateTask(emailId, actionItem);
    },
    [onCreateTask]
  );

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with search and batch process */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search emails..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Batch Process Button */}
        {hasPendingEmails && (
          <Button
            onClick={onBatchProcess}
            className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Process {pendingCount} Email{pendingCount !== 1 ? 's' : ''}
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FilterTab)}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="all" className="relative">
            <Mail className="w-4 h-4 mr-2 hidden sm:inline" />
            All
            <Badge variant="secondary" className="ml-2 text-xs">
              {counts.all}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="pending">
            <Filter className="w-4 h-4 mr-2 hidden sm:inline" />
            Pending
            {counts.pending > 0 && (
              <Badge variant="default" className="ml-2 text-xs bg-yellow-500">
                {counts.pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="processed">
            <CheckCircle className="w-4 h-4 mr-2 hidden sm:inline" />
            Processed
            {counts.processed > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {counts.processed}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="archived">
            <Archive className="w-4 h-4 mr-2 hidden sm:inline" />
            Archived
            {counts.archived > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {counts.archived}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Email List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredEmails.length > 0 ? (
            filteredEmails.map((email) => (
              <EmailCard
                key={email.id}
                email={email}
                onDelete={handleDelete}
                onArchive={handleArchive}
                onProcess={handleProcess}
                onCreateTask={handleCreateTask}
              />
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400">
                {search
                  ? 'No emails match your search'
                  : activeTab === 'all'
                  ? 'No emails yet'
                  : `No ${activeTab} emails`}
              </p>
              {search && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearch('')}
                  className="mt-2"
                >
                  Clear search
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Summary */}
      {filteredEmails.length > 0 && (
        <p className="text-center text-sm text-slate-400 pt-4">
          Showing {filteredEmails.length} of {emails.length} emails
        </p>
      )}
    </div>
  );
}
