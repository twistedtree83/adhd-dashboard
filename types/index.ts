// ============================================================================
// ADHD Dashboard - TypeScript Type Definitions
// ============================================================================

// ----------------------------------------------------------------------------
// User & Authentication
// ----------------------------------------------------------------------------
export interface User {
  id: string;
  email: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  timezone: string;
  
  // Account Status
  is_active: boolean;
  is_premium: boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  
  // ADHD-Specific Settings
  adhd_settings: {
    medication_reminder_time?: string | null;
    peak_energy_hours: number[];
    low_energy_hours: number[];
    focus_duration_minutes: number;
    break_duration_minutes: number;
    pomodoro_sessions_before_long_break: number;
    long_break_duration_minutes: number;
    triggers: string[];
    preferred_task_batch_size: number;
    overwhelm_threshold: number;
    needs_visual_cues: boolean;
    prefers_time_blocking: boolean;
    distraction_sensitivity: 'low' | 'medium' | 'high';
  };
  
  // Notification Preferences
  notification_settings: {
    email_enabled: boolean;
    push_enabled: boolean;
    sms_enabled: boolean;
    quiet_hours_start: string;
    quiet_hours_end: string;
    task_reminder_minutes_before: number;
    daily_summary_time: string;
    weekly_summary_day: string;
  };
  
  // UI Preferences
  ui_preferences: {
    theme: 'light' | 'dark' | 'auto';
    color_scheme: string;
    font_size: 'small' | 'medium' | 'large';
    show_completed_tasks: boolean;
    default_view: string;
    compact_mode: boolean;
  };
  
  // Gamification Stats
  total_xp: number;
  current_level: number;
  current_streak_days: number;
  longest_streak_days: number;
  tasks_completed_count: number;
  
  // Location
  current_location?: string | null;
  last_location_update?: string | null;
  last_known_lat?: number | null;
  last_known_lng?: number | null;
  location_accuracy?: number | null;
}

// ----------------------------------------------------------------------------
// Task Management
// ----------------------------------------------------------------------------
export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'completed' | 'cancelled' | 'snoozed' | 'archived';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type EnergyLevel = 'low' | 'medium' | 'high';
export type TaskSource = 'manual' | 'email' | 'meeting' | 'voice' | 'ai_extracted';

export interface Task {
  id: string;
  user_id: string;
  project_id?: string | null;
  
  // Task Content
  title: string;
  description?: string | null;
  
  // Status & Priority
  status: TaskStatus;
  priority: TaskPriority;
  
  // Context
  location_id?: string | null;
  energy_required?: EnergyLevel | null;
  estimated_duration_minutes?: number | null;
  
  // Source Tracking
  source: TaskSource;
  source_id?: string | null; // email_id or meeting_id
  
  // Timing
  due_date?: string | null;
  due_time?: string | null;
  reminder_at?: string | null;
  
  // Completion
  completed_at?: string | null;
  completed_by?: string | null;
  
  // Metadata
  created_at: string;
  updated_at: string;
  
  // Relations
  project?: Project;
  location?: Location;
}

// ----------------------------------------------------------------------------
// Project Organization
// ----------------------------------------------------------------------------
export type ProjectStatus = 'active' | 'archived' | 'completed' | 'on_hold';

export interface Project {
  id: string;
  user_id: string;
  parent_project_id?: string | null;
  
  name: string;
  description?: string | null;
  color: string;
  icon: string;
  
  status: ProjectStatus;
  is_default: boolean;
  
  settings: {
    default_priority: TaskPriority;
    default_context_ids: string[];
    auto_archive_completed: boolean;
    show_in_today_view: boolean;
  };
  
  total_tasks: number;
  completed_tasks: number;
  
  display_order: number;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
  completed_at?: string | null;
}

// ----------------------------------------------------------------------------
// Location Management
// ----------------------------------------------------------------------------
export interface Location {
  id: string;
  user_id?: string | null; // null for system locations
  
  name: string;
  address?: string | null;
  lat: number;
  lng: number;
  radius: number; // meters
  
  color?: string | null;
  icon?: string | null;
  
  is_default: boolean;
  created_at: string;
}

