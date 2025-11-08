# Onboarding Wizard Components

This directory contains the multi-step onboarding wizard for capturing client information during the intake process.

## Component Structure

```
onboarding/
├── steps/
│   ├── BusinessInfoStep.tsx      # Step 1: Business information
│   ├── GoalsStep.tsx             # Step 2: Goals and objectives
│   ├── CompetitorsStep.tsx       # Step 3: Competitive landscape
│   ├── BrandVoiceStep.tsx        # Step 4: Brand voice and personality
│   ├── ChannelsStep.tsx          # Step 5: Channel priorities
│   ├── RegionsStep.tsx           # Step 6: Geographic focus
│   ├── StepIndicator.tsx         # Progress indicator component
│   └── index.ts                  # Exports all steps
├── OnboardingWizard.tsx          # Main wizard container
└── README.md                     # This file
```

## Step Components

Each step component follows a consistent API:

```typescript
interface StepProps {
  initialData?: Partial<StepData>;
  onNext: (data: StepData) => void;
  onBack?: () => void;
  isSubmitting: boolean;
}
```

### 1. BusinessInfoStep

Captures basic business information:
- Business name (required)
- Industry (required)
- Website (required)
- Company size: SOLO | SMALL | MEDIUM | LARGE | ENTERPRISE (required)
- Founded year (required)

### 2. GoalsStep

Captures business goals and success metrics:
- Primary goals (multi-select checkboxes, required)
- Success metrics (multi-select checkboxes, required)
- Timeline (text, required)
- Budget range (text, required)

### 3. CompetitorsStep

Captures competitive landscape:
- Competitors (dynamic list with name, website, strengths)
- Market position: LEADER | CHALLENGER | FOLLOWER | NICHE (required)
- Unique value proposition (textarea, required)

### 4. BrandVoiceStep

Captures brand identity:
- Brand tone (multi-select checkboxes, required)
- Brand attributes (multi-select checkboxes, required)
- Brand personality (textarea, required)

### 5. ChannelsStep

Captures channel priorities:
- PR priority (1-5 slider, required)
- Content marketing priority (1-5 slider, required)
- SEO priority (1-5 slider, required)
- Preferred content types (multi-select checkboxes, required)

### 6. RegionsStep

Captures geographic focus:
- Primary regions (multi-select checkboxes, required)
- Languages (multi-select checkboxes, required)
- Local considerations (textarea, optional)
- Additional context (textarea, optional)

## Usage Example

```typescript
import {
  BusinessInfoStep,
  GoalsStep,
  type BusinessInfoData,
  type GoalsData,
} from '@/components/onboarding/steps';

function MyWizard() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBusinessInfo = async (data: BusinessInfoData) => {
    setIsSubmitting(true);
    try {
      await saveBusinessInfo(data);
      // Move to next step
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BusinessInfoStep
      initialData={savedData}
      onNext={handleBusinessInfo}
      isSubmitting={isSubmitting}
    />
  );
}
```

## StepIndicator Component

Shows progress through the wizard:

```typescript
<StepIndicator
  steps={[
    { id: 'business', label: 'Business Info' },
    { id: 'goals', label: 'Goals' },
    { id: 'competitors', label: 'Competitors' },
    { id: 'brand', label: 'Brand Voice' },
    { id: 'channels', label: 'Channels' },
    { id: 'regions', label: 'Regions' },
  ]}
  currentStep={2}
  completedSteps={[0, 1]}
/>
```

## Styling

All components use Tailwind CSS with design system tokens:
- `text-primary` for primary color
- `text-muted-foreground` for secondary text
- Standard spacing: `space-y-6`, `gap-3`, etc.
- Focus rings: `focus:ring-2 focus:ring-primary`

## Form Validation

- Basic HTML5 validation (required, type, min/max)
- Custom validation for multi-select fields
- User-friendly alert messages for validation errors
- Loading states with disabled inputs

## Accessibility

- Semantic HTML elements
- Proper label associations
- Keyboard navigation support
- Focus indicators on all interactive elements
- ARIA attributes where needed

## Integration with OnboardingWizard

The main `OnboardingWizard` component orchestrates all steps:

```typescript
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';

function OnboardingPage() {
  return (
    <OnboardingWizard
      session={onboardingSession}
      onSaveResponse={saveStepData}
      onComplete={handleComplete}
    />
  );
}
```

## Type Safety

All step components export their data types:
- `BusinessInfoData`
- `GoalsData`
- `CompetitorsData` (with `Competitor` interface)
- `BrandVoiceData`
- `ChannelsData`
- `RegionsData`

Import types for type-safe handling:

```typescript
import type { BusinessInfoData, GoalsData } from '@/components/onboarding/steps';
```
