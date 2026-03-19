import React from 'react';
import { CalendarDays, Flag, Sparkles } from 'lucide-react';
import { shellClassName } from './utils';

const timelineItems = [
  {
    title: 'Registration Window Open',
    time: 'Now',
    detail: 'Participants can browse events, compare categories, submit entries, and track status instantly.',
    tone: 'cyan',
  },
  {
    title: 'Final Registration Push',
    time: '1 Week Before Event',
    detail: 'Last call for teams, live slot counters tighten, and organizers verify pending registrations.',
    tone: 'fuchsia',
  },
  {
    title: 'Cognotsav Day 1',
    time: '07 Apr 2026',
    detail: 'Technical quiz, coding, treasure hunt, and esports brackets begin across the CE Department.',
    tone: 'amber',
  },
  {
    title: 'Cognotsav Day 2',
    time: '08 Apr 2026',
    detail: 'Project expo, fun events, performances, and in-person participant coordination continue.',
    tone: 'pink',
  },
  {
    title: 'Verification and Closure',
    time: 'Post Event',
    detail: 'Participant records, exports, and final organizer reporting remain accessible from the portal.',
    tone: 'violet',
  },
];

const timelineLabels = ['Registration', 'Verification', 'Event Days', 'Reporting'];

const toneMap = {
  cyan: {
    card: 'border-blue-400/15 bg-gradient-to-br from-blue-500/14 via-cyan-400/10 to-transparent',
    badge: 'border-blue-400/18 bg-blue-500/12 text-blue-100',
    dot: 'bg-blue-300 shadow-[0_0_24px_rgba(59,130,246,0.35)]',
  },
  fuchsia: {
    card: 'border-purple-400/15 bg-gradient-to-br from-purple-500/14 via-pink-500/10 to-transparent',
    badge: 'border-purple-400/18 bg-purple-500/12 text-purple-100',
    dot: 'bg-purple-300 shadow-[0_0_24px_rgba(168,85,247,0.35)]',
  },
  amber: {
    card: 'border-yellow-400/15 bg-gradient-to-br from-yellow-500/16 via-orange-400/10 to-transparent',
    badge: 'border-yellow-400/18 bg-yellow-500/12 text-yellow-100',
    dot: 'bg-yellow-300 shadow-[0_0_24px_rgba(251,191,36,0.32)]',
  },
  pink: {
    card: 'border-pink-400/15 bg-gradient-to-br from-pink-500/14 via-rose-400/10 to-transparent',
    badge: 'border-pink-400/18 bg-pink-500/12 text-pink-100',
    dot: 'bg-pink-300 shadow-[0_0_24px_rgba(236,72,153,0.32)]',
  },
  violet: {
    card: 'border-purple-400/15 bg-gradient-to-br from-purple-500/14 via-violet-400/10 to-transparent',
    badge: 'border-purple-400/18 bg-purple-500/12 text-purple-100',
    dot: 'bg-purple-300 shadow-[0_0_24px_rgba(168,85,247,0.32)]',
  },
};

export const TimelineSection: React.FC<{ standalone?: boolean }> = ({ standalone = false }) => {
  return (
    <section id={standalone ? undefined : 'timeline'} className={standalone ? '' : `${shellClassName} py-4 md:py-8`}>
      <div data-reveal="up" className="portal-glass rounded-[2.2rem] p-6 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-blue-300/80">Event Timeline</p>
            <h3 className="mt-2 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text font-orbitron text-3xl font-black uppercase text-transparent">
              How the fest journey unfolds
            </h3>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-slate-100 backdrop-blur-md">
            <CalendarDays size={16} />
            07-08 April 2026
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {timelineLabels.map((label, index) => {
            const chipClass = [
              'border-blue-400/16 bg-blue-500/10 text-blue-100',
              'border-purple-400/16 bg-purple-500/10 text-purple-100',
              'border-yellow-400/16 bg-yellow-500/10 text-yellow-100',
              'border-pink-400/16 bg-pink-500/10 text-pink-100',
            ][index];

            return (
              <span
                key={label}
                className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.22em] backdrop-blur-md ${chipClass}`}
              >
                {label}
              </span>
            );
          })}
        </div>

        <div className="relative mt-8">
          <div className="absolute bottom-0 left-5 top-0 w-px bg-gradient-to-b from-blue-400/50 via-purple-400/36 via-yellow-400/28 to-pink-400/44 md:left-1/2 md:-translate-x-1/2" />
          <div className="space-y-6">
            {timelineItems.map((item, index) => {
              const alignRight = index % 2 === 1;
              const tone = toneMap[item.tone as keyof typeof toneMap];

              return (
                <div
                  key={item.title}
                  data-reveal={alignRight ? 'right' : 'left'}
                  className={`relative grid gap-4 md:grid-cols-2 ${alignRight ? 'md:[&>*:first-child]:order-2' : ''}`}
                >
                  <div className={`hidden md:block ${alignRight ? '' : 'md:pr-10 md:text-right'}`}>
                    {!alignRight ? <TimelineCard item={item} /> : <div />}
                  </div>

                  <div className={`hidden md:block ${alignRight ? 'md:pl-10' : ''}`}>
                    {alignRight ? <TimelineCard item={item} /> : <div />}
                  </div>

                  <div className="md:hidden">
                    <TimelineCard item={item} />
                  </div>

                  <div
                    className={`absolute left-5 top-6 h-4 w-4 -translate-x-1/2 rounded-full border-4 border-[#091321] md:left-1/2 ${tone.dot}`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div data-reveal="up" className="tilt-card rounded-2xl border border-blue-400/12 bg-gradient-to-br from-blue-500/12 to-transparent p-4 backdrop-blur-md">
            <Sparkles size={18} className="text-blue-100" />
            <p className="mt-3 text-sm font-semibold text-white">Before the fest</p>
            <p className="mt-1 text-sm text-slate-300">
              Browse events, monitor live slots, and save unfinished registration drafts.
            </p>
          </div>
          <div data-reveal="up" className="tilt-card rounded-2xl border border-purple-400/12 bg-gradient-to-br from-purple-500/12 to-transparent p-4 backdrop-blur-md">
            <Flag size={18} className="text-purple-100" />
            <p className="mt-3 text-sm font-semibold text-white">During the fest</p>
            <p className="mt-1 text-sm text-slate-300">
              Show your confirmation pass and registration code for quick organizer checks.
            </p>
          </div>
          <div data-reveal="up" className="tilt-card rounded-2xl border border-yellow-400/12 bg-gradient-to-br from-yellow-500/12 to-transparent p-4 backdrop-blur-md">
            <CalendarDays size={18} className="text-yellow-100" />
            <p className="mt-3 text-sm font-semibold text-white">After the fest</p>
            <p className="mt-1 text-sm text-slate-300">
              Keep the tracker and export tools available for verification and reporting.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

const TimelineCard: React.FC<{ item: typeof timelineItems[number] }> = ({ item }) => {
  const tone = toneMap[item.tone as keyof typeof toneMap];

  return (
    <div className={`tilt-card rounded-[1.6rem] border p-5 shadow-[0_18px_50px_rgba(2,8,23,0.18)] backdrop-blur-md ${tone.card}`}>
      <div className={`inline-flex rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.3em] ${tone.badge}`}>
        {item.time}
      </div>
      <h4 className="mt-4 text-xl font-bold text-white">{item.title}</h4>
      <p className="mt-3 text-sm leading-7 text-slate-200">{item.detail}</p>
    </div>
  );
};
