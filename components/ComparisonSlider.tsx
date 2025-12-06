import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';
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

  const handleMove = useCallback((clientX: number) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percentage = (x / rect.width) * 100;
      setSliderPosition(percentage);
    }
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    // Only start drag if not clicking the maximize button
    if ((e.target as HTMLElement).closest('button')) return;
    
    setIsDragging(true);
    handleMove(e.clientX);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    // Only start drag if not clicking the maximize button
    if ((e.target as HTMLElement).closest('button')) return;

    setIsDragging(true);
    handleMove(e.touches[0].clientX);
  };

  const onMouseUp = useCallback(() => setIsDragging(false), []);
  const onTouchEnd = useCallback(() => setIsDragging(false), []);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      e.preventDefault(); 
      handleMove(e.clientX);
    }
  }, [isDragging, handleMove]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (isDragging) {
      handleMove(e.touches[0].clientX);
    }
  }, [isDragging, handleMove]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      setSliderPosition(prev => Math.max(0, prev - 5));
    } else if (e.key === 'ArrowRight') {
      setSliderPosition(prev => Math.min(100, prev + 5));
    }
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      document.addEventListener('touchmove', onTouchMove, { passive: false });
      document.addEventListener('touchend', onTouchEnd);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    }

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDragging, onMouseMove, onMouseUp, onTouchMove, onTouchEnd]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full aspect-video group cursor-ew-resize select-none overflow-hidden bg-neutral-100 outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="slider"
      aria-valuenow={sliderPosition}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Comparison slider: Left side is Current, Right side is Proposal"
    >
      {/* Background (After / Proposal) */}
      <img 
        src={afterImage.base64} 
        alt="Proposed Design" 
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />

      {/* Foreground (Before / Current) - Clipped */}
      <div 
        className="absolute inset-0 w-full h-full will-change-[clip-path]"
        style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
      >
        <img 
          src={beforeImage.base64} 
          alt="Original Condition" 
          className="absolute inset-0 w-full h-full object-cover" 
          draggable={false}
        />
        
        {/* Shadow overlay near the edge for depth */}
        <div className="absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-black/20 to-transparent pointer-events-none"></div>
      </div>

      {/* Labels - Fade out when slider approaches */}
      <div 
        className="absolute top-6 left-6 pointer-events-none transition-all duration-300 z-10"
        style={{ opacity: sliderPosition > 15 ? 1 : 0, transform: `translateX(${sliderPosition > 15 ? 0 : -20}px)` }}
      >
        <div className="bg-white/95 backdrop-blur-md text-black px-4 py-2 text-[10px] font-bold uppercase tracking-ultra shadow-lg border border-white/20">
          Current
        </div>
      </div>
      
      <div 
        className="absolute top-6 right-6 pointer-events-none transition-all duration-300 z-10"
        style={{ opacity: sliderPosition < 85 ? 1 : 0, transform: `translateX(${sliderPosition < 85 ? 0 : 20}px)` }}
      >
        <div className="bg-black/80 backdrop-blur-md text-white px-4 py-2 text-[10px] font-bold uppercase tracking-ultra shadow-lg border border-white/10">
          Proposal
        </div>
      </div>

      {/* Slider Handle */}
      <div 
        className="absolute top-0 bottom-0 w-0.5 bg-white cursor-ew-resize z-20 pointer-events-none shadow-[0_0_10px_rgba(0,0,0,0.2)]"
        style={{ left: `${sliderPosition}%` }}
      >
         {/* Touch Target (Invisible, larger area for grabbing) */}
         <div className="absolute inset-y-0 -left-6 w-12 cursor-ew-resize pointer-events-auto"></div>

         {/* Handle Icon */}
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center cursor-ew-resize pointer-events-auto hover:scale-110 transition-transform duration-200">
             <div className="flex gap-[2px]">
                 <ChevronLeft size={14} className="text-black" />
                 <ChevronRight size={14} className="text-black" />
             </div>
         </div>
      </div>

      {/* Fullscreen Button */}
      {onImageClick && (
        <button 
            onClick={(e) => {
                e.stopPropagation();
                onImageClick();
            }}
            className="absolute bottom-6 right-6 z-30 bg-white/90 backdrop-blur hover:bg-black hover:text-white p-3 transition-colors border border-black/10 shadow-lg rounded-full"
            title="View Fullscreen"
            aria-label="View Fullscreen"
        >
            <Maximize2 size={18} strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
};