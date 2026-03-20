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
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/18 bg-cyan-400/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100">
            <Sparkles size={14} />
            Official Festival Registration
          </div>

          <div className="mt-5 flex items-center gap-4">
            <div className="hidden h-16 w-16 overflow-hidden rounded-[1.3rem] border border-white/10 bg-white/10 p-2 sm:block">
              <img src="/images/ceasposter.jpeg" alt="CEAS COGNOTSAV logo" className="h-full w-full rounded-[1rem] object-cover" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/80">Our Legacy</p>
              <h2 className="portal-brand-title mt-2 text-white">
                Where Engineering
                <br />
                Meets Excellence
              </h2>
            </div>
          </div>

          <div className="mt-5 space-y-5">
            <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
              COGNOTSAV is the flagship technical festival of the Computer Engineering Department at Dr. Vithalrao Vikhe Patil College of Engineering, Ahilyanagar. It provides a platform for students to showcase innovation, technical skills, and problem-solving abilities beyond the classroom.
            </p>
            <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
              Through exciting competitions, esports, project exhibitions, and UTOPIA, COGNOTSAV encourages students to explore technology, collaborate with peers, and push their creative boundaries.
            </p>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="rounded-[1.35rem] border border-cyan-300/14 bg-cyan-400/8 p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-200/80">Our Vision</p>
              <p className="mt-2 text-lg font-semibold text-white">Innovate. Compete. Excel.</p>
            </div>
            <div className="rounded-[1.35rem] border border-fuchsia-300/14 bg-fuchsia-400/8 p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-fuchsia-200/80">Our Mission</p>
              <p className="mt-2 text-lg font-semibold text-white">Code, Compete, and Conquer.</p>
            </div>
          </div>

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
                <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/80">Festival Countdown</p>
                <p className="mt-2 text-xl font-semibold text-white">07-08 April 2026</p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-slate-200">
                <CalendarDays size={14} className="mr-2 inline text-yellow-200" />
                Ahilyanagar
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              {[{ label: 'Days', value: timeLeft.days }, { label: 'Hours', value: timeLeft.hours }, { label: 'Minutes', value: timeLeft.minutes }].map((item, index) => (
                <div
                  key={item.label}
                  className={`rounded-[1.25rem] px-4 py-4 text-center ${index === 0 ? 'bg-white text-slate-950' : 'border border-white/10 bg-white/[0.05]'}`}
                >
                  <p className={`text-[10px] uppercase tracking-[0.18em] ${index === 0 ? 'text-slate-500' : 'text-slate-400'}`}>{item.label}</p>
                  <p className={`mt-2 ${index === 0 ? 'text-3xl text-slate-950' : 'text-2xl text-white'} font-semibold`}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
