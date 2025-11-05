# Pravado Platform - Billing Operations Runbook

**Sprint 76 - Track D: Observability & SLOs**

This runbook provides procedures for managing billing operations, troubleshooting Stripe integration issues, and responding to billing-related incidents.

## Table of Contents

1. [Overview](#overview)
2. [Daily Operations](#daily-operations)
3. [Billing Incident Response](#billing-incident-response)
4. [Common Billing Issues](#common-billing-issues)
5. [Trial Management](#trial-management)
6. [Subscription Management](#subscription-management)
7. [Payment Failure Handling](#payment-failure-handling)
8. [Refunds and Credits](#refunds-and-credits)
9. [Revenue Operations](#revenue-operations)
10. [Escalation and Support](#escalation-and-support)

---

## Overview

### Billing System Architecture

Pravado uses Stripe for all subscription billing and payment processing:

- **Products**: Starter, Pro, Premium, Enterprise
- **Billing Cycles**: Monthly and Annual (25% discount)
- **Trial Period**: 7 days with $2 budget
- **Payment Methods**: Credit card, ACH (Enterprise only)
- **Invoicing**: Automatic via Stripe

### Key Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Trial-to-Paid Conversion | > 15% | < 5% |
| Payment Failure Rate | < 5% | > 10% |
| Churn Rate (monthly) | < 5% | > 10% |
| MRR Growth | > 20% MoM | Decline 2 months |
| Billing Webhook Success | > 99% | < 95% |

### Tools and Access

- **Stripe Dashboard**: https://dashboard.stripe.com
- **Supabase Dashboard**: https://app.supabase.com
- **Executive Dashboard**: https://dashboard.pravado.com/admin/executive
- **Prometheus**: https://prometheus.pravado.com
- **Support Email**: support@pravado.com

---

## Daily Operations

### Daily Checklist

Run this checklist every business day at 9:00 AM:

- [ ] Check billing failure rate (target: < 5%)
- [ ] Review failed payments from last 24 hours
- [ ] Check trial-to-paid conversion rate
- [ ] Monitor MRR and ARR trends
- [ ] Review Stripe webhook health
- [ ] Check for any billing alerts in Prometheus
- [ ] Respond to billing support tickets

### Daily Metrics Query

```sql
-- Daily billing health check
SELECT
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions,
  COUNT(CASE WHEN status = 'trialing' THEN 1 END) as trials,
  COUNT(CASE WHEN status = 'past_due' THEN 1 END) as past_due,
  COUNT(CASE WHEN status = 'canceled' THEN 1 END) as canceled_today,
  SUM(CASE WHEN status = 'active' THEN mrr ELSE 0 END) as total_mrr
FROM subscriptions
WHERE DATE(created_at) = CURRENT_DATE OR DATE(updated_at) = CURRENT_DATE;
```

### Weekly Review

Run this review every Monday:

1. **MRR/ARR Analysis**: Review revenue trends and growth rate
2. **Churn Analysis**: Identify churned customers and reasons
3. **Trial Conversion**: Analyze trial-to-paid funnel performance
4. **Payment Failures**: Review failure patterns and reasons
5. **Plan Distribution**: Check which plans are most popular

---

## Billing Incident Response

### Billing Failure Spike

**Alert**: `BillingFailureSpike`

**Symptoms**:
- Failure rate > 10%
- Multiple failed payment webhooks
- Customer complaints about billing errors

**Investigation Steps**:

1. **Check Stripe Dashboard** for status issues:
   - Go to https://dashboard.stripe.com
   - Check "Recent events" for error patterns
   - Review "Failed payments" section

2. **Query recent failures**:
   ```sql
   SELECT
     organization_id,
     stripe_customer_id,
     error_message,
     failure_code,
     COUNT(*) as failure_count
   FROM billing_failures
   WHERE created_at > NOW() - INTERVAL '1 hour'
   GROUP BY organization_id, stripe_customer_id, error_message, failure_code
   ORDER BY failure_count DESC
   LIMIT 20;
   ```

3. **Check Prometheus metrics**:
   ```promql
   sum(rate(billing_failures_total{job="pravado-api"}[5m])) by (failure_reason)
   ```

**Common Failure Reasons**:

| Failure Code | Reason | Action |
|--------------|--------|--------|
| `card_declined` | Insufficient funds or bank decline | Email customer to update payment method |
| `expired_card` | Card expired | Auto-send update payment method email |
| `authentication_required` | 3D Secure required | Send customer to Stripe checkout for re-auth |
| `processing_error` | Temporary Stripe issue | Retry automatically after 1 hour |
| `incorrect_cvc` | Invalid CVC code | Email customer to re-enter card details |

**Immediate Actions**:

1. **If Stripe is experiencing issues**:
   - Check https://status.stripe.com
   - Post in #incidents Slack channel
   - Enable billing retry queue
   - Notify customers of temporary issues

2. **If issue is card-specific**:
   ```javascript
   // Trigger automated "Update Payment Method" emails
   await sendPaymentUpdateEmail(affectedCustomers);
   ```

3. **For systemic failures (> 20% failure rate)**:
   - Page on-call engineer
   - Check webhook configuration
   - Verify Stripe API keys are valid
   - Check for code bugs in webhook handler

---

### Stripe Webhook Failures

**Alert**: `StripeWebhookFailures`

**Symptoms**:
- Subscriptions not updating in database
- Customers upgraded but not showing new limits
- Failed payment notifications not sent

**Investigation**:

1. **Check Stripe webhook dashboard**:
   - Go to Stripe Dashboard → Developers → Webhooks
   - Review failed webhook attempts
   - Check error messages and response codes

2. **Common webhook errors**:
   - `401 Unauthorized`: STRIPE_WEBHOOK_SECRET is wrong
   - `500 Internal Server Error`: Bug in webhook handler
   - `Timeout`: Handler taking too long (> 30 seconds)

3. **Review webhook handler logs**:
   ```bash
   pm2 logs pravado-api | grep "webhook"
   ```

**Fixes**:

```javascript
// apps/api/src/routes/webhooks/stripe.ts

// Ensure webhook signature verification
const signature = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(
  req.body,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET
);

// Handle events idempotently
const existingEvent = await db.query(
  'SELECT id FROM stripe_events WHERE event_id = $1',
  [event.id]
);
if (existingEvent.rows.length > 0) {
  return res.json({ received: true });  // Already processed
}
```

**Manual Webhook Replay**:

If webhooks failed and need replay:

1. Go to Stripe Dashboard → Developers → Webhooks → [Your endpoint]
2. Click "View events"
3. Find failed event
4. Click "Send test webhook" to replay

---

## Common Billing Issues

### Customer Can't Upgrade Plan

**Symptoms**: User clicks "Upgrade" but checkout fails

**Investigation**:

1. **Check error in browser console** (user screenshot)
2. **Verify Stripe Price IDs** are correct:
   ```bash
   # In .env
   STRIPE_PRICE_PRO_MONTHLY=price_xxxPro_Monthly
   STRIPE_PRICE_PRO_ANNUAL=price_xxxPro_Annual
   ```

3. **Test checkout flow**:
   ```bash
   curl -X POST https://api.pravado.com/api/billing/checkout \
     -H "Authorization: Bearer $USER_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"tier": "pro", "billingCycle": "monthly"}'
   ```

**Common Causes**:

- Price ID mismatch (test vs production)
- Stripe product deactivated
- Stripe API key expired
- User already has active subscription

**Fix**:

```javascript
// Verify Price ID exists in Stripe
const price = await stripe.prices.retrieve('price_xxxPro_Monthly');
console.log(price);  // Should return price object

// If price is deactivated, reactivate:
await stripe.prices.update('price_xxxPro_Monthly', { active: true });
```

---

### Subscription Not Reflecting in Database

**Symptoms**: User paid in Stripe but database shows old plan

**Cause**: Webhook not processed or database update failed

**Fix**:

1. **Manually sync subscription from Stripe**:
   ```javascript
   // apps/api/src/services/billing.service.ts
   export async function syncSubscriptionFromStripe(customerId: string) {
     const subscription = await stripe.subscriptions.list({
       customer: customerId,
       limit: 1,
     });

     if (subscription.data.length > 0) {
       const sub = subscription.data[0];
       await db.query(
         `UPDATE subscriptions
          SET status = $1, tier = $2, updated_at = NOW()
          WHERE stripe_customer_id = $3`,
         [sub.status, getTierFromPriceId(sub.items.data[0].price.id), customerId]
       );
     }
   }
   ```

2. **Run sync for affected customer**:
   ```bash
   curl -X POST https://api.pravado.com/internal/billing/sync \
     -H "X-Internal-Token: $INTERNAL_TOKEN" \
     -d '{"stripe_customer_id": "cus_xxxxxxxxxxxxx"}'
   ```

---

### Customer Billed Twice

**Symptoms**: Double charge on customer's card

**Immediate Actions**:

1. **Verify in Stripe Dashboard**:
   - Search for customer
   - Check "Payments" tab for duplicate charges
   - Note invoice IDs

2. **Issue full refund** for duplicate charge:
   ```javascript
   const refund = await stripe.refunds.create({
     charge: 'ch_xxxxxxxxxxxxx',
     reason: 'duplicate',
   });
   ```

3. **Email customer immediately**:
   ```
   Subject: Refund Processed - Duplicate Charge

   Hi [Name],

   We noticed a duplicate charge on your account and have immediately
   processed a full refund of $[amount]. The refund should appear in
   your account within 5-10 business days.

   We sincerely apologize for this error.

   - Pravado Billing Team
   ```

4. **Investigate root cause**:
   - Check webhook logs for duplicate events
   - Review subscription creation code
   - Fix bug and deploy

---

## Trial Management

### Trial Threshold Alert

**Alert**: `TrialThresholdAlert`

**Description**: User approaching trial budget limit ($2)

**Actions**:

1. **Send notification** to user:
   ```javascript
   await sendTrialThresholdAlert(userId, daysRemaining);
   ```

2. **Monitor trial usage**:
   ```sql
   SELECT
     o.id,
     o.name,
     t.trial_budget_used_usd,
     t.trial_budget_usd,
     t.trial_end_date,
     (t.trial_budget_usd - t.trial_budget_used_usd) as budget_remaining
   FROM trial_lifecycle t
   JOIN organizations o ON o.id = t.organization_id
   WHERE t.status = 'active'
     AND t.trial_budget_used_usd > (t.trial_budget_usd * 0.75)
   ORDER BY budget_remaining ASC;
   ```

3. **Encourage upgrade**:
   - Send personalized upgrade email
   - Offer discount code for quick conversion
   - Schedule sales call if Enterprise prospect

---

### Low Trial Conversion Rate

**Alert**: `TrialConversionDropOff`

**Symptoms**: Conversion rate < 5% over 24 hours

**Investigation**:

1. **Analyze conversion funnel**:
   ```sql
   SELECT
     trial_start_count,
     conversion_count,
     (conversion_count::float / trial_start_count) * 100 as conversion_rate
   FROM (
     SELECT
       COUNT(*) FILTER (WHERE status = 'started') as trial_start_count,
       COUNT(*) FILTER (WHERE status = 'converted') as conversion_count
     FROM trial_lifecycle
     WHERE created_at > NOW() - INTERVAL '7 days'
   ) subq;
   ```

2. **Identify drop-off reasons**:
   - Exit surveys (if implemented)
   - Support ticket analysis
   - Usage analytics (did they use key features?)

3. **A/B test improvements**:
   - Longer trial period (14 days vs 7 days)
   - Higher trial budget ($5 vs $2)
   - Better onboarding emails
   - In-app upgrade prompts

---

### Extend Trial for Customer

**Request**: Customer asks for trial extension

**Approval Process**:

- Sales can approve up to 14 days extension
- VP Product can approve up to 30 days extension
- Document reason in CRM

**Implementation**:

```sql
-- Extend trial by 7 days
UPDATE trial_lifecycle
SET trial_end_date = trial_end_date + INTERVAL '7 days'
WHERE organization_id = '<org_id>'
  AND status = 'active';
```

Send confirmation email to customer.

---

## Subscription Management

### Manual Subscription Creation

**Use Case**: Customer wants to bypass Stripe checkout (e.g., via wire transfer, custom contract)

**Steps**:

1. **Create Stripe customer** (if not exists):
   ```javascript
   const customer = await stripe.customers.create({
     email: 'customer@example.com',
     name: 'Customer Name',
     metadata: {
       organization_id: '<org_id>',
     },
   });
   ```

2. **Create subscription**:
   ```javascript
   const subscription = await stripe.subscriptions.create({
     customer: customer.id,
     items: [{ price: 'price_xxxPro_Annual' }],
     trial_end: 'now',  // No trial
     metadata: {
       organization_id: '<org_id>',
     },
   });
   ```

3. **Update database**:
   ```sql
   INSERT INTO subscriptions (
     organization_id,
     stripe_customer_id,
     stripe_subscription_id,
     tier,
     billing_cycle,
     status,
     created_at
   ) VALUES (
     '<org_id>',
     '<customer_id>',
     '<subscription_id>',
     'pro',
     'annual',
     'active',
     NOW()
   );
   ```

4. **Send welcome email** to customer

---

### Downgrade Customer Immediately

**Use Case**: Customer requests immediate downgrade (instead of end of billing period)

**Steps**:

1. **Confirm** with customer (downgrade is effective immediately, no refund for unused time)

2. **Cancel current subscription**:
   ```javascript
   await stripe.subscriptions.del(subscriptionId, {
     prorate: false,  // No refund
   });
   ```

3. **Create new subscription** at lower tier:
   ```javascript
   const newSub = await stripe.subscriptions.create({
     customer: customerId,
     items: [{ price: 'price_xxxStarter_Monthly' }],
     trial_end: 'now',
   });
   ```

4. **Update database** to reflect new tier

---

### Cancel Subscription with Refund

**Use Case**: Customer requests cancellation and refund

**Approval**: Requires VP Product or CEO approval for refunds > $500

**Steps**:

1. **Cancel subscription**:
   ```javascript
   await stripe.subscriptions.cancel(subscriptionId, {
     prorate: true,  // Calculate prorated refund
   });
   ```

2. **Issue refund**:
   ```javascript
   const refund = await stripe.refunds.create({
     charge: latestChargeId,
     amount: proratedAmount,  // In cents
     reason: 'requested_by_customer',
   });
   ```

3. **Send confirmation email** with refund details

---

## Payment Failure Handling

### Automatic Retry Logic

Stripe automatically retries failed payments with this schedule:

- **Day 1**: Immediate retry
- **Day 3**: Second retry
- **Day 5**: Third retry
- **Day 7**: Fourth retry
- **Day 9**: Final retry → Subscription canceled if still failing

### Manual Payment Retry

To manually retry a failed payment:

```javascript
const invoice = await stripe.invoices.retrieve(invoiceId);
await stripe.invoices.pay(invoice.id, {
  paid_out_of_band: false,  // Attempt to charge card again
});
```

### Update Payment Method

**Customer-Initiated**:

1. **Send customer to billing portal**:
   ```javascript
   const session = await stripe.billingPortal.sessions.create({
     customer: customerId,
     return_url: 'https://dashboard.pravado.com/settings/billing',
   });

   // Redirect customer to session.url
   ```

**Support-Initiated**:

1. **Generate payment method update link**:
   ```javascript
   const session = await stripe.checkout.sessions.create({
     mode: 'setup',
     customer: customerId,
     success_url: 'https://dashboard.pravado.com/settings/billing?updated=true',
     cancel_url: 'https://dashboard.pravado.com/settings/billing',
   });

   // Email link to customer
   ```

---

## Refunds and Credits

### Full Refund

```javascript
// Refund entire charge
const refund = await stripe.refunds.create({
  charge: 'ch_xxxxxxxxxxxxx',
  reason: 'requested_by_customer',  // or 'duplicate', 'fraudulent'
});
```

### Partial Refund

```javascript
// Refund specific amount
const refund = await stripe.refunds.create({
  charge: 'ch_xxxxxxxxxxxxx',
  amount: 5000,  // $50.00 in cents
  reason: 'requested_by_customer',
});
```

### Stripe Credit

**Use Case**: Offer credit for future invoices (e.g., service disruption compensation)

```javascript
// Add credit to customer balance
await stripe.customers.update(customerId, {
  balance: -5000,  // Negative balance = credit ($50.00)
});

// Credit will be automatically applied to next invoice
```

---

## Revenue Operations

### MRR Calculation

```sql
-- Calculate current MRR
SELECT
  tier,
  COUNT(*) as customer_count,
  SUM(CASE
    WHEN billing_cycle = 'monthly' THEN price_usd
    WHEN billing_cycle = 'annual' THEN price_usd / 12
  END) as mrr
FROM subscriptions
WHERE status = 'active'
GROUP BY tier;
```

### ARR Calculation

```sql
-- Calculate ARR
SELECT SUM(mrr) * 12 as arr
FROM (
  SELECT SUM(CASE
    WHEN billing_cycle = 'monthly' THEN price_usd
    WHEN billing_cycle = 'annual' THEN price_usd / 12
  END) as mrr
  FROM subscriptions
  WHERE status = 'active'
) subq;
```

### Churn Analysis

```sql
-- Monthly churn rate
SELECT
  DATE_TRUNC('month', canceled_at) as month,
  COUNT(*) as churned_customers,
  (COUNT(*) / LAG(COUNT(*)) OVER (ORDER BY DATE_TRUNC('month', canceled_at))) * 100 as churn_rate_percent
FROM subscriptions
WHERE status = 'canceled'
  AND canceled_at > NOW() - INTERVAL '6 months'
GROUP BY month
ORDER BY month DESC;
```

---

## High Churn Rate

**Alert**: `HighChurnRate`

**Symptoms**: Churn rate > 20% over 7 days

**Investigation**:

1. **Identify churned customers**:
   ```sql
   SELECT
     o.name,
     s.tier,
     s.canceled_at,
     s.cancellation_reason
   FROM subscriptions s
   JOIN organizations o ON o.id = s.organization_id
   WHERE s.status = 'canceled'
     AND s.canceled_at > NOW() - INTERVAL '7 days'
   ORDER BY s.canceled_at DESC;
   ```

2. **Conduct exit interviews** (if not already done)

3. **Analyze cancellation reasons**:
   - Price too high
   - Missing features
   - Poor onboarding
   - Competitor offering better value
   - Business closed/budget cuts

**Actions**:

1. **Product improvements** based on feedback
2. **Pricing adjustments** if price is common issue
3. **Win-back campaign** for recent churned customers:
   ```
   Subject: We'd love to have you back

   Hi [Name],

   We noticed you recently canceled your Pravado subscription.
   We'd love to understand what we could have done better.

   As a token of our appreciation, here's 50% off for 3 months
   if you'd like to give us another try: [DISCOUNT_CODE]

   - Pravado Team
   ```

---

## Escalation and Support

### Billing Support Tiers

| Issue Type | Response Time | Handled By |
|------------|---------------|------------|
| Payment failure | 4 hours | Support Team |
| Upgrade/downgrade request | 2 hours | Support Team |
| Refund request | 4 hours | Support Team (< $100), Product Team (> $100) |
| Custom pricing (Enterprise) | 24 hours | Sales Team |
| Billing dispute | 4 hours | Support Team → Product Team |

### Contact Information

- **Support Team**: support@pravado.com, #support Slack channel
- **Product Team**: @product-team in Slack
- **Sales Team**: sales@pravado.com
- **Stripe Support**: https://support.stripe.com (for Stripe-specific issues)

### Escalation Path

1. **Support Team** handles routine billing issues
2. **Product Team** handles complex issues, refunds > $100
3. **VP Product** approves refunds > $500
4. **CEO** approves refunds > $5,000 or custom pricing

---

## Additional Resources

- Stripe Dashboard: https://dashboard.stripe.com
- Stripe API Docs: https://stripe.com/docs/api
- Stripe Billing Best Practices: https://stripe.com/docs/billing/lifecycle
- Executive Dashboard: https://dashboard.pravado.com/admin/executive
- Prometheus Billing Metrics: https://prometheus.pravado.com/billing
- SETUP.md Stripe Configuration: /SETUP.md#stripe-setup

---

**Last Updated**: Sprint 76 (generated automatically)
**Maintained By**: Product Team + Support Team
**Review Frequency**: Monthly or after major billing incidents
