import React, { memo, useEffect, useState } from 'react';
import {
  ArrowRight, Award, Clock3, Code2, Cpu, Flame, Gamepad2, Gift, MapPin, MonitorUp, Rocket, Trophy, Users,
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
] as const;

const heroFeatureBadges = [
  { label: 'Certificates', Icon: Award, tone: 'cyan' },
  { label: 'Goodies', Icon: Gift, tone: 'amber' },
  { label: 'Networking', Icon: Rocket, tone: 'pink' },
] as const;

const heroMobileTopicBadges = [
  { label: 'BGMI', Icon: Gamepad2, tone: 'cyan' },
  { label: 'Hackathon', Icon: MonitorUp, tone: 'violet' },
  { label: 'Tech Quiz', Icon: Cpu, tone: 'amber' },
] as const;

const heroStatItems = [
  { value: '1200+', label: 'Participants', Icon: Users, tone: 'cyan' },
  { value: '₹1,00,000', label: 'Prize Pool', Icon: Trophy, tone: 'amber' },
  { value: '8', label: 'Events', Icon: MapPin, tone: 'pink' },
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
    <section id="overview" className="mx-auto w-full max-w-[1320px] px-0 pt-0 pb-2 sm:px-5 lg:px-8 md:pt-0 md:pb-4">
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
          <div className="portal-summit-hero__curve-lines" aria-hidden="true">
            <svg viewBox="0 0 1440 420" preserveAspectRatio="none" role="presentation">
              <defs>
                <linearGradient id="portalHeroCurvePrimary" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#53e7ff" stopOpacity="0" />
                  <stop offset="18%" stopColor="#53e7ff" stopOpacity="0.95" />
                  <stop offset="55%" stopColor="#7392ff" stopOpacity="0.9" />
                  <stop offset="82%" stopColor="#b97eff" stopOpacity="0.94" />
                  <stop offset="100%" stopColor="#b97eff" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="portalHeroCurveSecondary" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ffc15c" stopOpacity="0" />
                  <stop offset="20%" stopColor="#ffc15c" stopOpacity="0.74" />
                  <stop offset="48%" stopColor="#66e9ff" stopOpacity="0.72" />
                  <stop offset="80%" stopColor="#8467ff" stopOpacity="0.82" />
                  <stop offset="100%" stopColor="#8467ff" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="portalHeroCurveAccent" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
                  <stop offset="24%" stopColor="#ffffff" stopOpacity="0.44" />
                  <stop offset="56%" stopColor="#84e1ff" stopOpacity="0.34" />
                  <stop offset="82%" stopColor="#ffd77f" stopOpacity="0.38" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                className="portal-summit-hero__curve-line portal-summit-hero__curve-line--primary"
                d="M-60 178C178 16 438 18 658 104S1118 280 1502 70"
                stroke="url(#portalHeroCurvePrimary)"
              />
              <path
                className="portal-summit-hero__curve-line portal-summit-hero__curve-line--secondary"
                d="M-88 244C196 122 456 92 716 170S1188 350 1518 168"
                stroke="url(#portalHeroCurveSecondary)"
              />
              <path
                className="portal-summit-hero__curve-line portal-summit-hero__curve-line--accent"
                d="M92 334C320 232 526 220 744 270S1178 414 1452 294"
                stroke="url(#portalHeroCurveAccent)"
              />
            </svg>
          </div>

          <p className="portal-summit-hero__eyebrow portal-summit-hero__eyebrow--immersive">CEAS PRESENTS</p>
          <h1 className="portal-summit-hero__title portal-summit-hero__title--immersive" aria-label="COGNOTSAV 2K26">
            <span className="portal-summit-hero__title-line portal-summit-hero__title-line--main" data-text="COGNOTSAV">
              COGNOTSAV
            </span>
            <span className="portal-summit-hero__title-line portal-summit-hero__title-line--year" data-text="2K26">
              2K26
            </span>
          </h1>
          <div className="portal-summit-hero__mobile-topics" aria-hidden="true">
            {heroMobileTopicBadges.map(({ label, Icon, tone }) => (
              <div key={label} className={`portal-summit-hero__mobile-topic-pill portal-summit-hero__mobile-topic-pill--${tone}`}>
                <Icon size={14} />
                <span>{label}</span>
              </div>
            ))}
          </div>
          <p className="portal-summit-hero__subtitle portal-summit-hero__subtitle--immersive">
            State-Level Technical
            <br className="portal-summit-hero__subtitle-break" />
            &amp; Esports Event
          </p>
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

          <div className="portal-summit-hero__actions portal-summit-hero__actions--mobile">
            <a href="#registration-panel" className="portal-summit-hero__action portal-summit-hero__action--primary">
              Register Now
              <ArrowRight size={16} />
            </a>
            <a href="#registration-panel" className="portal-summit-hero__action portal-summit-hero__action--ghost">
              Explore Events
              <ArrowRight size={16} />
            </a>
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
