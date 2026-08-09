'use client';

import { use, useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useConversation, useSendMessage, useUpdateConversationMode } from '@/hooks/use-api';
import { formatDateTime, getPriorityColor } from '@/lib/utils';
import {
  ArrowLeft,
  Send,
  Bot,
  User,
  Pause,
  Play,
  MessageSquare,
} from 'lucide-react';
import Link from 'next/link';

export default function ConversationChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: conversation, isLoading } = useConversation(id);
  const sendMessageMutation = useSendMessage();
  const updateModeMutation = useUpdateConversationMode();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">Conversation not found</p>
        <Link href="/conversations">
          <Button variant="link">Go back to conversations</Button>
        </Link>
      </div>
    );
  }

  const messages = conversation.messages || [];

  const handleSend = async () => {
    if (!message.trim()) return;

    await sendMessageMutation.mutateAsync({
      conversationId: id,
      content: message,
    });

    setMessage('');
  };

  const handleModeChange = async (mode: string) => {
    await updateModeMutation.mutateAsync({
      conversationId: id,
      mode,
    });
  };

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/conversations">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{conversation.customer?.name || 'Unknown'}</h1>
            <p className="text-muted-foreground">{conversation.customer?.company}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getPriorityColor(conversation.priority)}>
            {conversation.priority}
          </Badge>
          <Badge variant={conversation.mode === 'AI' ? 'success' : 'warning'}>
            {conversation.mode === 'AI' ? (
              <><Bot className="h-3 w-3 mr-1" /> AI Mode</>
            ) : (
              <><User className="h-3 w-3 mr-1" /> Human Mode</>
            )}
          </Badge>
          {conversation.mode === 'AI' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleModeChange('HUMAN')}
            >
              <Pause className="h-4 w-4 mr-1" />
              Take Over
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleModeChange('AI')}
            >
              <Play className="h-4 w-4 mr-1" />
              Resume AI
            </Button>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <Card className="flex flex-col h-[calc(100%-4rem)]">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Messages ({messages.length})
          </CardTitle>
        </CardHeader>

        {/* Messages */}
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No messages yet</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.direction === 'OUTGOING' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    msg.direction === 'OUTGOING'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  {msg.englishTranslation && msg.detectedLanguage !== 'en' && (
                    <p className="text-xs mt-1 opacity-70 italic">
                      EN: {msg.englishTranslation}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs opacity-70">
                      {formatDateTime(msg.sentAt)}
                    </span>
                    {msg.aiGenerated && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">
                        AI
                      </Badge>
                    )}
                    {msg.detectedLanguage && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">
                        {msg.detectedLanguage}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              disabled={conversation.mode !== 'HUMAN'}
            />
            <Button
              onClick={handleSend}
              disabled={!message.trim() || sendMessageMutation.isPending || conversation.mode !== 'HUMAN'}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {conversation.mode === 'AI' && (
            <p className="text-xs text-muted-foreground mt-2">
              AI is handling this conversation. Click "Take Over" to respond manually.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
