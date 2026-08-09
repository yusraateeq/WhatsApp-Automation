'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bot, Settings, Activity, MessageSquare } from 'lucide-react';

export default function AIAgentPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">AI Agent</h1>
        <Button variant="outline">
          <Settings className="h-4 w-4 mr-2" />
          Configure
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Agent Status
            </CardTitle>
            <CardDescription>Current AI agent configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <Badge variant="success">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Model</span>
              <span className="text-sm">anthropic/claude-3-sonnet</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Conversations Today</span>
              <span className="text-2xl font-bold">0</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Performance
            </CardTitle>
            <CardDescription>AI agent metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Success Rate</span>
              <span className="text-2xl font-bold">-</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Avg Response Time</span>
              <span className="text-sm">-</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Human Handoffs</span>
              <span className="text-sm">0</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Conversations</CardTitle>
          <CardDescription>Latest AI-handled conversations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No recent conversations</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
