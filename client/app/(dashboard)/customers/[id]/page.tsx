'use client';

import { use, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCustomer, useConversations, useTickets } from '@/hooks/use-api';
import { formatDate, getStatusColor, getPriorityColor, formatPhoneDisplay } from '@/lib/utils';
import { ElevatorForm } from '@/components/elevators/elevator-form';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Building,
  MessageSquare,
  Wrench,
  Calendar,
  Bot,
  Edit,
  Plus,
} from 'lucide-react';
import Link from 'next/link';

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: customer, isLoading } = useCustomer(id);
  const { data: conversations } = useConversations({ customerId: id });
  const { data: ticketsData } = useTickets({ customerId: id });
  const [showElevatorForm, setShowElevatorForm] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">Customer not found</p>
        <Link href="/customers">
          <Button variant="link">Go back to customers</Button>
        </Link>
      </div>
    );
  }

  const tickets = ticketsData?.tickets || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/customers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{customer.name}</h1>
            <p className="text-muted-foreground">{customer.company || 'No company'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Badge className={getStatusColor(customer.status)}>
            {customer.status}
          </Badge>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Phone</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm">{formatPhoneDisplay(customer.phone)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm">{customer.email || 'No email'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Location</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm">{customer.location || 'No location'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Automation</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant={customer.automationEnabled ? 'success' : 'secondary'}>
              {customer.automationEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="elevators">
        <TabsList>
          <TabsTrigger value="elevators">
            Elevators ({customer.elevators?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="conversations">
            Conversations ({conversations?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="tickets">
            Tickets ({tickets.length})
          </TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        {/* Elevators Tab */}
        <TabsContent value="elevators">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Elevators</CardTitle>
                <CardDescription>All elevators for this customer</CardDescription>
              </div>
              <Button size="sm" onClick={() => setShowElevatorForm(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Elevator
              </Button>
            </CardHeader>
            <CardContent>
              {customer.elevators?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Model</TableHead>
                      <TableHead>Serial Number</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Installation Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.elevators.map((elevator) => (
                      <TableRow key={elevator.id}>
                        <TableCell className="font-medium">{elevator.model || '-'}</TableCell>
                        <TableCell>{elevator.serialNumber || '-'}</TableCell>
                        <TableCell>{elevator.type || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={elevator.status === 'ACTIVE' ? 'success' : 'secondary'}>
                            {elevator.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {elevator.installationDate ? formatDate(elevator.installationDate) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-8 text-muted-foreground">No elevators found</p>
              )}
            </CardContent>
          </Card>
          <ElevatorForm
            open={showElevatorForm}
            onOpenChange={setShowElevatorForm}
            customerId={id}
          />
        </TabsContent>

        {/* Conversations Tab */}
        <TabsContent value="conversations">
          <Card>
            <CardHeader>
              <CardTitle>Conversations</CardTitle>
              <CardDescription>All conversations with this customer</CardDescription>
            </CardHeader>
            <CardContent>
              {conversations?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mode</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Last Message</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conversations.map((conv) => (
                      <TableRow key={conv.id}>
                        <TableCell>
                          <Badge variant={conv.mode === 'AI' ? 'success' : 'warning'}>
                            {conv.mode}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(conv.priority)}>
                            {conv.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {conv.lastMessageAt ? formatDate(conv.lastMessageAt) : '-'}
                        </TableCell>
                        <TableCell>
                          <Link href={`/conversations/${conv.id}`}>
                            <Button variant="ghost" size="sm">
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-8 text-muted-foreground">No conversations yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tickets Tab */}
        <TabsContent value="tickets">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Tickets</CardTitle>
              <CardDescription>All tickets for this customer</CardDescription>
            </CardHeader>
            <CardContent>
              {tickets.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-medium">{ticket.title}</TableCell>
                        <TableCell>{ticket.category}</TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(ticket.priority)}>
                            {ticket.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={ticket.status === 'OPEN' ? 'destructive' : 'secondary'}>
                            {ticket.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(ticket.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-8 text-muted-foreground">No tickets found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
              <CardDescription>Recent activity for this customer</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Customer created</p>
                    <p className="text-xs text-muted-foreground">{formatDate(customer.createdAt)}</p>
                  </div>
                </div>
                {customer.lastContactAt && (
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <div>
                      <p className="text-sm font-medium">Last contact</p>
                      <p className="text-xs text-muted-foreground">{formatDate(customer.lastContactAt)}</p>
                    </div>
                  </div>
                )}
                {customer.nextFollowupAt && (
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    <div>
                      <p className="text-sm font-medium">Next follow-up scheduled</p>
                      <p className="text-xs text-muted-foreground">{formatDate(customer.nextFollowupAt)}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
