-- =====================================================
-- STRIPE INTEGRATION MIGRATION
-- Sprint 72: Automated Billing & Revenue Operations Integration
-- =====================================================
-- Stripe customer/subscription mapping and billing automation

-- =====================================================
-- STRIPE CUSTOMERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS stripe_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Organization mapping
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,

  -- Stripe identifiers
  stripe_customer_id TEXT NOT NULL UNIQUE,
  stripe_subscription_id TEXT,  -- Current active subscription
  stripe_payment_method_id TEXT,

  -- Billing details
  billing_email TEXT,
  billing_name TEXT,
  billing_address JSONB,  -- Stripe Address object

  -- Subscription status
  subscription_status TEXT,  -- active, past_due, canceled, trialing, etc.
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,

  -- Plan tier (synced from Stripe)
  plan_tier TEXT NOT NULL DEFAULT 'trial',
  stripe_price_id TEXT,  -- Current Stripe Price ID

  -- Payment status
  payment_status TEXT DEFAULT 'current',  -- current, past_due, delinquent
  last_payment_date TIMESTAMP WITH TIME ZONE,
  last_payment_amount NUMERIC(10, 2),
  failed_payment_count INTEGER DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_plan_tier CHECK (plan_tier IN ('trial', 'pro', 'enterprise')),
  CONSTRAINT valid_payment_status CHECK (
    payment_status IN ('current', 'past_due', 'delinquent', 'canceled')
  )
);

-- =====================================================
-- STRIPE INVOICES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS stripe_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Organization mapping
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,

  -- Stripe identifiers
  stripe_invoice_id TEXT NOT NULL UNIQUE,
  stripe_subscription_id TEXT,

  -- Invoice details
  amount_due NUMERIC(10, 2) NOT NULL,
  amount_paid NUMERIC(10, 2) DEFAULT 0,
  amount_remaining NUMERIC(10, 2) DEFAULT 0,
  currency TEXT DEFAULT 'usd',

  -- Status
  status TEXT NOT NULL,  -- draft, open, paid, void, uncollectible
  paid BOOLEAN DEFAULT false,

  -- Dates
  invoice_date TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,

  -- Invoice period
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,

  -- Usage data reference
  usage_ledger_dates JSONB DEFAULT '[]',  -- Array of dates from billing_usage_ledger

  -- Links
  invoice_pdf TEXT,
  hosted_invoice_url TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Indexes
  CONSTRAINT valid_status CHECK (
    status IN ('draft', 'open', 'paid', 'void', 'uncollectible')
  )
);

-- =====================================================
-- STRIPE EVENTS LOG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS stripe_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Stripe event details
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,  -- invoice.paid, customer.subscription.updated, etc.

  -- Related entities
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_invoice_id TEXT,
  organization_id UUID REFERENCES organizations(id),

  -- Event data
  event_data JSONB NOT NULL,  -- Full Stripe event object

  -- Processing status
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  processing_error TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Index
  CONSTRAINT unique_stripe_event UNIQUE (stripe_event_id)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Stripe Customers
CREATE INDEX idx_stripe_customers_org
  ON stripe_customers(organization_id);

CREATE INDEX idx_stripe_customers_stripe_id
  ON stripe_customers(stripe_customer_id);

CREATE INDEX idx_stripe_customers_subscription
  ON stripe_customers(stripe_subscription_id);

CREATE INDEX idx_stripe_customers_payment_status
  ON stripe_customers(payment_status, subscription_status);

-- Stripe Invoices
CREATE INDEX idx_stripe_invoices_org
  ON stripe_invoices(organization_id);

CREATE INDEX idx_stripe_invoices_stripe_id
  ON stripe_invoices(stripe_invoice_id);

CREATE INDEX idx_stripe_invoices_status
  ON stripe_invoices(status, paid);

CREATE INDEX idx_stripe_invoices_dates
  ON stripe_invoices(invoice_date DESC);

-- Stripe Events
CREATE INDEX idx_stripe_events_type
  ON stripe_events(event_type, created_at DESC);

CREATE INDEX idx_stripe_events_processed
  ON stripe_events(processed, created_at ASC)
  WHERE processed = false;

CREATE INDEX idx_stripe_events_customer
  ON stripe_events(stripe_customer_id, created_at DESC);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

/**
 * Get Stripe customer for organization
 */
