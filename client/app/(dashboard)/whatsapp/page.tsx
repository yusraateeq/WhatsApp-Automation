'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useWhatsAppStatus, useReconnectWhatsApp, useLogoutWhatsApp } from '@/hooks/use-api';
import { useAuth } from '@/providers/auth-provider';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  LogOut,
  QrCode,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

export default function WhatsAppPage() {
  const { data: status, isLoading, error, refetch: refetchStatus } = useWhatsAppStatus();
  const reconnectMutation = useReconnectWhatsApp();
  const logoutMutation = useLogoutWhatsApp();
  const { getToken } = useAuth();

  // Poll QR code when state is QR_READY
  const { data: qrData, isLoading: qrLoading } = useQuery({
    queryKey: ['whatsapp-qr'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return api.getWhatsAppQR(token);
    },
    enabled: status?.status === 'QR_READY',
    refetchInterval: 2000, // Poll every 2 seconds for fresh QR
    refetchIntervalInBackground: true,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-destructive">Error loading WhatsApp status</p>
      </div>
    );
  }

  const state = status?.status || 'DISCONNECTED';
  const isConnected = state === 'CONNECTED';
  const isQRReady = state === 'QR_READY';
  const isInitializing = state === 'INITIALIZING';
  const isAuthenticating = state === 'AUTHENTICATING';
  const hasError = state === 'ERROR' || state === 'AUTH_FAILURE';

  const getStateInfo = () => {
    switch (state) {
      case 'INITIALIZING':
        return { icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-50', animate: true };
      case 'QR_READY':
        return { icon: QrCode, color: 'text-orange-500', bg: 'bg-orange-50', animate: false };
      case 'AUTHENTICATING':
        return { icon: Loader2, color: 'text-yellow-500', bg: 'bg-yellow-50', animate: true };
      case 'CONNECTED':
        return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50', animate: false };
      case 'DISCONNECTED':
        return { icon: WifiOff, color: 'text-gray-500', bg: 'bg-gray-50', animate: false };
      case 'AUTH_FAILURE':
        return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', animate: false };
      case 'ERROR':
        return { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50', animate: false };
      default:
        return { icon: WifiOff, color: 'text-gray-500', bg: 'bg-gray-50', animate: false };
    }
  };

  const stateInfo = getStateInfo();
  const StateIcon = stateInfo.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">WhatsApp Connection</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => reconnectMutation.mutate()}
            disabled={reconnectMutation.isPending || isConnected}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${reconnectMutation.isPending ? 'animate-spin' : ''}`} />
            Reconnect
          </Button>
          <Button
            variant="destructive"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending || !isConnected}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isConnected ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-500" />
              )}
              Connection Status
            </CardTitle>
            <CardDescription>Current WhatsApp connection state</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <Badge className={`${stateInfo.bg} ${stateInfo.color} border-0`}>
                <StateIcon className={`h-3 w-3 mr-1 ${stateInfo.animate ? 'animate-spin' : ''}`} />
                {state}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Phone Number</span>
              <span className="text-sm font-mono">{status?.phoneNumber || 'Not connected'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Messages Today</span>
              <span className="text-sm font-bold">{status?.messagesToday || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Last Message</span>
              <span className="text-sm">
                {status?.lastMessageAt ? formatDateTime(status.lastMessageAt) : 'N/A'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* QR Code / Connection Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isQRReady ? (
                <QrCode className="h-5 w-5 text-orange-500" />
              ) : isConnected ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <Wifi className="h-5 w-5 text-blue-500" />
              )}
              {isQRReady ? 'Scan QR Code' : isConnected ? 'Connected' : 'Connection'}
            </CardTitle>
            <CardDescription>
              {isQRReady
                ? 'Scan with your phone to connect'
                : isConnected
                ? 'WhatsApp is connected and ready'
                : 'Initialize connection to generate QR code'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isQRReady && qrData?.qr ? (
              <div className="text-center py-4">
                <div className="mb-4 p-4 bg-white rounded-lg border-2 border-dashed border-orange-300 inline-block">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData.qr)}`}
                    alt="WhatsApp QR Code"
                    className="mx-auto"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Open WhatsApp → Linked Devices → Link a Device
                </p>
              </div>
            ) : isQRReady && qrLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-16 w-16 mx-auto text-orange-500 animate-spin mb-4" />
                <p className="text-sm text-muted-foreground">Generating QR code...</p>
              </div>
            ) : isConnected ? (
              <div className="text-center py-8">
                <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
                <p className="text-lg font-medium text-green-700">Connected!</p>
                <p className="text-sm text-muted-foreground">
                  Phone: {status?.phoneNumber}
                </p>
              </div>
            ) : isInitializing || isAuthenticating ? (
              <div className="text-center py-8">
                <Loader2 className="h-16 w-16 mx-auto text-blue-500 animate-spin mb-4" />
                <p className="text-sm text-muted-foreground">
                  {isInitializing ? 'Initializing WhatsApp client...' : 'Authenticating...'}
                </p>
              </div>
            ) : hasError ? (
              <div className="text-center py-8">
                <XCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
                <p className="text-sm text-muted-foreground">
                  {state === 'AUTH_FAILURE' ? 'Authentication failed. Click Reconnect to try again.' : 'An error occurred. Click Reconnect to try again.'}
                </p>
              </div>
            ) : (
              <div className="text-center py-8">
                <WifiOff className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <p className="text-sm text-muted-foreground">
                  Click "Reconnect" to start WhatsApp connection
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Connection Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Instructions</CardTitle>
          <CardDescription>How to connect your WhatsApp account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className={`text-center p-4 border rounded-lg ${isInitializing ? 'border-blue-300 bg-blue-50' : ''}`}>
              <div className="text-2xl font-bold text-primary mb-2">1</div>
              <p className="text-sm">Click "Reconnect" to initialize WhatsApp</p>
            </div>
            <div className={`text-center p-4 border rounded-lg ${isQRReady ? 'border-orange-300 bg-orange-50' : ''}`}>
              <div className="text-2xl font-bold text-primary mb-2">2</div>
              <p className="text-sm">Wait for QR code to appear</p>
            </div>
            <div className={`text-center p-4 border rounded-lg ${isAuthenticating ? 'border-yellow-300 bg-yellow-50' : ''}`}>
              <div className="text-2xl font-bold text-primary mb-2">3</div>
              <p className="text-sm">Open WhatsApp → Linked Devices → Link a Device</p>
            </div>
            <div className={`text-center p-4 border rounded-lg ${isConnected ? 'border-green-300 bg-green-50' : ''}`}>
              <div className="text-2xl font-bold text-primary mb-2">4</div>
              <p className="text-sm">Scan the QR code to connect</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
