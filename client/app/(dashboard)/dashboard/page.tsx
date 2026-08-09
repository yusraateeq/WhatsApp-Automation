'use client';

import { useDashboardStats, useWhatsAppStatus, useTickets } from '@/hooks/use-api';
import { EmergencyAlerts } from '@/components/dashboard/emergency-alerts';
import {
  Users,
  UserCheck,
  Bot,
  MessageSquare,
  AlertTriangle,
  Clock,
  Wifi,
  WifiOff,
  Loader2,
  Wrench,
} from 'lucide-react';

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  loading,
}: {
  title: string;
  value: number | undefined;
  icon: React.ElementType;
  color: string;
  loading?: boolean;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          {loading ? (
            <div className="mt-2 h-8 w-16 bg-gray-100 rounded animate-pulse" />
          ) : (
            <p className="mt-2 text-3xl font-bold text-gray-900">{value ?? 0}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  );
}

function WhatsAppStatusCard() {
  const { data: status, isLoading } = useWhatsAppStatus();

  const isConnected = status?.status === 'CONNECTED';

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">WhatsApp Status</h3>

      {isLoading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 size={20} className="animate-spin" />
          <span>Checking status...</span>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {isConnected ? (
              <div className="flex items-center gap-2 text-green-600">
                <Wifi size={20} />
                <span className="font-medium">Connected</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600">
                <WifiOff size={20} />
                <span className="font-medium">{status?.status || 'Disconnected'}</span>
              </div>
            )}
          </div>

          {status?.phoneNumber && (
            <p className="text-sm text-gray-600">
              Phone: {status.phoneNumber}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <p className="text-sm text-gray-500">Messages Today</p>
              <p className="text-lg font-semibold">{status?.messagesToday || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Uptime</p>
              <p className="text-lg font-semibold">
                {status?.uptime ? `${Math.floor(status.uptime / 3600)}h` : '0h'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStats();
  const { data: ticketsData } = useTickets({ status: 'OPEN', priority: 'CRITICAL' });

  const emergencyAlerts = (ticketsData?.tickets || [])
    .filter((t: any) => t.priority === 'CRITICAL')
    .map((t: any) => ({
      id: t.id,
      customerName: t.customer?.name || 'Unknown',
      message: t.title,
      ticketId: t.id,
      createdAt: t.createdAt,
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of your WhatsApp automation platform</p>
      </div>

      {/* Emergency Alerts */}
      <EmergencyAlerts alerts={emergencyAlerts} />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Customers"
          value={stats?.totalCustomers}
          icon={Users}
          color="bg-blue-500"
          loading={isLoading}
        />
        <StatCard
          title="Active Customers"
          value={stats?.activeCustomers}
          icon={UserCheck}
          color="bg-green-500"
          loading={isLoading}
        />
        <StatCard
          title="AI Conversations"
          value={stats?.aiConversations}
          icon={Bot}
          color="bg-purple-500"
          loading={isLoading}
        />
        <StatCard
          title="Messages Today"
          value={stats?.messagesToday}
          icon={MessageSquare}
          color="bg-orange-500"
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Open Tickets"
          value={stats?.openTickets}
          icon={Wrench}
          color="bg-yellow-500"
          loading={isLoading}
        />
        <StatCard
          title="High Priority"
          value={stats?.highPriorityIssues}
          icon={AlertTriangle}
          color="bg-red-500"
          loading={isLoading}
        />
        <StatCard
          title="Human Handoffs"
          value={stats?.humanHandoffs}
          icon={Users}
          color="bg-indigo-500"
          loading={isLoading}
        />
        <StatCard
          title="Pending Follow-ups"
          value={stats?.pendingFollowups}
          icon={Clock}
          color="bg-teal-500"
          loading={isLoading}
        />
      </div>

      {/* WhatsApp Status */}
      <WhatsAppStatusCard />
    </div>
  );
}
