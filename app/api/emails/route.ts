// ============================================================================
// Emails API Route - CRUD operations for emails
// ============================================================================

import { createRouteHandlerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/emails - List user's emails with pagination
export async function GET(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '20');
    const limit = Math.min(perPage, 100); // Cap at 100 items per page
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('emails')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      emails: data || [],
      pagination: {
        page,
        per_page: limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
        has_more: offset + (data?.length || 0) < (count || 0),
      },
    });
  } catch (error) {
    console.error('Error fetching emails:', error);
    return NextResponse.json(
      { error: 'Failed to fetch emails' },
      { status: 500 }
    );
  }
}

// PATCH /api/emails - Update email status (batch update)
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { ids, status, action_items } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Email IDs are required' },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (status) {
      updateData.status = status;
      if (status === 'processed') {
        updateData.processed_at = new Date().toISOString();
      }
    }

    if (action_items) {
      updateData.action_items = action_items;
    }

    // Update emails - ensure user can only update their own emails
    const { data, error } = await supabase
      .from('emails')
      .update(updateData)
      .in('id', ids)
      .eq('user_id', user.id)
      .select();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      updated: data?.length || 0,
      emails: data,
    });
  } catch (error) {
    console.error('Error updating emails:', error);
    return NextResponse.json(
      { error: 'Failed to update emails' },
      { status: 500 }
    );
  }
}

// DELETE /api/emails - Delete emails (batch delete)
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse IDs from query params or body
    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get('ids');
    
    let ids: string[] = [];
    
    if (idsParam) {
      ids = idsParam.split(',');
    } else {
      // Try to get from body
      try {
        const body = await req.json();
        ids = body.ids || [];
      } catch {
        // No body provided
      }
    }

    if (!ids || ids.length === 0) {
      return NextResponse.json(
        { error: 'Email IDs are required' },
        { status: 400 }
      );
    }

    // Delete emails - ensure user can only delete their own emails
    const { error, count } = await supabase
      .from('emails')
      .delete()
      .in('id', ids)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      deleted: count || 0,
    });
  } catch (error) {
    console.error('Error deleting emails:', error);
    return NextResponse.json(
      { error: 'Failed to delete emails' },
      { status: 500 }
    );
  }
}
