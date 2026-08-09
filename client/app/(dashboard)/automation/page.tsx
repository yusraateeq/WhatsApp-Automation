'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { useAutomationStatus, useAutomationLogs } from '@/hooks/use-api';
import { formatDate, formatDateTime } from '@/lib/utils';
import { Bot, Activity, Clock, MessageSquare, AlertTriangle } from 'lucide-react';

export default function AutomationPage() {
  const { data: status, isLoading: statusLoading } = useAutomationStatus();
  const { data: logs, isLoading: logsLoading } = useAutomationLogs();

  if (statusLoading || logsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Automation</h1>
        <Button variant="outline">
          <Activity className="h-4 w-4 mr-2" />
          View Logs
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.totalCustomers || 0}</div>
            <p className="text-xs text-muted-foreground">With automation enabled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.activeConversations || 0}</div>
            <p className="text-xs text-muted-foreground">In AI mode</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Follow-ups</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.pendingFollowups || 0}</div>
            <p className="text-xs text-muted-foreground">Scheduled for next 24h</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Messages</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.failedMessages || 0}</div>
            <p className="text-xs text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Global Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Automation Settings</CardTitle>
          <CardDescription>Configure global automation behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable Global Automation</p>
              <p className="text-sm text-muted-foreground">
                Turn on/off automation for all customers
              </p>
            </div>
            <Badge variant={status?.enabled ? 'success' : 'destructive'}>
              {status?.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Business Hours Only</p>
              <p className="text-sm text-muted-foreground">
                Only send messages during business hours
              </p>
            </div>
            <Badge variant={status?.businessHoursOnly ? 'success' : 'secondary'}>
              {status?.businessHoursOnly ? 'Yes' : 'No'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Recent Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest automation events</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs?.slice(0, 10).map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{formatDateTime(log.createdAt)}</TableCell>
                  <TableCell>{log.event}</TableCell>
                  <TableCell>{log.customerName}</TableCell>
                  <TableCell>
                    <Badge variant={log.success ? 'success' : 'destructive'}>
                      {log.success ? 'Success' : 'Failed'}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                    {log.details}
                  </TableCell>
                </TableRow>
              ))}
              {logs?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No recent activity</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
