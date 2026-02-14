// ============================================================================
// Email Webhook Handler - Resend webhook for incoming emails
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import crypto from 'crypto';
import { ActionItem } from '@/types';

// Lazy initialization of OpenAI client
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  return new OpenAI({ apiKey });
}

// Verify Resend webhook signature using HMAC-SHA256
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

// Extract action items from email using OpenAI GPT-4o-mini
async function extractActionItems(
  subject: string,
  body: string
): Promise<ActionItem[]> {
  const prompt = `Extract actionable tasks from this email. 

Return a JSON object with an "actions" array containing objects with these fields:
- title: A clear, concise task title (required)
- description: Additional details about the task (optional)
- priority: "high", "medium", or "low" based on urgency (default: "medium")
- due_date: ISO date string if a deadline is mentioned, otherwise null (optional)
- estimated_time_minutes: Estimated time to complete if mentioned, otherwise null (optional)

If no actionable tasks are found, return an empty actions array.

Email Subject: ${subject}
Email Body: ${body.substring(0, 4000)}

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
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      console.warn('Empty response from OpenAI');
      return [];
    }

    const parsed = JSON.parse(content);
    
    // Validate and clean up action items
    const actions: ActionItem[] = (parsed.actions || []).map((action: any, index: number) => ({
      id: `action-${index}`,
      title: action.title?.trim() || 'Untitled Task',
      description: action.description?.trim(),
      priority: ['high', 'medium', 'low'].includes(action.priority) 
        ? action.priority 
        : 'medium',
      due_date: action.due_date || null,
      estimated_time_minutes: action.estimated_time_minutes || null,
    }));

    return actions;
  } catch (error) {
    console.error('Error extracting action items:', error);
    return [];
  }
}

// Find user by email address (from the 'to' field)
async function findUserByEmail(supabase: ReturnType<typeof createAdminClient>, emailAddress: string): Promise<string | null> {
  try {
    // Try to find user by their email in the users table
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', emailAddress.toLowerCase())
      .single();

    if (error || !data) {
      console.warn(`User not found for email: ${emailAddress}`);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('Error finding user:', error);
    return null;
  }
}

// POST handler for Resend webhook
export async function POST(req: NextRequest) {
  try {
    // Get the raw payload for signature verification
    const payload = await req.text();
    
    // Get signature from headers
    const signature = req.headers.get('resend-signature') || '';
    
    // Verify webhook signature
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (!secret) {
      console.error('RESEND_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    if (!verifyWebhookSignature(payload, signature, secret)) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse the email payload
    let emailData;
    try {
      emailData = JSON.parse(payload);
    } catch (error) {
      console.error('Failed to parse email payload:', error);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!emailData.to || !emailData.to.length || !emailData.subject) {
      console.error('Missing required email fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    
    // The recipient email address (where the email was sent)
    // This should match a user's email in our system
    const recipientEmail = Array.isArray(emailData.to) 
      ? emailData.to[0] 
      : emailData.to;

    // Find the user by their email address
    const userId = await findUserByEmail(supabase, recipientEmail);

    if (!userId) {
      // Store the email anyway but mark it as needing user assignment
      console.warn(`No user found for email ${recipientEmail}, storing as orphaned email`);
    }

    // Extract text content (prefer text over HTML for AI processing)
    const emailText = emailData.text || '';
    const emailHtml = emailData.html || '';

    // Store email in database
    const { data: emailRecord, error: emailError } = await supabase
      .from('emails')
      .insert({
        user_id: userId || '00000000-0000-0000-0000-000000000000', // Placeholder if no user found
        from_address: emailData.from || 'unknown@example.com',
        from_name: emailData.from_name || null,
        to_address: recipientEmail,
        subject: emailData.subject,
        body_text: emailText,
        body_html: emailHtml,
        status: 'pending',
        thread_id: emailData.threadId || null,
        message_id: emailData.messageId || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (emailError) {
      console.error('Error storing email:', emailError);
      return NextResponse.json(
        { error: 'Failed to store email' },
        { status: 500 }
      );
    }

    // If we have a valid user, extract action items using AI
    let actionItems: ActionItem[] = [];
    if (userId && emailText) {
      try {
        actionItems = await extractActionItems(emailData.subject, emailText);

        // Update email with extracted action items
        if (actionItems.length > 0) {
          await supabase
            .from('emails')
            .update({
              action_items: actionItems,
              status: 'processing',
              updated_at: new Date().toISOString(),
            })
            .eq('id', emailRecord.id);
        }
      } catch (aiError) {
        console.error('Error during AI extraction:', aiError);
        // Continue without action items - email is still stored
      }
    }

    // Return success response
    return NextResponse.json({
      success: true,
      emailId: emailRecord.id,
      userId: userId,
      actionItemsExtracted: actionItems.length,
      actions: actionItems,
    });

  } catch (error) {
    console.error('Email webhook error:', error);
    return NextResponse.json(
      { error: 'Processing failed' },
      { status: 500 }
    );
  }
}

// GET handler for webhook health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Email webhook endpoint is ready',
    timestamp: new Date().toISOString(),
  });
}
