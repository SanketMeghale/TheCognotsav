import React, { memo, useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, MapPin, Trophy } from 'lucide-react';
import { parsePortalEventDate } from './utils';

type Props = {};

const heroLinks = [
  { href: '#overview', label: 'Home' },
  { href: '#registration-panel', label: 'Competitions' },
  { href: '#tracker', label: 'Tracker' },
  { href: '#timeline', label: 'Timeline' },
];

const heroStartDate = parsePortalEventDate('7 Apr 2026', '10:00 AM');
const heroEndDate = parsePortalEventDate('8 Apr 2026', '10:00 AM');

function getHeroCountdown(now: Date) {
  if (!heroStartDate) {
    return {
      state: 'pending' as const,
      label: 'Schedule pending',
      units: [] as Array<{ label: string; value: string }>,
    };
  }

  const diffMs = heroStartDate.getTime() - now.getTime();

  if (diffMs <= 0) {
    if (heroEndDate && now.getTime() <= heroEndDate.getTime()) {
      return {
        state: 'live' as const,
        label: 'Event live now',
        units: [],
      };
    }

    return {
      state: 'complete' as const,
      label: 'Event weekend started',
      units: [],
    };
  }

  const totalSeconds = Math.max(Math.floor(diffMs / 1000), 0);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    state: 'countdown' as const,
    label: 'Countdown to kickoff',
    units: [
      { label: 'Days', value: String(days).padStart(2, '0') },
      { label: 'Hours', value: String(hours).padStart(2, '0') },
      { label: 'Mins', value: String(minutes).padStart(2, '0') },
      { label: 'Secs', value: String(seconds).padStart(2, '0') },
    ],
  };
}

export const HeroSection: React.FC<Props> = memo(() => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const countdown = getHeroCountdown(now);

  return (
    <section id="overview" className="mx-auto w-full max-w-[1320px] px-1 pt-0 pb-2 sm:px-5 lg:px-8 md:pt-0 md:pb-4">
      <div className="portal-summit-hero">
        <div className="portal-summit-hero__rail">
          <a href="#overview" className="portal-summit-hero__brand" aria-label="CEAS home">
            <span className="portal-summit-hero__brand-badge">
              <img
                src="/images/ceasposter.jpeg"
                alt="CEAS logo"
                loading="eager"
                decoding="async"
                className="portal-summit-hero__brand-image"
              />
            </span>
            <span className="portal-summit-hero__brand-copy">
              <span className="portal-summit-hero__brand-kicker">Computer Engineering Association of Students</span>
              <span className="portal-summit-hero__brand-title">CEAS</span>
            </span>
          </a>

          <nav className="portal-summit-hero__nav" aria-label="Hero shortcuts">
            {heroLinks.map((link) => (
              <a key={link.href} href={link.href} className="portal-summit-hero__nav-link">
                {link.label}
              </a>
            ))}
          </nav>

          <a href="#registration-panel" className="portal-summit-hero__rail-cta">
            Register
            <ArrowRight size={15} />
          </a>
        </div>

        <div className="portal-summit-hero__content" data-reveal="fade-up">
          <p className="portal-summit-hero__eyebrow">CEAS Presents</p>
          <div className="portal-summit-hero__title-shell">
            <span className="portal-summit-hero__title-arc" aria-hidden="true" />
            <h1 className="portal-summit-hero__title">COGNOTSAV 2026</h1>
          </div>
          <p className="portal-summit-hero__subtitle">A State-Level Technical &amp; Esports Event</p>
          <p className="portal-summit-hero__description">
            Where ideas turn into impact through competitions, esports &amp; innovation.
          </p>

          <div className="portal-summit-hero__actions">
            <a href="#registration-panel" className="portal-summit-hero__action portal-summit-hero__action--primary">
              Register Now
            </a>
            <a href="#registration-panel" className="portal-summit-hero__action portal-summit-hero__action--ghost">
              Explore Events
              <ArrowRight size={15} />
            </a>
          </div>

          <div className="portal-summit-hero__prize-card" data-reveal="fade-up">
            <div className="portal-summit-hero__prize-icon" aria-hidden="true">
              <Trophy size={34} />
            </div>
            <div className="portal-summit-hero__prize-copy">
              <h2 className="portal-summit-hero__prize-title">&#8377;1,00,000 Prize Pool</h2>
              <div className="portal-summit-hero__prize-meta">
                <div className="portal-summit-hero__prize-meta-item">
                  <CalendarDays size={16} />
                  <span>7-8 April 2026</span>
                </div>
                <div className="portal-summit-hero__prize-meta-item">
                  <MapPin size={16} />
                  <span>Ahilyanagar</span>
                </div>
              </div>
              <div className="portal-summit-hero__timer">
                <span className="portal-summit-hero__timer-label">{countdown.label}</span>
                {countdown.state === 'countdown' ? (
                  <div className="portal-summit-hero__timer-grid" aria-live="polite">
                    {countdown.units.map((unit) => (
                      <div key={unit.label} className="portal-summit-hero__timer-chip">
                        <span className="portal-summit-hero__timer-value">{unit.value}</span>
                        <span className="portal-summit-hero__timer-unit">{unit.label}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`portal-summit-hero__timer-state portal-summit-hero__timer-state--${countdown.state}`}>
                    {countdown.label}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});