// School locations for the user
export const SCHOOL_LOCATIONS: Location[] = [
  { 
    id: 'st_thomas', 
    name: 'St Thomas Aquinas', 
    lat: -33.700, 
    lng: 150.560, 
    radius: 200,
    address: 'Springwood, NSW',
    is_default: true,
    created_at: new Date().toISOString(),
  },
  { 
    id: 'trinity', 
    name: 'Trinity Primary School', 
    lat: -33.850, 
    lng: 150.780, 
    radius: 200,
    address: "Kemp's Creek",
    is_default: true,
    created_at: new Date().toISOString(),
  },
  { 
    id: 'st_josephs', 
    name: "St Joseph's", 
    lat: -33.790, 
    lng: 150.870, 
    radius: 200,
    address: 'Schofields',
    is_default: true,
    created_at: new Date().toISOString(),
  },
  { 
    id: 'jpii', 
    name: 'St John Paul II', 
    lat: -33.795, 
    lng: 150.875, 
    radius: 200,
    address: 'Schofields',
    is_default: true,
    created_at: new Date().toISOString(),
  },
  { 
    id: 'wetherill', 
    name: 'Wetherill Park', 
    lat: -33.850, 
    lng: 150.900, 
    radius: 200,
    address: 'Main Site',
    is_default: true,
    created_at: new Date().toISOString(),
  },
];

// ----------------------------------------------------------------------------
// Email Integration
// ----------------------------------------------------------------------------
export type EmailStatus = 'pending' | 'processing' | 'processed' | 'archived' | 'ignored';

export interface Email {
  id: string;
  user_id: string;
  
  // Sender Info
  from_address: string;
  from_name?: string | null;
  to_address: string;
  
  // Content
  subject: string;
  body_text: string;
  body_html?: string | null;
  
  // Processing
  status: EmailStatus;
  action_items?: ActionItem[] | null;
  processed_at?: string | null;
  
  // Metadata
  thread_id?: string | null;
  message_id?: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface ActionItem {
  id?: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  due_date?: string | null;
  estimated_time_minutes?: number;
}

// ----------------------------------------------------------------------------
// Meeting Transcription
// ----------------------------------------------------------------------------
export type MeetingStatus = 'idle' | 'recording' | 'completed' | 'processing' | 'error';
export type RecordingStatus = 'idle' | 'connecting' | 'recording' | 'paused' | 'processing' | 'completed' | 'error';

export interface TranscriptSegment {
  id: string;
  text: string;
  is_final: boolean;
  speaker?: number;
  start: number; // seconds
  end: number; // seconds
  confidence: number;
  created_at: string;
}

export interface MeetingActionItem {
  action: string;
  assignee?: string;
  priority: 'high' | 'medium' | 'low';
  due?: string | null;
}

export interface Meeting {
  id: string;
  user_id: string;
  
  title?: string | null;
  transcript?: string | null;
  transcript_segments?: TranscriptSegment[] | null;
  action_items?: MeetingActionItem[] | null;
  summary?: string | null;
  
  status: MeetingStatus;
  started_at?: string | null;
  ended_at?: string | null;
  duration_seconds?: number | null;
  
  processed: boolean;
  processed_at?: string | null;
  
  created_at: string;
  updated_at: string;
}

// ----------------------------------------------------------------------------
// Gamification
// ----------------------------------------------------------------------------
export interface Level {
  id: number;
  level_number: number;
  title: string;
  description: string;
  xp_required: number;
  icon_url?: string | null;
  color: string;
  rewards: {
    unlocked_features: string[];
    bonus_points_multiplier: number;
    custom_themes: string[];
    max_projects: number;
    max_contexts: number;
  };
  created_at: string;
}

export interface PointsLog {
  id: string;
  user_id: string;
  points: number;
  reason: string;
  source: string;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export type StreakType = 'daily_tasks' | 'capture' | 'location_visits';

export interface Streak {
  id: string;
  user_id: string;
  streak_type: StreakType;
  current_count: number;
  longest_count: number;
  last_maintained: string;
  created_at: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  criteria: {
    type: string;
    threshold: number;
    [key: string]: unknown;
  };
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
  achievement?: Achievement;
}

// ----------------------------------------------------------------------------
// Notifications
// ----------------------------------------------------------------------------
export type NotificationType = 
  | 'task_reminder' 
  | 'task_due' 
  | 'location_arrival' 
  | 'streak_at_risk' 
  | 'achievement_unlocked' 
  | 'level_up' 
  | 'email_processed';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
  read_at?: string | null;
  created_at: string;
}

// ----------------------------------------------------------------------------
// API Response Types
// ----------------------------------------------------------------------------
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}
