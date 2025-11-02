import { faker } from '@faker-js/faker';
import dotenv from 'dotenv';
import { supabase } from '../src/lib/supabase';
import { logger } from '../src/lib/logger';

dotenv.config();

// Media outlet database for realistic contacts
const MEDIA_OUTLETS = {
  TIER_1: [
    { name: 'The New York Times', domain: 'nytimes.com' },
    { name: 'The Wall Street Journal', domain: 'wsj.com' },
    { name: 'The Washington Post', domain: 'washingtonpost.com' },
    { name: 'Bloomberg', domain: 'bloomberg.com' },
    { name: 'Reuters', domain: 'reuters.com' },
    { name: 'Associated Press', domain: 'ap.org' },
    { name: 'Financial Times', domain: 'ft.com' },
    { name: 'CNN', domain: 'cnn.com' },
    { name: 'BBC News', domain: 'bbc.com' },
    { name: 'The Guardian', domain: 'theguardian.com' },
  ],
  TIER_2: [
    { name: 'TechCrunch', domain: 'techcrunch.com' },
    { name: 'Forbes', domain: 'forbes.com' },
    { name: 'Business Insider', domain: 'businessinsider.com' },
    { name: 'The Verge', domain: 'theverge.com' },
    { name: 'Wired', domain: 'wired.com' },
    { name: 'Ars Technica', domain: 'arstechnica.com' },
    { name: 'VentureBeat', domain: 'venturebeat.com' },
    { name: 'Engadget', domain: 'engadget.com' },
    { name: 'CNET', domain: 'cnet.com' },
    { name: 'Fast Company', domain: 'fastcompany.com' },
    { name: 'Inc.', domain: 'inc.com' },
    { name: 'Entrepreneur', domain: 'entrepreneur.com' },
  ],
  TIER_3: [
    { name: 'VentureBeat', domain: 'venturebeat.com' },
    { name: 'The Information', domain: 'theinformation.com' },
    { name: 'Protocol', domain: 'protocol.com' },
    { name: 'Axios', domain: 'axios.com' },
    { name: 'The Register', domain: 'theregister.com' },
    { name: 'ZDNet', domain: 'zdnet.com' },
    { name: 'TechRadar', domain: 'techradar.com' },
    { name: 'PCMag', domain: 'pcmag.com' },
    { name: 'Gizmodo', domain: 'gizmodo.com' },
    { name: 'Mashable', domain: 'mashable.com' },
  ],
  TIER_4: [
    { name: 'Product Hunt Blog', domain: 'producthunt.com' },
    { name: 'Medium', domain: 'medium.com' },
    { name: 'Hacker Noon', domain: 'hackernoon.com' },
    { name: 'Dev.to', domain: 'dev.to' },
    { name: 'The Next Web', domain: 'thenextweb.com' },
  ],
};

const BEATS = [
  'Technology',
  'Business',
  'Finance',
  'Startups',
  'Enterprise',
  'AI/ML',
  'Cybersecurity',
  'SaaS',
  'Cloud Computing',
  'Mobile',
  'E-commerce',
  'Marketing',
  'Healthcare Tech',
  'FinTech',
  'EdTech',
];

const POSITIONS = [
  'Senior Reporter',
  'Staff Writer',
  'Technology Correspondent',
  'Business Reporter',
  'Contributing Editor',
  'News Editor',
  'Features Editor',
  'Tech Editor',
  'Columnist',
  'Senior Analyst',
];

