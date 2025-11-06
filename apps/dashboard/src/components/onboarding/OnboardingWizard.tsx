'use client';

import { useState } from 'react';
import { IntakeStep, type OnboardingSession } from '@pravado/types';
import { BusinessInfoStep } from './steps/BusinessInfoStep';
import { GoalsStep } from './steps/GoalsStep';
import { CompetitorsStep } from './steps/CompetitorsStep';
import { BrandVoiceStep } from './steps/BrandVoiceStep';
import { ChannelsStep } from './steps/ChannelsStep';
import { RegionsStep } from './steps/RegionsStep';
import { StepIndicator } from './StepIndicator';

interface OnboardingWizardProps {
  session: OnboardingSession;
  onSaveResponse: (data: { sessionId: string; step: IntakeStep; data: any }) => Promise<void>;
  onComplete: () => void;
}

const STEPS = [
  { step: IntakeStep.BUSINESS_INFO, label: 'Business Info', component: BusinessInfoStep },
  { step: IntakeStep.GOALS, label: 'Goals', component: GoalsStep },
  { step: IntakeStep.COMPETITORS, label: 'Competitors', component: CompetitorsStep },
  { step: IntakeStep.BRAND_VOICE, label: 'Brand Voice', component: BrandVoiceStep },
  { step: IntakeStep.CHANNELS, label: 'Channels', component: ChannelsStep },
  { step: IntakeStep.REGIONS, label: 'Regions', component: RegionsStep },
];

export function OnboardingWizard({ session, onSaveResponse, onComplete }: OnboardingWizardProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(() => {
    const currentStep = session.currentStep || IntakeStep.BUSINESS_INFO;
    return STEPS.findIndex((s) => s.step === currentStep) || 0;
  });

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStep = STEPS[currentStepIndex];
  const StepComponent = currentStep.component;

  const handleNext = async (stepData: any) => {
    setIsSubmitting(true);

    try {
      // Save the response for this step
      await onSaveResponse({
        sessionId: session.id,
        step: currentStep.step,
        data: stepData,
      });

      // Update local form data
      setFormData((prev) => ({
        ...prev,
        [currentStep.step]: stepData,
      }));

      // Move to next step or complete
      if (currentStepIndex < STEPS.length - 1) {
        setCurrentStepIndex(currentStepIndex + 1);
      } else {
        // All steps complete, trigger processing
        onComplete();
      }
    } catch (error) {
      console.error('Failed to save step:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const completedSteps = session.completedSteps || [];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Indicator */}
      <StepIndicator
        steps={STEPS.map((s) => s.label)}
        currentStep={currentStepIndex}
        completedSteps={completedSteps.map((s) => STEPS.findIndex((step) => step.step === s))}
      />

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-lg p-8 mt-8">
        <h2 className="text-2xl font-bold mb-6">{currentStep.label}</h2>

        <StepComponent
          initialData={formData[currentStep.step]}
          onNext={handleNext}
          onBack={currentStepIndex > 0 ? handleBack : undefined}
          isSubmitting={isSubmitting}
        />
      </div>

      {/* Helper text */}
      <div className="mt-4 text-center text-sm text-gray-500">
        Step {currentStepIndex + 1} of {STEPS.length}
      </div>
    </div>
  );
}
