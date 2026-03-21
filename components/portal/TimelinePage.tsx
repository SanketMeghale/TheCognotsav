import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { TimelineSection } from './TimelineSection';
import { shellClassName } from './utils';

export const TimelinePage: React.FC = () => {
  return (
    <main className={`${shellClassName} space-y-6 pb-16 pt-8 md:space-y-8 md:pb-20 md:pt-10`}>
      <section data-reveal="up" className="portal-glow-card portal-glass rounded-[2rem] p-6 md:p-8">
        <a
          href="#overview"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-slate-100 transition hover:border-blue-400/30 hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to portal
        </a>
        <div className="mt-5 max-w-3xl">
          <p className="text-[11px] uppercase tracking-[0.35em] text-blue-300/80">Timeline page</p>
          <h2 className="mt-2 bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-amber-300 bg-clip-text font-orbitron text-3xl font-black uppercase text-transparent md:text-4xl">
            Fest roadmap and live alerts
          </h2>
        </div>
      </section>

      <TimelineSection standalone />
    </main>
  );
};

export default TimelinePage;