CREATE OR REPLACE FUNCTION get_stripe_customer(org_id UUID)
RETURNS TABLE (
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan_tier TEXT,
  subscription_status TEXT,
  payment_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sc.stripe_customer_id,
    sc.stripe_subscription_id,
    sc.plan_tier,
    sc.subscription_status,
    sc.payment_status
  FROM stripe_customers sc
  WHERE sc.organization_id = org_id;
END;
$$ LANGUAGE plpgsql STABLE;

/**
 * Get unpaid invoices for organization
 */
CREATE OR REPLACE FUNCTION get_unpaid_invoices(org_id UUID)
RETURNS TABLE (
  stripe_invoice_id TEXT,
  amount_due NUMERIC,
  due_date TIMESTAMP WITH TIME ZONE,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    si.stripe_invoice_id,
    si.amount_due,
    si.due_date,
    si.status
  FROM stripe_invoices si
  WHERE si.organization_id = org_id
    AND si.paid = false
    AND si.status IN ('open', 'uncollectible')
  ORDER BY si.due_date ASC;
END;
$$ LANGUAGE plpgsql STABLE;

/**
 * Get revenue metrics
 */
CREATE OR REPLACE FUNCTION get_revenue_metrics(
  start_date TIMESTAMP WITH TIME ZONE DEFAULT now() - INTERVAL '30 days',
  end_date TIMESTAMP WITH TIME ZONE DEFAULT now()
)
RETURNS TABLE (
  total_revenue NUMERIC,
  total_invoices BIGINT,
  paid_invoices BIGINT,
  unpaid_amount NUMERIC,
  active_subscriptions BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN si.paid THEN si.amount_paid ELSE 0 END), 0) as total_revenue,
    COUNT(*)::BIGINT as total_invoices,
    COUNT(CASE WHEN si.paid THEN 1 END)::BIGINT as paid_invoices,
    COALESCE(SUM(CASE WHEN NOT si.paid THEN si.amount_remaining ELSE 0 END), 0) as unpaid_amount,
    (SELECT COUNT(*)::BIGINT FROM stripe_customers WHERE subscription_status = 'active') as active_subscriptions
  FROM stripe_invoices si
  WHERE si.invoice_date BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql STABLE;

/**
 * Update customer payment status based on failed payments
 */
CREATE OR REPLACE FUNCTION update_customer_payment_status(
  customer_id TEXT,
  new_status TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE stripe_customers
  SET
    payment_status = new_status,
    failed_payment_count = CASE
      WHEN new_status = 'current' THEN 0
      ELSE failed_payment_count + 1
    END,
    updated_at = now()
  WHERE stripe_customer_id = customer_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

/**
 * Sync plan tier from Stripe to organization
 */
CREATE OR REPLACE FUNCTION sync_plan_tier_from_stripe(
  org_id UUID,
  new_tier TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Update organization plan_tier
  UPDATE organizations
  SET
    plan_tier = new_tier,
    updated_at = now()
  WHERE id = org_id;

  -- Update stripe_customers plan_tier
  UPDATE stripe_customers
  SET
    plan_tier = new_tier,
    updated_at = now()
  WHERE organization_id = org_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- AUTOMATIC UPDATE TRIGGERS
-- =====================================================

/**
 * Update updated_at on row change
 */
CREATE OR REPLACE FUNCTION update_stripe_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stripe_customers_timestamp
  BEFORE UPDATE ON stripe_customers
  FOR EACH ROW
  EXECUTE FUNCTION update_stripe_timestamp();

CREATE TRIGGER trigger_update_stripe_invoices_timestamp
  BEFORE UPDATE ON stripe_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_stripe_timestamp();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE stripe_customers IS 'Sprint 72: Stripe customer/subscription mapping';
COMMENT ON TABLE stripe_invoices IS 'Sprint 72: Stripe invoice records for audit trail';
COMMENT ON TABLE stripe_events IS 'Sprint 72: Stripe webhook events log';

COMMENT ON COLUMN stripe_customers.stripe_customer_id IS 'Stripe Customer ID (cus_xxx)';
COMMENT ON COLUMN stripe_customers.stripe_subscription_id IS 'Active Stripe Subscription ID (sub_xxx)';
COMMENT ON COLUMN stripe_invoices.usage_ledger_dates IS 'Array of dates from billing_usage_ledger included in invoice';

-- =====================================================
-- GRANTS (if using RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

-- Organizations can read their own Stripe data
CREATE POLICY stripe_customers_select_own
  ON stripe_customers
  FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

CREATE POLICY stripe_invoices_select_own
  ON stripe_invoices
  FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', true)::UUID);

-- Only system/admin can modify
CREATE POLICY stripe_customers_admin_all
  ON stripe_customers
  FOR ALL
  USING (current_setting('app.user_role', true) = 'admin');

CREATE POLICY stripe_invoices_admin_all
  ON stripe_invoices
  FOR ALL
  USING (current_setting('app.user_role', true) = 'admin');

CREATE POLICY stripe_events_admin_all
  ON stripe_events
  FOR ALL
  USING (current_setting('app.user_role', true) = 'admin');
