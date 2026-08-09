'use client';

import { useState } from 'react';
import { useCustomers } from '@/hooks/use-api';
import { formatPhoneDisplay, getStatusColor, formatDate } from '@/lib/utils';
import { CustomerForm } from '@/components/customers/customer-form';
import Link from 'next/link';
import {
  Users,
  Plus,
  Search,
  Filter,
  Loader2,
  Phone,
  Building2,
  Bot,
  BotOff,
} from 'lucide-react';

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useCustomers({
    search: search || undefined,
    status: statusFilter || undefined,
    page,
    limit: 20,
  });

  const customers = (data as any)?.customers || [];
  const pagination = (data as any)?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600">Manage your customer database</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          Add Customer
        </button>
      </div>

      {/* Customer Form Dialog */}
      <CustomerForm open={showForm} onOpenChange={setShowForm} />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
            <option value="BLOCKED">Blocked</option>
            <option value="DO_NOT_CONTACT">Do Not Contact</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center p-12">
            <Users size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No customers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Automation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Contact
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {customers.map((customer: any) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{customer.name}</p>
                        {customer.company && (
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Building2 size={14} />
                            {customer.company}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="text-gray-900 flex items-center gap-1">
                          <Phone size={14} />
                          {formatPhoneDisplay(customer.phone)}
                        </p>
                        {customer.email && (
                          <p className="text-gray-500">{customer.email}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(customer.status)}`}>
                        {customer.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {customer.automationEnabled ? (
                        <span className="flex items-center gap-1 text-sm text-green-600">
                          <Bot size={16} />
                          Enabled
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-sm text-gray-500">
                          <BotOff size={16} />
                          Disabled
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {customer.lastContactAt ? formatDate(customer.lastContactAt) : 'Never'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/customers/${customer.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.total > 20 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, pagination.total)} of{' '}
              {pagination.total} customers
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
