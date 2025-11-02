'use client';

import { useState } from 'react';
import type { Contact } from '@pravado/shared-types';
import Link from 'next/link';

interface ContactTableProps {
  contacts: Contact[];
  total: number;
  limit: number;
  offset: number;
  isLoading: boolean;
  selectedContacts: string[];
  onSelectContacts: (ids: string[]) => void;
  onPageChange: (offset: number) => void;
  onSort: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
}

export function ContactTable({
  contacts,
  total,
  limit,
  offset,
  isLoading,
  selectedContacts,
  onSelectContacts,
  onPageChange,
  onSort,
}: ContactTableProps) {
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const toggleSort = (column: string) => {
    const newOrder = sortBy === column && sortOrder === 'desc' ? 'asc' : 'desc';
    setSortBy(column);
    setSortOrder(newOrder);
    onSort(column, newOrder);
  };

  const toggleSelectAll = () => {
    if (selectedContacts.length === contacts.length) {
      onSelectContacts([]);
    } else {
      onSelectContacts(contacts.map((c) => c.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedContacts.includes(id)) {
      onSelectContacts(selectedContacts.filter((cid) => cid !== id));
    } else {
      onSelectContacts([...selectedContacts, id]);
    }
  };

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  if (isLoading) {
    return <div className="text-center py-12">Loading contacts...</div>;
  }

  if (contacts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow text-center py-12">
        <p className="text-gray-500">No contacts found. Try adjusting your filters.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left">
              <input
                type="checkbox"
                checked={selectedContacts.length === contacts.length && contacts.length > 0}
                onChange={toggleSelectAll}
                className="rounded border-gray-300"
              />
            </th>
            <th
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => toggleSort('name')}
            >
              Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Title
            </th>
            <th
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => toggleSort('outlet')}
            >
              Outlet {sortBy === 'outlet' && (sortOrder === 'asc' ? '↑' : '↓')}
            </th>
            <th
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => toggleSort('tier')}
            >
              Tier {sortBy === 'tier' && (sortOrder === 'asc' ? '↑' : '↓')}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Topics
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Contact
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {contacts.map((contact) => (
            <tr key={contact.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <input
                  type="checkbox"
                  checked={selectedContacts.includes(contact.id)}
                  onChange={() => toggleSelect(contact.id)}
                  className="rounded border-gray-300"
                />
              </td>
              <td className="px-6 py-4">
                <Link
                  href={`/contacts/${contact.id}`}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  {contact.fullName}
                </Link>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">{contact.title || '-'}</td>
              <td className="px-6 py-4 text-sm">{contact.outlet || '-'}</td>
              <td className="px-6 py-4">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    contact.tier === '1'
                      ? 'bg-purple-100 text-purple-800'
                      : contact.tier === '2'
                      ? 'bg-blue-100 text-blue-800'
                      : contact.tier === '3'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  Tier {contact.tier}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {contact.topics.slice(0, 2).join(', ')}
                {contact.topics.length > 2 && ` +${contact.topics.length - 2}`}
              </td>
              <td className="px-6 py-4 text-sm">
                <div className="flex gap-2">
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} className="text-blue-600 hover:text-blue-800">
                      @
                    </a>
                  )}
                  {contact.linkedinUrl && (
                    <a
                      href={contact.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      in
                    </a>
                  )}
                  {contact.twitterUrl && (
                    <a
                      href={contact.twitterUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      𝕏
                    </a>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => onPageChange(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => onPageChange(offset + limit)}
            disabled={offset + limit >= total}
            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{offset + 1}</span> to{' '}
              <span className="font-medium">{Math.min(offset + limit, total)}</span> of{' '}
              <span className="font-medium">{total}</span> results
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                onClick={() => onPageChange(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => onPageChange(offset + limit)}
                disabled={offset + limit >= total}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
