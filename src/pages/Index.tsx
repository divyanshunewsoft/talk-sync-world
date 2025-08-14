import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { ChatInterface } from '@/components/chat/ChatInterface';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Loading...</h1>
          <p className="text-muted-foreground">Setting up your chat experience</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <ChatInterface />;
};

export default Index;
