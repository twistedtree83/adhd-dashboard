// ============================================================================
// Action Item Extractor Component - Show AI extracted tasks from email
// ============================================================================

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  AlertCircle,
  Clock,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ActionItem, TaskPriority } from '@/types';

interface ActionItemExtractorProps {
  actionItems: ActionItem[];
  onChange: (items: ActionItem[]) => void;
  onCreateAll: () => void;
  onCreateOne: (item: ActionItem) => void;
  emailSubject: string;
  isProcessing?: boolean;
}

export function ActionItemExtractor({
  actionItems,
  onChange,
  onCreateAll,
  onCreateOne,
  emailSubject,
  isProcessing = false,
}: ActionItemExtractorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ActionItem | null>(null);

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditForm({ ...actionItems[index] });
  };

  const handleSave = () => {
    if (editForm && editingIndex !== null) {
      const updated = [...actionItems];
      updated[editingIndex] = editForm;
      onChange(updated);
      setEditingIndex(null);
      setEditForm(null);
    }
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setEditForm(null);
  };

  const handleDelete = (index: number) => {
    const updated = actionItems.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleAddNew = () => {
    const newItem: ActionItem = {
      id: `manual-${Date.now()}`,
      title: '',
      description: '',
      priority: 'medium',
      due_date: null,
      estimated_time_minutes: null,
    };
    onChange([...actionItems, newItem]);
    setEditingIndex(actionItems.length);
    setEditForm(newItem);
  };

  if (actionItems.length === 0 && !isProcessing) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-6 text-center">
        <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <p className="text-slate-600 dark:text-slate-400">
          No action items extracted from this email.
        </p>
        <Button variant="outline" size="sm" onClick={handleAddNew} className="mt-3">
          <Plus className="w-4 h-4 mr-2" />
          Add Task Manually
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-200">
            AI-Extracted Action Items
          </h3>
          <Badge variant="secondary">{actionItems.length}</Badge>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleAddNew}>
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
          {actionItems.length > 0 && (
            <Button size="sm" onClick={onCreateAll} disabled={isProcessing}>
              <Check className="w-4 h-4 mr-2" />
              Create All Tasks
            </Button>
          )}
        </div>
      </div>

      {/* Source Email Info */}
      <div className="text-sm text-slate-500 bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded">
        From: <span className="font-medium text-slate-700 dark:text-slate-300">{emailSubject}</span>
      </div>

      {/* Action Items List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {actionItems.map((item, index) => (
            <motion.div
              key={item.id || index}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4"
            >
              {editingIndex === index ? (
                // Edit Mode
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">
                      Task Title
                    </label>
                    <Input
                      value={editForm?.title || ''}
                      onChange={(e) =>
                        setEditForm((prev) =>
                          prev ? { ...prev, title: e.target.value } : null
                        )
                      }
                      placeholder="What needs to be done?"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">
                      Description
                    </label>
                    <Textarea
                      value={editForm?.description || ''}
                      onChange={(e) =>
                        setEditForm((prev) =>
                          prev ? { ...prev, description: e.target.value } : null
                        )
                      }
                      placeholder="Additional details..."
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-1 block">
                        Priority
                      </label>
                      <Select
                        value={editForm?.priority || 'medium'}
                        onValueChange={(value: TaskPriority) =>
                          setEditForm((prev) =>
                            prev ? { ...prev, priority: value } : null
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-1 block">
                        Due Date
                      </label>
                      <Input
                        type="date"
                        value={editForm?.due_date?.split('T')[0] || ''}
                        onChange={(e) =>
                          setEditForm((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  due_date: e.target.value
                                    ? new Date(e.target.value).toISOString()
                                    : null,
                                }
                              : null
                          )
                        }
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-1 block">
                        Est. Minutes
                      </label>
                      <Input
                        type="number"
                        value={editForm?.estimated_time_minutes || ''}
                        onChange={(e) =>
                          setEditForm((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  estimated_time_minutes: e.target.value
                                    ? parseInt(e.target.value)
                                    : null,
                                }
                              : null
                          )
                        }
                        placeholder="30"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <Button variant="ghost" size="sm" onClick={handleCancel}>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave}>
                      <Check className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 dark:text-slate-200">
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {item.description}
                      </p>
                    )}
                    <div className="flex items-center space-x-2 mt-2 flex-wrap gap-y-1">
                      {item.priority && (
                        <Badge
                          variant="outline"
                          className={`${
                            item.priority === 'high'
                              ? 'text-red-600 border-red-200 bg-red-50'
                              : item.priority === 'medium'
                              ? 'text-yellow-600 border-yellow-200 bg-yellow-50'
                              : 'text-green-600 border-green-200 bg-green-50'
                          }`}
                        >
                          {item.priority}
                        </Badge>
                      )}
                      {item.due_date && (
                        <Badge variant="outline" className="text-slate-600">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(item.due_date).toLocaleDateString()}
                        </Badge>
                      )}
                      {item.estimated_time_minutes && (
                        <Badge variant="outline" className="text-slate-600">
                          <Clock className="w-3 h-3 mr-1" />
                          {item.estimated_time_minutes} min
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-blue-600"
                      onClick={() => handleEdit(index)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-red-600"
                      onClick={() => handleDelete(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-blue-600 hover:text-blue-700"
                      onClick={() => onCreateOne(item)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Task
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Loading skeleton for action items
export function ActionItemExtractorSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-slate-300" />
          <div className="h-5 w-32 bg-slate-200 rounded" />
        </div>
        <div className="h-8 w-24 bg-slate-200 rounded" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-slate-100 rounded-lg p-4">
            <div className="h-4 w-3/4 bg-slate-200 rounded mb-2" />
            <div className="h-3 w-1/2 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
