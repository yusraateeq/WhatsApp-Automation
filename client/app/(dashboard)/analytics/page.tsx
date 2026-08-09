'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAnalyticsOverview, useAnalyticsMessages, useAnalyticsTickets, useAnalyticsLanguages } from '@/hooks/use-api';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { MessageSquare, Users, AlertTriangle, Globe } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function AnalyticsPage() {
  const { data: overviewData, isLoading: overviewLoading } = useAnalyticsOverview();
  const { data: messagesData, isLoading: messagesLoading } = useAnalyticsMessages();
  const { data: ticketsData, isLoading: ticketsLoading } = useAnalyticsTickets();
  const { data: languagesData, isLoading: languagesLoading } = useAnalyticsLanguages();

  // Extract arrays from API responses
  const overview = overviewData || {};
  const messages = messagesData || [];
  const tickets = ticketsData?.byCategory || [];
  const languages = languagesData?.languages || [];

  if (overviewLoading || messagesLoading || ticketsLoading || languagesLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Analytics</h1>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.totalMessages || 0}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.activeCustomers || 0}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.openTickets || 0}</div>
            <p className="text-xs text-muted-foreground">Pending resolution</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Languages</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.languagesCount || 0}</div>
            <p className="text-xs text-muted-foreground">Detected languages</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Messages Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Messages Over Time</CardTitle>
            <CardDescription>Daily message volume</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={messages || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="sent" 
                  stroke="#8884d8" 
                  name="Sent"
                  strokeWidth={2} 
                />
                <Line 
                  type="monotone" 
                  dataKey="received" 
                  stroke="#82ca9d" 
                  name="Received"
                  strokeWidth={2} 
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tickets by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Tickets by Category</CardTitle>
            <CardDescription>Distribution of maintenance tickets</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tickets || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8">
                  {(tickets || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Language Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Language Distribution</CardTitle>
            <CardDescription>Customer preferred languages</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={languages || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {(languages || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* AI vs Human */}
        <Card>
          <CardHeader>
            <CardTitle>AI vs Human Conversations</CardTitle>
            <CardDescription>Conversation mode distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-[300px]">
              <div className="text-center">
                <div className="flex justify-center gap-8 mb-8">
                  <div>
                    <div className="text-4xl font-bold text-green-500">
                      {overview?.aiConversations || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">AI Handled</p>
                  </div>
                  <div>
                    <div className="text-4xl font-bold text-orange-500">
                      {overview?.humanConversations || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">Human Handled</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div 
                    className="bg-green-500 h-4 rounded-full" 
                    style={{ 
                      width: `${((overview?.aiConversations || 0) / 
                        ((overview?.aiConversations || 0) + (overview?.humanConversations || 1)) * 100)}%` 
                    }}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {((overview?.aiConversations || 0) / 
                    ((overview?.aiConversations || 0) + (overview?.humanConversations || 1)) * 100).toFixed(1)}% AI Automation Rate
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
