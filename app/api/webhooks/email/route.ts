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
// Resend signs the raw request body with the webhook secret
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    // Remove any 'whsec_' prefix if present (some webhook providers use this)
    const cleanSecret = secret.replace(/^whsec_/, '');
    
    const expectedSignature = crypto
      .createHmac('sha256', cleanSecret)
      .update(payload, 'utf8')
      .digest('hex');

    // Use timing-safe comparison
    const sigBuf = Buffer.from(signature, 'hex');
    const expectedBuf = Buffer.from(expectedSignature, 'hex');
    
    if (sigBuf.length !== expectedBuf.length) {
      console.log('[Email Webhook] Signature length mismatch:', sigBuf.length, 'vs', expectedBuf.length);
      return false;
    }
    
    return crypto.timingSafeEqual(sigBuf, expectedBuf);
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

// Extract action items from email using OpenAI GPT-4o-mini
async function extractActionItems(
  subject: string,
  body: string,
  forwardedInfo?: {
    isForwarded: boolean;
    originalSender?: string;
    originalSubject?: string;
    originalBody?: string;
    originalDate?: string;
  }
): Promise<ActionItem[]> {
  // Use forwarded content if available
  const effectiveSubject = forwardedInfo?.isForwarded && forwardedInfo.originalSubject
    ? forwardedInfo.originalSubject
    : subject;
  
  const effectiveBody = forwardedInfo?.isForwarded && forwardedInfo.originalBody
    ? cleanEmailBody(forwardedInfo.originalBody)
    : cleanEmailBody(body);

  const forwardedContext = forwardedInfo?.isForwarded
    ? `\n\nNOTE: This is a forwarded email. Original sender: ${forwardedInfo.originalSender || 'Unknown'}, Date: ${forwardedInfo.originalDate || 'Unknown'}`
    : '';

  const prompt = `Extract actionable tasks from this email. 

Return a JSON object with an "actions" array containing objects with these fields:
- title: A clear, concise task title (required)
- description: Additional details about the task (optional)
- priority: "high", "medium", or "low" based on urgency (default: "medium")
- due_date: ISO date string if a deadline is mentioned, otherwise null (optional)
- estimated_time_minutes: Estimated time to complete if mentioned, otherwise null (optional)

If no actionable tasks are found, return an empty actions array.

Email Subject: ${effectiveSubject}
Email Body: ${effectiveBody.substring(0, 4000)}${forwardedContext}

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

// Parse forwarded email content to extract original sender, subject, and body
function parseForwardedEmail(text: string): {
  isForwarded: boolean;
  originalSender?: string;
  originalSubject?: string;
  originalBody?: string;
  originalDate?: string;
} {
  if (!text) return { isForwarded: false };

  // Common forwarded email patterns
  const forwardPatterns = [
    // Gmail/Standard: ---------- Forwarded message ---------
    /[-]+\s*Forwarded message\s*[-]+[\s\S]*?From:\s*([^\n]+)\n[\s\S]*?Date:\s*([^\n]+)\n[\s\S]*?Subject:\s*([^\n]+)\n[\s\S]*?To:\s*([^\n]+)\n\n([\s\S]*)/i,
    // Outlook: -----Original Message-----
    /[-]+\s*Original Message\s*[-]+[\s\S]*?From:\s*([^\n]+)[\s\S]*?Sent:\s*([^\n]+)[\s\S]*?To:\s*([^\n]+)[\s\S]*?Subject:\s*([^\n]+)\n\n([\s\S]*)/i,
    // Apple Mail: Begin forwarded message:
    /Begin forwarded message:[\s\S]*?From:\s*([^\n]+)[\s\S]*?Date:\s*([^\n]+)[\s\S]*?Subject:\s*([^\n]+)[\s\S]*?To:\s*([^\n]+)\n\n([\s\S]*)/i,
    // Simple pattern: From: ... Subject: ...
    /From:\s*([^\n]+)[\s\S]*?Subject:\s*([^\n]+)[\s\S]*?\n\n([\s\S]*)/i,
  ];

  for (const pattern of forwardPatterns) {
    const match = text.match(pattern);
    if (match) {
      // Pattern matches, extract based on which pattern matched
      if (pattern.source.includes('Forwarded message') || pattern.source.includes('Original Message')) {
        return {
          isForwarded: true,
          originalSender: match[1]?.trim(),
          originalDate: match[2]?.trim(),
          originalSubject: match[3]?.trim(),
          originalBody: match[5]?.trim() || match[4]?.trim(),
        };
      } else if (pattern.source.includes('Begin forwarded message')) {
        return {
          isForwarded: true,
          originalSender: match[1]?.trim(),
          originalDate: match[2]?.trim(),
          originalSubject: match[3]?.trim(),
          originalBody: match[5]?.trim() || match[4]?.trim(),
        };
      } else {
        // Simple pattern
        return {
          isForwarded: true,
          originalSender: match[1]?.trim(),
          originalSubject: match[2]?.trim(),
          originalBody: match[3]?.trim(),
        };
      }
    }
  }

  return { isForwarded: false };
}

// Clean up email body (remove signatures, footers)
function cleanEmailBody(body: string): string {
  if (!body) return '';

  // Common signature separators
  const signaturePatterns = [
    /^\s*[-]+\s*$/m,                              // -----
    /^\s*_{2,}\s*$/m,                            // ____
    /^\s*--\s*$/m,                               // --
    /^\s*Best regards,?\s*$/im,                  // Best regards
    /^\s*Kind regards,?\s*$/im,                  // Kind regards
    /^\s*Regards,?\s*$/im,                       // Regards
    /^\s*Cheers,?\s*$/im,                        // Cheers
    /^\s*Thanks,?\s*$/im,                        // Thanks
    /^\s*Sent from my \w+\s*$/im,                // Sent from my iPhone
    /^\s*On \w+, \w+ \d+, \d+ at \d+:\d+,?\s*\w+.*wrote:\s*$/m,  // On Mon, Jan 1, 2024 at 10:00, John wrote:
    /^\s*>?\s*\d{4}-\d{2}-\d{2}\s+\d+:\d+\s+GMT[+-]\d+.*$/m,  // Timestamp patterns
  ];

  let cleaned = body;

  // Find the first signature marker and cut there
  for (const pattern of signaturePatterns) {
    const match = cleaned.match(pattern);
    if (match && match.index) {
      cleaned = cleaned.substring(0, match.index).trim();
      break;
    }
  }

  return cleaned;
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

    // Log for debugging
    console.log('[Email Webhook] Received signature:', signature ? signature.substring(0, 30) + '...' : 'empty');
    console.log('[Email Webhook] Payload length:', payload.length);
    console.log('[Email Webhook] Payload preview:', payload.substring(0, 200) + '...');

    // Allow bypass via env variable or Cloudflare Email Routing
    const verifyEnabled = process.env.WEBHOOK_VERIFY_SIGNATURE !== 'false';
    const isCloudflare = signature === 'cloudflare-email-routing';
    
    if (isCloudflare) {
      console.log('[Email Webhook] Request from Cloudflare Email Routing - accepted');
    } else if (verifyEnabled) {
      if (!verifyWebhookSignature(payload, signature, secret)) {
        console.error('[Email Webhook] Invalid signature - expected:', 
          crypto.createHmac('sha256', secret.replace(/^whsec_/, '')).update(payload, 'utf8').digest('hex').substring(0, 30) + '...');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
      console.log('[Email Webhook] Signature verified successfully');
    } else {
      console.warn('[Email Webhook] Signature verification DISABLED - processing anyway');
    }

    // Parse the email payload
    let payloadData;
    try {
      payloadData = JSON.parse(payload);
    } catch (error) {
      console.error('Failed to parse email payload:', error);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Resend webhook wraps email data in a "data" property
    const emailData = payloadData.data || payloadData;
    
    console.log('[Email Webhook] Email data extracted:', {
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject?.substring(0, 50),
    });

    // Validate required fields
    if (!emailData.to || !emailData.subject) {
      console.error('[Email Webhook] Missing required email fields:', { 
        hasTo: !!emailData.to, 
        hasSubject: !!emailData.subject,
        keys: Object.keys(emailData).slice(0, 10)
      });
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

    // Parse forwarded email if present
    const forwardedInfo = parseForwardedEmail(emailText);
    
    if (forwardedInfo.isForwarded) {
      console.log('[Email Webhook] Detected forwarded email:', {
        originalSender: forwardedInfo.originalSender,
        originalSubject: forwardedInfo.originalSubject,
        originalDate: forwardedInfo.originalDate,
      });
    }

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
        is_forwarded: forwardedInfo.isForwarded,
        forwarded_from: forwardedInfo.originalSender || null,
        forwarded_subject: forwardedInfo.originalSubject || null,
        forwarded_date: forwardedInfo.originalDate || null,
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
    const createdTaskIds: string[] = [];
    
    if (userId && emailText) {
      try {
        actionItems = await extractActionItems(emailData.subject, emailText, forwardedInfo);

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

          // Create actual tasks from action items
          for (const action of actionItems) {
            const { data: task, error: taskError } = await supabase
              .from('tasks')
              .insert({
                user_id: userId,
                title: action.title,
                description: action.description || `From email: ${forwardedInfo.isForwarded ? forwardedInfo.originalSubject : emailData.subject}`,
                status: 'todo',
                priority: action.priority || 'medium',
                due_date: action.due_date || null,
                estimated_time_minutes: action.estimated_time_minutes || null,
                source_type: 'email',
                source_id: emailRecord.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .select()
              .single();

            if (taskError) {
              console.error('Error creating task from action item:', taskError);
            } else if (task) {
              createdTaskIds.push(task.id);
            }
          }

          // Update email with created task IDs
          if (createdTaskIds.length > 0) {
            await supabase
              .from('emails')
              .update({
                created_task_ids: createdTaskIds,
                status: 'completed',
                updated_at: new Date().toISOString(),
              })
              .eq('id', emailRecord.id);
          }
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
      tasksCreated: createdTaskIds.length,
      taskIds: createdTaskIds,
      forwardedEmail: forwardedInfo.isForwarded ? {
        originalSender: forwardedInfo.originalSender,
        originalSubject: forwardedInfo.originalSubject,
        originalDate: forwardedInfo.originalDate,
      } : null,
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
