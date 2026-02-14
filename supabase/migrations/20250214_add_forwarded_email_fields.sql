-- Add forwarded email fields to emails table
ALTER TABLE emails 
ADD COLUMN IF NOT EXISTS is_forwarded BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS forwarded_from VARCHAR(255),
ADD COLUMN IF NOT EXISTS forwarded_subject VARCHAR(1000),
ADD COLUMN IF NOT EXISTS forwarded_date TEXT;

-- Add index for forwarded emails
CREATE INDEX IF NOT EXISTS idx_emails_is_forwarded ON emails(is_forwarded);
