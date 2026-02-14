// ============================================================================
// Task Form Component - Create/Edit task form
// ============================================================================

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Task, TaskPriority, EnergyLevel, SCHOOL_LOCATIONS } from '@/types';

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: Partial<Task>) => Promise<void>;
  initialTask?: Partial<Task>;
  mode?: 'create' | 'edit';
}

export function TaskForm({
  isOpen,
  onClose,
  onSubmit,
  initialTask,
  mode = 'create',
}: TaskFormProps) {
  const [title, setTitle] = useState(initialTask?.title || '');
  const [description, setDescription] = useState(initialTask?.description || '');
  const [priority, setPriority] = useState<TaskPriority>(
    initialTask?.priority || 'medium'
  );
  const [energyRequired, setEnergyRequired] = useState<EnergyLevel | undefined>(
    initialTask?.energy_required || undefined
  );
  const [locationId, setLocationId] = useState<string | undefined>(
    initialTask?.location_id || undefined
  );
  const [dueDate, setDueDate] = useState(initialTask?.due_date || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        ...initialTask,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        energy_required: energyRequired,
        location_id: locationId === 'any' ? undefined : locationId,
        due_date: dueDate || undefined,
      });
      
      // Only reset and close on success
      if (mode === 'create') {
        setTitle('');
        setDescription('');
        setPriority('medium');
        setEnergyRequired(undefined);
        setLocationId(undefined);
        setDueDate('');
      }
      
      onClose();
    } catch (error) {
      // Error is handled by parent, keep modal open for retry
      console.error('TaskForm submission failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const priorityButtons: { value: TaskPriority; label: string; color: string }[] = [
    { value: 'low', label: 'Low', color: 'bg-green-500' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
    { value: 'high', label: 'High', color: 'bg-orange-500' },
    { value: 'urgent', label: 'Urgent', color: 'bg-red-500' },
  ];

  const energyButtons: { value: EnergyLevel; label: string }[] = [
    { value: 'low', label: '😴 Low' },
    { value: 'medium', label: '⚡ Medium' },
    { value: 'high', label: '🔥 High' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create New Task' : 'Edit Task'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">What do you need to do?</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Submit behavior report for..."
              className="h-12"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Details (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any additional details..."
              rows={3}
            />
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>Priority</Label>
            <div className="flex space-x-2">
              {priorityButtons.map((btn) => (
                <motion.button
                  key={btn.value}
                  type="button"
                  onClick={() => setPriority(btn.value)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    priority === btn.value
                      ? `${btn.color} text-white shadow-md`
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  whileTap={{ scale: 0.95 }}
                >
                  {btn.label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Energy Level */}
          <div className="space-y-2">
            <Label>Energy Required</Label>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setEnergyRequired(undefined)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  !energyRequired
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Auto
              </button>
              {energyButtons.map((btn) => (
                <button
                  key={btn.value}
                  type="button"
                  onClick={() => setEnergyRequired(btn.value)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    energyRequired === btn.value
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label>Location</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a location (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any location</SelectItem>
                {SCHOOL_LOCATIONS.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={!title.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === 'create' ? (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Task
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
