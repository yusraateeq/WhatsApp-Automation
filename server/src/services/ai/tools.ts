import { tool } from '@openrouter/agent';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '../../db/index.js';
import {
  customers,
  elevators,
  maintenanceTickets,
  conversations,
  followups,
} from '../../db/schema.js';

// ============================================================
// Get Customer
// ============================================================
export const getCustomerTool = tool({
  name: 'get_customer',
  description: 'Get customer details by phone number or customer ID',
  inputSchema: z.object({
    customerId: z.string().optional().describe('Customer UUID'),
    phone: z.string().optional().describe('Phone number'),
  }),
  outputSchema: z.object({
    id: z.string(),
    name: z.string(),
    company: z.string().nullable(),
    phone: z.string(),
    email: z.string().nullable(),
    status: z.string(),
    preferredLanguage: z.string(),
  }),
  execute: async (params) => {
    const customer = await db.query.customers.findFirst({
      where: params.customerId
        ? eq(customers.id, params.customerId)
        : eq(customers.phone, params.phone || ''),
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    return {
      id: customer.id,
      name: customer.name,
      company: customer.company,
      phone: customer.phone,
      email: customer.email,
      status: customer.status,
      preferredLanguage: customer.preferredLanguage,
    };
  },
});

// ============================================================
// Get Elevator Details
// ============================================================
export const getElevatorDetailsTool = tool({
  name: 'get_elevator_details',
  description: 'Get elevator information for a customer',
  inputSchema: z.object({
    customerId: z.string().describe('Customer UUID'),
  }),
  outputSchema: z.object({
    elevators: z.array(z.object({
      id: z.string(),
      model: z.string().nullable(),
      serialNumber: z.string().nullable(),
      type: z.string().nullable(),
      status: z.string(),
      lastMaintenanceDate: z.string().nullable(),
      nextMaintenanceDate: z.string().nullable(),
    })),
  }),
  execute: async (params) => {
    const customerElevators = await db.query.elevators.findMany({
      where: eq(elevators.customerId, params.customerId),
    });

    return {
      elevators: customerElevators.map((e) => ({
        id: e.id,
        model: e.model,
        serialNumber: e.serialNumber,
        type: e.type,
        status: e.status,
        lastMaintenanceDate: e.lastMaintenanceDate?.toISOString() || null,
        nextMaintenanceDate: e.nextMaintenanceDate?.toISOString() || null,
      })),
    };
  },
});

// ============================================================
// Get Last Maintenance
// ============================================================
export const getLastMaintenanceTool = tool({
  name: 'get_last_maintenance',
  description: 'Get last maintenance record for an elevator',
  inputSchema: z.object({
    elevatorId: z.string().describe('Elevator UUID'),
  }),
  outputSchema: z.object({
    lastMaintenance: z.object({
      date: z.string(),
      notes: z.string().nullable(),
    }).nullable(),
  }),
  execute: async (params) => {
    const elevator = await db.query.elevators.findFirst({
      where: eq(elevators.id, params.elevatorId),
    });

    if (!elevator) {
      throw new Error('Elevator not found');
    }

    return {
      lastMaintenance: elevator.lastMaintenanceDate ? {
        date: elevator.lastMaintenanceDate.toISOString(),
        notes: elevator.notes,
      } : null,
    };
  },
});

// ============================================================
// Get Open Tickets
// ============================================================
export const getOpenTicketsTool = tool({
  name: 'get_open_tickets',
  description: 'Get open maintenance tickets for a customer',
  inputSchema: z.object({
    customerId: z.string().describe('Customer UUID'),
  }),
  outputSchema: z.object({
    tickets: z.array(z.object({
      id: z.string(),
      title: z.string(),
      category: z.string(),
      priority: z.string(),
      status: z.string(),
      createdAt: z.string(),
    })),
  }),
  execute: async (params) => {
    const tickets = await db.query.maintenanceTickets.findMany({
      where: and(
        eq(maintenanceTickets.customerId, params.customerId),
        eq(maintenanceTickets.status, 'OPEN')
      ),
    });

    return {
      tickets: tickets.map((t) => ({
        id: t.id,
        title: t.title,
        category: t.category,
        priority: t.priority,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
      })),
    };
  },
});

// ============================================================
// Create Maintenance Ticket
// ============================================================
export const createMaintenanceTicketTool = tool({
  name: 'create_maintenance_ticket',
  description: 'Create a new maintenance ticket',
  inputSchema: z.object({
    customerId: z.string().describe('Customer UUID'),
    title: z.string().describe('Ticket title'),
    description: z.string().optional().describe('Ticket description'),
    category: z.enum(['MAINTENANCE', 'REPAIR', 'BREAKDOWN', 'EMERGENCY']).describe('Ticket category'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).describe('Ticket priority'),
    elevatorId: z.string().optional().describe('Related elevator UUID'),
    conversationId: z.string().optional().describe('Related conversation UUID'),
  }),
  outputSchema: z.object({
    ticketId: z.string(),
    title: z.string(),
    status: z.string(),
  }),
  execute: async (params) => {
    const [ticket] = await db.insert(maintenanceTickets).values({
      customerId: params.customerId,
      title: params.title,
      description: params.description,
      category: params.category,
      priority: params.priority,
      elevatorId: params.elevatorId,
      conversationId: params.conversationId,
    }).returning();

    return {
      ticketId: ticket.id,
      title: ticket.title,
      status: ticket.status,
    };
  },
});

// ============================================================
// Create Followup
// ============================================================
export const createFollowupTool = tool({
  name: 'create_followup',
  description: 'Schedule a follow-up message for a customer',
  inputSchema: z.object({
    customerId: z.string().describe('Customer UUID'),
    scheduledAt: z.string().describe('ISO date string for when to send'),
    message: z.string().optional().describe('Custom follow-up message'),
  }),
  outputSchema: z.object({
    followupId: z.string(),
    scheduledAt: z.string(),
    status: z.string(),
  }),
  execute: async (params) => {
    const [followup] = await db.insert(followups).values({
      customerId: params.customerId,
      scheduledAt: new Date(params.scheduledAt),
      message: params.message,
    }).returning();

    return {
      followupId: followup.id,
      scheduledAt: followup.scheduledAt.toISOString(),
      status: followup.status,
    };
  },
});

// ============================================================
// Pause Automation
// ============================================================
export const pauseAutomationTool = tool({
  name: 'pause_automation',
  description: 'Pause automation for a customer',
  inputSchema: z.object({
    customerId: z.string().describe('Customer UUID'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
  }),
  execute: async (params) => {
    await db.update(customers)
      .set({ automationEnabled: false, updatedAt: new Date() })
      .where(eq(customers.id, params.customerId));

    return {
      success: true,
      message: 'Automation paused for this customer',
    };
  },
});

// ============================================================
// Request Human Handoff
// ============================================================
export const requestHumanHandoffTool = tool({
  name: 'request_human_handoff',
  description: 'Transfer conversation to a human agent',
  inputSchema: z.object({
    conversationId: z.string().describe('Conversation UUID'),
    reason: z.string().describe('Reason for handoff'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).describe('Priority level'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
  }),
  execute: async (params) => {
    await db.update(conversations)
      .set({
        mode: 'HUMAN',
        priority: params.priority,
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, params.conversationId));

    // TODO: Send notification to admin

    return {
      success: true,
      message: `Conversation transferred to human agent. Reason: ${params.reason}`,
    };
  },
});

// All tools array
export const allTools = [
  getCustomerTool,
  getElevatorDetailsTool,
  getLastMaintenanceTool,
  getOpenTicketsTool,
  createMaintenanceTicketTool,
  createFollowupTool,
  pauseAutomationTool,
  requestHumanHandoffTool,
];
