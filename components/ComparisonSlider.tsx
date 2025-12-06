import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ImageData } from '../types';

interface ComparisonSliderProps {
  beforeImage: ImageData;
  afterImage: ImageData;
  onImageClick?: () => void;
}

export const ComparisonSlider: React.FC<ComparisonSliderProps> = ({ beforeImage, afterImage, onImageClick }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasMoved = useRef(false);

  const handleMove = useCallback((clientX: number) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percentage = (x / rect.width) * 100;
      setSliderPosition(percentage);
      hasMoved.current = true;
    }
  }, []);

  const onMouseDown = () => {
    setIsDragging(true);
    hasMoved.current = false;
  };
  
  const onTouchStart = () => {
    setIsDragging(true);
    hasMoved.current = false;
  };

  const onMouseUp = () => setIsDragging(false);
  const onTouchEnd = () => setIsDragging(false);

  const onMouseMove = (e: React.MouseEvent) => {
    if (isDragging) handleMove(e.clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (isDragging) handleMove(e.touches[0].clientX);
  };

  const onContainerClick = (e: React.MouseEvent) => {
    const isHandle = (e.target as HTMLElement).closest('.slider-handle');
    
    if (isHandle) {
      if (!hasMoved.current && onImageClick) {
        onImageClick();
      }
    } else {
      if (onImageClick) {
        onImageClick();
      }
    }
  };

  useEffect(() => {
    if (isDragging) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchend', onTouchEnd);
    } else {
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchend', onTouchEnd);
    }

    return () => {
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDragging]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full aspect-video overflow-hidden bg-white select-none group cursor-pointer border border-black"
      onMouseMove={onMouseMove}
      onTouchMove={onTouchMove}
      onMouseLeave={() => setIsDragging(false)}
      onClick={onContainerClick}
    >
      {/* After Image (Base) */}
      <img 
        src={afterImage.base64} 
        alt="After landscaping" 
        className="absolute inset-0 w-full h-full object-cover"
      />
      
      {/* Label After */}
      <div className="absolute top-0 right-0 bg-black text-white px-6 py-3 border-l border-b border-white z-10 pointer-events-none">
        <span className="text-[10px] tracking-ultra font-bold uppercase">Proposal</span>
      </div>

      {/* Before Image (Clipped) */}
      <div 
        className="absolute inset-0 w-full h-full overflow-hidden"
        style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
      >
        <img 
          src={beforeImage.base64} 
          alt="Before landscaping" 
          className="absolute inset-0 w-full h-full object-cover grayscale" 
        />
        {/* Label Before */}
        <div className="absolute top-0 left-0 bg-white text-black px-6 py-3 border-r border-b border-black z-10 pointer-events-none">
           <span className="text-[10px] tracking-ultra font-bold uppercase">Current</span>
        </div>
      </div>

      {/* Slider Handle */}
      <div 
        className="slider-handle absolute top-0 bottom-0 w-[1px] bg-white cursor-col-resize z-20 flex items-center justify-center"
        style={{ left: `${sliderPosition}%` }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        <div className="w-12 h-12 bg-black border border-white flex items-center justify-center -ml-[1px] hover:scale-110 transition-transform duration-300">
           <div className="w-[1px] h-4 bg-white mx-1"></div>
           <div className="w-[1px] h-4 bg-white mx-1"></div>
        </div>
      </div>
    </div>
  );
};