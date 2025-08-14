/*
  # Fix RLS infinite recursion for conversation policies

  1. Problem
    - RLS policies for conversations, conversation_participants, and messages tables are causing infinite recursion
    - The SELECT policies contain subqueries that recursively trigger the same RLS policies
    - This prevents users from fetching conversations, viewing participants, or creating new conversations

  2. Solution
    - Drop the problematic RLS policies
    - Create SECURITY DEFINER functions to safely retrieve conversation IDs without triggering RLS recursion
    - Re-apply RLS policies using these new helper functions
    - This breaks the recursive dependency and allows policies to be evaluated correctly

  3. Changes
    - Drop existing SELECT policies on conversations, conversation_participants, and messages
    - Drop existing INSERT policy on conversation_participants
    - Create get_user_conversation_ids() function
    - Create get_created_conversation_ids() function
    - Recreate all policies using the new helper functions
*/

-- Drop existing problematic SELECT policies
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view messages from their conversations" ON public.messages;

-- Drop existing problematic INSERT policy on conversation_participants
DROP POLICY IF EXISTS "Users can add participants to conversations they created" ON public.conversation_participants;

-- Create helper function to get conversation IDs for the current user
-- This function runs with SECURITY DEFINER, bypassing RLS on conversation_participants for its internal query.
CREATE OR REPLACE FUNCTION public.get_user_conversation_ids()
RETURNS SETOF UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid();
END;
$$;

-- Create helper function to get conversation IDs created by the current user
CREATE OR REPLACE FUNCTION public.get_created_conversation_ids()
RETURNS SETOF UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT id FROM public.conversations WHERE created_by = auth.uid();
END;
$$;

-- Recreate RLS policies using the new helper functions

-- RLS policy for conversations (SELECT)
CREATE POLICY "Users can view conversations they participate in" ON public.conversations FOR SELECT
USING (id IN (SELECT public.get_user_conversation_ids()));

-- RLS policy for conversation_participants (SELECT)
CREATE POLICY "Users can view participants of their conversations" ON public.conversation_participants FOR SELECT
USING (conversation_id IN (SELECT public.get_user_conversation_ids()));

-- RLS policy for conversation_participants (INSERT)
-- A user can add a participant if the conversation was created by them OR if the participant being added is themselves.
CREATE POLICY "Users can add participants to conversations they created" ON public.conversation_participants FOR INSERT
WITH CHECK (conversation_id IN (SELECT public.get_created_conversation_ids()) OR user_id = auth.uid());

-- RLS policy for messages (SELECT)
CREATE POLICY "Users can view messages from their conversations" ON public.messages FOR SELECT
USING (conversation_id IN (SELECT public.get_user_conversation_ids()));