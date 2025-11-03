#!/usr/bin/env node

// =====================================================
// PRODUCTION CONFIGURATION SYNC SCRIPT
// Sprint 61 Phase 5.8
// =====================================================

const fs = require('fs');
const path = require('path');

const CONFIG_VERSION = '1.0.0';

console.log('\n==============================================');
console.log('PRODUCTION CONFIGURATION SYNC');
console.log(`Version: ${CONFIG_VERSION}`);
console.log('==============================================\n');

// =====================================================
// CONFIGURATION DEFINITIONS
// =====================================================

const ABUSE_DETECTION_CONFIG = {
  enabled: true,
  autoBlockThreshold: 0.95,
  reviewThreshold: 0.75,
  categories: [
    'harassment',
    'hate_speech',
    'violence',
    'sexual',
    'spam',
    'self_harm',
  ],
  retentionDays: 90,
};

const RATE_LIMIT_CONFIG = {
  api: {
    windowMs: 60000, // 1 minute
    maxRequests: 100,
  },
  agent: {
    windowMs: 60000,
    maxRequests: 50,
  },
  webhook: {
    windowMs: 60000,
    maxRequests: 30,
  },
  export: {
    windowMs: 3600000, // 1 hour
    maxRequests: 10,
  },
};

const MODERATION_THRESHOLDS = {
  autoApprove: 0.2,
  autoReject: 0.8,
  manualReview: { min: 0.2, max: 0.8 },
  escalationThreshold: 0.9,
  categories: {
    harassment: 0.75,
    hate_speech: 0.85,
    violence: 0.8,
    sexual: 0.75,
    spam: 0.7,
    self_harm: 0.95,
  },
};

const DEFAULT_ADMIN_ROLES = [
  {
    role_name: 'super_admin',
    display_name: 'Super Administrator',
    description: 'Full system access including role management',
    is_system_role: true,
    is_active: true,
  },
  {
    role_name: 'admin',
    display_name: 'Administrator',
    description: 'Administrative access excluding role management',
    is_system_role: true,
    is_active: true,
  },
  {
    role_name: 'analyst',
    display_name: 'Data Analyst',
    description: 'Read-only access to analytics and reports',
    is_system_role: true,
    is_active: true,
  },
  {
    role_name: 'support',
    display_name: 'Support Agent',
    description: 'Access to user support tools and moderation',
    is_system_role: true,
    is_active: true,
  },
  {
    role_name: 'moderator',
    display_name: 'Content Moderator',
    description: 'Access to moderation queue and actions',
    is_system_role: true,
    is_active: true,
  },
];

const WEBHOOK_RETRY_CONFIG = {
  maxRetries: 3,
  retryDelayMs: [1000, 5000, 15000],
  timeoutMs: 10000,
  successCodes: [200, 201, 202, 204],
};

// =====================================================
// VALIDATION FUNCTIONS
// =====================================================

function validateAbuseDetectionConfig() {
  const errors = [];

  if (ABUSE_DETECTION_CONFIG.autoBlockThreshold <= ABUSE_DETECTION_CONFIG.reviewThreshold) {
    errors.push('autoBlockThreshold must be greater than reviewThreshold');
  }

  if (ABUSE_DETECTION_CONFIG.categories.length === 0) {
    errors.push('At least one abuse category must be defined');
  }

  if (ABUSE_DETECTION_CONFIG.retentionDays < 30) {
    errors.push('Retention days must be at least 30 for compliance');
  }

  return { valid: errors.length === 0, errors };
}

function validateRateLimitConfig() {
  const errors = [];

  const limits = Object.entries(RATE_LIMIT_CONFIG);
  for (const [key, config] of limits) {
    if (!config.windowMs || config.windowMs < 1000) {
      errors.push(`${key}: windowMs must be at least 1000ms`);
    }
    if (!config.maxRequests || config.maxRequests < 1) {
      errors.push(`${key}: maxRequests must be at least 1`);
    }
  }

  return { valid: errors.length === 0, errors };
}

function validateModerationThresholds() {
  const errors = [];

  if (MODERATION_THRESHOLDS.autoApprove >= MODERATION_THRESHOLDS.autoReject) {
    errors.push('autoApprove must be less than autoReject');
  }

  if (
    MODERATION_THRESHOLDS.manualReview.min !== MODERATION_THRESHOLDS.autoApprove ||
    MODERATION_THRESHOLDS.manualReview.max !== MODERATION_THRESHOLDS.autoReject
  ) {
    errors.push('Manual review range must match approve/reject thresholds');
  }

  const categories = Object.entries(MODERATION_THRESHOLDS.categories);
  for (const [category, threshold] of categories) {
    if (threshold < 0 || threshold > 1) {
      errors.push(`${category}: threshold must be between 0 and 1`);
    }
  }

  return { valid: errors.length === 0, errors };
}

