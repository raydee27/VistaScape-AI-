import React from 'react';
import { AppState } from '../types';
import { Camera, Edit3, Sparkles } from 'lucide-react';

interface StepIndicatorProps {
  currentState: AppState;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentState }) => {
  const steps = [
    { id: AppState.UPLOAD, label: 'Upload Photo', icon: Camera },
    { id: AppState.DESCRIBE, label: 'Describe Vision', icon: Edit3 },
    { id: AppState.RESULT, label: 'View Result', icon: Sparkles },
  ];

  // Determine active index. Treat Generating as Describe step visually or Result step? 
  // Let's treat Generating as between Describe and Result.
  let activeIndex = 0;
  if (currentState === AppState.DESCRIBE) activeIndex = 1;
  if (currentState === AppState.GENERATING) activeIndex = 1; // Staying on middle step during loading
  if (currentState === AppState.RESULT) activeIndex = 2;

  return (
    <div className="flex justify-center w-full mb-8">
      <div className="flex items-center space-x-4 md:space-x-12 relative">
        {/* Connecting Line */}
        <div className="absolute left-0 top-1/2 w-full h-1 bg-gray-200 -z-10 rounded-full"></div>
        <div 
          className="absolute left-0 top-1/2 h-1 bg-leaf-500 -z-10 rounded-full transition-all duration-500"
          style={{ width: `${(activeIndex / (steps.length - 1)) * 100}%` }}
        ></div>

        {steps.map((step, index) => {
          const isActive = index <= activeIndex;
          const isCurrent = index === activeIndex;
          
          return (
            <div key={step.id} className="flex flex-col items-center bg-white p-2 rounded-lg">
              <div 
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2
                  ${isActive ? 'bg-leaf-500 border-leaf-500 text-white shadow-lg' : 'bg-white border-gray-300 text-gray-400'}
                  ${isCurrent ? 'ring-4 ring-leaf-100' : ''}
                `}
              >
                <step.icon size={18} />
              </div>
              <span className={`mt-2 text-xs font-medium ${isActive ? 'text-leaf-800' : 'text-gray-400'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};