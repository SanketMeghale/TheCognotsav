import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, Sparkles } from 'lucide-react';
import { shellClassName } from './utils';

type Props = {
  totalEvents: number;
  totalRegistrations: number;
  totalRemainingSlots: number;
};

const eventDate = new Date('2026-04-07T09:00:00');

export const HeroSection: React.FC<Props> = ({ totalEvents, totalRegistrations, totalRemainingSlots }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const update = () => {
      const diff = Math.max(eventDate.getTime() - Date.now(), 0);
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };

    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const quickStats = useMemo(
    () => [
      { label: 'Competitions', value: totalEvents },
      { label: 'Registrations', value: totalRegistrations },
      { label: 'Open Slots', value: totalRemainingSlots },
    ],
    [totalEvents, totalRegistrations, totalRemainingSlots],
  );

  return (
    <section id="overview" className={`${shellClassName} pt-4 pb-4 md:pt-7 md:pb-6`}>
      <div className="portal-hero-grid">
        <div
          data-reveal="left"
          className="portal-glow-card portal-glass relative overflow-hidden rounded-[2rem] px-4 py-5 sm:px-5 sm:py-6 md:px-8 md:py-8"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(217,70,239,0.16),transparent_24%),radial-gradient(circle_at_70%_80%,rgba(251,191,36,0.12),transparent_26%)]" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-100 sm:text-[11px]">
              <Sparkles size={14} className="text-cyan-200" />
              Runbhumi 2026 Registrations
            </div>

            <h2 className="portal-title-xl mt-4 max-w-[10ch] font-semibold text-white">
              Register for the most energetic tech fest on campus.
            </h2>
            <p className="portal-copy mt-3 max-w-2xl text-slate-300">
              Discover competitions, pay event-wise, and complete registration in a smooth mobile-first
              flow built for quick submissions.
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <a
                href="#registration-panel"
                className="animated-gradient-button inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-bold text-slate-950"
              >
                Register Now
                <ArrowRight size={16} />
              </a>
              <a
                href="#tracker"
                className="magnetic-button inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/6 px-5 py-3 text-sm font-semibold text-white"
              >
                Track Registration
              </a>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
              {quickStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[1.35rem] border border-white/12 bg-white/[0.06] px-3 py-3 backdrop-blur-md"
                >
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400 sm:text-[11px]">{stat.label}</p>
                  <p className="mt-1 text-lg font-semibold text-white sm:text-2xl">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:gap-4">
          <div
            data-reveal="right"
            className="portal-glow-card portal-glass overflow-hidden rounded-[1.8rem] p-4 sm:p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-200/85 sm:text-[11px]">Fest Date</p>
                <h3 className="portal-title-lg mt-2 font-semibold text-white">07-08 April 2026</h3>
              </div>
              <div className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-2 text-xs text-slate-200">
                <CalendarDays size={14} className="mr-2 inline text-yellow-200" />
                Ahilyanagar
              </div>
            </div>

            <div className="mt-4 rounded-[1.45rem] border border-white/12 bg-[linear-gradient(145deg,rgba(11,18,34,0.94),rgba(18,22,44,0.84))] p-4">
              <div className="portal-countdown-card">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Days</p>
                  <p className="mt-1 text-xl font-semibold text-white sm:text-2xl">{timeLeft.days}</p>
                </div>
                <div className="h-9 w-px bg-white/10" />
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Hours</p>
                  <p className="mt-1 text-xl font-semibold text-white sm:text-2xl">{timeLeft.hours}</p>
                </div>
                <div className="h-9 w-px bg-white/10" />
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Minutes</p>
                  <p className="mt-1 text-xl font-semibold text-white sm:text-2xl">{timeLeft.minutes}</p>
                </div>
              </div>
            </div>
          </div>

          <div
            data-reveal="right"
            className="portal-glow-card portal-glass overflow-hidden rounded-[1.8rem] p-3 sm:p-4"
          >
            <div className="portal-hero-poster">
              <img
                src="/images/ceasposter.jpeg"
                alt="CEAS COGNOTSAV 2026 poster"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,10,25,0.04),rgba(5,10,25,0.84))]" />
              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                <p className="text-[10px] uppercase tracking-[0.24em] text-blue-100/70 sm:text-[11px]">Flagship Event</p>
                <p className="mt-2 text-lg font-semibold text-white sm:text-xl">Competitions, gaming, projects, and more.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
