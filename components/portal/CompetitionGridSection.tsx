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

const categoryThemes: Record<string, { button: string; glow: string; badge: string }> = {
  Technical: {
    button: 'from-sky-400 to-cyan-300 text-slate-950',
    glow: 'shadow-[0_18px_45px_rgba(56,189,248,0.18)]',
    badge: 'bg-sky-400/14 text-sky-100',
  },
  Gaming: {
    button: 'from-fuchsia-400 to-pink-300 text-slate-950',
    glow: 'shadow-[0_18px_45px_rgba(217,70,239,0.18)]',
    badge: 'bg-fuchsia-400/14 text-fuchsia-100',
  },
  Fun: {
    button: 'from-amber-300 to-orange-300 text-slate-950',
    glow: 'shadow-[0_18px_45px_rgba(251,191,36,0.18)]',
    badge: 'bg-amber-400/14 text-amber-100',
  },
};

export const CompetitionGridSection: React.FC<Props> = ({ events, loadingEvents, selectedEventSlug, onSelectEvent }) => {
  return (
    <section id="registration-panel" className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(9,13,24,0.72))] p-4 sm:p-5 md:p-6">
      <div className="text-center">
        <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/80">Competitions</p>
        <h3 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">Select an event and continue on its page.</h3>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-300">
          Open any card to read the handbook, view event details, and complete registration on its dedicated page.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loadingEvents
          ? Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="rounded-[1.8rem] border border-white/10 bg-white/[0.04] p-4">
                <div className="h-56 animate-pulse rounded-[1.4rem] bg-white/10" />
                <div className="mt-4 h-4 w-20 animate-pulse rounded-full bg-white/10" />
                <div className="mt-3 h-6 w-2/3 animate-pulse rounded-full bg-white/10" />
              </div>
            ))
          : events.map((event) => {
              const active = event.slug === selectedEventSlug;
              const slotsLeft = event.max_slots !== null ? Math.max(event.max_slots - event.registrations_count, 0) : null;
              const heat = getEventHeatLevel(event);
              const theme = categoryThemes[event.category] || categoryThemes.Technical;

              return (
                <button
                  key={event.slug}
                  type="button"
                  onClick={() => onSelectEvent(event.slug)}
                  className={`group tilt-card overflow-hidden rounded-[1.9rem] border bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(9,13,24,0.9))] text-left transition duration-200 ${
                    active ? 'border-cyan-300/36' : 'border-white/10 hover:border-white/18'
                  } ${theme.glow}`}
                >
                  <div className="relative h-56 overflow-hidden">
                    <img src={event.poster_path} alt={event.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]" />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,10,21,0.06),rgba(7,10,21,0.86))]" />
                    <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                      <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${theme.badge}`}>{event.category}</span>
                      <span className="rounded-full bg-black/35 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/86">{formatCurrency(event.registration_fee)}</span>
                    </div>
                    <div className="absolute inset-x-4 bottom-4">
                      <div className="rounded-[1.15rem] border border-white/12 bg-black/35 px-4 py-3 backdrop-blur-md">
                        <p className="portal-card-title text-white">{event.name}</p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-300">{event.date_label} / {event.time_label}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{getTeamLabel(event)}</p>
                        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/8">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-400 to-fuchsia-400"
                            style={{ width: `${Math.max(heat.fillPercent, 12)}%` }}
                          />
                        </div>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                        {heat.label}
                      </span>
                    </div>

                    <p className="mt-4 line-clamp-2 text-sm leading-7 text-slate-300">{event.description}</p>

                    <div className="mt-5 flex items-center justify-between gap-3 text-sm text-slate-400">
                      <span>{event.date_label}</span>
                      <span>{slotsLeft !== null ? `${slotsLeft} left` : 'Open'}</span>
                    </div>

                    <div className={`mt-5 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r px-4 py-3 text-sm font-semibold ${theme.button}`}>
                      View Details
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
