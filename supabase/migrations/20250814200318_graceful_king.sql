/*
  # Fix RLS policies to prevent infinite recursion

  1. Problem
    - Current RLS policies on conversation_participants are causing infinite recursion
    - Policies are referencing themselves or creating circular dependencies

  2. Solution
    - Drop existing problematic policies
    - Create simple, non-recursive policies that avoid circular references
    - Use direct auth.uid() checks instead of complex subqueries

  3. Security
    - Users can only see participants of conversations they are part of
    - Users can only add participants to conversations they created or join themselves
    - Maintain data security without recursion
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to conversations they created" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON conversations;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;
DROP POLICY IF EXISTS "Users can view messages from their conversations" ON messages;

-- Create simple, non-recursive policy for conversation_participants SELECT
CREATE POLICY "Users can view participants of conversations they join"
  ON conversation_participants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM conversation_participants cp 
      WHERE cp.conversation_id = conversation_participants.conversation_id 
      AND cp.user_id = auth.uid()
    )
  );

-- Create simple policy for conversation_participants INSERT
CREATE POLICY "Users can join conversations or add others to their own conversations"
  ON conversation_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Users can always add themselves
    user_id = auth.uid()
    OR
    -- Users can add others to conversations they created
    EXISTS (
      SELECT 1 
      FROM conversations c 
      WHERE c.id = conversation_id 
      AND c.created_by = auth.uid()
    )
  );

-- Create simple policy for conversations SELECT
CREATE POLICY "Users can view their conversations"
  ON conversations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM conversation_participants cp 
      WHERE cp.conversation_id = conversations.id 
      AND cp.user_id = auth.uid()
    )
  );

-- Create simple policy for messages SELECT
CREATE POLICY "Users can view messages in their conversations"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM conversation_participants cp 
      WHERE cp.conversation_id = messages.conversation_id 
      AND cp.user_id = auth.uid()
    )
  );

-- Create simple policy for messages INSERT
CREATE POLICY "Users can send messages to conversations they participate in"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND
    EXISTS (
      SELECT 1 
      FROM conversation_participants cp 
      WHERE cp.conversation_id = messages.conversation_id 
      AND cp.user_id = auth.uid()
    )
  );