async function seed() {
  logger.info('Starting database seed...');

  try {
    // 1. Create demo organization
    logger.info('Creating demo organization...');
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: 'Pravado Demo Inc',
        slug: 'pravado-demo',
        settings: {
          industry: 'Technology',
          size: 'startup',
          timezone: 'America/New_York',
        },
      })
      .select()
      .single();

    if (orgError) throw orgError;
    logger.info(`Created organization: ${org.id}`);

    // 2. Create demo users
    logger.info('Creating demo users...');
    const demoUsers = [
      {
        email: 'admin@pravado-demo.com',
        name: 'Alex Admin',
        role: 'ADMIN',
      },
      {
        email: 'manager@pravado-demo.com',
        name: 'Morgan Manager',
        role: 'MANAGER',
      },
      {
        email: 'contributor@pravado-demo.com',
        name: 'Charlie Contributor',
        role: 'CONTRIBUTOR',
      },
      {
        email: 'viewer@pravado-demo.com',
        name: 'Victor Viewer',
        role: 'VIEWER',
      },
    ];

    const createdUsers = [];
    for (const user of demoUsers) {
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: 'Demo123!@#',
        email_confirm: true,
        user_metadata: {
          name: user.name,
        },
      });

      if (authError) {
        logger.warn(`User ${user.email} might already exist, skipping...`);
        continue;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          id: authUser.user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organization_id: org.id,
          status: 'ACTIVE',
        })
        .select()
        .single();

      if (userError) throw userError;
      createdUsers.push(userData);
      logger.info(`Created user: ${userData.email} (${userData.role})`);
    }

    const adminUser = createdUsers[0];

    // 3. Create 250 realistic media contacts
    logger.info('Creating 250 media contacts...');
    const contacts = [];

    for (let i = 0; i < 250; i++) {
      let tier: 'TIER_1' | 'TIER_2' | 'TIER_3' | 'TIER_4';
      let tierOutlets;

      // Distribution: 10% T1, 25% T2, 40% T3, 25% T4
      const rand = Math.random();
      if (rand < 0.1) {
        tier = 'TIER_1';
        tierOutlets = MEDIA_OUTLETS.TIER_1;
      } else if (rand < 0.35) {
        tier = 'TIER_2';
        tierOutlets = MEDIA_OUTLETS.TIER_2;
      } else if (rand < 0.75) {
        tier = 'TIER_3';
        tierOutlets = MEDIA_OUTLETS.TIER_3;
      } else {
        tier = 'TIER_4';
        tierOutlets = MEDIA_OUTLETS.TIER_4;
      }

      const outlet = faker.helpers.arrayElement(tierOutlets);
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const position = faker.helpers.arrayElement(POSITIONS);
      const beats = faker.helpers.arrayElements(BEATS, { min: 1, max: 3 });

      contacts.push({
        name: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${outlet.domain}`,
        phone: Math.random() > 0.7 ? faker.phone.number('+1##########') : null,
        outlet: outlet.name,
        position,
        tier,
        status: 'ACTIVE',
        beats,
        interests: faker.helpers.arrayElements(BEATS, { min: 2, max: 5 }),
        timezone: faker.helpers.arrayElement([
          'America/New_York',
          'America/Los_Angeles',
          'America/Chicago',
          'Europe/London',
        ]),
        social_profiles: {
          twitter: `@${firstName.toLowerCase()}${lastName.toLowerCase()}`,
          linkedin: `linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}`,
        },
        notes: Math.random() > 0.8 ? faker.lorem.sentence() : null,
        response_rate: faker.number.float({ min: 0, max: 100, precision: 0.01 }),
        organization_id: org.id,
        created_by: adminUser.id,
      });
    }

    const { error: contactsError } = await supabase.from('media_contacts').insert(contacts);
    if (contactsError) throw contactsError;
    logger.info('Created 250 media contacts');

    // 4. Create 5 sample campaigns
    logger.info('Creating sample campaigns...');
    const campaigns = [
      {
        name: 'Q1 2025 Product Launch',
        description: 'Launch campaign for new AI-powered features',
        type: 'INTEGRATED',
        status: 'ACTIVE',
        start_date: new Date('2025-01-01'),
        end_date: new Date('2025-03-31'),
        budget: 50000,
        organization_id: org.id,
        owner_id: adminUser.id,
        created_by: adminUser.id,
        goals: [
          { id: faker.string.uuid(), metric: 'Press Mentions', target: 50, current: 12, unit: 'mentions' },
          { id: faker.string.uuid(), metric: 'Website Traffic', target: 100000, current: 45000, unit: 'visits' },
        ],
        metrics: {
          impressions: 250000,
          engagements: 15000,
          conversions: 500,
          roi: 3.5,
          customMetrics: {},
        },
      },
      {
        name: 'Thought Leadership Series',
        description: 'Build authority through expert content',
        type: 'CONTENT',
        status: 'ACTIVE',
        start_date: new Date('2025-01-15'),
        end_date: null,
        budget: 25000,
        organization_id: org.id,
        owner_id: adminUser.id,
        created_by: adminUser.id,
        goals: [],
        metrics: { impressions: 0, engagements: 0, conversions: 0, roi: null, customMetrics: {} },
      },
      {
        name: 'SEO Content Blitz',
        description: 'Scale organic traffic through optimized content',
        type: 'SEO',
        status: 'PLANNING',
        start_date: new Date('2025-02-01'),
        end_date: new Date('2025-04-30'),
        budget: 35000,
        organization_id: org.id,
        owner_id: adminUser.id,
        created_by: adminUser.id,
        goals: [],
        metrics: { impressions: 0, engagements: 0, conversions: 0, roi: null, customMetrics: {} },
      },
      {
        name: 'Industry Awards PR Push',
        description: 'Leverage awards wins for media coverage',
        type: 'PR',
        status: 'DRAFT',
        start_date: new Date('2025-03-01'),
        end_date: new Date('2025-03-15'),
        budget: 15000,
        organization_id: org.id,
        owner_id: adminUser.id,
        created_by: adminUser.id,
        goals: [],
        metrics: { impressions: 0, engagements: 0, conversions: 0, roi: null, customMetrics: {} },
      },
      {
        name: 'Customer Success Stories',
        description: 'Showcase customer wins and case studies',
        type: 'CONTENT',
        status: 'COMPLETED',
        start_date: new Date('2024-10-01'),
        end_date: new Date('2024-12-31'),
        budget: 20000,
        organization_id: org.id,
        owner_id: adminUser.id,
        created_by: adminUser.id,
        goals: [],
        metrics: { impressions: 500000, engagements: 35000, conversions: 1200, roi: 5.2, customMetrics: {} },
      },
    ];

    const { data: createdCampaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .insert(campaigns)
      .select();

    if (campaignsError) throw campaignsError;
    logger.info(`Created ${createdCampaigns.length} campaigns`);

    // 5. Create 10 sample content items
    logger.info('Creating sample content items...');
    const contentItems = [
      {
        title: 'How AI is Transforming Modern PR Strategies',
        type: 'BLOG_POST',
        status: 'PUBLISHED',
        channels: ['WEBSITE', 'LINKEDIN'],
        content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit...',
        summary: 'Exploring the intersection of AI and public relations',
        campaign_id: createdCampaigns[0].id,
        author_id: adminUser.id,
        published_at: new Date('2025-01-15'),
        metadata: {
          wordCount: 1500,
          readingTime: 7,
          tags: ['AI', 'PR', 'Technology'],
          targetAudience: ['PR Professionals', 'Marketers'],
          tone: 'professional',
          customFields: {},
        },
        organization_id: org.id,
        created_by: adminUser.id,
      },
      {
        title: 'New Product Launch: Revolutionary AI Features',
        type: 'PRESS_RELEASE',
        status: 'APPROVED',
        channels: ['WEBSITE', 'EMAIL'],
        content: 'FOR IMMEDIATE RELEASE: Pravado announces...',
        summary: 'Official announcement of new AI capabilities',
        campaign_id: createdCampaigns[0].id,
        author_id: adminUser.id,
        scheduled_for: new Date('2025-02-01'),
        metadata: { wordCount: 800, readingTime: 4, tags: ['Launch', 'AI'], targetAudience: ['Media'], tone: 'formal', customFields: {} },
        organization_id: org.id,
        created_by: adminUser.id,
      },
    ];

    for (let i = 3; i <= 10; i++) {
      contentItems.push({
        title: `${faker.company.catchPhrase()} - Expert Analysis`,
        type: faker.helpers.arrayElement(['BLOG_POST', 'SOCIAL_POST', 'EMAIL'] as const),
        status: faker.helpers.arrayElement(['DRAFT', 'IN_REVIEW', 'PUBLISHED'] as const),
        channels: faker.helpers.arrayElements(['WEBSITE', 'LINKEDIN', 'TWITTER', 'MEDIUM'] as const, { min: 1, max: 3 }),
        content: faker.lorem.paragraphs(5),
        summary: faker.lorem.sentence(),
        campaign_id: faker.helpers.arrayElement(createdCampaigns).id,
        author_id: adminUser.id,
        published_at: Math.random() > 0.5 ? faker.date.recent({ days: 30 }) : null,
        metadata: {
          wordCount: faker.number.int({ min: 500, max: 2000 }),
          readingTime: faker.number.int({ min: 3, max: 10 }),
          tags: faker.helpers.arrayElements(['AI', 'Business', 'Technology', 'Innovation', 'Strategy'], { min: 2, max: 4 }),
          targetAudience: ['Business Leaders'],
          tone: 'professional',
          customFields: {},
        },
        organization_id: org.id,
        created_by: adminUser.id,
      });
    }

    const { error: contentError } = await supabase.from('content_items').insert(contentItems);
    if (contentError) throw contentError;
    logger.info('Created 10 content items');

    // 6. Create 2 strategy plans
    logger.info('Creating strategy plans...');
    const strategyPlans = [
      {
        name: '2025 Annual Marketing Strategy',
        description: 'Comprehensive marketing and PR strategy for 2025',
        type: 'ANNUAL',
        status: 'ACTIVE',
        goals: [
          {
            id: faker.string.uuid(),
            title: 'Increase brand awareness',
            description: 'Grow brand mentions by 200%',
            targetValue: 1000,
            currentValue: 350,
            unit: 'mentions',
            deadline: new Date('2025-12-31'),
            priority: 1,
          },
        ],
        tactics: [
          {
            id: faker.string.uuid(),
            name: 'Thought leadership content',
            description: 'Publish expert insights weekly',
            channel: 'Content Marketing',
            timeline: 'Weekly',
            resources: ['Content team', 'Subject matter experts'],
            kpis: ['Article views', 'Social shares', 'Backlinks'],
          },
        ],
        timeline: {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          milestones: [],
          phases: [],
        },
        organization_id: org.id,
        owner_id: adminUser.id,
        created_by: adminUser.id,
      },
      {
        name: 'Q1 PR Offensive',
        description: 'Aggressive PR campaign for product launch',
        type: 'PR',
        status: 'IN_REVIEW',
        goals: [],
        tactics: [],
        timeline: {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-03-31'),
          milestones: [],
          phases: [],
        },
        organization_id: org.id,
        owner_id: adminUser.id,
        created_by: adminUser.id,
      },
    ];

    const { error: strategiesError } = await supabase.from('strategy_plans').insert(strategyPlans);
    if (strategiesError) throw strategiesError;
    logger.info('Created 2 strategy plans');

    // 7. Create 1 style guide
    logger.info('Creating style guide...');
    const styleGuide = {
      name: 'Pravado Brand Voice & Style Guide',
      description: 'Official guidelines for all Pravado communications',
      tone_guidelines: 'Professional, confident, and approachable. Avoid jargon unless necessary.',
      voice_characteristics: {
        tone: ['Professional', 'Confident', 'Helpful'],
        attributes: ['Clear', 'Concise', 'Actionable'],
        personality: 'Expert advisor who makes complex topics accessible',
        targetAudience: 'PR professionals, marketers, and business leaders',
      },
      formatting_rules: {
        headingStyle: 'Title Case for H1, Sentence case for H2-H4',
        listStyle: 'Use bullet points for lists of 3+ items',
        dateFormat: 'Month DD, YYYY',
        numberFormat: 'Use commas for thousands',
        customRules: {},
      },
      vocabulary_preferences: {
        preferredTerms: {
          'AI': 'artificial intelligence (AI)',
          'PR': 'public relations (PR)',
        },
        avoidedTerms: ['synergy', 'leverage (as verb)', 'disruptive'],
        brandTerms: {
          'Pravado': 'Always capitalized, never "pravado"',
        },
      },
      examples: [
        {
          category: 'Headlines',
          goodExample: 'How AI Transforms Modern PR Strategies',
          badExample: 'Leveraging Disruptive AI for PR Synergy',
          explanation: 'Use clear, benefit-focused headlines without jargon',
        },
      ],
      dos_and_donts: {
        dos: [
          'Start with the benefit to the reader',
          'Use active voice',
          'Include specific examples',
          'Keep paragraphs under 4 sentences',
        ],
        donts: [
          'Use excessive jargon or buzzwords',
          'Write in passive voice',
          'Make unsubstantiated claims',
          'Bury the lede',
        ],
      },
      is_default: true,
      organization_id: org.id,
      created_by: adminUser.id,
    };

    const { error: styleGuideError } = await supabase.from('style_guides').insert(styleGuide);
    if (styleGuideError) throw styleGuideError;
    logger.info('Created style guide');

    logger.info('✅ Database seed completed successfully!');
    logger.info(`
      Summary:
      - Organization: Pravado Demo Inc
      - Users: 4 (Admin, Manager, Contributor, Viewer)
      - Media Contacts: 250
      - Campaigns: 5
      - Content Items: 10
      - Strategy Plans: 2
      - Style Guides: 1

      Login credentials (all users):
      Password: Demo123!@#

      Users:
      - admin@pravado-demo.com (Admin)
      - manager@pravado-demo.com (Manager)
      - contributor@pravado-demo.com (Contributor)
      - viewer@pravado-demo.com (Viewer)
    `);
  } catch (error) {
    logger.error('Seed failed:', error);
    throw error;
  }
}

// Run seed
seed()
  .then(() => {
    logger.info('Seed script completed');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Seed script failed:', error);
    process.exit(1);
  });
