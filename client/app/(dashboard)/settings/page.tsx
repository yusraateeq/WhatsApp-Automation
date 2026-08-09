'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useSystemSettings, useUpdateSystemSettings } from '@/hooks/use-api';
import { useState } from 'react';
import { Settings, Clock, Bot, Bell, Save } from 'lucide-react';

export default function SettingsPage() {
  const { data: settings, isLoading } = useSystemSettings();
  const updateSettingsMutation = useUpdateSystemSettings();
  
  const [formData, setFormData] = useState({
    businessHoursStart: settings?.businessHoursStart || 9,
    businessHoursEnd: settings?.businessHoursEnd || 18,
    followupIntervalDays: settings?.followupIntervalDays || 15,
    aiModel: settings?.aiModel || 'anthropic/claude-3-sonnet',
    enableNotifications: settings?.enableNotifications ?? true,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const handleSave = () => {
    updateSettingsMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Settings</h1>
        <Button onClick={handleSave} disabled={updateSettingsMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Business Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Business Hours
            </CardTitle>
            <CardDescription>Set when automation is active</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start">Start Time</Label>
                <Input
                  id="start"
                  type="number"
                  min={0}
                  max={23}
                  value={formData.businessHoursStart}
                  onChange={(e) =>
                    setFormData({ ...formData, businessHoursStart: parseInt(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end">End Time</Label>
                <Input
                  id="end"
                  type="number"
                  min={0}
                  max={23}
                  value={formData.businessHoursEnd}
                  onChange={(e) =>
                    setFormData({ ...formData, businessHoursEnd: parseInt(e.target.value) })
                  }
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Active Monday - Saturday, {formData.businessHoursStart}:00 - {formData.businessHoursEnd}:00 (Pakistan Time)
            </p>
          </CardContent>
        </Card>

        {/* Automation Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Automation
            </CardTitle>
            <CardDescription>Configure automation behavior</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="followup">Follow-up Interval (Days)</Label>
              <Input
                id="followup"
                type="number"
                min={1}
                max={90}
                value={formData.followupIntervalDays}
                onChange={(e) =>
                  setFormData({ ...formData, followupIntervalDays: parseInt(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">AI Model</Label>
              <Input
                id="model"
                value={formData.aiModel}
                onChange={(e) => setFormData({ ...formData, aiModel: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>Configure notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive alerts for emergencies and important events
                </p>
              </div>
              <Button
                variant={formData.enableNotifications ? 'default' : 'outline'}
                size="sm"
                onClick={() =>
                  setFormData({ ...formData, enableNotifications: !formData.enableNotifications })
                }
              >
                {formData.enableNotifications ? 'ON' : 'OFF'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              System Information
            </CardTitle>
            <CardDescription>Current system status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Version</span>
              <span className="text-sm">1.0.0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Environment</span>
              <span className="text-sm">Production</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Last Updated</span>
              <span className="text-sm">August 9, 2026</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
