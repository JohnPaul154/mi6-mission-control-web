import React from 'react';

interface ChecklistItem {
  completed: boolean;
  timestamp: number;
}

interface ProgressBarProps {
  checklist: Record<string, ChecklistItem>;
}

const orderedSteps = [
  'arrivalHQ',
  'onTheWayToEvent',
  'arrivalEvent',
  'setupDone',
  'missionComplete'
];

const stepLabels: Record<string, string> = {
  arrivalHQ: 'All team members at HQ',
  onTheWayToEvent: 'On the Way to Event',
  arrivalEvent: 'Arrived at Event',
  setupDone: 'Setup Completed',
  missionComplete: 'Mission Completed'
};

const ProgressBar: React.FC<ProgressBarProps> = ({ checklist }) => {
  const currentStep = orderedSteps.findIndex(step => !checklist[step]?.completed);
  const effectiveStep = currentStep === -1 ? orderedSteps.length : currentStep;

  return (
    <div className="flex items-center w-full px-4 pt-12">
      <div className="relative w-10 h-full flex flex-col items-center">
        {orderedSteps.map((step, i) => (
          <React.Fragment key={step}>
            {i < orderedSteps.length - 1 && (
              <div
              className={`w-2 ${i < effectiveStep && checklist[orderedSteps[i+1]]?.completed ? 'bg-blue-500' : 'bg-gray-200'} absolute left-1/2 transform -translate-x-1/2`}
                style={{
                  height: `calc(${100 / (orderedSteps.length - 1)}% - 1em)`,
                  top: `calc(${i * (100 / (orderedSteps.length))}% + 0.7em)`
                }}
              ></div>
            )}
            <div className="relative flex items-center mb-16 w-full">
              <div
                className={`w-6 h-6 rounded-full border-8 flex items-center justify-center text-lg font-bold ${
                  checklist[step]?.completed ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300 bg-white text-gray-500'
                } translate-x-[30%]`}
                title={stepLabels[step]}
              >
                {i + 1}
              </div>
              <div
                className={`ml-8 text-md ${checklist[step]?.completed ? 'text-blue-500' : 'text-gray-200'} whitespace-nowrap`}
              >
                {stepLabels[step]}
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default ProgressBar;