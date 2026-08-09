'use client';

import { use } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTickets, useUpdateTicketStatus } from '@/hooks/use-api';
import { formatDate, getPriorityColor, getStatusColor } from '@/lib/utils';
import {
  ArrowLeft,
  Wrench,
  User,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: ticketsData, isLoading } = useTickets({});
  const updateStatusMutation = useUpdateTicketStatus();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const tickets = ticketsData?.tickets || [];
  const ticket = tickets.find((t) => t.id === id);

  if (!ticket) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">Ticket not found</p>
        <Link href="/tickets">
          <Button variant="link">Go back to tickets</Button>
        </Link>
      </div>
    );
  }

  const handleStatusChange = async (status: string) => {
    await updateStatusMutation.mutateAsync({ id, status });
  };

  const statusActions: Record<string, string[]> = {
    OPEN: ['IN_PROGRESS', 'CLOSED'],
    IN_PROGRESS: ['WAITING_CUSTOMER', 'RESOLVED'],
    WAITING_CUSTOMER: ['IN_PROGRESS', 'RESOLVED'],
    RESOLVED: ['CLOSED'],
    CLOSED: [],
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/tickets">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{ticket.title}</h1>
            <p className="text-muted-foreground">Ticket #{ticket.id.slice(0, 8)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge className={getPriorityColor(ticket.priority)}>
            {ticket.priority}
          </Badge>
          <Badge className={getStatusColor(ticket.status)}>
            {ticket.status}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Ticket Info */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Ticket Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Description</p>
              <p className="mt-1">{ticket.description || 'No description provided'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Category</p>
                <Badge variant="outline" className="mt-1">{ticket.category}</Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Customer</p>
                <p className="mt-1">{ticket.customer?.name || 'Unknown'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <p className="mt-1 flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(ticket.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                <p className="mt-1 flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatDate(ticket.updatedAt)}
                </p>
              </div>
            </div>
            {ticket.resolvedAt && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Resolved</p>
                <p className="mt-1 flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  {formatDate(ticket.resolvedAt)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Actions
            </CardTitle>
            <CardDescription>Update ticket status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {statusActions[ticket.status]?.map((action) => (
              <Button
                key={action}
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleStatusChange(action)}
                disabled={updateStatusMutation.isPending}
              >
                {action === 'IN_PROGRESS' && <Clock className="h-4 w-4 mr-2" />}
                {action === 'RESOLVED' && <CheckCircle className="h-4 w-4 mr-2" />}
                {action === 'CLOSED' && <Wrench className="h-4 w-4 mr-2" />}
                {action === 'WAITING_CUSTOMER' && <User className="h-4 w-4 mr-2" />}
                Mark as {action.replace('_', ' ')}
              </Button>
            ))}
            {statusActions[ticket.status]?.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                This ticket is closed
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
