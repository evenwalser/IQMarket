
-- Add session_id column to conversations table
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS session_id UUID NULL;

-- Add index for faster lookups by session_id
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);

-- Backfill existing conversations with a random session ID
-- This ensures existing data won't be lost
UPDATE conversations 
SET session_id = gen_random_uuid()
WHERE session_id IS NULL;

-- Make session_id non-nullable after backfill
ALTER TABLE conversations ALTER COLUMN session_id SET NOT NULL;
