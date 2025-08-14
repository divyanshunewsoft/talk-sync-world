import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  username: string;
  display_name: string | null;
}

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationCreated: (conversationId: string) => void;
}

export const NewConversationDialog = ({
  open,
  onOpenChange,
  onConversationCreated,
}: NewConversationDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) return;

    const fetchUsers = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .neq('id', user?.id)
        .order('display_name');

      if (error) {
        console.error('Error fetching users:', error);
        toast({
          title: "Error",
          description: "Failed to load users",
          variant: "destructive",
        });
      } else {
        setUsers(data || []);
      }
      setLoading(false);
    };

    fetchUsers();
  }, [open, user?.id, toast]);

  const filteredUsers = users.filter(u => 
    (u.display_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const createConversation = async (otherUserId: string) => {
    if (!user || creating) return;

    setCreating(true);

    try {
      // Check if conversation already exists
      const { data: existingConv } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .in('user_id', [user.id, otherUserId]);

      if (existingConv && existingConv.length >= 2) {
        // Find conversation that has both users
        const conversationCounts = existingConv.reduce((acc: Record<string, number>, item) => {
          acc[item.conversation_id] = (acc[item.conversation_id] || 0) + 1;
          return acc;
        }, {});

        const existingConversationId = Object.keys(conversationCounts).find(
          id => conversationCounts[id] === 2
        );

        if (existingConversationId) {
          onConversationCreated(existingConversationId);
          onOpenChange(false);
          setCreating(false);
          return;
        }
      }

      // Create new conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          type: 'dm',
          created_by: user.id,
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add participants
      const { error: participantsError } = await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: conversation.id, user_id: user.id },
          { conversation_id: conversation.id, user_id: otherUserId },
        ]);

      if (participantsError) throw participantsError;

      onConversationCreated(conversation.id);
      onOpenChange(false);
      toast({
        title: "Conversation created",
        description: "You can now start chatting!",
      });
    } catch (error: any) {
      console.error('Error creating conversation:', error);
      toast({
        title: "Failed to create conversation",
        description: error.message,
        variant: "destructive",
      });
    }

    setCreating(false);
  };

  const getDisplayName = (user: User) => {
    return user.display_name || user.username;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start a new conversation</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="search">Search users</Label>
            <Input
              id="search"
              placeholder="Search by name or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <ScrollArea className="h-64">
            {loading ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground">Loading users...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground">No users found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer"
                    onClick={() => createConversation(u.id)}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {getInitials(getDisplayName(u))}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{getDisplayName(u)}</p>
                      <p className="text-xs text-muted-foreground">@{u.username}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};