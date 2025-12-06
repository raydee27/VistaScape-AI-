import React from 'react';
import { AppState } from '../types';
import { Camera, Edit3, Sparkles } from 'lucide-react';

interface StepIndicatorProps {
  currentState: AppState;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentState }) => {
  const steps = [
    { id: AppState.UPLOAD, label: 'UPLOAD', icon: Camera },
    { id: AppState.DESCRIBE, label: 'VISION', icon: Edit3 },
    { id: AppState.RESULT, label: 'RESULT', icon: Sparkles },
  ];

  let activeIndex = 0;
  if (currentState === AppState.DESCRIBE) activeIndex = 1;
  if (currentState === AppState.GENERATING) activeIndex = 1; 
  if (currentState === AppState.VIDEO_GENERATING) activeIndex = 1;
  if (currentState === AppState.RESULT) activeIndex = 2;

  return (
    <div className="flex justify-center w-full mb-12">
      <div className="flex items-center space-x-12 relative">
        {/* Connecting Line */}
        <div className="absolute left-0 top-5 w-full h-[1px] bg-neutral-200 -z-10"></div>
        <div 
          className="absolute left-0 top-5 h-[1px] bg-black -z-10 transition-all duration-700 ease-in-out"
          style={{ width: `${(activeIndex / (steps.length - 1)) * 100}%` }}
        ></div>

        {steps.map((step, index) => {
          const isActive = index <= activeIndex;
          const isCurrent = index === activeIndex;
          
          return (
            <div key={step.id} className="flex flex-col items-center bg-white px-2">
              <div 
                className={`
                  w-10 h-10 flex items-center justify-center transition-all duration-300 border
                  ${isActive ? 'bg-black border-black text-white' : 'bg-white border-neutral-300 text-neutral-400'}
                  ${isCurrent ? 'ring-2 ring-offset-2 ring-black' : ''}
                `}
              >
                <step.icon size={16} strokeWidth={1.5} />
              </div>
              <span className={`mt-3 text-[10px] tracking-[0.2em] font-bold uppercase ${isActive ? 'text-black' : 'text-neutral-300'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};