// ============================================================
// Customer Types
// ============================================================
export type CustomerStatus = 'ACTIVE' | 'PAUSED' | 'BLOCKED' | 'DO_NOT_CONTACT' | 'ARCHIVED';

export interface Customer {
  id: string;
  name: string;
  company: string | null;
  phone: string;
  email: string | null;
  location: string | null;
  status: CustomerStatus;
  automationEnabled: boolean;
  preferredLanguage: string;
  notes: string | null;
  lastContactAt: string | null;
  nextFollowupAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerWithElevators extends Customer {
  elevators: Elevator[];
}

export interface CreateCustomerInput {
  name: string;
  company?: string;
  phone: string;
  email?: string;
  location?: string;
  preferredLanguage?: string;
  notes?: string;
  automationEnabled?: boolean;
}

// ============================================================
// Elevator Types
// ============================================================
export type ElevatorStatus = 'ACTIVE' | 'UNDER_MAINTENANCE' | 'OUT_OF_SERVICE' | 'RETIRED';
export type ElevatorType = 'PASSENGER' | 'FREIGHT' | 'HOME' | 'ESCALATOR';

export interface Elevator {
  id: string;
  customerId: string;
  model: string | null;
  serialNumber: string | null;
  type: ElevatorType | null;
  installationDate: string | null;
  lastMaintenanceDate: string | null;
  nextMaintenanceDate: string | null;
  status: ElevatorStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Conversation Types
// ============================================================
export type ConversationMode = 'AI' | 'HUMAN' | 'PAUSED';
export type ConversationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type Intent = 'GENERAL' | 'MAINTENANCE' | 'COMPLAINT' | 'BREAKDOWN' | 'EMERGENCY' | 'QUOTE_REQUEST' | 'INSTALLATION' | 'PAYMENT' | 'FOLLOW_UP' | 'OTHER';

export interface Conversation {
  id: string;
  customerId: string;
  mode: ConversationMode;
  priority: ConversationPriority;
  intent: Intent | null;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationWithDetails extends Conversation {
  customer: Customer;
  messages: Message[];
}

export interface ConversationListItem extends Conversation {
  customer: {
    id: string;
    name: string;
    company: string | null;
    phone: string;
  };
}

// ============================================================
// Message Types
// ============================================================
export type MessageDirection = 'INCOMING' | 'OUTGOING';
export type MessageType = 'TEXT' | 'IMAGE' | 'AUDIO' | 'DOCUMENT';
export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

export interface Message {
  id: string;
  conversationId: string;
  direction: MessageDirection;
  content: string;
  detectedLanguage: string | null;
  englishTranslation: string | null;
  urduTranslation: string | null;
  messageType: MessageType;
  status: MessageStatus;
  aiGenerated: boolean;
  whatsappMessageId: string | null;
  sentAt: string;
}

// ============================================================
// Maintenance Ticket Types
// ============================================================
export type TicketCategory = 'MAINTENANCE' | 'REPAIR' | 'BREAKDOWN' | 'EMERGENCY';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'RESOLVED' | 'CLOSED';

export interface MaintenanceTicket {
  id: string;
  customerId: string;
  elevatorId: string | null;
  conversationId: string | null;
  title: string;
  description: string | null;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

// ============================================================
// Followup Types
// ============================================================
export type FollowupStatus = 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED';

export interface Followup {
  id: string;
  customerId: string;
  scheduledAt: string;
  sentAt: string | null;
  status: FollowupStatus;
  message: string | null;
  retryCount: number;
  createdAt: string;
}

// ============================================================
// Analytics Types
// ============================================================
export interface DashboardStats {
  totalCustomers: number;
  activeCustomers: number;
  automatedCustomers: number;
  messagesToday: number;
  openTickets: number;
  highPriorityIssues: number;
  aiConversations: number;
  humanHandoffs: number;
  pendingFollowups: number;
}

export interface MessageStats {
  incoming: number;
  outgoing: number;
  aiGenerated: number;
  humanGenerated: number;
}

export interface TicketStats {
  byStatus: { status: string; count: number }[];
  byPriority: { priority: string; count: number }[];
  byCategory: { category: string; count: number }[];
}

// ============================================================
// WhatsApp Types
// ============================================================
export type WhatsAppStatus = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'AUTH_REQUIRED' | 'ERROR';

export interface WhatsAppConnectionStatus {
  status: WhatsAppStatus;
  phoneNumber: string | null;
  lastMessageAt: string | null;
  messagesToday: number;
  uptime: number;
}

// ============================================================
// API Response Types
// ============================================================
export interface PaginatedResponse<T> {
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
  [key: string]: T[] | { page: number; limit: number; total: number };
}

export interface ApiError {
  error: string;
  message: string;
}

// ============================================================
// Auth Types
// ============================================================
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}
