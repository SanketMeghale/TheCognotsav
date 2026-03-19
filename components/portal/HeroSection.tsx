import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { shellClassName } from './utils';

type Props = {
  totalEvents: number;
  totalRegistrations: number;
  totalRemainingSlots: number;
};

const eventDate = new Date('2026-04-07T09:00:00');

export const HeroSection: React.FC<Props> = ({ totalEvents, totalRegistrations, totalRemainingSlots }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });

  useEffect(() => {
    const update = () => {
      const diff = Math.max(eventDate.getTime() - Date.now(), 0);
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
      });
    };

    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const quickStats = useMemo(
    () => [
      { label: 'Events', value: totalEvents },
      { label: 'Registrations', value: totalRegistrations },
      { label: 'Slots Left', value: totalRemainingSlots },
    ],
    [totalEvents, totalRegistrations, totalRemainingSlots],
  );

  return (
    <section id="overview" className={`${shellClassName} pt-3 pb-2 md:pt-5 md:pb-4`}>
      <div className="portal-front-hero">
        <div className="portal-front-hero__content">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-100">
            CEAS COGNOTSAV 2026
          </div>

          <h2 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl">
            Discover events.
            <br />
            Register faster.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
            Browse the official competitions, open the event handbook, and move into a dedicated registration page built for mobile-first submissions.
          </p>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <a href="#registration-panel" className="animated-gradient-button inline-flex items-center justify-center rounded-2xl px-6 py-3 text-sm font-bold text-slate-950">
              Explore Events
              <ArrowRight size={16} />
            </a>
            <a href="#tracker" className="magnetic-button inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/[0.05] px-6 py-3 text-sm font-semibold text-white">
              Track Registration
            </a>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {quickStats.map((stat) => (
              <div key={stat.label} className="rounded-[1.4rem] border border-white/10 bg-white/[0.05] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{stat.label}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="portal-front-hero__panel">
          <div className="portal-front-hero__countdown">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/80">Event Countdown</p>
                <p className="mt-2 text-xl font-semibold text-white">07-08 April 2026</p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-slate-200">
                <CalendarDays size={14} className="mr-2 inline text-yellow-200" />
                Ahilyanagar
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-[1.25rem] bg-white px-4 py-4 text-center text-slate-950">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Days</p>
                <p className="mt-2 text-3xl font-semibold">{timeLeft.days}</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.05] px-4 py-4 text-center">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Hours</p>
                <p className="mt-2 text-2xl font-semibold text-white">{timeLeft.hours}</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.05] px-4 py-4 text-center">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Minutes</p>
                <p className="mt-2 text-2xl font-semibold text-white">{timeLeft.minutes}</p>
              </div>
            </div>
          </div>

          <div className="portal-front-hero__poster">
            <img src="/images/ceasposter.jpeg" alt="CEAS COGNOTSAV 2026 poster" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,12,22,0.04),rgba(8,12,22,0.78))]" />
            <div className="absolute inset-x-0 bottom-0 p-5">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-200/70">Official Festival Poster</p>
              <p className="mt-2 text-xl font-semibold text-white">Competitions, esports, expo, and stage events.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
