import React, { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays } from 'lucide-react';

type Props = {};

const eventDate = new Date('2026-04-07T09:00:00');

export const HeroSection: React.FC<Props> = () => {
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

  const countdownCards = [
    { label: 'Days', value: timeLeft.days, color: 'is-red', face: 'happy' },
    { label: 'Hours', value: timeLeft.hours, color: 'is-cream', face: 'calm' },
    { label: 'Minutes', value: timeLeft.minutes, color: 'is-blue', face: 'happy' },
    { label: 'Seconds', value: timeLeft.seconds, color: 'is-yellow', face: 'spark' },
  ];

  return (
    <section id="overview" className="mx-auto w-full max-w-[1320px] px-2 sm:px-5 lg:px-8 pt-3 pb-2 md:pt-5 md:pb-4">
      <div className="portal-front-hero">
        <div className="portal-front-hero__content">
          <div className="portal-hero-topbar">
            <div className="portal-cognotsav-heading-wrap">
              <div className="portal-cognotsav-heading-kicker-row">
                <span className="portal-cognotsav-heading-logo">
                  <img src="/images/ceasposter.jpeg" alt="CEAS logo" className="h-full w-full rounded-[0.75rem] object-cover" />
                </span>
                <p className="portal-cognotsav-heading-kicker">CEAS Presents</p>
              </div>
              <h1 className="portal-cognotsav-heading">COGNOTSAV</h1>
            </div>
          </div>

          <div className="portal-legacy-headline mt-5">
            <div className="min-w-0">
              <p className="portal-kicker">Our Legacy</p>
              <h2 className="portal-legacy-title">
                Where Engineering
                <br />
                Meets Excellence
              </h2>
            </div>
          </div>

          <div className="mt-5 space-y-5">
            <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
              COGNOTSAV is the flagship tech fest of the Computer Engineering Department at Dr. Vithalrao Vikhe Patil College of Engineering, Ahilyanagar, bringing students together to innovate, compete, and go beyond the classroom through competitions, esports, exhibitions, and UTOPIA.
            </p>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="portal-legacy-card portal-legacy-card--vision">
              <p className="portal-kicker">Our Vision</p>
              <p className="mt-2 text-lg font-semibold text-white">Innovate. Compete. Excel.</p>
            </div>
            <div className="portal-legacy-card portal-legacy-card--mission">
              <p className="portal-kicker">Our Mission</p>
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

          <div className="portal-prize-pool-card mt-8">
            <div className="portal-prize-pool-card__badge">🏆</div>
            <p className="portal-prize-pool-card__kicker">Total Prize Pool Distributed</p>
            <h3 className="portal-prize-pool-card__value">
              Over <span>₹1,00,000</span>
            </h3>
            <p className="portal-prize-pool-card__meta">
              Cash Rewards
              <span />
              Participation Certificates
            </p>
          </div>
        </div>

        <div className="portal-front-hero__panel">
          <div className="portal-front-hero__visual-card">
            <img src="/images/ceasposter.jpeg" alt="CEAS COGNOTSAV crest" className="portal-front-hero__visual-image" />
          </div>

          <div className="portal-ceas-signature">
            <div className="portal-ceas-signature__brand">
              <span className="portal-ceas-signature__logo">
                <img src="/images/ceasposter.jpeg" alt="CEAS COGNOTSAV logo" className="portal-brand-logo-image" />
              </span>
              <div className="portal-ceas-signature__copy">
                <p className="portal-brand-overline portal-ceas-signature__overline">Computer Engineering Association</p>
                <h2 className="portal-ceas-signature__title">CEAS COGNOTSAV 2026</h2>
              </div>
            </div>
          </div>

          <div className="portal-front-hero__countdown portal-festival-counter portal-festival-counter--compact">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="portal-kicker">Festival Countdown</p>
                <p className="mt-2 text-lg font-semibold text-white">07-08 April 2026</p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-slate-200">
                <CalendarDays size={14} className="mr-2 inline text-yellow-200" />
                Ahilyanagar
              </div>
            </div>

            <div className="portal-festival-counter__board mt-6">
              {countdownCards.map((item) => (
                <div key={item.label} className={`portal-festival-counter__card ${item.color}`}>
                  <div className={`portal-festival-counter__balloon ${item.face}`}>
                    <span className="portal-festival-counter__face">
                      <span />
                      <span />
                    </span>
                  </div>
                  <div className="portal-festival-counter__stick" />
                  <div className="portal-festival-counter__number">{String(item.value).padStart(2, '0')}</div>
                  <div className="portal-festival-counter__label">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
