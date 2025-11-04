-- Migration: Add workout assistant conversation tables
-- This enables AI-powered workout building with conversational interface

-- Conversations table
CREATE TABLE IF NOT EXISTS workout_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
  title TEXT, -- e.g., "Tom Jenkins - Hyrox Week 1"
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversation messages
CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES workout_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  action TEXT CHECK (action IN ('create', 'update', 'delete', 'info', 'error')),
  metadata JSONB DEFAULT '{}', -- Store changes, exercise IDs, affected sessions, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workout_conversations_client ON workout_conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_workout_conversations_plan ON workout_conversations(plan_id);
CREATE INDEX IF NOT EXISTS idx_workout_conversations_status ON workout_conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_created ON conversation_messages(created_at DESC);

-- RLS Policies (if needed)
ALTER TABLE workout_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage their conversations
CREATE POLICY "Users can view their own conversations" ON workout_conversations
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own conversations" ON workout_conversations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own conversations" ON workout_conversations
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view messages in their conversations" ON conversation_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workout_conversations
      WHERE workout_conversations.id = conversation_messages.conversation_id
    )
  );

CREATE POLICY "Users can insert messages" ON conversation_messages
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Comments for documentation
COMMENT ON TABLE workout_conversations IS 'Stores AI workout builder conversations for iterative workout creation';
COMMENT ON TABLE conversation_messages IS 'Individual messages in workout builder conversations with AI responses and actions';
COMMENT ON COLUMN conversation_messages.metadata IS 'JSON data containing changes made, exercise IDs, session IDs, and other context';

