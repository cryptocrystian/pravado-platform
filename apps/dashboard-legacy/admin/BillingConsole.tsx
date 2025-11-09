// =====================================================
// BILLING CONSOLE (Admin Component)
// Sprint 72: Automated Billing & Revenue Operations Integration
// =====================================================

import React, { useState } from 'react';
import {
  useBillingCustomers,
  useBillingInvoices,
  useRevenueMetrics,
  useOrganizationsAtRisk,
  useAddCreditAdjustment,
  useVoidInvoice,
  useTriggerBilling,
} from '@/hooks/useBillingData';

interface BillingConsoleProps {
  defaultView?: 'customers' | 'invoices' | 'metrics' | 'at-risk';
}

export function BillingConsole({ defaultView = 'metrics' }: BillingConsoleProps) {
  const [activeView, setActiveView] = useState(defaultView);
  const [_selectedCustomer, setSelectedCustomer] = useState<string | null>(null);

  const { data: customers, isLoading: customersLoading} = useBillingCustomers();
  const { data: invoices, isLoading: invoicesLoading } = useBillingInvoices();
  const { data: metrics, isLoading: metricsLoading } = useRevenueMetrics();
  const { data: atRisk, isLoading: atRiskLoading } = useOrganizationsAtRisk();

  const addCredit = useAddCreditAdjustment();
  const voidInvoice = useVoidInvoice();
  const triggerBilling = useTriggerBilling();

  const handleAddCredit = async (organizationId: string, amount: number, description: string) => {
    try {
      await addCredit.mutateAsync({ organizationId, amount, description });
      alert('Credit adjustment added successfully');
    } catch (err: any) {
      alert(`Failed to add credit: ${err.message}`);
    }
  };

  const handleVoidInvoice = async (organizationId: string, invoiceId: string) => {
    if (!confirm('Are you sure you want to void this invoice?')) return;

    try {
      await voidInvoice.mutateAsync({ organizationId, invoiceId });
      alert('Invoice voided successfully');
    } catch (err: any) {
      alert(`Failed to void invoice: ${err.message}`);
    }
  };

  const handleTriggerBilling = async () => {
    if (!confirm('Trigger billing cycle now? This will create invoices for all unbilled usage.')) {
      return;
    }

    try {
      await triggerBilling.mutateAsync();
      alert('Billing cycle triggered successfully');
    } catch (err: any) {
      alert(`Failed to trigger billing: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing Console</h1>
          <p className="text-gray-600 mt-1">Manage customers, invoices, and revenue operations</p>
        </div>
        <button
          onClick={handleTriggerBilling}
          disabled={triggerBilling.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {triggerBilling.isPending ? 'Triggering...' : 'Trigger Billing Now'}
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'metrics', label: 'Revenue Metrics' },
            { id: 'customers', label: 'Customers' },
            { id: 'invoices', label: 'Invoices' },
            { id: 'at-risk', label: 'At Risk' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeView === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="mt-6">
        {activeView === 'metrics' && (
          <MetricsView metrics={metrics} isLoading={metricsLoading} />
        )}

        {activeView === 'customers' && (
          <CustomersView
            customers={customers}
            isLoading={customersLoading}
            onAddCredit={handleAddCredit}
            onSelectCustomer={setSelectedCustomer}
          />
        )}

        {activeView === 'invoices' && (
          <InvoicesView
            invoices={invoices}
            isLoading={invoicesLoading}
            onVoidInvoice={handleVoidInvoice}
          />
        )}

        {activeView === 'at-risk' && (
          <AtRiskView organizations={atRisk} isLoading={atRiskLoading} />
        )}
      </div>
    </div>
  );
}

// =====================================================
// METRICS VIEW
// =====================================================

function MetricsView({ metrics, isLoading }: { metrics: any; isLoading: boolean }) {
  if (isLoading) return <div className="text-gray-500">Loading metrics...</div>;
  if (!metrics) return <div className="text-red-500">Failed to load metrics</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="Total Revenue (30d)"
          value={`$${metrics.totalRevenue.toFixed(2)}`}
          subtitle={`${metrics.paidInvoices}/${metrics.totalInvoices} invoices paid`}
        />
        <MetricCard
          title="Unpaid Amount"
          value={`$${metrics.unpaidAmount.toFixed(2)}`}
          subtitle={`${metrics.totalInvoices - metrics.paidInvoices} unpaid invoices`}
          variant="warning"
        />
        <MetricCard
          title="Active Subscriptions"
          value={metrics.activeSubscriptions}
          subtitle="Currently active"
        />
        <MetricCard
          title="Collection Rate"
          value={`${((metrics.paidInvoices / metrics.totalInvoices) * 100).toFixed(1)}%`}
          subtitle="Payment success rate"
          variant={
            (metrics.paidInvoices / metrics.totalInvoices) * 100 >= 90 ? 'success' : 'warning'
          }
        />
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  variant = 'default',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const colors = {
    default: 'bg-white border-gray-200',
    success: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
    danger: 'bg-red-50 border-red-200',
  };

  return (
    <div className={`border-2 rounded-lg p-6 ${colors[variant]}`}>
      <div className="text-sm text-gray-600 mb-1">{title}</div>
      <div className="text-3xl font-bold">{value}</div>
      {subtitle && <div className="text-sm text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );
}

// =====================================================
// CUSTOMERS VIEW
// =====================================================

function CustomersView({
  customers,
  isLoading,
  onAddCredit,
  onSelectCustomer,
}: {
  customers: any[] | undefined;
  isLoading: boolean;
  onAddCredit: (orgId: string, amount: number, description: string) => void;
  onSelectCustomer: (orgId: string) => void;
}) {
  const [creditAmount, setCreditAmount] = useState('');
  const [creditDescription, setCreditDescription] = useState('');
  const [selectedOrgForCredit, setSelectedOrgForCredit] = useState<string | null>(null);

  if (isLoading) return <div className="text-gray-500">Loading customers...</div>;
  if (!customers || customers.length === 0) {
    return <div className="text-gray-500">No customers found</div>;
  }

  const handleAddCreditSubmit = () => {
    if (!selectedOrgForCredit || !creditAmount || !creditDescription) {
      alert('Please fill in all fields');
      return;
    }

    onAddCredit(selectedOrgForCredit, parseFloat(creditAmount), creditDescription);
    setSelectedOrgForCredit(null);
    setCreditAmount('');
    setCreditDescription('');
  };

  return (
    <div className="space-y-6">
      {/* Add Credit Form */}
      {selectedOrgForCredit && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold mb-4">Add Credit Adjustment</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
              <input
                type="number"
                step="0.01"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                placeholder="10.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={creditDescription}
                onChange={(e) => setCreditDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                placeholder="Refund for service issue"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddCreditSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add Credit
              </button>
              <button
                onClick={() => setSelectedOrgForCredit(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customers Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Organization
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Plan Tier
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Subscription Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Payment Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Failed Payments
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {customers.map((customer) => (
              <tr key={customer.organizationId} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {customer.organizationId.substring(0, 8)}...
                  </div>
                  <div className="text-sm text-gray-500">{customer.billingEmail}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                    {customer.planTier.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={customer.subscriptionStatus} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={customer.paymentStatus} variant="payment" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`text-sm font-medium ${
                      customer.failedPaymentCount >= 3 ? 'text-red-600' : 'text-gray-900'
                    }`}
                  >
                    {customer.failedPaymentCount}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => setSelectedOrgForCredit(customer.organizationId)}
                    className="text-blue-600 hover:text-blue-800 mr-4"
                  >
                    Add Credit
                  </button>
                  <button
                    onClick={() => onSelectCustomer(customer.organizationId)}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =====================================================
// INVOICES VIEW
// =====================================================

function InvoicesView({
  invoices,
  isLoading,
  onVoidInvoice,
}: {
  invoices: any[] | undefined;
  isLoading: boolean;
  onVoidInvoice: (orgId: string, invoiceId: string) => void;
}) {
  if (isLoading) return <div className="text-gray-500">Loading invoices...</div>;
  if (!invoices || invoices.length === 0) {
    return <div className="text-gray-500">No invoices found</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Invoice ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Organization
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Amount
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Invoice Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Due Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {invoices.map((invoice) => (
            <tr key={invoice.stripeInvoiceId} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {invoice.stripeInvoiceId.substring(0, 12)}...
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {invoice.organizationId.substring(0, 8)}...
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  ${invoice.amountDue.toFixed(2)}
                </div>
                {invoice.amountPaid > 0 && (
                  <div className="text-xs text-gray-500">Paid: ${invoice.amountPaid.toFixed(2)}</div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <StatusBadge status={invoice.status} variant="invoice" />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(invoice.invoiceDate).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {invoice.hostedInvoiceUrl && (
                  <a
                    href={invoice.hostedInvoiceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 mr-4"
                  >
                    View
                  </a>
                )}
                {!invoice.paid && invoice.status !== 'void' && (
                  <button
                    onClick={() => onVoidInvoice(invoice.organizationId, invoice.stripeInvoiceId)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Void
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// =====================================================
// AT RISK VIEW
// =====================================================

function AtRiskView({
  organizations,
  isLoading,
}: {
  organizations: any[] | undefined;
  isLoading: boolean;
}) {
  if (isLoading) return <div className="text-gray-500">Loading at-risk organizations...</div>;
  if (!organizations || organizations.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <div className="text-green-800 font-medium">No organizations at risk</div>
        <div className="text-sm text-green-600 mt-1">All customers are in good standing</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="font-semibold text-yellow-900">
          {organizations.length} organization{organizations.length !== 1 ? 's' : ''} at risk
        </div>
        <div className="text-sm text-yellow-700 mt-1">
          These organizations have 2+ failed payments and may be downgraded soon
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Organization
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Plan Tier
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Failed Payments
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Payment Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Risk Level
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {organizations.map((org) => (
              <tr key={org.organizationId} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {org.organizationId.substring(0, 8)}...
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                    {org.planTier.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-red-600">
                    {org.failedPaymentCount}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={org.paymentStatus} variant="payment" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <RiskBadge failedCount={org.failedPaymentCount} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =====================================================
// HELPER COMPONENTS
// =====================================================

function StatusBadge({
  status,
  variant = 'subscription',
}: {
  status: string;
  variant?: 'subscription' | 'payment' | 'invoice';
}) {
  const getColor = () => {
    if (variant === 'subscription') {
      if (status === 'active') return 'bg-green-100 text-green-800';
      if (status === 'past_due') return 'bg-yellow-100 text-yellow-800';
      if (status === 'canceled') return 'bg-red-100 text-red-800';
      return 'bg-gray-100 text-gray-800';
    }

    if (variant === 'payment') {
      if (status === 'current') return 'bg-green-100 text-green-800';
      if (status === 'past_due') return 'bg-yellow-100 text-yellow-800';
      if (status === 'delinquent') return 'bg-red-100 text-red-800';
      return 'bg-gray-100 text-gray-800';
    }

    if (variant === 'invoice') {
      if (status === 'paid') return 'bg-green-100 text-green-800';
      if (status === 'open') return 'bg-blue-100 text-blue-800';
      if (status === 'void') return 'bg-gray-100 text-gray-800';
      return 'bg-yellow-100 text-yellow-800';
    }

    return 'bg-gray-100 text-gray-800';
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded ${getColor()}`}>
      {status?.toUpperCase() || 'UNKNOWN'}
    </span>
  );
}

function RiskBadge({ failedCount }: { failedCount: number }) {
  if (failedCount >= 3) {
    return (
      <span className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800">
        CRITICAL
      </span>
    );
  }
  if (failedCount === 2) {
    return (
      <span className="px-2 py-1 text-xs font-medium rounded bg-orange-100 text-orange-800">
        HIGH
      </span>
    );
  }
  return (
    <span className="px-2 py-1 text-xs font-medium rounded bg-yellow-100 text-yellow-800">
      MEDIUM
    </span>
  );
}
