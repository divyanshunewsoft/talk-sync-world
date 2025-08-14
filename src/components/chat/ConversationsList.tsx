import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, MessageCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Conversation {
  id: string;
  name: string | null;
  type: string;
  updated_at: string;
  created_by: string | null;
  other_user?: {
    display_name: string | null;
    username: string;
  };
}

interface ConversationsListProps {
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
}

export const ConversationsList = ({
  selectedConversationId,
  onSelectConversation,
  onNewConversation,
}: ConversationsListProps) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      const { data: convData, error } = await supabase
        .from('conversations')
        .select(`
          id,
          name,
          type,
          updated_at,
          created_by,
          conversation_participants!inner(
            user_id,
            profiles(username, display_name)
          )
        `)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        return;
      }

      // Process conversations to get other user info for DMs
      const processedConversations = convData?.map((conv: any) => {
        if (conv.type === 'dm') {
          const otherParticipant = conv.conversation_participants.find(
            (p: any) => p.user_id !== user.id
          );
          return {
            ...conv,
            other_user: otherParticipant?.profiles,
          };
        }
        return conv;
      }) || [];

      setConversations(processedConversations);
      setLoading(false);
    };

    fetchConversations();

    // Set up realtime subscription
    const channel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const getConversationName = (conversation: Conversation) => {
    if (conversation.type === 'group') {
      return conversation.name || 'Group Chat';
    }
    return conversation.other_user?.display_name || conversation.other_user?.username || 'Unknown User';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <Card className="w-80 h-full flex items-center justify-center">
        <p className="text-muted-foreground">Loading conversations...</p>
      </Card>
    );
  }

  return (
    <Card className="w-80 h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Conversations</h2>
          <Button size="icon" variant="outline" onClick={onNewConversation}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2">
          {conversations.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No conversations yet</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={onNewConversation}
              >
                Start a conversation
              </Button>
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-accent ${
                  selectedConversationId === conversation.id 
                    ? 'bg-accent text-accent-foreground' 
                    : ''
                }`}
                onClick={() => onSelectConversation(conversation.id)}
              >
                <Avatar>
                  <AvatarFallback>
                    {getInitials(getConversationName(conversation))}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">
                    {getConversationName(conversation)}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {new Date(conversation.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};