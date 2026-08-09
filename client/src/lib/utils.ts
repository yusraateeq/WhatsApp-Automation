import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatPhoneDisplay(phone: string): string {
  const normalized = phone.replace(/[^0-9]/g, '');

  if (normalized.length === 12 && normalized.startsWith('92')) {
    const code = normalized.substring(0, 2);
    const carrier = normalized.substring(2, 5);
    const number = normalized.substring(5);
    return `+${code} ${carrier} ${number}`;
  }

  return `+${normalized}`;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    PAUSED: 'bg-yellow-100 text-yellow-800',
    BLOCKED: 'bg-red-100 text-red-800',
    DO_NOT_CONTACT: 'bg-gray-100 text-gray-800',
    ARCHIVED: 'bg-gray-100 text-gray-800',
    OPEN: 'bg-blue-100 text-blue-800',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
    WAITING_CUSTOMER: 'bg-orange-100 text-orange-800',
    RESOLVED: 'bg-green-100 text-green-800',
    CLOSED: 'bg-gray-100 text-gray-800',
    CONNECTED: 'bg-green-100 text-green-800',
    CONNECTING: 'bg-yellow-100 text-yellow-800',
    DISCONNECTED: 'bg-red-100 text-red-800',
    AUTH_REQUIRED: 'bg-orange-100 text-orange-800',
    ERROR: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    LOW: 'bg-gray-100 text-gray-800',
    MEDIUM: 'bg-blue-100 text-blue-800',
    HIGH: 'bg-orange-100 text-orange-800',
    CRITICAL: 'bg-red-100 text-red-800',
  };
  return colors[priority] || 'bg-gray-100 text-gray-800';
}
