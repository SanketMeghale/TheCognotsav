import React from 'react';
import { BellRing, CalendarDays, CircleCheckBig, Sparkles } from 'lucide-react';
import { shellClassName } from './utils';

const timelineItems = [
  {
    phase: 'Phase 01',
    title: 'Registration Opens',
    time: 'Live Now',
    detail: 'Browse competitions, lock your preferred event, and submit the registration form with payment proof.',
    checkpoints: ['Choose the correct event and team size', 'Upload payment screenshot clearly', 'Save your registration code for tracking'],
    accent: 'from-cyan-400 via-sky-400 to-blue-500',
  },
  {
    phase: 'Phase 02',
    title: 'Screening And Verification',
    time: 'Rolling Review',
    detail: 'Every submission enters organizer review for payment verification, team validation, and slot confirmation.',
    checkpoints: ['Incomplete entries may stay pending', 'Approved teams receive confirmation updates', 'Waitlisted teams move up as slots open'],
    accent: 'from-fuchsia-400 via-purple-400 to-indigo-500',
  },
  {
    phase: 'Phase 03',
    title: 'Pre-Event Briefing',
    time: '06 Apr 2026',
    detail: 'Final instructions, venue reminders, and reporting windows are pushed through the updates and tracker sections.',
    checkpoints: ['Recheck venue and reporting time', 'Carry ID card and registration code', 'Review event-specific rules before arrival'],
    accent: 'from-violet-400 via-fuchsia-400 to-pink-500',
  },
  {
    phase: 'Phase 04',
    title: 'Day 1 Reporting Desk Opens',
    time: '07 Apr 2026 • Morning',
    detail: 'Participants report at assigned desks for attendance, team confirmation, and final event routing.',
    checkpoints: ['Entry verification at reporting counter', 'Late reporting may affect participation', 'Teams are directed to event zones after check-in'],
    accent: 'from-amber-300 via-orange-400 to-rose-500',
  },
  {
    phase: 'Phase 05',
    title: 'Day 1 Competition Blocks',
    time: '07 Apr 2026 • Full Day',
    detail: 'Gaming qualifiers, quiz rounds, technical screening, and hunt activities run in parallel across the campus schedule.',
    checkpoints: ['Technical eliminations and shortlisting', 'Gaming rooms and match rotations', 'Round-wise announcements published live'],
    accent: 'from-yellow-300 via-amber-400 to-orange-500',
  },
  {
    phase: 'Phase 06',
    title: 'Day 1 Finalists Update',
    time: '07 Apr 2026 • Evening',
    detail: 'Shortlisted teams and finalists are announced after evaluation so participants can prepare for showcase and final rounds.',
    checkpoints: ['Finalists list published in updates', 'Next-day reporting slots confirmed', 'Teams receive final-round guidance'],
    accent: 'from-emerald-300 via-teal-400 to-cyan-500',
  },
  {
    phase: 'Phase 07',
    title: 'Day 2 Expo And Showcase',
    time: '08 Apr 2026 • Morning',
    detail: 'Project Expo, poster showcases, and presentation-based events move into judged display and demo sessions.',
    checkpoints: ['Judging panels begin review', 'Teams present demos and explain solutions', 'Scoring and evaluation are consolidated live'],
    accent: 'from-lime-300 via-emerald-400 to-cyan-500',
  },
  {
    phase: 'Phase 08',
    title: 'Day 2 Finals And Closing',
    time: '08 Apr 2026 • Afternoon To Evening',
    detail: 'Final rounds, stage highlights, results, prize announcements, and closing moments complete the fest roadmap.',
    checkpoints: ['Final matchups and decisive rounds', 'Winner announcements and recognition', 'Prize distribution and event close-out'],
    accent: 'from-cyan-300 via-sky-400 to-blue-500',
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
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-200">
                            {item.phase}
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-200">
                            {item.time}
                          </span>
                        </div>
                        {index === 0 ? <Sparkles size={18} className="text-cyan-200" /> : <CircleCheckBig size={18} className="text-white/80" />}
                      </div>
                      <div className={`mt-4 h-1.5 w-20 rounded-full bg-gradient-to-r ${item.accent}`} />
                      <h4 className="mt-4 text-lg font-semibold text-white">{item.title}</h4>
                      <p className="mt-3 text-sm leading-7 text-slate-300">{item.detail}</p>
                      <div className="mt-4 grid gap-2">
                        {item.checkpoints.map((checkpoint) => (
                          <div
                            key={checkpoint}
                            className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2 text-xs font-medium tracking-[0.04em] text-slate-200"
                          >
                            {checkpoint}
                          </div>
                        ))}
                      </div>
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
              <div className="rounded-[1.2rem] border border-white/10 bg-black/15 p-4 text-sm text-slate-300">Watch the updates section for reporting-time and venue changes.</div>
              <div className="rounded-[1.2rem] border border-white/10 bg-black/15 p-4 text-sm text-slate-300">Every registration starts in pending review before verification.</div>
              <div className="rounded-[1.2rem] border border-white/10 bg-black/15 p-4 text-sm text-slate-300">Use the tracker and handbook buttons to re-check instructions anytime.</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TimelineSection;
