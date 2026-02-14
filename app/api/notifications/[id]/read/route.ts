// ============================================================================
// Mark Notification as Read
// PATCH /api/notifications/[id]/read
// ============================================================================

import { createRouteHandlerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/notifications/[id]/read - Mark as read
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createRouteHandlerClient();
    const { id } = await params;

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const isRead = body.is_read !== undefined ? body.is_read : true;

    const { data, error } = await supabase
      .from('notifications')
      .update({ 
        is_read: isRead,
        read_at: isRead ? new Date().toISOString() : null,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Notification not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({ notification: data });
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}
