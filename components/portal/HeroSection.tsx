import React, { memo, useEffect, useState } from 'react';
import {
  Award, Clock3, Code2, Cpu, Flame, Gamepad2, Gift, MapPin, MonitorUp, Rocket, Trophy, Users,
} from 'lucide-react';
import { parsePortalEventDate } from './utils';

type Props = {};

const heroStartDate = parsePortalEventDate('7 Apr 2026', '10:00 AM');
const heroEndDate = parsePortalEventDate('8 Apr 2026', '10:00 AM');
const heroOrbitBadges = [
  { label: 'BGMI', Icon: Gamepad2, tone: 'cyan', position: 'top-left' },
  { label: 'Hackathon', Icon: MonitorUp, tone: 'violet', position: 'top-right' },
  { label: 'Tech Quiz', Icon: Cpu, tone: 'amber', position: 'middle-left' },
  { label: 'C coding', Icon: Code2, tone: 'violet', position: 'middle-right' },
  { label: 'Tech Quiz', Icon: Cpu, tone: 'amber', position: 'bottom-right' },
] as const;

const heroFeatureBadges = [
  { label: 'Certificates', Icon: Award, tone: 'cyan' },
  { label: 'Goodies', Icon: Gift, tone: 'amber' },
  { label: 'Networking', Icon: Rocket, tone: 'pink' },
] as const;

const heroStatItems = [
  { value: '1200+', label: 'Participants', Icon: Users, tone: 'cyan' },
  { value: '₹1,00,000', label: 'Prize Pool', Icon: Trophy, tone: 'amber' },
  { value: '10+', label: 'Offline Events', Icon: MapPin, tone: 'pink' },
  { value: 'Live', label: 'Competitions', Icon: Flame, tone: 'orange' },
] as const;

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

function getHeroCountdownSummary(
  countdown: ReturnType<typeof getHeroCountdown>,
) {
  if (countdown.state !== 'countdown') {
    return countdown.label;
  }

  const [days, hours, minutes] = countdown.units;
  return `${Number(days?.value || '0')}d ${hours?.value || '00'}h ${minutes?.value || '00'}m`;
}

export const HeroSection: React.FC<Props> = memo(() => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const countdown = getHeroCountdown(now);
  const countdownSummary = getHeroCountdownSummary(countdown);

  return (
    <section id="overview" className="mx-auto w-full max-w-[1320px] px-1 pt-0 pb-2 sm:px-5 lg:px-8 md:pt-0 md:pb-4">
      <div className="portal-summit-hero portal-summit-hero--immersive">
        <div className="portal-summit-hero__content portal-summit-hero__content--immersive" data-reveal="fade-up">
          <div className="portal-summit-hero__orbit" aria-hidden="true">
            {heroOrbitBadges.map(({ label, Icon, tone, position }) => (
              <div
                key={`${position}-${label}`}
                className={`portal-summit-hero__orbit-pill portal-summit-hero__orbit-pill--${tone} portal-summit-hero__orbit-pill--${position}`}
              >
                <Icon size={15} />
                <span>{label}</span>
              </div>
            ))}
          </div>

          <p className="portal-summit-hero__eyebrow portal-summit-hero__eyebrow--immersive">CEAS PRESENTS</p>
          <h1 className="portal-summit-hero__title portal-summit-hero__title--immersive" aria-label="COGNOTSAV 2026">
            <span className="portal-summit-hero__title-line portal-summit-hero__title-line--main" data-text="COGNOTSAV">
              COGNOTSAV
            </span>
            <span className="portal-summit-hero__title-line portal-summit-hero__title-line--year" data-text="2026">
              2026
            </span>
          </h1>
          <p className="portal-summit-hero__subtitle portal-summit-hero__subtitle--immersive">A State-Level Technical &amp; Esports Event</p>
          <p className="portal-summit-hero__description portal-summit-hero__description--immersive">
            Where ideas turn into impact through competitions, esports &amp; innovation.
          </p>

          <div className="portal-summit-hero__countdown-pill" aria-live="polite">
            <Clock3 size={17} />
            <span className="portal-summit-hero__countdown-label">
              {countdown.state === 'countdown' ? 'Starts in:' : 'Status:'}
            </span>
            <strong className="portal-summit-hero__countdown-value">{countdownSummary}</strong>
          </div>

          <div className="portal-summit-hero__benefit-row">
            {heroFeatureBadges.map(({ label, Icon, tone }) => (
              <div key={label} className={`portal-summit-hero__benefit-pill portal-summit-hero__benefit-pill--${tone}`}>
                <Icon size={18} />
                <span>{label}</span>
              </div>
            ))}
          </div>

          <div className="portal-summit-hero__stats-bar">
            {heroStatItems.map(({ value, label, Icon, tone }) => (
              <div key={`${value}-${label}`} className="portal-summit-hero__stat-card">
                <div className={`portal-summit-hero__stat-icon portal-summit-hero__stat-icon--${tone}`}>
                  <Icon size={17} />
                </div>
                <div className="portal-summit-hero__stat-copy">
                  <strong>{value}</strong>
                  <span>{label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
});
