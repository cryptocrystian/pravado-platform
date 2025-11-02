'use client';

import { useState } from 'react';
import { ContactTier, ContactRole, type ContactSearchParams } from '@pravado/shared-types';
import { useContactTags } from '@/hooks/useContacts';

interface ContactFiltersProps {
  onFilterChange: (filters: Partial<ContactSearchParams>) => void;
  currentFilters: ContactSearchParams;
}

export function ContactFilters({ onFilterChange, currentFilters }: ContactFiltersProps) {
  const [search, setSearch] = useState(currentFilters.search || '');
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: tags } = useContactTags();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({ search });
  };

  const toggleTier = (tier: ContactTier) => {
    const currentTiers = currentFilters.tier || [];
    const newTiers = currentTiers.includes(tier)
      ? currentTiers.filter((t) => t !== tier)
      : [...currentTiers, tier];
    onFilterChange({ tier: newTiers.length > 0 ? newTiers : undefined });
  };

  const toggleRole = (role: ContactRole) => {
    const currentRoles = currentFilters.role || [];
    const newRoles = currentRoles.includes(role)
      ? currentRoles.filter((r) => r !== role)
      : [...currentRoles, role];
    onFilterChange({ role: newRoles.length > 0 ? newRoles : undefined });
  };

  const clearFilters = () => {
    setSearch('');
    onFilterChange({
      search: undefined,
      tier: undefined,
      topics: undefined,
      regions: undefined,
      tagIds: undefined,
      outlet: undefined,
      role: undefined,
      hasEmail: undefined,
      hasLinkedIn: undefined,
      hasTwitter: undefined,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, outlet, or topic..."
          className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Search
        </button>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          {isExpanded ? 'Less' : 'More'} Filters
        </button>
      </form>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="mt-6 space-y-6">
          {/* Tier Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tier</label>
            <div className="flex gap-2">
              {[ContactTier.TIER_1, ContactTier.TIER_2, ContactTier.TIER_3, ContactTier.TIER_4].map((tier) => (
                <button
                  key={tier}
                  onClick={() => toggleTier(tier)}
                  className={`px-4 py-2 rounded-md border text-sm ${
                    currentFilters.tier?.includes(tier)
                      ? 'bg-blue-100 border-blue-500 text-blue-700'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Tier {tier}
                </button>
              ))}
            </div>
          </div>

          {/* Role Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <div className="flex flex-wrap gap-2">
              {[
                ContactRole.JOURNALIST,
                ContactRole.EDITOR,
                ContactRole.BLOGGER,
                ContactRole.INFLUENCER,
                ContactRole.PODCASTER,
              ].map((role) => (
                <button
                  key={role}
                  onClick={() => toggleRole(role)}
                  className={`px-3 py-1 rounded-md border text-sm ${
                    currentFilters.role?.includes(role)
                      ? 'bg-blue-100 border-blue-500 text-blue-700'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* Contact Method Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Has Contact Info</label>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  onFilterChange({
                    hasEmail: currentFilters.hasEmail ? undefined : true,
                  })
                }
                className={`px-4 py-2 rounded-md border text-sm ${
                  currentFilters.hasEmail
                    ? 'bg-blue-100 border-blue-500 text-blue-700'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                Email
              </button>
              <button
                onClick={() =>
                  onFilterChange({
                    hasLinkedIn: currentFilters.hasLinkedIn ? undefined : true,
                  })
                }
                className={`px-4 py-2 rounded-md border text-sm ${
                  currentFilters.hasLinkedIn
                    ? 'bg-blue-100 border-blue-500 text-blue-700'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                LinkedIn
              </button>
              <button
                onClick={() =>
                  onFilterChange({
                    hasTwitter: currentFilters.hasTwitter ? undefined : true,
                  })
                }
                className={`px-4 py-2 rounded-md border text-sm ${
                  currentFilters.hasTwitter
                    ? 'bg-blue-100 border-blue-500 text-blue-700'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                Twitter/X
              </button>
            </div>
          </div>

          {/* Clear Filters */}
          <div className="pt-4 border-t">
            <button
              onClick={clearFilters}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Clear all filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
