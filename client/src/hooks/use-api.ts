'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';

// ============================================================
// Customer Hooks
// ============================================================
export function useCustomers(params?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['customers', params],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return api.getCustomers(token, params);
    },
  });
}

export function useCustomer(id: string) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return api.getCustomer(token, id);
    },
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return api.createCustomer(token, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useUpdateCustomer() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return api.updateCustomer(token, id, data);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
    },
  });
}

// ============================================================
// Elevator Hooks
// ============================================================
export function useCreateElevator() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ customerId, data }: { customerId: string; data: any }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return api.createElevator(token, customerId, data);
    },
    onSuccess: (_, { customerId }) => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
    },
  });
}

export function useUpdateElevator() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return api.updateElevator(token, id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

// ============================================================
// Conversation Hooks
// ============================================================
export function useConversations(params?: {
  customerId?: string;
  mode?: string;
  page?: number;
  limit?: number;
}) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['conversations', params],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return api.getConversations(token, params);
    },
  });
}

export function useConversation(id: string) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['conversation', id],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return api.getConversation(token, id);
    },
    enabled: !!id,
  });
}

export function useSendMessage() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return api.sendMessage(token, conversationId, content);
    },
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useUpdateConversationMode() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, mode }: { conversationId: string; mode: string }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return api.updateConversationMode(token, conversationId, mode);
    },
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

// ============================================================
// Ticket Hooks
// ============================================================
export function useTickets(params?: {
  status?: string;
  priority?: string;
  customerId?: string;
  page?: number;
  limit?: number;
}) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['tickets', params],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return api.getTickets(token, params);
    },
  });
}

export function useCreateTicket() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return api.createTicket(token, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

export function useUpdateTicketStatus() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return api.updateTicketStatus(token, id, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

// ============================================================
// WhatsApp Hooks
// ============================================================
export function useWhatsAppStatus() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return api.getWhatsAppStatus(token);
    },
    refetchInterval: 10000, // Poll every 10 seconds
  });
}

// ============================================================
// Analytics Hooks
// ============================================================
export function useDashboardStats() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return api.getDashboardStats(token);
    },
  });
}

export function useMessageStats() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['message-stats'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return api.getMessageStats(token);
    },
  });
}

// ============================================================
// Follow-up Hooks
// ============================================================
export function useFollowups(params?: {
  customerId?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['followups', params],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return api.getFollowups(token, params);
    },
  });
}

// ============================================================
// Automation Hooks
// ============================================================
export function useAutomationStatus() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['automation-status'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return api.getAutomationStatus(token);
    },
  });
}

export function useAutomationLogs(params?: {
  page?: number;
  limit?: number;
}) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['automation-logs', params],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return api.getAutomationLogs(token, params);
    },
  });
}

// ============================================================
// Settings Hooks
// ============================================================
export function useSystemSettings() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return api.getSettings(token);
    },
  });
}

export function useUpdateSystemSettings() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return api.updateSettings(token, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    },
  });
}

// ============================================================
// Analytics Extended Hooks
// ============================================================
export function useAnalyticsOverview() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['analytics-overview'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return api.getAnalyticsOverview(token);
    },
  });
}

export function useAnalyticsMessages() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['analytics-messages'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return api.getAnalyticsMessages(token);
    },
  });
}

export function useAnalyticsTickets() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['analytics-tickets'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return api.getAnalyticsTickets(token);
    },
  });
}

export function useAnalyticsLanguages() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['analytics-languages'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return api.getAnalyticsLanguages(token);
    },
  });
}

// ============================================================
// WhatsApp Extended Hooks
// ============================================================
export function useReconnectWhatsApp() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return api.reconnectWhatsApp(token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
    },
  });
}

export function useLogoutWhatsApp() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return api.logoutWhatsApp(token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
    },
  });
}
