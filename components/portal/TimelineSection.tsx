import React from 'react';
import { BellRing, CalendarDays, CircleCheckBig, Sparkles } from 'lucide-react';
import { shellClassName } from './utils';

const timelineItems = [
  {
    title: 'Registration Opens',
    time: 'Now',
    detail: 'Browse the competition cards, check the short brief, and submit payment proof from the event page.',
    accent: 'from-cyan-400 via-sky-400 to-blue-500',
  },
  {
    title: 'Verification Wave',
    time: 'Before Event Day',
    detail: 'Registrations move into pending review first, then organizers publish updates and verification results.',
    accent: 'from-fuchsia-400 via-purple-400 to-indigo-500',
  },
  {
    title: 'Day 1 Launch',
    time: '07 Apr 2026',
    detail: 'Gaming, quiz, hunt, and technical rounds begin with reporting checkpoints and live notices.',
    accent: 'from-amber-300 via-orange-400 to-rose-500',
  },
  {
    title: 'Day 2 Showcase',
    time: '08 Apr 2026',
    detail: 'Expo, stage events, finals, and closing highlights continue with on-ground guidance and tracker support.',
    accent: 'from-lime-300 via-emerald-400 to-cyan-500',
  },
];

export const TimelineSection: React.FC<{ standalone?: boolean }> = ({ standalone = false }) => {
  return (
    <section id={standalone ? undefined : 'timeline'} className={standalone ? '' : `${shellClassName} py-4 md:py-8`}>
      <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(9,13,24,0.78))] p-4 sm:p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/80">Roadmap</p>
            <h3 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">Follow the fest roadmap.</h3>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-slate-200">
            <CalendarDays size={16} className="text-yellow-200" />
            07-08 April 2026
          </div>
        </div>

        <div className="mt-6 space-y-6">
          <div className="roadmap-pulse-line" />

          <div className="roadmap-vertical">
            <div className="roadmap-vertical__line" />
            {timelineItems.map((item, index) => (
              <div key={item.title} className={`roadmap-vertical__row ${index % 2 === 0 ? 'is-left' : 'is-right'}`}>
                <div className="roadmap-vertical__side">
                  <article className="roadmap-card">
                    <div className={`roadmap-card__glow bg-gradient-to-r ${item.accent}`} />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between gap-3">
                        <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-200">
                          {item.time}
                        </span>
                        {index === 0 ? <Sparkles size={18} className="text-cyan-200" /> : <CircleCheckBig size={18} className="text-white/80" />}
                      </div>
                      <div className={`mt-4 h-1.5 w-20 rounded-full bg-gradient-to-r ${item.accent}`} />
                      <h4 className="mt-4 text-lg font-semibold text-white">{item.title}</h4>
                      <p className="mt-3 text-sm leading-7 text-slate-300">{item.detail}</p>
                    </div>
                  </article>
                </div>
                <div className="roadmap-vertical__node">
                  <span className={`roadmap-vertical__dot bg-gradient-to-r ${item.accent}`} />
                </div>
                <div className="roadmap-vertical__side roadmap-vertical__side--ghost" />
              </div>
            ))}
          </div>

          <div className="rounded-[1.7rem] border border-fuchsia-300/12 bg-[linear-gradient(145deg,rgba(217,70,239,0.08),rgba(59,130,246,0.08),rgba(251,191,36,0.08))] p-5">
            <div className="flex items-center gap-2 text-white">
              <BellRing size={18} className="text-fuchsia-200" />
              <p className="text-sm font-semibold">Live checkpoints</p>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-[1.2rem] border border-white/10 bg-black/15 p-4 text-sm text-slate-300">Updates above this section carry reporting-time changes first.</div>
              <div className="rounded-[1.2rem] border border-white/10 bg-black/15 p-4 text-sm text-slate-300">Pending registrations receive mail confirmation before admin verification.</div>
              <div className="rounded-[1.2rem] border border-white/10 bg-black/15 p-4 text-sm text-slate-300">Use tracker and handbook buttons to re-check instructions any time.</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TimelineSection;
