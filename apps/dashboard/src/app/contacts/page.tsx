'use client';

import { useState } from 'react';
import { ContactTable } from '@/components/contacts/ContactTable';
import { ContactFilters } from '@/components/contacts/ContactFilters';
import { ContactForm } from '@/components/contacts/ContactForm';
import { EnrichmentButton } from '@/components/contacts/EnrichmentButton';
import { useContacts, useContactStats } from '@/hooks/useContacts';
import type { ContactSearchParams } from '@pravado/shared-types';

export default function ContactsPage() {
  const [searchParams, setSearchParams] = useState<ContactSearchParams>({
    limit: 50,
    offset: 0,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data: result, isLoading } = useContacts(searchParams);
  const { data: stats } = useContactStats();

  const handleFilterChange = (filters: Partial<ContactSearchParams>) => {
    setSearchParams((prev) => ({
      ...prev,
      ...filters,
      offset: 0, // Reset pagination when filters change
    }));
  };

  const handlePageChange = (offset: number) => {
    setSearchParams((prev) => ({ ...prev, offset }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Media Contacts</h1>
              <p className="mt-1 text-sm text-gray-500">
                {stats?.total || 0} total contacts
              </p>
            </div>
            <div className="flex gap-3">
              {selectedContacts.length > 0 && (
                <EnrichmentButton
                  contactIds={selectedContacts}
                  onComplete={() => setSelectedContacts([])}
                />
              )}
              <button
                onClick={() => setIsFormOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                + Add Contact
              </button>
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="mt-4 grid grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500">Tier 1</div>
                <div className="text-2xl font-bold">{stats.byTier?.['1'] || 0}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500">Tier 2</div>
                <div className="text-2xl font-bold">{stats.byTier?.['2'] || 0}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500">Enriched</div>
                <div className="text-2xl font-bold">{stats.enriched || 0}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500">With Email</div>
                <div className="text-2xl font-bold">{stats.withEmail || 0}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <ContactFilters
          onFilterChange={handleFilterChange}
          currentFilters={searchParams}
        />

        {/* Table */}
        <div className="mt-6">
          <ContactTable
            contacts={result?.contacts || []}
            total={result?.total || 0}
            limit={searchParams.limit || 50}
            offset={searchParams.offset || 0}
            isLoading={isLoading}
            selectedContacts={selectedContacts}
            onSelectContacts={setSelectedContacts}
            onPageChange={handlePageChange}
            onSort={(sortBy, sortOrder) => {
              setSearchParams((prev) => ({ ...prev, sortBy, sortOrder }));
            }}
          />
        </div>
      </div>

      {/* Contact Form Modal */}
      {isFormOpen && (
        <ContactForm
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => {
            setIsFormOpen(false);
          }}
        />
      )}
    </div>
  );
}
