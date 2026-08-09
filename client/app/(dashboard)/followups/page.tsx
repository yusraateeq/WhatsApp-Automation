'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { useFollowups } from '@/hooks/use-api';
import { formatDate, getStatusColor } from '@/lib/utils';
import { Search, Calendar, MessageSquare, RefreshCw } from 'lucide-react';
import { useState } from 'react';

export default function FollowupsPage() {
  const { data: followups, isLoading } = useFollowups();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const filteredFollowups = followups?.filter((followup) => {
    const matchesSearch = 
      followup.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      followup.message?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || followup.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info'> = {
      PENDING: 'warning',
      SENT: 'success',
      FAILED: 'destructive',
      CANCELLED: 'secondary',
    };
    return variants[status] || 'default';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Follow-ups</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule New
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer or message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'PENDING', 'SENT', 'FAILED', 'CANCELLED'].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(status)}
            >
              {status === 'all' ? 'All' : status}
            </Button>
          ))}
        </div>
      </div>

      {/* Follow-ups Table */}
      <Card>
        <CardHeader>
          <CardTitle>Follow-up History</CardTitle>
          <CardDescription>All scheduled and sent follow-up messages</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Retries</TableHead>
                <TableHead>Message Preview</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFollowups?.map((followup) => (
                <TableRow key={followup.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{followup.customer?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {followup.customer?.company}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(followup.scheduledAt)}</TableCell>
                  <TableCell>
                    {followup.sentAt ? formatDate(followup.sentAt) : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadge(followup.status)}>
                      {followup.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{followup.retryCount}</TableCell>
                  <TableCell>
                    <p className="max-w-xs truncate text-sm text-muted-foreground">
                      {followup.message}
                    </p>
                  </TableCell>
                  <TableCell>
                    {followup.status === 'FAILED' && (
                      <Button variant="ghost" size="sm">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredFollowups?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No follow-ups found</p>
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
