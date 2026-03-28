import React, { useMemo } from 'react';
import { ArrowUp, BellRing, CalendarDays, Clock3, MapPin, Sparkles, Users } from 'lucide-react';
import { getEventLiveState, getTeamLabel, parsePortalEventDate, shellClassName } from './utils';
import type { EventRecord } from './types';

type TimelineSectionProps = {
  standalone?: boolean;
  events: EventRecord[];
};

const accentByCategory: Record<string, string> = {
  Technical: 'from-cyan-400 via-sky-400 to-blue-500',
  Gaming: 'from-fuchsia-400 via-violet-400 to-indigo-500',
  Fun: 'from-amber-300 via-orange-400 to-rose-500',
  Sports: 'from-emerald-300 via-teal-400 to-cyan-500',
};

function getCurrentEventSlug(events: EventRecord[], now: Date) {
  const orderedEvents = events
    .map((event) => ({
      event,
      eventDate: parsePortalEventDate(event.date_label, event.time_label),
    }))
    .filter((entry): entry is { event: EventRecord; eventDate: Date } => Boolean(entry.eventDate))
    .sort((left, right) => left.eventDate.getTime() - right.eventDate.getTime());

  const liveEntry = orderedEvents.find(({ eventDate }) => {
    const endAt = eventDate.getTime() + 4 * 60 * 60 * 1000;
    return now.getTime() >= eventDate.getTime() && now.getTime() < endAt;
  });

  if (liveEntry) {
    return liveEntry.event.slug;
  }

  const upcomingEntry = orderedEvents.find(({ eventDate }) => eventDate.getTime() >= now.getTime());
  if (upcomingEntry) {
    return upcomingEntry.event.slug;
  }

  return orderedEvents.at(-1)?.event.slug ?? null;
}