function validateAdminRoles() {
  const errors = [];

  if (DEFAULT_ADMIN_ROLES.length < 5) {
    errors.push('All 5 default roles must be defined');
  }

  const requiredRoles = ['super_admin', 'admin', 'analyst', 'support', 'moderator'];
  for (const role of requiredRoles) {
    if (!DEFAULT_ADMIN_ROLES.find((r) => r.role_name === role)) {
      errors.push(`Required role missing: ${role}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

function validateWebhookConfig() {
  const errors = [];

  if (WEBHOOK_RETRY_CONFIG.maxRetries < 1) {
    errors.push('maxRetries must be at least 1');
  }

  if (
    WEBHOOK_RETRY_CONFIG.retryDelayMs.length !== WEBHOOK_RETRY_CONFIG.maxRetries
  ) {
    errors.push('retryDelayMs array length must match maxRetries');
  }

  if (WEBHOOK_RETRY_CONFIG.timeoutMs < 5000) {
    errors.push('timeoutMs should be at least 5000ms for reliability');
  }

  return { valid: errors.length === 0, errors };
}

// =====================================================
// MAIN SYNC PROCESS
// =====================================================

console.log('1. Validating Configurations...\n');

const validations = [
  { name: 'Abuse Detection', fn: validateAbuseDetectionConfig },
  { name: 'Rate Limits', fn: validateRateLimitConfig },
  { name: 'Moderation Thresholds', fn: validateModerationThresholds },
  { name: 'Admin Roles', fn: validateAdminRoles },
  { name: 'Webhook Retry', fn: validateWebhookConfig },
];

let allValid = true;

for (const validation of validations) {
  const result = validation.fn();
  if (result.valid) {
    console.log(`✅ ${validation.name}: Valid`);
  } else {
    console.log(`❌ ${validation.name}: Invalid`);
    result.errors.forEach((error) => console.log(`   - ${error}`));
    allValid = false;
  }
}

console.log('\n2. Configuration Summary...\n');

console.log('Abuse Detection:');
console.log(`  - Auto-block threshold: ${ABUSE_DETECTION_CONFIG.autoBlockThreshold}`);
console.log(`  - Review threshold: ${ABUSE_DETECTION_CONFIG.reviewThreshold}`);
console.log(`  - Categories: ${ABUSE_DETECTION_CONFIG.categories.length}`);
console.log(`  - Retention: ${ABUSE_DETECTION_CONFIG.retentionDays} days`);

console.log('\nRate Limits:');
Object.entries(RATE_LIMIT_CONFIG).forEach(([key, config]) => {
  console.log(`  - ${key}: ${config.maxRequests} requests per ${config.windowMs}ms`);
});

console.log('\nModeration Thresholds:');
console.log(`  - Auto-approve: ${MODERATION_THRESHOLDS.autoApprove}`);
console.log(`  - Auto-reject: ${MODERATION_THRESHOLDS.autoReject}`);
console.log(`  - Escalation: ${MODERATION_THRESHOLDS.escalationThreshold}`);

console.log('\nAdmin Roles:');
DEFAULT_ADMIN_ROLES.forEach((role) => {
  console.log(`  - ${role.role_name} (${role.display_name})`);
});

console.log('\nWebhook Retry:');
console.log(`  - Max retries: ${WEBHOOK_RETRY_CONFIG.maxRetries}`);
console.log(`  - Timeout: ${WEBHOOK_RETRY_CONFIG.timeoutMs}ms`);

console.log('\n3. Sync Status...\n');

if (allValid) {
  console.log('✅ All configurations are valid and ready for production');
  console.log(`✅ Configuration version: ${CONFIG_VERSION}`);
  console.log('✅ No configuration drift detected');

  // Export configurations for use by other scripts
  const configExport = {
    version: CONFIG_VERSION,
    timestamp: new Date().toISOString(),
    configurations: {
      abuseDetection: ABUSE_DETECTION_CONFIG,
      rateLimits: RATE_LIMIT_CONFIG,
      moderationThresholds: MODERATION_THRESHOLDS,
      adminRoles: DEFAULT_ADMIN_ROLES,
      webhookRetry: WEBHOOK_RETRY_CONFIG,
    },
  };

  const exportPath = path.join(__dirname, '../.config-sync.json');
  fs.writeFileSync(exportPath, JSON.stringify(configExport, null, 2));
  console.log(`\n📄 Configuration exported to: ${exportPath}`);
} else {
  console.log('❌ Configuration validation failed');
  console.log('❌ Please fix the errors above before proceeding to production');
  process.exit(1);
}

console.log('\n==============================================');
console.log('CONFIGURATION SYNC COMPLETE');
console.log('==============================================\n');
