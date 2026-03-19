
import React, { useState, useEffect } from 'react';
import { EVENT_DATE } from '../constants';
import confetti from 'canvas-confetti';

const Hero: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0, hours: 0, minutes: 0, seconds: 0
  });
  const [isEventStarted, setIsEventStarted] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = EVENT_DATE.getTime() - now;

      if (distance <= 0) {
        clearInterval(timer);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setIsEventStarted(true);
      } else {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isEventStarted) {
      const duration = 5 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);
    }
  }, [isEventStarted]);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 px-6">
      {/* Animated Tech Background */}
      <div className="absolute inset-0 z-0 bg-grid-pattern opacity-40"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] animate-bounce"></div>
      
      {/* Overlay for scanline effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none z-10 opacity-20"></div>

      <div className="relative z-20 text-center max-w-5xl mx-auto">
        <p className="font-orbitron text-cyan-400 tracking-[0.5em] mb-4 text-sm md:text-lg animate-pulse uppercase">
          Department of Computer Engineering Presents
        </p>
        
        <h1 className="font-orbitron text-5xl md:text-9xl font-black mb-3 tracking-tight leading-none">
          <span className="block text-white">COGNOTSAV</span>
          <span className="block bg-gradient-to-r from-cyan-400 via-purple-500 to-blue-500 bg-clip-text text-transparent italic filter drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">
             2026
          </span>
        </h1>

        <p className="text-xl md:text-3xl font-light text-gray-300 mb-12 max-w-3xl mx-auto border-l-4 border-purple-500 pl-4">
          Code. Compete. Conquer. Join the elite clash of technical minds.
        </p>

        {isEventStarted ? (
          <div className="mb-10 md:mb-16 animate-bounce">
            <h2 className="text-3xl md:text-6xl font-black font-orbitron text-white uppercase tracking-widest bg-white/5 border border-white/10 backdrop-blur-md px-8 py-6 rounded-3xl inline-block shadow-[0_0_30px_rgba(6,182,212,0.3)]">
              🚀 COGNOTSAV 2026 HAS BEGUN!
            </h2>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3 md:gap-6 mb-10 md:mb-16">
            <div className="flex flex-col items-center bg-white/5 border border-white/10 backdrop-blur-md px-3 py-2 md:px-6 md:py-4 rounded-xl md:rounded-2xl min-w-[70px] md:min-w-[100px]">
              <span className="text-3xl md:text-5xl font-bold font-orbitron text-white">{timeLeft.days}</span>
              <span className="text-xs text-gray-400 uppercase tracking-widest mt-1">Days</span>
            </div>
            <div className="flex flex-col items-center bg-white/5 border border-white/10 backdrop-blur-md px-3 py-2 md:px-6 md:py-4 rounded-xl md:rounded-2xl min-w-[70px] md:min-w-[100px]">
              <span className="text-3xl md:text-5xl font-bold font-orbitron text-white">{timeLeft.hours}</span>
              <span className="text-xs text-gray-400 uppercase tracking-widest mt-1">Hours</span>
            </div>
            <div className="flex flex-col items-center bg-white/5 border border-white/10 backdrop-blur-md px-3 py-2 md:px-6 md:py-4 rounded-xl md:rounded-2xl min-w-[70px] md:min-w-[100px]">
              <span className="text-3xl md:text-5xl font-bold font-orbitron text-white">{timeLeft.minutes}</span>
              <span className="text-xs text-gray-400 uppercase tracking-widest mt-1">Mins</span>
            </div>
            <div className="flex flex-col items-center bg-white/5 border border-white/10 backdrop-blur-md px-3 py-2 md:px-6 md:py-4 rounded-xl md:rounded-2xl min-w-[70px] md:min-w-[100px]">
              <span className="text-3xl md:text-5xl font-bold font-orbitron text-cyan-400">{timeLeft.seconds}</span>
              <span className="text-xs text-gray-400 uppercase tracking-widest mt-1">Secs</span>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <a 
            href="#events" 
            className="group relative px-10 py-4 bg-cyan-600 overflow-hidden rounded-full font-bold text-lg glow-cyan transition-all transform hover:scale-105 active:scale-95"
          >
            <span className="relative z-10">EXPLORE EVENTS</span>
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          </a>
          <a
            href="#tracker"
            className="px-10 py-4 rounded-full border border-white/10 bg-white/5 text-white font-bold text-lg backdrop-blur-md transition-all hover:border-cyan-400/40 hover:text-cyan-300"
          >
            TRACK REGISTRATION
          </a>
          <div className="flex items-center gap-3 text-gray-300 bg-white/5 px-6 py-4 rounded-full border border-white/10">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            <span className="font-medium">CE Department, DVVPOE</span>
          </div>
        </div><br/>
      </div>
    </section>
  );
};

export default Hero;
