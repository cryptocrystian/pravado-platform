import { useState, useEffect } from 'react';
import {
  useCreateMonitoringRule,
  useUpdateMonitoringRule,
  useDeleteMonitoringRule,
} from '../../hooks/useReputation';
import type {
  MonitoringRule,
  CreateMonitoringRuleInput,
  UpdateMonitoringRuleInput,
  EntityType,
  AlertChannel,
  AlertFrequency,
  MentionType,
  Medium,
  MentionSentiment,
} from '@pravado/shared-types';

export interface RuleEditorProps {
  rule?: MonitoringRule;
  organizationId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function RuleEditor({ rule, organizationId, onSuccess, onCancel }: RuleEditorProps) {
  const isEditing = !!rule;

  const [name, setName] = useState(rule?.name || '');
  const [queryTerms, setQueryTerms] = useState<string[]>(rule?.queryTerms || []);
  const [currentTerm, setCurrentTerm] = useState('');
  const [entityType, setEntityType] = useState<EntityType>(rule?.entityType || 'BRAND');
  const [alertChannel, setAlertChannel] = useState<AlertChannel>(rule?.alertChannel || 'EMAIL');
  const [alertFrequency, setAlertFrequency] = useState<AlertFrequency>(
    rule?.alertFrequency || 'IMMEDIATE'
  );
  const [thresholdScore, setThresholdScore] = useState(rule?.thresholdScore || 70);
  const [filterMentionTypes, setFilterMentionTypes] = useState<MentionType[]>(
    rule?.filterMentionTypes || []
  );
  const [filterMediums, setFilterMediums] = useState<Medium[]>(rule?.filterMediums || []);
  const [filterSentiments, setFilterSentiments] = useState<MentionSentiment[]>(
    rule?.filterSentiments || []
  );
  const [alertEmail, setAlertEmail] = useState(rule?.alertEmail || '');
  const [alertSlackChannel, setAlertSlackChannel] = useState(rule?.alertSlackChannel || '');
  const [alertWebhookUrl, setAlertWebhookUrl] = useState(rule?.alertWebhookUrl || '');
  const [isActive, setIsActive] = useState(rule?.isActive ?? true);

  const createMutation = useCreateMonitoringRule();
  const updateMutation = useUpdateMonitoringRule();
  const deleteMutation = useDeleteMonitoringRule();

  const handleAddTerm = () => {
    if (currentTerm.trim() && !queryTerms.includes(currentTerm.trim())) {
      setQueryTerms([...queryTerms, currentTerm.trim()]);
      setCurrentTerm('');
    }
  };

  const handleRemoveTerm = (term: string) => {
    setQueryTerms(queryTerms.filter((t) => t !== term));
  };

  const handleToggleMentionType = (type: MentionType) => {
    setFilterMentionTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleToggleMedium = (medium: Medium) => {
    setFilterMediums((prev) =>
      prev.includes(medium) ? prev.filter((m) => m !== medium) : [...prev, medium]
    );
  };

  const handleToggleSentiment = (sentiment: MentionSentiment) => {
    setFilterSentiments((prev) =>
      prev.includes(sentiment) ? prev.filter((s) => s !== sentiment) : [...prev, sentiment]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const ruleData: any = {
      name,
      queryTerms,
      entityType,
      alertChannel,
      alertFrequency,
      thresholdScore,
      filterMentionTypes: filterMentionTypes.length > 0 ? filterMentionTypes : undefined,
      filterMediums: filterMediums.length > 0 ? filterMediums : undefined,
      filterSentiments: filterSentiments.length > 0 ? filterSentiments : undefined,
      isActive,
    };

    // Add channel-specific fields
    if (alertChannel === 'EMAIL') {
      ruleData.alertEmail = alertEmail;
    } else if (alertChannel === 'SLACK') {
      ruleData.alertSlackChannel = alertSlackChannel;
    } else if (alertChannel === 'WEBHOOK') {
      ruleData.alertWebhookUrl = alertWebhookUrl;
    }

    try {
      if (isEditing && rule) {
        await updateMutation.mutateAsync({
          id: rule.id,
          data: ruleData as UpdateMonitoringRuleInput,
        });
      } else {
        await createMutation.mutateAsync({
          ...ruleData,
          organizationId,
        } as CreateMonitoringRuleInput);
      }
      onSuccess?.();
    } catch (error) {
      console.error('Failed to save rule:', error);
    }
  };

  const handleDelete = async () => {
    if (!rule || !confirm('Are you sure you want to delete this monitoring rule?')) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(rule.id);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const hasError = createMutation.isError || updateMutation.isError || deleteMutation.isError;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          {isEditing ? 'Edit Monitoring Rule' : 'Create Monitoring Rule'}
        </h2>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rule Name */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Rule Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g., Brand Mentions Alert"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Query Terms */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Query Terms <span className="text-red-500">*</span>
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={currentTerm}
              onChange={(e) => setCurrentTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTerm())}
              placeholder="Enter a term and press Enter"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleAddTerm}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {queryTerms.map((term) => (
              <span
                key={term}
                className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
              >
                {term}
                <button
                  type="button"
                  onClick={() => handleRemoveTerm(term)}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
          {queryTerms.length === 0 && (
            <p className="mt-1 text-xs text-gray-500">Add at least one query term</p>
          )}
        </div>

        {/* Entity Type */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Entity Type <span className="text-red-500">*</span>
          </label>
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value as EntityType)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="BRAND">Brand</option>
            <option value="COMPETITOR">Competitor</option>
            <option value="PRODUCT">Product</option>
            <option value="PERSON">Person</option>
            <option value="LOCATION">Location</option>
            <option value="ORGANIZATION">Organization</option>
          </select>
        </div>

        {/* Filters */}
        <div className="space-y-4 rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900">Filters (Optional)</h3>

          {/* Mention Types */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Mention Types</label>
            <div className="flex flex-wrap gap-2">
              {(['BRAND', 'COMPETITOR', 'INDUSTRY', 'TOPIC'] as MentionType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleToggleMentionType(type)}
                  className={`rounded-md px-3 py-1 text-sm font-medium ${
                    filterMentionTypes.includes(type)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Mediums */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Mediums</label>
            <div className="flex flex-wrap gap-2">
              {(['NEWS', 'BLOG', 'FORUM', 'SOCIAL', 'PODCAST', 'VIDEO'] as Medium[]).map((medium) => (
                <button
                  key={medium}
                  type="button"
                  onClick={() => handleToggleMedium(medium)}
                  className={`rounded-md px-3 py-1 text-sm font-medium ${
                    filterMediums.includes(medium)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {medium}
                </button>
              ))}
            </div>
          </div>

          {/* Sentiments */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Sentiments</label>
            <div className="flex flex-wrap gap-2">
              {(['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'MIXED'] as MentionSentiment[]).map((sentiment) => (
                <button
                  key={sentiment}
                  type="button"
                  onClick={() => handleToggleSentiment(sentiment)}
                  className={`rounded-md px-3 py-1 text-sm font-medium ${
                    filterSentiments.includes(sentiment)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {sentiment}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Alert Configuration */}
        <div className="space-y-4 rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900">Alert Configuration</h3>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Alert Channel */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Alert Channel <span className="text-red-500">*</span>
              </label>
              <select
                value={alertChannel}
                onChange={(e) => setAlertChannel(e.target.value as AlertChannel)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="EMAIL">Email</option>
                <option value="SLACK">Slack</option>
                <option value="IN_APP">In-App</option>
                <option value="WEBHOOK">Webhook</option>
              </select>
            </div>

            {/* Alert Frequency */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Alert Frequency <span className="text-red-500">*</span>
              </label>
              <select
                value={alertFrequency}
                onChange={(e) => setAlertFrequency(e.target.value as AlertFrequency)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="IMMEDIATE">Immediate</option>
                <option value="HOURLY">Hourly Digest</option>
                <option value="DAILY_DIGEST">Daily Digest</option>
                <option value="WEEKLY_DIGEST">Weekly Digest</option>
              </select>
            </div>
          </div>

          {/* Channel-Specific Configuration */}
          {alertChannel === 'EMAIL' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={alertEmail}
                onChange={(e) => setAlertEmail(e.target.value)}
                required
                placeholder="alerts@example.com"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          {alertChannel === 'SLACK' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Slack Channel <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={alertSlackChannel}
                onChange={(e) => setAlertSlackChannel(e.target.value)}
                required
                placeholder="#reputation-alerts"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          {alertChannel === 'WEBHOOK' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Webhook URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={alertWebhookUrl}
                onChange={(e) => setAlertWebhookUrl(e.target.value)}
                required
                placeholder="https://example.com/webhooks/alerts"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Threshold Score */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Threshold Score: {thresholdScore}
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={thresholdScore}
              onChange={(e) => setThresholdScore(parseInt(e.target.value))}
              className="w-full"
            />
            <p className="mt-1 text-xs text-gray-500">
              Only trigger alerts for mentions with relevance score above this threshold
            </p>
          </div>
        </div>

        {/* Is Active Toggle */}
        <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Rule Status</h3>
            <p className="text-xs text-gray-500">Enable or disable this monitoring rule</p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300"></div>
            <span className="ml-3 text-sm font-medium text-gray-900">
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </label>
        </div>

        {/* Error Message */}
        {hasError && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
            Failed to save rule. Please check your inputs and try again.
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
          <div>
            {isEditing && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Delete Rule
              </button>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isPending}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isPending || queryTerms.length === 0}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? 'Saving...' : isEditing ? 'Update Rule' : 'Create Rule'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
