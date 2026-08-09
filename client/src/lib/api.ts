const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface RequestOptions extends RequestInit {
  token?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { token, ...fetchOptions } = options;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: 'Request failed',
        message: response.statusText,
      }));
      throw new ApiError(error.error || 'Request failed', response.status);
    }

    return response.json();
  }

  // ============================================================
  // Customers
  // ============================================================
  async getCustomers(token: string, params?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const query = searchParams.toString();
    return this.request(`/api/customers${query ? `?${query}` : ''}`, { token });
  }

  async getCustomer(token: string, id: string) {
    return this.request(`/api/customers/${id}`, { token });
  }

  async createCustomer(token: string, data: any) {
    return this.request('/api/customers', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    });
  }

  async updateCustomer(token: string, id: string, data: any) {
    return this.request(`/api/customers/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    });
  }

  async blockCustomer(token: string, id: string) {
    return this.request(`/api/customers/${id}/block`, {
      method: 'PATCH',
      token,
    });
  }

  async unblockCustomer(token: string, id: string) {
    return this.request(`/api/customers/${id}/unblock`, {
      method: 'PATCH',
      token,
    });
  }

  // ============================================================
  // Elevators
  // ============================================================
  async getElevators(token: string, customerId: string) {
    return this.request(`/api/customers/${customerId}/elevators`, { token });
  }

  async createElevator(token: string, customerId: string, data: any) {
    return this.request(`/api/customers/${customerId}/elevators`, {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    });
  }

  async updateElevator(token: string, id: string, data: any) {
    return this.request(`/api/elevators/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    });
  }

  async deleteElevator(token: string, id: string) {
    return this.request(`/api/elevators/${id}`, {
      method: 'DELETE',
      token,
    });
  }

  // ============================================================
  // Conversations
  // ============================================================
  async getConversations(token: string, params?: {
    customerId?: string;
    mode?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.customerId) searchParams.set('customerId', params.customerId);
    if (params?.mode) searchParams.set('mode', params.mode);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const query = searchParams.toString();
    return this.request(`/api/conversations${query ? `?${query}` : ''}`, { token });
  }

  async getConversation(token: string, id: string) {
    return this.request(`/api/conversations/${id}`, { token });
  }

  async sendMessage(token: string, conversationId: string, content: string) {
    return this.request(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      token,
      body: JSON.stringify({ content }),
    });
  }

  async updateConversationMode(token: string, conversationId: string, mode: string) {
    return this.request(`/api/conversations/${conversationId}/mode`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ mode }),
    });
  }

  // ============================================================
  // Tickets
  // ============================================================
  async getTickets(token: string, params?: {
    status?: string;
    priority?: string;
    customerId?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.priority) searchParams.set('priority', params.priority);
    if (params?.customerId) searchParams.set('customerId', params.customerId);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const query = searchParams.toString();
    return this.request(`/api/tickets${query ? `?${query}` : ''}`, { token });
  }

  async getTicket(token: string, id: string) {
    return this.request(`/api/tickets/${id}`, { token });
  }

  async createTicket(token: string, data: any) {
    return this.request('/api/tickets', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    });
  }

  async updateTicket(token: string, id: string, data: any) {
    return this.request(`/api/tickets/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    });
  }

  async updateTicketStatus(token: string, id: string, status: string) {
    return this.request(`/api/tickets/${id}/status`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ status }),
    });
  }

  // ============================================================
  // WhatsApp
  // ============================================================
  async getWhatsAppStatus(token: string) {
    return this.request('/api/whatsapp/status', { token });
  }

  async reconnectWhatsApp(token: string) {
    return this.request('/api/whatsapp/reconnect', {
      method: 'POST',
      token,
      body: JSON.stringify({}),
    });
  }

  async logoutWhatsApp(token: string) {
    return this.request('/api/whatsapp/logout', {
      method: 'POST',
      token,
      body: JSON.stringify({}),
    });
  }

  async getWhatsAppQR(token: string) {
    return this.request('/api/whatsapp/qr', { token });
  }

  // ============================================================
  // Follow-ups
  // ============================================================
  async getFollowups(token: string, params?: {
    customerId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.customerId) searchParams.set('customerId', params.customerId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const query = searchParams.toString();
    return this.request(`/api/followups${query ? `?${query}` : ''}`, { token });
  }

  async createFollowup(token: string, data: any) {
    return this.request('/api/followups', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    });
  }

  async cancelFollowup(token: string, id: string) {
    return this.request(`/api/followups/${id}`, {
      method: 'DELETE',
      token,
    });
  }

  async retryFollowup(token: string, id: string) {
    return this.request(`/api/followups/${id}/retry`, {
      method: 'PATCH',
      token,
    });
  }

  // ============================================================
  // Automation
  // ============================================================
  async getAutomationStatus(token: string) {
    return this.request('/api/automation/status', { token });
  }

  async toggleAutomation(token: string, enabled: boolean) {
    return this.request('/api/automation/toggle', {
      method: 'PATCH',
      token,
      body: JSON.stringify({ enabled }),
    });
  }

  async getAutomationLogs(token: string, params?: {
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const query = searchParams.toString();
    return this.request(`/api/automation/logs${query ? `?${query}` : ''}`, { token });
  }

  // ============================================================
  // Settings
  // ============================================================
  async getSettings(token: string) {
    return this.request('/api/settings', { token });
  }

  async updateSettings(token: string, data: any) {
    return this.request('/api/settings', {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    });
  }

  // ============================================================
  // Analytics
  // ============================================================
  async getDashboardStats(token: string) {
    return this.request('/api/analytics/overview', { token });
  }

  async getMessageStats(token: string) {
    return this.request('/api/analytics/messages', { token });
  }

  async getTicketStats(token: string) {
    return this.request('/api/analytics/tickets', { token });
  }

  async getLanguageStats(token: string) {
    return this.request('/api/analytics/languages', { token });
  }

  async getAnalyticsOverview(token: string) {
    return this.request('/api/analytics/overview', { token });
  }

  async getAnalyticsMessages(token: string) {
    return this.request('/api/analytics/messages', { token });
  }

  async getAnalyticsTickets(token: string) {
    return this.request('/api/analytics/tickets', { token });
  }

  async getAnalyticsLanguages(token: string) {
    return this.request('/api/analytics/languages', { token });
  }
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const api = new ApiClient(API_URL);
