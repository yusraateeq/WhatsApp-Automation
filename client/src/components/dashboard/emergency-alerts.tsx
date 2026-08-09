'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Phone, Clock } from 'lucide-react';
import Link from 'next/link';

interface EmergencyAlert {
  id: string;
  customerName: string;
  message: string;
  ticketId: string;
  createdAt: string;
}

interface EmergencyAlertsProps {
  alerts: EmergencyAlert[];
}

export function EmergencyAlerts({ alerts }: EmergencyAlertsProps) {
  if (!alerts || alerts.length === 0) {
    return null;
  }

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="h-5 w-5" />
          Emergency Alerts ({alerts.length})
        </CardTitle>
        <CardDescription className="text-red-600">
          Critical issues requiring immediate attention
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="flex items-start justify-between p-3 bg-white rounded-lg border border-red-200"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="destructive">CRITICAL</Badge>
                <span className="font-medium">{alert.customerName}</span>
              </div>
              <p className="text-sm text-muted-foreground">{alert.message}</p>
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {new Date(alert.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/tickets/${alert.ticketId}`}>
                <Button size="sm" variant="destructive">
                  View Ticket
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
