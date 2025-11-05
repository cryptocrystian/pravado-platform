# Pravado Platform - Setup Guide

## Quick Start

### Prerequisites
- Node.js 18.x or higher
- pnpm 8.x or higher
- Supabase CLI
- Docker (for local Supabase)
- Redis (local or Upstash)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd pravado-platform
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Configure environment variables**
```bash
cp .env.sample .env
# Edit .env with your configuration
```

See the [Stripe Setup](#stripe-setup) section below for detailed Stripe configuration.

4. **Start Supabase locally**
```bash
cd apps/api
supabase start
# Note the anon key and service role key from output
```

5. **Generate database types**
```bash
pnpm db:types
```

6. **Start development servers**
```bash
# In separate terminals:
pnpm dev
```

## Project Structure

```
pravado-platform/
├── apps/
│   ├── api/              # Express + Supabase backend
│   ├── dashboard/        # Next.js 14 frontend (Cloudflare Pages)
│   └── agents/           # Agent execution engine
├── packages/
│   ├── design-system/    # Shared UI components
│   ├── shared-types/     # TypeScript types
│   └── utils/            # Shared utilities
└── docs/                 # Documentation
```

## Deployment

### Backend API
Deploy to any Node.js hosting platform. Configure Supabase production credentials.

### Frontend Dashboard
Deploy to Cloudflare Pages:
```bash
cd apps/dashboard
pnpm build
# Connect to Cloudflare Pages via dashboard or CLI
```

### Database
Use Supabase managed PostgreSQL or self-host.

## Development Workflow

1. Create feature branch
2. Make changes
3. Run tests: `pnpm test`
4. Run linting: `pnpm lint`
5. Build: `pnpm build`
6. Create pull request

## Stripe Setup

Pravado uses Stripe for subscription billing and payment processing. Follow these steps to configure Stripe for development and production.

### Prerequisites

- Stripe account (https://stripe.com)
- Access to Stripe Dashboard
- Stripe CLI (optional, for webhook testing)

### Step 1: Create Stripe Products

Create 4 subscription products in the Stripe Dashboard (https://dashboard.stripe.com/products):

#### Product 1: Starter

**Product Details:**
- Name: `Pravado Starter`
- Description: `For small teams getting started with AI-native operations`
- Statement Descriptor: `PRAVADO STARTER`

**Prices to Create:**
1. **Monthly**
   - Price: `$149.00 USD`
   - Billing Period: `Monthly`
   - Price ID: Copy and save (e.g., `price_xxxStarter_Monthly`)

2. **Annual** (25% discount)
   - Price: `$1,341.00 USD` ($149 × 12 × 0.75 = $1,341)
   - Billing Period: `Yearly`
   - Price ID: Copy and save (e.g., `price_xxxStarter_Annual`)

#### Product 2: Pro (Recommended)

**Product Details:**
- Name: `Pravado Pro`
- Description: `For scaling teams with advanced AI automation needs`
- Statement Descriptor: `PRAVADO PRO`

**Prices to Create:**
1. **Monthly**
   - Price: `$599.00 USD`
   - Billing Period: `Monthly`
   - Price ID: Copy and save (e.g., `price_xxxPro_Monthly`)

2. **Annual** (25% discount)
   - Price: `$5,391.00 USD` ($599 × 12 × 0.75 = $5,391)
   - Billing Period: `Yearly`
   - Price ID: Copy and save (e.g., `price_xxxPro_Annual`)

#### Product 3: Premium

**Product Details:**
- Name: `Pravado Premium`
- Description: `For enterprises requiring maximum scale and customization`
- Statement Descriptor: `PRAVADO PREMIUM`

**Prices to Create:**
1. **Monthly**
   - Price: `$1,499.00 USD`
   - Billing Period: `Monthly`
   - Price ID: Copy and save (e.g., `price_xxxPremium_Monthly`)

2. **Annual** (25% discount)
   - Price: `$13,491.00 USD` ($1,499 × 12 × 0.75 = $13,491)
   - Billing Period: `Yearly`
   - Price ID: Copy and save (e.g., `price_xxxPremium_Annual`)

#### Product 4: Enterprise

**Product Details:**
- Name: `Pravado Enterprise`
- Description: `Custom pricing for large organizations`
- Statement Descriptor: `PRAVADO ENTERPRISE`

**Prices to Create:**
1. **Monthly**
   - Price: `$5,000.00 USD` (starting price)
   - Billing Period: `Monthly`
   - Price ID: Copy and save (e.g., `price_xxxEnterprise_Monthly`)

2. **Annual** (25% discount)
   - Price: `$45,000.00 USD` ($5,000 × 12 × 0.75 = $45,000)
   - Billing Period: `Yearly`
   - Price ID: Copy and save (e.g., `price_xxxEnterprise_Annual`)

**Note:** Enterprise pricing is typically custom. You may want to set this as "Contact Sales" in production.

### Step 2: Configure Environment Variables

Add the following Stripe variables to your `.env` file:

```bash
# ============================================================================
# Stripe Configuration
# ============================================================================

# Stripe API Keys (get from https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Stripe Price IDs (from Product creation above)
STRIPE_PRICE_STARTER_MONTHLY=price_xxxStarter_Monthly
STRIPE_PRICE_STARTER_ANNUAL=price_xxxStarter_Annual
STRIPE_PRICE_PRO_MONTHLY=price_xxxPro_Monthly
STRIPE_PRICE_PRO_ANNUAL=price_xxxPro_Annual
STRIPE_PRICE_PREMIUM_MONTHLY=price_xxxPremium_Monthly
STRIPE_PRICE_PREMIUM_ANNUAL=price_xxxPremium_Annual
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_xxxEnterprise_Monthly
STRIPE_PRICE_ENTERPRISE_ANNUAL=price_xxxEnterprise_Annual

# Stripe Webhook Secret (get from webhook configuration)
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Stripe Customer Portal (optional, for self-service billing)
STRIPE_CUSTOMER_PORTAL_URL=https://billing.stripe.com/p/login/test_xxxxxxxxxxxxx
```

### Step 3: Set Up Webhook Endpoints

Stripe webhooks notify your backend of subscription events (created, updated, canceled, payment succeeded/failed).

#### Development Webhooks (Stripe CLI)

1. **Install Stripe CLI:**
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Other platforms: https://stripe.com/docs/stripe-cli
```

2. **Login to Stripe:**
```bash
stripe login
```

3. **Forward webhooks to local server:**
```bash
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
```

4. **Copy the webhook signing secret:**
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

5. **Add to `.env`:**
```bash
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### Production Webhooks

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Enter your production URL: `https://api.pravado.com/api/webhooks/stripe`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the webhook signing secret
6. Add to production environment variables

### Step 4: Configure Stripe Customer Portal

The Customer Portal allows users to manage their subscriptions, update payment methods, and view invoices.

1. Go to Stripe Dashboard → Settings → Billing → Customer Portal
2. Enable the Customer Portal
3. Configure settings:
   - **Allow customers to:** Update payment methods, cancel subscriptions, view invoices
   - **Cancellation behavior:** Cancel immediately or at period end (recommended)
   - **Invoice history:** Show all invoices
4. Copy the Customer Portal URL
5. Add to `.env`:
```bash
STRIPE_CUSTOMER_PORTAL_URL=https://billing.stripe.com/p/login/xxxxxxxxxxxxx
```

### Step 5: Test Stripe Integration

#### Test Checkout Flow

1. Start the development server:
```bash
pnpm dev
```

2. Navigate to pricing page:
```
http://localhost:3000/pricing
```

3. Click "Start Free Trial" on any plan

4. Use Stripe test card:
   - Card Number: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/34`)
   - CVC: Any 3 digits (e.g., `123`)
   - Postal Code: Any 5 digits (e.g., `12345`)

5. Complete checkout

6. Verify in Stripe Dashboard → Payments that test payment appears

#### Test Webhook Events

1. With Stripe CLI forwarding running, complete a test checkout

2. Check terminal output for webhook events:
```
[200] POST /api/webhooks/stripe [evt_xxxxxxxxxxxxx]
```

3. Verify subscription created in database

4. Test subscription lifecycle:
   - Cancel subscription in Stripe Dashboard
   - Check webhook fires `customer.subscription.deleted`
   - Verify user downgraded in database

### Step 6: Production Checklist

Before going live with Stripe in production:

- [ ] Replace test API keys with live keys (`sk_live_xxx`, `pk_live_xxx`)
- [ ] Update all Price IDs to production prices
- [ ] Configure production webhook endpoint
- [ ] Test live checkout flow with real payment method
- [ ] Enable Stripe Radar for fraud prevention
- [ ] Set up email receipts in Stripe Dashboard → Settings → Emails
- [ ] Configure tax settings (if applicable)
- [ ] Review Stripe compliance settings (PCI, SCA, etc.)
- [ ] Set up billing alerts for failed payments
- [ ] Test Customer Portal access

### Troubleshooting

#### Webhook 401 Unauthorized
- Verify `STRIPE_WEBHOOK_SECRET` is set correctly
- Check webhook signature validation in `/api/webhooks/stripe`
- Ensure webhook endpoint is publicly accessible (use ngrok for local testing)

#### Checkout Session Not Found
- Verify `STRIPE_SECRET_KEY` is correct
- Check Price IDs match the products created in Stripe Dashboard
- Ensure frontend is using `STRIPE_PUBLISHABLE_KEY` (not secret key)

#### Customer Portal Not Loading
- Verify `STRIPE_CUSTOMER_PORTAL_URL` is correct
- Check user has active Stripe customer ID in database
- Ensure Customer Portal is enabled in Stripe Dashboard

### Resources

- Stripe Dashboard: https://dashboard.stripe.com
- Stripe API Docs: https://stripe.com/docs/api
- Stripe CLI: https://stripe.com/docs/stripe-cli
- Stripe Testing: https://stripe.com/docs/testing
- Stripe Webhooks: https://stripe.com/docs/webhooks

---

## Additional Resources

- [Architecture Documentation](./docs/architecture.md)
- [Agent Framework](./docs/agent_framework.md)
- [Design System](./docs/design_system.md)