export const TimelineSection: React.FC<TimelineSectionProps> = ({ standalone = false, events }) => {
  const now = new Date();

  const groupedEvents = useMemo(() => {
    const sorted = [...events].sort((left, right) => {
      const leftTime = parsePortalEventDate(left.date_label, left.time_label)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const rightTime = parsePortalEventDate(right.date_label, right.time_label)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return leftTime - rightTime;
    });

    return sorted.reduce<Array<{ dateLabel: string; events: EventRecord[] }>>((groups, event) => {
      const existing = groups.find((group) => group.dateLabel === event.date_label);
      if (existing) {
        existing.events.push(event);
        return groups;
      }

      groups.push({ dateLabel: event.date_label, events: [event] });
      return groups;
    }, []);
  }, [events]);

  const currentEventSlug = useMemo(() => getCurrentEventSlug(events, now), [events, now]);

  if (events.length === 0) {
    return (
      <section id={standalone ? undefined : 'timeline'} className={standalone ? '' : `${shellClassName} py-4 md:py-8`}>
        <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(9,13,24,0.78))] p-6 text-center">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Timeline unavailable</p>
          <p className="mt-3 text-base text-slate-300">The event schedule is still loading. Refresh in a moment to see the full timeline.</p>
        </div>
      </section>
    );
  }

  return (
    <section id={standalone ? undefined : 'timeline'} className={standalone ? '' : `${shellClassName} py-4 md:py-8`}>
      <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(9,13,24,0.78))] p-4 sm:p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/80">Event Timeline</p>
            <h3 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">Follow the fest event by event.</h3>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-slate-200">
            <CalendarDays size={16} className="text-yellow-200" />
            07-08 April 2026
          </div>
        </div>

        <div className="mt-6 space-y-8">
          <div className="roadmap-pulse-line" />

          {groupedEvents.map((group, groupIndex) => (
            <div key={group.dateLabel} className="relative">
              <div className="mb-4 rounded-[1.45rem] border border-white/10 bg-[linear-gradient(145deg,rgba(10,18,32,0.96),rgba(9,13,24,0.88))] p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                      <CalendarDays size={16} className="text-cyan-200" />
                      Day {groupIndex + 1}
                    </div>
                    <p className="mt-2 text-lg font-semibold text-white">{group.dateLabel}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 font-semibold uppercase tracking-[0.18em] text-slate-200">
                      {group.events.length} events
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 font-semibold uppercase tracking-[0.18em] text-slate-200">
                      Reporting from {group.events[0]?.time_label}
                    </span>
                  </div>
                </div>
              </div>

              <div className="relative space-y-4 pl-6 sm:pl-8">
                <div className="absolute bottom-4 left-2 top-2 w-px bg-[linear-gradient(180deg,rgba(103,232,249,0.28),rgba(251,191,36,0.22),rgba(255,255,255,0.08))]" />

                {group.events.map((event, eventIndex) => {
                  const accent = accentByCategory[event.category] || accentByCategory.Technical;
                  const liveState = getEventLiveState(event, now);
                  const isCurrent = currentEventSlug === event.slug;
                  const itemNumber = `${groupIndex + 1}.${eventIndex + 1}`;

                  return (
                    <div key={event.slug} className="relative">
                      <span
                        className={`absolute left-[-1.15rem] top-7 h-4 w-4 rounded-full border ${
                          isCurrent
                            ? 'border-yellow-200/90 bg-yellow-300 shadow-[0_0_0_6px_rgba(251,191,36,0.16),0_0_28px_rgba(250,204,21,0.55)]'
                            : 'border-cyan-200/40 bg-slate-950 shadow-[0_0_0_4px_rgba(34,211,238,0.08)]'
                        }`}
                      />

                      <article
                        className={`portal-glow-card relative overflow-hidden rounded-[1.7rem] border p-5 transition md:p-6 ${
                          isCurrent
                            ? 'border-yellow-300/30 bg-[linear-gradient(145deg,rgba(48,34,5,0.28),rgba(11,18,30,0.96))] shadow-[0_18px_50px_rgba(251,191,36,0.16)]'
                            : 'border-white/10 bg-[linear-gradient(145deg,rgba(13,20,36,0.92),rgba(7,11,22,0.96))]'
                        }`}
                      >
                        <div className={`pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${accent}`} />

                        <div className="relative z-10">
                          <div className="md:hidden">
                            <h4 className="text-base font-semibold text-white">{event.name}</h4>
                          </div>

                          <div className="hidden flex-col gap-3 md:flex md:flex-row md:items-start md:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-200">
                                  Event {itemNumber}
                                </span>
                                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-200">
                                  {event.category}
                                </span>
                                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-200">
                                  {liveState.label}
                                </span>
                                {isCurrent ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-yellow-200/30 bg-yellow-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-yellow-100">
                                    <ArrowUp size={12} />
                                    Current Step
                                  </span>
                                ) : null}
                              </div>

                              <h4 className="mt-4 text-xl font-semibold text-white md:text-2xl">{event.name}</h4>
                              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">{event.description}</p>
                            </div>

                            <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${
                              isCurrent
                                ? 'border-yellow-200/25 bg-yellow-400/10 text-yellow-50'
                                : 'border-white/10 bg-white/[0.05] text-slate-200'
                            }`}>
                              {isCurrent ? <Sparkles size={16} className="text-yellow-200" /> : <Clock3 size={16} className="text-cyan-200" />}
                              {liveState.countdown}
                            </div>
                          </div>

                          <div className="mt-5 hidden gap-3 md:grid md:grid-cols-3">
                            <div className="rounded-[1.2rem] border border-white/10 bg-black/15 p-4">
                              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Time</p>
                              <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-white">
                                <Clock3 size={16} className="text-cyan-200" />
                                <span>{event.time_label}</span>
                              </div>
                            </div>
                            <div className="rounded-[1.2rem] border border-white/10 bg-black/15 p-4">
                              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Venue</p>
                              <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-white">
                                <MapPin size={16} className="text-fuchsia-200" />
                                <span>{event.venue}</span>
                              </div>
                            </div>
                            <div className="rounded-[1.2rem] border border-white/10 bg-black/15 p-4">
                              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Team / Fee</p>
                              <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-white">
                                <Users size={16} className="text-amber-200" />
                                <span>{getTeamLabel(event)} / {event.registration_fee_label}</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 hidden gap-2 md:grid md:grid-cols-3">
                            <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2 text-xs font-medium tracking-[0.04em] text-slate-200">
                              Date: {event.date_label}
                            </div>
                            <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2 text-xs font-medium tracking-[0.04em] text-slate-200">
                              Prize: {event.prize}
                            </div>
                            <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2 text-xs font-medium tracking-[0.04em] text-slate-200">
                              Coordinators: {event.coordinators.map((coordinator) => coordinator.name).join(', ')}
                            </div>
                          </div>

                          <div className="mt-4 hidden rounded-[1.1rem] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300 md:block">
                            Event link: <a href={`#events/${event.slug}`} className="font-semibold text-cyan-100 transition hover:text-white">{event.name}</a>
                          </div>
                        </div>
                      </article>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="rounded-[1.7rem] border border-fuchsia-300/12 bg-[linear-gradient(145deg,rgba(217,70,239,0.08),rgba(59,130,246,0.08),rgba(251,191,36,0.08))] p-5">
            <div className="flex items-center gap-2 text-white">
              <BellRing size={18} className="text-fuchsia-200" />
              <p className="text-sm font-semibold">Timeline notes</p>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-[1.2rem] border border-white/10 bg-black/15 p-4 text-sm text-slate-300">Watch the updates section for any reporting-time or venue changes before reaching campus.</div>
              <div className="rounded-[1.2rem] border border-white/10 bg-black/15 p-4 text-sm text-slate-300">The glowing card marks the event currently active now, or the next event if the current slot has not started yet.</div>
              <div className="rounded-[1.2rem] border border-white/10 bg-black/15 p-4 text-sm text-slate-300">Use the tracker and event details pages to cross-check coordinator contacts, fee, and final participation status.</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TimelineSection;
