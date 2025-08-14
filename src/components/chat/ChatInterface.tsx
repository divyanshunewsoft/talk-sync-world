import { useState } from 'react';
import { ConversationsList } from './ConversationsList';
import { MessagesList } from './MessagesList';
import { MessageInput } from './MessageInput';
import { NewConversationDialog } from './NewConversationDialog';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export const ChatInterface = () => {
  const { signOut, user } = useAuth();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showNewConversationDialog, setShowNewConversationDialog] = useState(false);

  const handleNewConversation = () => {
    setShowNewConversationDialog(true);
  };

  const handleConversationCreated = (conversationId: string) => {
    setSelectedConversationId(conversationId);
  };

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar */}
      <div className="flex flex-col h-full">
        {/* User info header */}
        <div className="p-4 border-b border-border w-80">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold">TalkSync</h1>
              <p className="text-sm text-muted-foreground">
                Welcome back, {user?.email?.split('@')[0]}
              </p>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={signOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Conversations list */}
        <div className="flex-1">
          <ConversationsList
            selectedConversationId={selectedConversationId}
            onSelectConversation={setSelectedConversationId}
            onNewConversation={handleNewConversation}
          />
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {selectedConversationId ? (
          <>
            <MessagesList conversationId={selectedConversationId} />
            <MessageInput conversationId={selectedConversationId} />
          </>
        ) : (
          <Card className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Welcome to TalkSync</h2>
              <p className="text-muted-foreground mb-4">
                Select a conversation to start chatting or create a new one
              </p>
              <Button onClick={handleNewConversation}>
                Start a conversation
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* New conversation dialog */}
      <NewConversationDialog
        open={showNewConversationDialog}
        onOpenChange={setShowNewConversationDialog}
        onConversationCreated={handleConversationCreated}
      />
    </div>
  );
};