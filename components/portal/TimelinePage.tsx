import React from 'react';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import { TimelineSection } from './TimelineSection';
import { shellClassName } from './utils';
import type { EventRecord } from './types';

export const TimelinePage: React.FC<{ events: EventRecord[] }> = ({ events }) => {
  const dayGroups = Array.from(new Set(events.map((event) => event.date_label))).map((dateLabel) => ({
    dateLabel,
    count: events.filter((event) => event.date_label === dateLabel).length,
  }));

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
            Day-wise event schedule
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
            Follow the fest one day at a time. Each day block shows the event order, reporting time, and venue, while the current step remains highlighted.
          </p>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {dayGroups.map((group, index) => (
            <div key={group.dateLabel} className="rounded-[1.35rem] border border-white/10 bg-[linear-gradient(145deg,rgba(15,23,42,0.88),rgba(8,15,29,0.94))] p-4">
              <div className="flex items-center gap-2 text-cyan-200">
                <CalendarDays size={16} />
                <p className="text-[11px] uppercase tracking-[0.24em]">Day {index + 1}</p>
              </div>
              <p className="mt-3 text-lg font-semibold text-white">{group.dateLabel}</p>
              <p className="mt-1 text-sm text-slate-300">{group.count} scheduled events</p>
            </div>
          ))}
        </div>
      </section>

      <TimelineSection standalone events={events} />
    </main>
  );
};

export default TimelinePage;
