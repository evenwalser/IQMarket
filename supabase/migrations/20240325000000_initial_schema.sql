-- This is the initial schema setup for IQMarket
-- It combines both the essential tables from the original project
-- and the new marketplace functionality

-- First, let's create the core tables needed from the original project
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'New Conversation',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    session_id UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS chat_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Set up storage bucket for file attachments
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('chat_attachments', 'chat_attachments', false, false, 104857600, '{application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv,image/png,image/jpeg,image/jpg}')
ON CONFLICT (id) DO NOTHING;

-- Now, let's create the marketplace tables
-- Create professionals table
CREATE TABLE IF NOT EXISTS professionals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    bio TEXT,
    expertise TEXT[] NOT NULL,
    hourly_rate INTEGER,
    availability_schedule JSONB,
    profile_image_url TEXT,
    linkedin_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    conversation_id UUID REFERENCES conversations(id),
    payment_id TEXT,
    payment_status TEXT CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create rag_agents table
CREATE TABLE IF NOT EXISTS rag_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN NOT NULL DEFAULT false,
    price INTEGER, -- null for free agents
    configuration JSONB NOT NULL,
    documents UUID[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_attachments_conversation_id ON chat_attachments(conversation_id);
CREATE INDEX IF NOT EXISTS idx_professionals_user_id ON professionals(user_id);
CREATE INDEX IF NOT EXISTS idx_professionals_expertise ON professionals USING GIN(expertise);
CREATE INDEX IF NOT EXISTS idx_bookings_professional_id ON bookings(professional_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_rag_agents_creator_id ON rag_agents(creator_id);
CREATE INDEX IF NOT EXISTS idx_rag_agents_is_public ON rag_agents(is_public);

-- Add RLS (Row Level Security) policies
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_agents ENABLE ROW LEVEL SECURITY;

-- RLS policies for conversations
CREATE POLICY "Users can view their own conversations"
ON conversations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations"
ON conversations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
ON conversations FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
ON conversations FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for chat_attachments
CREATE POLICY "Users can view attachments to their conversations"
ON chat_attachments FOR SELECT
USING (
    conversation_id IN (
        SELECT id FROM conversations WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert attachments to their conversations"
ON chat_attachments FOR INSERT
WITH CHECK (
    conversation_id IN (
        SELECT id FROM conversations WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete attachments to their conversations"
ON chat_attachments FOR DELETE
USING (
    conversation_id IN (
        SELECT id FROM conversations WHERE user_id = auth.uid()
    )
);

-- RLS policies for storage
CREATE POLICY "Users can upload attachments to their conversations"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'chat_attachments' AND 
    auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view attachments to their conversations"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'chat_attachments' AND 
    auth.uid() IS NOT NULL
);

-- RLS policies for professionals
CREATE POLICY "Public profiles are viewable by everyone"
ON professionals FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own profile"
ON professionals FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON professionals FOR UPDATE
USING (auth.uid() = user_id);

-- RLS policies for bookings
CREATE POLICY "Users can view their own bookings"
ON bookings FOR SELECT
USING (auth.uid() = user_id OR auth.uid() IN (
    SELECT user_id FROM professionals WHERE id = bookings.professional_id
));

CREATE POLICY "Users can insert bookings"
ON bookings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings"
ON bookings FOR UPDATE
USING (auth.uid() = user_id OR auth.uid() IN (
    SELECT user_id FROM professionals WHERE id = bookings.professional_id
));

-- RLS policies for rag_agents
CREATE POLICY "Public agents are viewable by everyone"
ON rag_agents FOR SELECT
USING (is_public OR auth.uid() = creator_id);

CREATE POLICY "Users can insert their own agents"
ON rag_agents FOR INSERT
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own agents"
ON rag_agents FOR UPDATE
USING (auth.uid() = creator_id); 