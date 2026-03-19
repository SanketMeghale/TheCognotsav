import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { EventRecord } from './types';
import { formatCurrency, getEventHeatLevel, getTeamLabel } from './utils';

type Props = {
  events: EventRecord[];
  loadingEvents: boolean;
  selectedEventSlug: string;
  onSelectEvent: (slug: string) => void;
};

const categoryThemes: Record<string, { accent: string; badge: string; progress: string }> = {
  Technical: {
    accent: 'from-sky-500/18 via-cyan-400/10 to-blue-500/10',
    badge: 'border-sky-300/20 bg-sky-400/14 text-sky-100',
    progress: 'from-sky-400 via-cyan-400 to-blue-400',
  },
  Gaming: {
    accent: 'from-fuchsia-500/18 via-purple-500/10 to-pink-500/10',
    badge: 'border-fuchsia-300/20 bg-fuchsia-400/14 text-fuchsia-100',
    progress: 'from-fuchsia-400 via-purple-400 to-pink-400',
  },
  Fun: {
    accent: 'from-amber-500/18 via-orange-500/10 to-rose-500/10',
    badge: 'border-amber-300/20 bg-amber-400/14 text-amber-100',
    progress: 'from-amber-400 via-orange-400 to-pink-400',
  },
};

export const CompetitionGridSection: React.FC<Props> = ({ events, loadingEvents, selectedEventSlug, onSelectEvent }) => {
  return (
    <section id="registration-panel" className="portal-glow-card portal-glass rounded-[1.8rem] p-4 sm:p-5 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-200/80 sm:text-[11px]">Competitions</p>
          <h3 className="portal-title-lg mt-2 font-semibold text-white">Choose an event to open its page.</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Inspired by the tighter event-card style you referenced: cleaner cards, stronger poster focus, and a single action into the event page.
          </p>
        </div>
        <div className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-200">
          {events.length} live
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {loadingEvents
          ? Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-4">
                <div className="h-40 animate-pulse rounded-[1.2rem] bg-white/10" />
                <div className="mt-4 h-4 w-24 animate-pulse rounded-full bg-white/10" />
                <div className="mt-3 h-6 w-2/3 animate-pulse rounded-full bg-white/10" />
              </div>
            ))
          : events.map((event) => {
              const active = event.slug === selectedEventSlug;
              const theme = categoryThemes[event.category] || categoryThemes.Technical;
              const slotsLeft = event.max_slots !== null ? Math.max(event.max_slots - event.registrations_count, 0) : null;
              const heat = getEventHeatLevel(event);

              return (
                <button
                  key={event.slug}
                  type="button"
                  onClick={() => onSelectEvent(event.slug)}
                  className={`group overflow-hidden rounded-[1.6rem] border bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(9,13,24,0.75))] text-left transition duration-200 ${
                    active ? 'border-white/24 shadow-[0_24px_60px_rgba(59,130,246,0.16)]' : 'border-white/10 hover:border-white/18'
                  }`}
                >
                  <div className="relative h-44 overflow-hidden">
                    <img src={event.poster_path} alt={event.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,10,21,0.06),rgba(7,10,21,0.88))]" />
                    <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                      <span className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.16em] ${theme.badge}`}>{event.category}</span>
                      <span className="rounded-full border border-white/12 bg-black/30 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/86">{formatCurrency(event.registration_fee)}</span>
                    </div>
                  </div>

                  <div className={`bg-gradient-to-br ${theme.accent} p-4`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-lg font-semibold text-white">{event.name}</h4>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-300">{getTeamLabel(event)}</p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${theme.badge}`}>{heat.label}</span>
                    </div>

                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-200">{event.description}</p>

                    <div className="mt-4 rounded-[1.1rem] border border-white/10 bg-black/18 p-3">
                      <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.16em] text-slate-400">
                        <span>{event.date_label}</span>
                        <span>{event.time_label}</span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                        <div className={`h-full rounded-full bg-gradient-to-r ${theme.progress}`} style={{ width: `${heat.fillPercent}%` }} />
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3 text-sm text-slate-300">
                        <span>{event.venue}</span>
                        <span>{slotsLeft !== null ? `${slotsLeft} left` : 'Open'}</span>
                      </div>
                    </div>

                    <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-white">
                      Open Event Page
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </button>
              );
            })}
      </div>
    </section>
  );
};

export default CompetitionGridSection;
