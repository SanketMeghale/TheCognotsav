import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { TimelineSection } from './TimelineSection';
import { shellClassName } from './utils';
import type { EventRecord } from './types';

export const TimelinePage: React.FC<{ events: EventRecord[] }> = ({ events }) => {
  return (
    <main className={`${shellClassName} space-y-5 pb-16 pt-7 md:space-y-6 md:pb-20 md:pt-9`}>
      <section data-reveal="up" className="portal-timeline-page-header">
        <a
          href="#overview"
          className="portal-timeline-page-header__back inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-slate-100 transition hover:border-blue-400/30 hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to portal
        </a>
      </section>

      <TimelineSection standalone events={events} />
    </main>
  );
};

export default TimelinePage;
