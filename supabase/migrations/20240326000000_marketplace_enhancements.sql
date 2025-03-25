-- Enhancement migration for IQ Marketplace
-- Adding tables for reviews, purchases, and calendar availability

-- Create reviews table for professionals
CREATE TABLE IF NOT EXISTS professional_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(professional_id, reviewer_id, booking_id)
);

-- Create reviews table for RAG agents
CREATE TABLE IF NOT EXISTS agent_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES rag_agents(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(agent_id, reviewer_id)
);

-- Create agent purchases table
CREATE TABLE IF NOT EXISTS agent_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES rag_agents(id) ON DELETE CASCADE,
    purchaser_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    payment_id TEXT,
    amount INTEGER NOT NULL,
    payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(agent_id, purchaser_id)
);

-- Create calendar availability table
CREATE TABLE IF NOT EXISTS availability_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_recurring BOOLEAN DEFAULT true,
    specific_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CHECK ((is_recurring = true AND specific_date IS NULL) OR 
           (is_recurring = false AND specific_date IS NOT NULL))
);

-- Create blocked time slots table
CREATE TABLE IF NOT EXISTS blocked_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user profile extensions table for marketplace-specific data
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    bio TEXT,
    profile_image_url TEXT,
    timezone TEXT DEFAULT 'UTC',
    email_notifications BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create categories table for organizing professionals and agents
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add category relationships
CREATE TABLE IF NOT EXISTS professional_categories (
    professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (professional_id, category_id)
);

CREATE TABLE IF NOT EXISTS agent_categories (
    agent_id UUID REFERENCES rag_agents(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (agent_id, category_id)
);

-- Enhance rag_agents table with additional fields
ALTER TABLE rag_agents ADD COLUMN IF NOT EXISTS version TEXT;
ALTER TABLE rag_agents ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3,2);
ALTER TABLE rag_agents ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;
ALTER TABLE rag_agents ADD COLUMN IF NOT EXISTS purchase_count INTEGER DEFAULT 0;

-- Enhance professionals table with additional fields
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3,2);
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS booking_count INTEGER DEFAULT 0;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;

-- Create indexes for optimized queries
CREATE INDEX IF NOT EXISTS idx_professional_reviews_professional_id ON professional_reviews(professional_id);
CREATE INDEX IF NOT EXISTS idx_professional_reviews_reviewer_id ON professional_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_agent_reviews_agent_id ON agent_reviews(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_reviews_reviewer_id ON agent_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_agent_purchases_agent_id ON agent_purchases(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_purchases_purchaser_id ON agent_purchases(purchaser_id);
CREATE INDEX IF NOT EXISTS idx_availability_slots_professional_id ON availability_slots(professional_id);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_professional_id ON blocked_slots(professional_id);
CREATE INDEX IF NOT EXISTS idx_professional_categories_category_id ON professional_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_agent_categories_category_id ON agent_categories(category_id);

-- Add RLS policies
ALTER TABLE professional_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_categories ENABLE ROW LEVEL SECURITY;

-- RLS for professional reviews
CREATE POLICY "Public can view professional reviews"
ON professional_reviews FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own professional reviews"
ON professional_reviews FOR INSERT
WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users can update their own professional reviews"
ON professional_reviews FOR UPDATE
USING (auth.uid() = reviewer_id);

-- RLS for agent reviews
CREATE POLICY "Public can view agent reviews"
ON agent_reviews FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own agent reviews"
ON agent_reviews FOR INSERT
WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users can update their own agent reviews"
ON agent_reviews FOR UPDATE
USING (auth.uid() = reviewer_id);

-- RLS for agent purchases
CREATE POLICY "Users can view their own purchases"
ON agent_purchases FOR SELECT
USING (auth.uid() = purchaser_id OR auth.uid() IN (
    SELECT creator_id FROM rag_agents WHERE id = agent_purchases.agent_id
));

CREATE POLICY "Users can insert their own purchases"
ON agent_purchases FOR INSERT
WITH CHECK (auth.uid() = purchaser_id);

-- RLS for availability slots
CREATE POLICY "Public can view availability slots"
ON availability_slots FOR SELECT
USING (true);

CREATE POLICY "Professionals can manage their own availability"
ON availability_slots FOR ALL
USING (auth.uid() IN (
    SELECT user_id FROM professionals WHERE id = availability_slots.professional_id
));

-- RLS for blocked slots
CREATE POLICY "Public can view blocked slots"
ON blocked_slots FOR SELECT
USING (true);

CREATE POLICY "Professionals can manage their own blocked slots"
ON blocked_slots FOR ALL
USING (auth.uid() IN (
    SELECT user_id FROM professionals WHERE id = blocked_slots.professional_id
));

-- RLS for user profiles
CREATE POLICY "Public can view user profiles"
ON user_profiles FOR SELECT
USING (true);

CREATE POLICY "Users can manage their own profile"
ON user_profiles FOR ALL
USING (auth.uid() = id);

-- RLS for categories
CREATE POLICY "Public can view categories"
ON categories FOR SELECT
USING (true);

-- Only admins can manage categories (to be implemented with custom claims)

-- RLS for category relationships
CREATE POLICY "Public can view professional categories"
ON professional_categories FOR SELECT
USING (true);

CREATE POLICY "Professionals can manage their own categories"
ON professional_categories FOR ALL
USING (auth.uid() IN (
    SELECT user_id FROM professionals WHERE id = professional_categories.professional_id
));

CREATE POLICY "Public can view agent categories"
ON agent_categories FOR SELECT
USING (true);

CREATE POLICY "Agent creators can manage their own categories"
ON agent_categories FOR ALL
USING (auth.uid() IN (
    SELECT creator_id FROM rag_agents WHERE id = agent_categories.agent_id
)); 