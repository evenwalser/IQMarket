-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  assistant_type TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  assistant_id TEXT,
  visualizations JSONB
);
