import React from 'react';
import { ArrowLeft, CalendarDays, Clock3, MapPin, Sparkles } from 'lucide-react';
import { TimelineSection } from './TimelineSection';
import { parsePortalEventDate, shellClassName } from './utils';
import type { EventRecord } from './types';

export const TimelinePage: React.FC<{ events: EventRecord[] }> = ({ events }) => {
  const orderedEvents = [...events].sort((left, right) => {
    const leftTime = parsePortalEventDate(left.date_label, left.time_label)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const rightTime = parsePortalEventDate(right.date_label, right.time_label)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return leftTime - rightTime;
  });

  const firstEvent = orderedEvents[0] ?? null;
  const lastEvent = orderedEvents[orderedEvents.length - 1] ?? null;
  const uniqueVenues = Array.from(new Set(events.map((event) => event.venue))).length;

  return (
    <main className={`${shellClassName} space-y-6 pb-16 pt-8 md:space-y-8 md:pb-20 md:pt-10`}>
      <section data-reveal="up" className="portal-glow-card portal-glass overflow-hidden rounded-[2rem] p-6 md:p-8">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-amber-300" />

        <a
          href="#overview"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-slate-100 transition hover:border-blue-400/30 hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to portal
        </a>

        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.85fr)] lg:items-end">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.35em] text-blue-300/80">Timeline page</p>
            <h2 className="mt-2 bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-amber-300 bg-clip-text font-orbitron text-3xl font-black uppercase text-transparent md:text-4xl">
              Event-wise schedule and live progression
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
              Track each competition with its scheduled time and venue. The current step stays highlighted so participants can quickly spot what is active now.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.05] p-4">
              <div className="flex items-center gap-2 text-cyan-200">
                <Sparkles size={16} />
                <p className="text-[11px] uppercase tracking-[0.24em]">Total events</p>
              </div>
              <p className="mt-3 text-2xl font-black text-white">{events.length}</p>
            </div>
            <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.05] p-4">
              <div className="flex items-center gap-2 text-fuchsia-200">
                <MapPin size={16} />
                <p className="text-[11px] uppercase tracking-[0.24em]">Venues</p>
              </div>
              <p className="mt-3 text-2xl font-black text-white">{uniqueVenues}</p>
            </div>
            <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.05] p-4">
              <div className="flex items-center gap-2 text-amber-200">
                <CalendarDays size={16} />
                <p className="text-[11px] uppercase tracking-[0.24em]">Window</p>
              </div>
              <p className="mt-3 text-sm font-semibold text-white">
                {firstEvent?.date_label ?? 'TBA'} to {lastEvent?.date_label ?? 'TBA'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-[1.35rem] border border-white/10 bg-[linear-gradient(145deg,rgba(15,23,42,0.88),rgba(8,15,29,0.94))] p-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Opening slot</p>
            <div className="mt-3 flex items-start gap-3">
              <Clock3 size={16} className="mt-0.5 text-cyan-200" />
              <div>
                <p className="text-sm font-semibold text-white">{firstEvent?.name ?? 'Waiting for schedule'}</p>
                <p className="mt-1 text-sm text-slate-300">{firstEvent ? `${firstEvent.date_label} • ${firstEvent.time_label}` : 'TBA'}</p>
              </div>
            </div>
          </div>
          <div className="rounded-[1.35rem] border border-white/10 bg-[linear-gradient(145deg,rgba(15,23,42,0.88),rgba(8,15,29,0.94))] p-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Closing slot</p>
            <div className="mt-3 flex items-start gap-3">
              <CalendarDays size={16} className="mt-0.5 text-fuchsia-200" />
              <div>
                <p className="text-sm font-semibold text-white">{lastEvent?.name ?? 'Waiting for schedule'}</p>
                <p className="mt-1 text-sm text-slate-300">{lastEvent ? `${lastEvent.date_label} • ${lastEvent.time_label}` : 'TBA'}</p>
              </div>
            </div>
          </div>
          <div className="rounded-[1.35rem] border border-white/10 bg-[linear-gradient(145deg,rgba(15,23,42,0.88),rgba(8,15,29,0.94))] p-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Usage note</p>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Use this page as the quick reporting guide before moving into event details or tracker updates.
            </p>
          </div>
        </div>
      </section>

      <TimelineSection standalone events={events} />
    </main>
  );
};

export default TimelinePage;
