export function StepIndicator({
  steps,
  currentStep,
  completedSteps,
}: {
  steps: string[];
  currentStep: number;
  completedSteps: number[];
}) {
  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center flex-1">
          <div className="flex flex-col items-center flex-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                completedSteps.includes(index)
                  ? 'bg-green-500 text-white'
                  : index === currentStep
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {completedSteps.includes(index) ? '✓' : index + 1}
            </div>
            <div className="mt-2 text-xs text-center font-medium text-gray-700">{step}</div>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`flex-1 h-1 mx-2 ${
                completedSteps.includes(index) ? 'bg-green-500' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
