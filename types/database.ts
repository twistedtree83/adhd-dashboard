// ============================================================================
// Supabase Database Types
// ============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          username: string | null;
          display_name: string | null;
          avatar_url: string | null;
          timezone: string;
          auth_provider: string;
          auth_provider_id: string | null;
          is_active: boolean;
          is_premium: boolean;
          created_at: string;
          updated_at: string;
          last_login_at: string | null;
          adhd_settings: Json;
          notification_settings: Json;
          ui_preferences: Json;
          total_xp: number;
          current_level: number;
          current_streak_days: number;
          longest_streak_days: number;
          tasks_completed_count: number;
          current_location: string | null;
          last_location_update: string | null;
          last_known_lat: number | null;
          last_known_lng: number | null;
          location_accuracy: number | null;
        };
        Insert: {
          id?: string;
          email: string;
          username?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          timezone?: string;
          auth_provider?: string;
          auth_provider_id?: string | null;
          is_active?: boolean;
          is_premium?: boolean;
          created_at?: string;
          updated_at?: string;
          last_login_at?: string | null;
          adhd_settings?: Json;
          notification_settings?: Json;
          ui_preferences?: Json;
          total_xp?: number;
          current_level?: number;
          current_streak_days?: number;
          longest_streak_days?: number;
          tasks_completed_count?: number;
          current_location?: string | null;
          last_location_update?: string | null;
          last_known_lat?: number | null;
          last_known_lng?: number | null;
          location_accuracy?: number | null;
        };
        Update: {
          id?: string;
          email?: string;
          username?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          timezone?: string;
          auth_provider?: string;
          auth_provider_id?: string | null;
          is_active?: boolean;
          is_premium?: boolean;
          created_at?: string;
          updated_at?: string;
          last_login_at?: string | null;
          adhd_settings?: Json;
          notification_settings?: Json;
          ui_preferences?: Json;
          total_xp?: number;
          current_level?: number;
          current_streak_days?: number;
          longest_streak_days?: number;
          tasks_completed_count?: number;
          current_location?: string | null;
          last_location_update?: string | null;
          last_known_lat?: number | null;
          last_known_lng?: number | null;
          location_accuracy?: number | null;
        };
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          project_id: string | null;
          title: string;
          description: string | null;
          status: 'todo' | 'in_progress' | 'blocked' | 'completed' | 'cancelled' | 'snoozed' | 'archived';
          priority: 'low' | 'medium' | 'high' | 'urgent';
          location_id: string | null;
          energy_required: 'low' | 'medium' | 'high' | null;
          estimated_duration_minutes: number | null;
          source_type: 'manual' | 'email' | 'meeting' | 'voice' | 'import' | 'template' | 'recurring';
          source_id: string | null;
          due_date: string | null;
          due_time: string | null;
          reminder_at: string | null;
          completed_at: string | null;
          completed_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id?: string | null;
          title: string;
          description?: string | null;
          status?: 'pending' | 'in_progress' | 'completed' | 'archived';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          location_id?: string | null;
          energy_required?: 'low' | 'medium' | 'high' | null;
          estimated_duration_minutes?: number | null;
          source_type?: 'manual' | 'email' | 'meeting' | 'voice' | 'import' | 'template' | 'recurring';
          source_id?: string | null;
          due_date?: string | null;
          due_time?: string | null;
          reminder_at?: string | null;
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string | null;
          title?: string;
          description?: string | null;
          status?: 'pending' | 'in_progress' | 'completed' | 'archived';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          location_id?: string | null;
          energy_required?: 'low' | 'medium' | 'high' | null;
          estimated_duration_minutes?: number | null;
          source_type?: 'manual' | 'email' | 'meeting' | 'voice' | 'import' | 'template' | 'recurring';
          source_id?: string | null;
          due_date?: string | null;
          due_time?: string | null;
          reminder_at?: string | null;
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      emails: {
        Row: {
          id: string;
          user_id: string;
          from_address: string;
          from_name: string | null;
          to_address: string;
          subject: string;
          body_text: string;
          body_html: string | null;
          status: 'pending' | 'processing' | 'processed' | 'archived' | 'ignored';
          action_items: Json | null;
          processed_at: string | null;
          thread_id: string | null;
          message_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          from_address: string;
          from_name?: string | null;
          to_address: string;
          subject: string;
          body_text: string;
          body_html?: string | null;
          status?: 'pending' | 'processing' | 'processed' | 'archived' | 'ignored';
          action_items?: Json | null;
          processed_at?: string | null;
          thread_id?: string | null;
          message_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          from_address?: string;
          from_name?: string | null;
          to_address?: string;
          subject?: string;
          body_text?: string;
          body_html?: string | null;
          status?: 'pending' | 'processing' | 'processed' | 'archived' | 'ignored';
          action_items?: Json | null;
          processed_at?: string | null;
          thread_id?: string | null;
          message_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      points_log: {
        Row: {
          id: string;
          user_id: string;
          points: number;
          reason: string;
          source: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          points: number;
          reason: string;
          source: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          points?: number;
          reason?: string;
          source?: string;
          metadata?: Json | null;
          created_at?: string;
        };
      };
      streaks: {
        Row: {
          id: string;
          user_id: string;
          streak_type: 'daily_tasks' | 'capture' | 'location_visits';
          current_count: number;
          longest_count: number;
          last_maintained: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          streak_type: 'daily_tasks' | 'capture' | 'location_visits';
          current_count?: number;
          longest_count?: number;
          last_maintained?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          streak_type?: 'daily_tasks' | 'capture' | 'location_visits';
          current_count?: number;
          longest_count?: number;
          last_maintained?: string;
          created_at?: string;
        };
      };
      meetings: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          transcript: string | null;
          transcript_segments: Json | null;
          action_items: Json | null;
          summary: string | null;
          status: 'idle' | 'recording' | 'completed' | 'processing' | 'error';
          started_at: string | null;
          ended_at: string | null;
          duration_seconds: number | null;
          processed: boolean;
          processed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string | null;
          transcript?: string | null;
          transcript_segments?: Json | null;
          action_items?: Json | null;
          summary?: string | null;
          status?: 'idle' | 'recording' | 'completed' | 'processing' | 'error';
          started_at?: string | null;
          ended_at?: string | null;
          duration_seconds?: number | null;
          processed?: boolean;
          processed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string | null;
          transcript?: string | null;
          transcript_segments?: Json | null;
          action_items?: Json | null;
          summary?: string | null;
          status?: 'idle' | 'recording' | 'completed' | 'processing' | 'error';
          started_at?: string | null;
          ended_at?: string | null;
          duration_seconds?: number | null;
          processed?: boolean;
          processed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
