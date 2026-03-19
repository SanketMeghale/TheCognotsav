import React from 'react';
import { Activity, BellRing, CalendarDays, CircleAlert, Flag, Sparkles } from 'lucide-react';
import { shellClassName } from './utils';

const timelineItems = [
  {
    title: 'Registrations Live',
    time: 'Now',
    detail: 'Participants browse competitions, open event handbooks, complete payment, and submit registrations.',
    status: 'live',
  },
  {
    title: 'Verification Window',
    time: 'Before Event Day',
    detail: 'Admins verify screenshots, move teams from pending to verified, and publish organizer instructions.',
    status: 'watch',
  },
  {
    title: 'Day 1 Launch',
    time: '07 Apr 2026',
    detail: 'Gaming, quiz, hunt, and technical events begin with reporting, room setup, and check-in coordination.',
    status: 'upcoming',
  },
  {
    title: 'Day 2 Flow',
    time: '08 Apr 2026',
    detail: 'Project expo, stage events, and fun competitions continue with live participant support and updates.',
    status: 'upcoming',
  },
];

const liveAlerts = [
  'Check the update desk before leaving for campus.',
  'Keep payment reference and screenshot ready.',
  'Use the tracker if your status is still pending.',
];

const toneMap = {
  live: 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100',
  watch: 'border-amber-300/20 bg-amber-400/10 text-amber-100',
  upcoming: 'border-cyan-300/20 bg-cyan-400/10 text-cyan-100',
};

export const TimelineSection: React.FC<{ standalone?: boolean }> = ({ standalone = false }) => {
  return (
    <section id={standalone ? undefined : 'timeline'} className={standalone ? '' : `${shellClassName} py-4 md:py-8`}>
      <div data-reveal="up" className="portal-glow-card portal-glass overflow-hidden rounded-[2rem] p-4 sm:p-5 md:p-6">
        <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[1.7rem] border border-white/10 bg-[linear-gradient(145deg,rgba(12,20,35,0.92),rgba(18,27,45,0.82))] p-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/18 bg-cyan-400/10 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-cyan-100 sm:text-[11px]">
              <Activity size={14} />
              Timeline and Alerts
            </div>
            <h3 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">A modern timeline with live organizer cues.</h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Use this page to understand the registration cycle, verification stage, and event-day flow before reporting to campus.
            </p>

            <div className="mt-5 rounded-[1.5rem] border border-fuchsia-300/14 bg-fuchsia-400/8 p-4">
              <div className="flex items-center gap-2">
                <BellRing size={16} className="text-fuchsia-200" />
                <p className="text-sm font-semibold text-white">Live alerts</p>
              </div>
              <div className="mt-3 space-y-2">
                {liveAlerts.map((alert) => (
                  <div key={alert} className="rounded-[1rem] border border-white/8 bg-black/15 px-3 py-3 text-sm text-slate-300">
                    {alert}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {timelineItems.map((item, index) => (
              <article key={item.title} data-reveal="up" className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-[linear-gradient(145deg,rgba(12,20,35,0.94),rgba(18,27,45,0.86))] p-4 sm:p-5">
                <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-cyan-400 via-fuchsia-400 to-amber-300" />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className={`inline-flex rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${toneMap[item.status as keyof typeof toneMap]}`}>
                      {item.time}
                    </div>
                    <h4 className="mt-3 text-lg font-semibold text-white">{item.title}</h4>
                    <p className="mt-2 text-sm leading-7 text-slate-300">{item.detail}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-slate-200">
                    {index === 0 ? <Sparkles size={18} /> : index === 1 ? <CircleAlert size={18} /> : index === 2 ? <Flag size={18} /> : <CalendarDays size={18} />}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TimelineSection;
