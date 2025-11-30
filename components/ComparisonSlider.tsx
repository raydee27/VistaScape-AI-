
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ImageData } from '../types';
import { ChevronsLeftRight } from 'lucide-react';

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
    // Check if the click originated from the handle (which involves dragging logic)
    const isHandle = (e.target as HTMLElement).closest('.slider-handle');
    
    if (isHandle) {
      // If on handle, only trigger if we didn't move
      if (!hasMoved.current && onImageClick) {
        onImageClick();
      }
    } else {
      // If on image background, trigger click
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
      className="relative w-full aspect-video overflow-hidden rounded-xl shadow-2xl bg-gray-900 select-none group cursor-pointer"
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
      <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm z-10 pointer-events-none">
        AFTER
      </div>

      {/* Before Image (Clipped) */}
      <div 
        className="absolute inset-0 w-full h-full overflow-hidden"
        style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
      >
        <img 
          src={beforeImage.base64} 
          alt="Before landscaping" 
          className="absolute inset-0 w-full h-full object-cover" 
        />
        {/* Label Before */}
        <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm z-10 pointer-events-none">
          BEFORE
        </div>
      </div>

      {/* Slider Handle */}
      <div 
        className="slider-handle absolute top-0 bottom-0 w-1 bg-white cursor-col-resize z-20 flex items-center justify-center hover:bg-leaf-300 transition-colors"
        style={{ left: `${sliderPosition}%` }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        <div className="w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center -ml-3.5 text-leaf-700">
           <ChevronsLeftRight size={16} />
        </div>
      </div>
    </div>
  );
};
