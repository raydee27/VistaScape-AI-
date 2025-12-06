import React from 'react';
import { AppState } from '../types';

interface StepIndicatorProps {
  currentState: AppState;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentState }) => {
  const steps = [
    { id: AppState.UPLOAD, label: '01. SOURCE' },
    { id: AppState.DESCRIBE, label: '02. DIRECTIVE' },
    { id: AppState.RESULT, label: '03. RENDER' },
  ];

  let activeIndex = 0;
  if (currentState === AppState.DESCRIBE) activeIndex = 1;
  if (currentState === AppState.GENERATING) activeIndex = 1; 
  if (currentState === AppState.VIDEO_GENERATING) activeIndex = 1;
  if (currentState === AppState.RESULT) activeIndex = 2;

  return (
    <div className="w-full border-b border-black pb-4 mb-8">
      <div className="flex justify-between items-end">
        {steps.map((step, index) => {
          const isActive = index <= activeIndex;
          const isCurrent = index === activeIndex;
          
          return (
            <div key={step.id} className={`flex flex-col gap-2 ${index === 0 ? 'items-start' : index === 2 ? 'items-end' : 'items-center'}`}>
              <div className={`
                text-[10px] font-bold uppercase tracking-ultra transition-colors duration-500
                ${isActive ? 'text-black' : 'text-neutral-300'}
              `}>
                {step.label}
              </div>
              
              {/* Active Indicator Shape */}
              <div className={`
                 h-1 w-full bg-black transition-all duration-500
                 ${isCurrent ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'}
              `}></div>
            </div>
          );
        })}
      </div>
      
      {/* Background Line */}
      <div className="w-full h-[1px] bg-neutral-100 -mt-[1px] relative z-[-1]"></div>
    </div>
  );
};