
import React from 'react';
import { ANNOUNCEMENTS } from '../constants';

const Marquee: React.FC = () => {
  return (
    <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-900 py-3 border-y border-purple-500/50 relative z-30 overflow-hidden">
      <div className="flex whitespace-nowrap animate-[marquee_30s_linear_infinite] hover:[animation-play-state:paused]">
        {[...ANNOUNCEMENTS, ...ANNOUNCEMENTS].map((text, i) => (
          <div key={i} className="flex items-center mx-8">
            <span className="inline-block w-2 h-2 bg-cyan-400 rounded-full mr-4 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
            <span className="text-white font-medium tracking-wide text-sm md:text-base">
              {text}
            </span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};

export default Marquee;
