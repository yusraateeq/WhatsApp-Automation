'use client';

import { useState } from 'react';
import { useConversations } from '@/hooks/use-api';
import { formatDateTime, getStatusColor, getPriorityColor } from '@/lib/utils';
import Link from 'next/link';
import {
  MessageSquare,
  Search,
  Filter,
  Loader2,
  Bot,
  User,
  Pause,
} from 'lucide-react';

function ModeBadge({ mode }: { mode: string }) {
  const config = {
    AI: { icon: Bot, color: 'bg-green-100 text-green-800', label: 'AI' },
    HUMAN: { icon: User, color: 'bg-orange-100 text-orange-800', label: 'Human' },
    PAUSED: { icon: Pause, color: 'bg-gray-100 text-gray-800', label: 'Paused' },
  }[mode] || { icon: Bot, color: 'bg-gray-100 text-gray-800', label: mode };

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
}

export default function ConversationsPage() {
  const [modeFilter, setModeFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useConversations({
    mode: modeFilter || undefined,
    page,
    limit: 20,
  });

  const conversations = (data as any)?.conversations || [];
  const pagination = (data as any)?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conversations</h1>
          <p className="text-gray-600">View and manage customer conversations</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-500" />
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Modes</option>
            <option value="AI">AI</option>
            <option value="HUMAN">Human</option>
            <option value="PAUSED">Paused</option>
          </select>
        </div>
      </div>

      {/* Conversations List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center p-12">
            <MessageSquare size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No conversations found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {conversations.map((conversation: any) => (
              <Link
                key={conversation.id}
                href={`/conversations/${conversation.id}`}
                className="block p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 font-medium">
                          {conversation.customer?.name?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 truncate">
                            {conversation.customer?.name || 'Unknown'}
                          </p>
                          {conversation.customer?.company && (
                            <span className="text-sm text-gray-500">
                              ({conversation.customer.company})
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 truncate">
                          {conversation.lastMessageAt
                            ? `Last message: ${formatDateTime(conversation.lastMessageAt)}`
                            : 'No messages yet'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 ml-4">
                    <ModeBadge mode={conversation.mode} />
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(conversation.priority)}`}>
                      {conversation.priority}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.total > 20 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, pagination.total)} of{' '}
              {pagination.total} conversations
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * 20 >= pagination.total}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
