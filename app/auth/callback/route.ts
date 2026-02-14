// ============================================================================
// Auth Callback Route - Handle OAuth and Email Confirmation
// ============================================================================

import { createRouteHandlerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = await createRouteHandlerClient();
    
    // Exchange the code for a session
    await supabase.auth.exchangeCodeForSession(code);
    
    // Create user profile if it doesn't exist
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Check if user profile exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();
      
      if (!existingUser) {
        // Create user profile
        await supabase.from('users').insert({
          id: user.id,
          email: user.email,
          display_name: user.user_metadata?.display_name || user.email?.split('@')[0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        
        // Initialize streaks
        await supabase.from('streaks').insert([
          {
            user_id: user.id,
            streak_type: 'daily_tasks',
            current_count: 0,
            longest_count: 0,
            last_maintained: new Date().toISOString(),
          },
          {
            user_id: user.id,
            streak_type: 'capture',
            current_count: 0,
            longest_count: 0,
            last_maintained: new Date().toISOString(),
          },
        ]);
      }
    }
  }

  // Redirect to dashboard
  return NextResponse.redirect(new URL('/', requestUrl.origin));
}
