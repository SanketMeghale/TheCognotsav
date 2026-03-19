
import React, { useState, useEffect, useCallback } from 'react';
import { CAROUSEL_SLIDES } from '../constants';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PosterCarousel: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev === CAROUSEL_SLIDES.length - 1 ? 0 : prev + 1));
  }, []);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? CAROUSEL_SLIDES.length - 1 : prev - 1));
  };

  useEffect(() => {
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, [nextSlide]);

  return (
    <section className="py-20 bg-black overflow-hidden px-6">
      <div className="max-w-7xl mx-auto">
        <div className="relative group rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(168,85,247,0.15)] border border-white/5">
          {/* Slides Container */}
          <div 
            className="flex transition-transform duration-700 ease-out aspect-video"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {CAROUSEL_SLIDES.map((slide) => (
              <div key={slide.id} className="min-w-full relative">
                <img 
                  src={slide.image} 
                  alt={slide.tagline}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>

          {/* Controls */}
          <button 
            onClick={prevSlide}
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-8 h-8 md:w-12 md:h-12 flex items-center justify-center bg-black/30 md:bg-black/50 text-white rounded-full backdrop-blur-sm md:backdrop-blur-md transition-all z-20 md:opacity-0 md:group-hover:opacity-100 md:hover:bg-white md:hover:text-black"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-4 h-4 md:w-6 md:h-6" />
          </button>
          <button 
            onClick={nextSlide}
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-8 h-8 md:w-12 md:h-12 flex items-center justify-center bg-black/30 md:bg-black/50 text-white rounded-full backdrop-blur-sm md:backdrop-blur-md transition-all z-20 md:opacity-0 md:group-hover:opacity-100 md:hover:bg-white md:hover:text-black"
            aria-label="Next slide"
          >
            <ChevronRight className="w-4 h-4 md:w-6 md:h-6" />
          </button>

          {/* Indicators */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-20">
            {CAROUSEL_SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === currentIndex ? 'w-8 bg-cyan-400' : 'w-2 bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PosterCarousel;
