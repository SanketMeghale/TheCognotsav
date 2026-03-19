import React from 'react';
import { BellRing, CalendarDays, CircleCheckBig, Sparkles } from 'lucide-react';
import { shellClassName } from './utils';

const timelineItems = [
  {
    title: 'Registration Window',
    time: 'Now',
    detail: 'Explore competitions, open handbook links, and submit your registration from the event page.',
  },
  {
    title: 'Verification Updates',
    time: 'Before Event Day',
    detail: 'Admins review screenshots and publish latest reporting instructions through the update desk.',
  },
  {
    title: 'Day 1 Event Flow',
    time: '07 Apr 2026',
    detail: 'Gaming, quiz, hunt, and technical rounds begin with coordinated check-in and live notices.',
  },
  {
    title: 'Day 2 Event Flow',
    time: '08 Apr 2026',
    detail: 'Expo, stage events, and final fun rounds continue with handbook-backed participant guidance.',
  },
];

export const TimelineSection: React.FC<{ standalone?: boolean }> = ({ standalone = false }) => {
  return (
    <section id={standalone ? undefined : 'timeline'} className={standalone ? '' : `${shellClassName} py-4 md:py-8`}>
      <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(9,13,24,0.78))] p-4 sm:p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/80">Timeline</p>
            <h3 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">Know the event journey before you arrive.</h3>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-slate-200">
            <CalendarDays size={16} className="text-yellow-200" />
            07-08 April 2026
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[1.7rem] border border-fuchsia-300/12 bg-[linear-gradient(145deg,rgba(217,70,239,0.08),rgba(59,130,246,0.08),rgba(251,191,36,0.08))] p-5">
            <div className="flex items-center gap-2 text-white">
              <BellRing size={18} className="text-fuchsia-200" />
              <p className="text-sm font-semibold">Live alert lane</p>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-[1.2rem] border border-white/10 bg-black/15 p-4 text-sm text-slate-300">Reporting-time changes appear in the update desk first.</div>
              <div className="rounded-[1.2rem] border border-white/10 bg-black/15 p-4 text-sm text-slate-300">Keep transaction ID and screenshot ready for verification.</div>
              <div className="rounded-[1.2rem] border border-white/10 bg-black/15 p-4 text-sm text-slate-300">Use the tracker if your payment is still pending.</div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {timelineItems.map((item, index) => (
              <article key={item.title} className={`rounded-[1.6rem] border border-white/10 p-5 ${index === 0 ? 'bg-white text-slate-950' : 'bg-[linear-gradient(145deg,rgba(12,20,35,0.94),rgba(18,27,45,0.86))]'}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${index === 0 ? 'bg-slate-950 text-white' : 'bg-white/[0.06] text-slate-300'}`}>
                    {item.time}
                  </span>
                  {index === 0 ? <Sparkles size={18} /> : <CircleCheckBig size={18} className="text-cyan-200" />}
                </div>
                <h4 className={`mt-4 text-lg font-semibold ${index === 0 ? 'text-slate-950' : 'text-white'}`}>{item.title}</h4>
                <p className={`mt-3 text-sm leading-7 ${index === 0 ? 'text-slate-700' : 'text-slate-300'}`}>{item.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TimelineSection;
