/**
 * Pricing Page
 *
 * Public-facing pricing page with 4-tier Balanced Model comparison.
 * Includes monthly/annual toggle with 25% annual discount.
 * Features Stripe checkout integration.
 *
 * Tiers: Starter ($149) | Pro ($599 - RECOMMENDED) | Premium ($1,499) | Enterprise
 *
 * Sprint 75 - Track B: Validated Pricing Rollout
 */

'use client';

import { useState } from 'react';
import { usePlanMatrix, useStartCheckout, type BillingCycle, type PlanTier } from '@/hooks/usePlans';

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const { data: plans, isLoading } = usePlanMatrix();
  const { mutate: startCheckout, isPending: isCheckoutLoading } = useStartCheckout();

  const handleStartTrial = (tier: PlanTier) => {
    startCheckout(
      { tier, billingCycle },
      {
        onSuccess: (data) => {
          // Redirect to Stripe Checkout
          window.location.href = data.url;
        },
        onError: (error) => {
          alert(`Failed to start checkout: ${error.message}`);
        },
      }
    );
  };

  const handleContactSales = () => {
    // Open contact form or redirect to sales page
    window.location.href = '/contact-sales';
  };

  const formatPrice = (monthly: number, annual: number): string => {
    const price = billingCycle === 'monthly' ? monthly : annual / 12;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getAnnualSavings = (monthly: number, annual: number): number => {
    return monthly * 12 - annual;
  };

  if (isLoading || !plans) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const sortedPlans = [...plans].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          Choose the perfect plan for your PR and media outreach needs.
          Start with a 7-day free trial, no credit card required.
        </p>

        {/* Billing Toggle */}
        <div className="inline-flex items-center bg-white rounded-full p-1 border border-gray-300 shadow-sm">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
              billingCycle === 'monthly'
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
              billingCycle === 'annual'
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            Annual
            <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
              Save 25%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {sortedPlans.map((plan) => {
            const isRecommended = plan.is_recommended;
            const isEnterprise = plan.tier === 'enterprise';

            return (
              <div
                key={plan.tier}
                className={`relative bg-white rounded-2xl shadow-lg overflow-hidden transition-transform hover:scale-105 ${
                  isRecommended ? 'ring-2 ring-blue-600' : ''
                }`}
              >
                {isRecommended && (
                  <div className="absolute top-0 right-0 bg-blue-600 text-white px-4 py-1 text-xs font-semibold uppercase">
                    Recommended
                  </div>
                )}

                <div className="p-8">
                  {/* Plan Name */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.tier_display_name}</h3>
                  <p className="text-sm text-gray-600 mb-6">{plan.tier_description}</p>

                  {/* Price */}
                  <div className="mb-6">
                    {!isEnterprise ? (
                      <>
                        <div className="flex items-baseline">
                          <span className="text-4xl font-bold text-gray-900">
                            {formatPrice(plan.monthly_price_usd, plan.annual_price_usd)}
                          </span>
                          <span className="text-gray-600 ml-2">/month</span>
                        </div>
                        {billingCycle === 'annual' && (
                          <p className="text-sm text-green-600 mt-2">
                            Save ${getAnnualSavings(plan.monthly_price_usd, plan.annual_price_usd).toLocaleString()}{' '}
                            per year
                          </p>
                        )}
                      </>
                    ) : (
                      <div className="text-4xl font-bold text-gray-900">Custom</div>
                    )}
                  </div>

                  {/* CTA Button */}
                  {!isEnterprise ? (
                    <button
                      onClick={() => handleStartTrial(plan.tier)}
                      disabled={isCheckoutLoading}
                      className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
                        isRecommended
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isCheckoutLoading ? 'Loading...' : 'Start Free Trial'}
                    </button>
                  ) : (
                    <button
                      onClick={handleContactSales}
                      className="w-full py-3 px-6 rounded-lg font-semibold bg-gray-900 text-white hover:bg-gray-800 transition-colors"
                    >
                      Contact Sales
                    </button>
                  )}

                  {/* Features */}
                  <div className="mt-8 space-y-4">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-700">
                        {plan.journalist_contacts_limit
                          ? `${plan.journalist_contacts_limit.toLocaleString()} journalist contacts`
                          : 'Unlimited contacts'}
                      </span>
                    </div>

                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-700">
                        {plan.ai_generations_monthly
                          ? `${plan.ai_generations_monthly.toLocaleString()} AI generations/month`
                          : 'Unlimited AI generations'}
                      </span>
                    </div>

                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-700">
                        {plan.max_users ? `Up to ${plan.max_users} users` : 'Unlimited users'}
                      </span>
                    </div>

                    {plan.podcast_syndications_monthly && plan.podcast_syndications_monthly > 0 && (
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-gray-700">
                          {plan.podcast_syndications_monthly} podcast syndications/month
                        </span>
                      </div>
                    )}

                    {plan.citemind_queries_monthly && (
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-gray-700">
                          {plan.citemind_queries_monthly === -1
                            ? 'Unlimited CiteMind queries'
                            : `${plan.citemind_queries_monthly} CiteMind queries/month`}
                        </span>
                      </div>
                    )}

                    {plan.api_access && (
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-gray-700">Full API access</span>
                      </div>
                    )}

                    {plan.white_label_reports && (
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-gray-700">White-label reports</span>
                      </div>
                    )}

                    {plan.dedicated_csm && (
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-gray-700">Dedicated Customer Success Manager</span>
                      </div>
                    )}

                    {plan.sla_uptime_percent && (
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-gray-700">{plan.sla_uptime_percent}% uptime SLA</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Frequently Asked Questions</h2>
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">How does the 7-day free trial work?</h3>
              <p className="text-gray-600">
                Start with any paid plan and get full access for 7 days with no credit card required. If you love it,
                continue with your chosen plan. Otherwise, no charges will apply.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Can I switch plans later?</h3>
              <p className="text-gray-600">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll
                prorate any charges or credits.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">What's included in all plans?</h3>
              <p className="text-gray-600">
                All plans include journalist contact database, CiteMind indexing, campaign planner, agent sync, AI
                visibility score, and email support. Higher tiers unlock podcast syndication, API access, and priority
                support.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">How does annual billing work?</h3>
              <p className="text-gray-600">
                Pay annually and save 25% (equivalent to 2 months free). Annual subscriptions are billed once per year,
                with full access for 12 months.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
