// ============================================================================
// Supabase Client Configuration (Re-exports)
// ============================================================================

// Client-side only - safe to use in both server and client components
export { createBrowserClient } from './supabase/client';

// Server-side only - use in API routes and server components
export { createServerClient, createRouteHandlerClient, createAdminClient } from './supabase/server';
