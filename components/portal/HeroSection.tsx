import React, { memo, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  ArrowRight, Award, Bot, Clock3, Cpu, FileCode2, Flame, Gamepad2, Gift, Github, MapPin, MonitorUp, Orbit, Rocket,
  ShieldCheck, Sparkles, Trophy, Users, Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { parsePortalEventDate } from './utils';

type Props = {
  adminTriggerProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
};
type HeroTone = 'amber' | 'blue' | 'cyan' | 'emerald' | 'orange' | 'pink' | 'rose' | 'violet';
type BackdropPill = {
  label: string;
  Icon: LucideIcon;
  style: CSSProperties;
  tier: 'primary' | 'secondary';
  tone: HeroTone;
};
type BackdropMark = {
  label: string;
  Icon: LucideIcon;
  style: CSSProperties;
  tone: HeroTone;
  variant: 'compact' | 'emblem' | 'wordmark';
};
type BackdropAccent = {
  Icon: LucideIcon;
  style: CSSProperties;
  tone: HeroTone;
};

const heroStartDate = parsePortalEventDate('7 Apr 2026', '10:00 AM');
const heroEndDate = parsePortalEventDate('8 Apr 2026', '10:00 AM');

const heroBackdropPills: BackdropPill[] = [
  { label: 'BGMI', Icon: Gamepad2, tone: 'cyan', tier: 'primary', style: { left: '8.5%', top: '8.5%' } },
  { label: 'Hackathon', Icon: MonitorUp, tone: 'violet', tier: 'primary', style: { right: '8.5%', top: '8.5%' } },
];

const heroBackdropMarks: BackdropMark[] = [
  { label: 'TECH QUIZ', Icon: Cpu, tone: 'orange', variant: 'compact', style: { left: '8.1%', top: '35.5%', transform: 'rotate(-6deg)' } },
  { label: 'REACT', Icon: Orbit, tone: 'cyan', variant: 'emblem', style: { left: '8.6%', top: '64.5%' } },
  { label: 'AI', Icon: Bot, tone: 'amber', variant: 'emblem', style: { right: '11.6%', top: '33%' } },
  { label: 'GITHUB', Icon: Github, tone: 'violet', variant: 'wordmark', style: { right: '12.5%', top: '58%', transform: 'rotate(-6deg)' } },
  { label: 'FREE FIRE', Icon: Flame, tone: 'orange', variant: 'wordmark', style: { right: '16.5%', bottom: '18%', transform: 'rotate(-2deg)' } },
];

const heroBackdropAccents: BackdropAccent[] = [
  { Icon: Sparkles, tone: 'violet', style: { left: '21%', top: '17%' } },
  { Icon: Zap, tone: 'orange', style: { right: '26%', top: '18%' } },
  { Icon: ShieldCheck, tone: 'cyan', style: { left: '6.6%', bottom: '16%' } },
  { Icon: Zap, tone: 'violet', style: { right: '22%', bottom: '31%' } },
];

const heroMobileBackdropMarks: BackdropMark[] = [
  { label: 'GAMES', Icon: Gamepad2, tone: 'cyan', variant: 'emblem', style: { left: '2.8%', top: '35.5%' } },
  { label: 'REACT', Icon: Orbit, tone: 'cyan', variant: 'emblem', style: { left: '2.4%', top: '45%' } },
  { label: 'HTML5', Icon: FileCode2, tone: 'orange', variant: 'emblem', style: { left: '1.8%', top: '81.5%' } },
  { label: 'AI', Icon: Bot, tone: 'pink', variant: 'emblem', style: { right: '3.6%', top: '43.5%' } },
  { label: 'GITHUB', Icon: Github, tone: 'violet', variant: 'emblem', style: { right: '2.8%', top: '57.5%' } },
  { label: 'FREE', Icon: Flame, tone: 'orange', variant: 'compact', style: { right: '2.8%', top: '81.5%', transform: 'rotate(-4deg)' } },
];

const heroMobileBackdropAccents: BackdropAccent[] = [
  { Icon: Sparkles, tone: 'violet', style: { left: '5.6%', top: '29.5%' } },
  { Icon: Zap, tone: 'orange', style: { right: '8.4%', top: '35.5%' } },
  { Icon: ShieldCheck, tone: 'cyan', style: { left: '4.8%', top: '72%' } },
  { Icon: Zap, tone: 'violet', style: { right: '5.8%', top: '73.5%' } },
];

const heroFeatureBadges = [
  { label: 'Certificates', Icon: Award, tone: 'cyan' },
  { label: 'Goodies', Icon: Gift, tone: 'amber' },
  { label: 'Networking', Icon: Rocket, tone: 'pink' },
] as const;

const heroStatItems = [
  { value: '1200+', label: 'Participants', Icon: Users, tone: 'cyan' },
  { value: 'Rs 1,00,000', label: 'Prize Pool', Icon: Trophy, tone: 'amber' },
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

export const HeroSection: React.FC<Props> = memo(({ adminTriggerProps }) => {
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
          <div className="portal-summit-hero__backdrop" aria-hidden="true">
            <div className="portal-summit-hero__backdrop-mesh" />
            {heroBackdropPills.map(({ label, Icon, tone, tier, style }) => (
              <div
                key={label}
                className={`portal-summit-hero__backdrop-pill portal-summit-hero__backdrop-pill--${tone} portal-summit-hero__backdrop-pill--${tier}`}
                style={style}
              >
                <Icon size={15} />
                <span>{label}</span>
              </div>
            ))}
            {heroBackdropMarks.map(({ label, Icon, tone, variant, style }) => (
              <div
                key={label}
                className={`portal-summit-hero__backdrop-mark portal-summit-hero__backdrop-mark--${tone} portal-summit-hero__backdrop-mark--${variant}`}
                style={style}
              >
                <span className="portal-summit-hero__backdrop-mark-icon">
                  <Icon size={variant === 'emblem' ? 18 : 16} />
                </span>
                <span className="portal-summit-hero__backdrop-mark-label">{label}</span>
              </div>
            ))}
            {heroBackdropAccents.map(({ Icon, tone, style }, index) => (
              <span
                key={`${tone}-${index}`}
                className={`portal-summit-hero__backdrop-accent portal-summit-hero__backdrop-accent--${tone}`}
                style={style}
              >
                <Icon size={18} />
              </span>
            ))}
            {heroMobileBackdropMarks.map(({ label, Icon, tone, variant, style }) => (
              <div
                key={`mobile-${label}`}
                className={`portal-summit-hero__backdrop-mark portal-summit-hero__backdrop-mark--${tone} portal-summit-hero__backdrop-mark--${variant} portal-summit-hero__backdrop-mark--mobile-only`}
                style={style}
              >
                <span className="portal-summit-hero__backdrop-mark-icon">
                  <Icon size={variant === 'emblem' ? 16 : 15} />
                </span>
                <span className="portal-summit-hero__backdrop-mark-label">{label}</span>
              </div>
            ))}
            {heroMobileBackdropAccents.map(({ Icon, tone, style }, index) => (
              <span
                key={`mobile-${tone}-${index}`}
                className={`portal-summit-hero__backdrop-accent portal-summit-hero__backdrop-accent--${tone} portal-summit-hero__backdrop-accent--mobile-only`}
                style={style}
              >
                <Icon size={16} />
              </span>
            ))}
          </div>

          <button
            type="button"
            className="portal-summit-hero__crest"
            aria-label="CEAS logo"
            {...adminTriggerProps}
          >
            <img
              src="/images/ceas-hero-badge-crop.png"
              alt="CEAS logo"
              className="portal-summit-hero__crest-image"
              loading="eager"
              decoding="async"
            />
          </button>
          <p className="portal-summit-hero__eyebrow portal-summit-hero__eyebrow--immersive">CEAS PRESENTS</p>
          <h1 className="portal-summit-hero__title portal-summit-hero__title--immersive" aria-label="COGNOTSAV 2K26">
            <span className="portal-summit-hero__title-line portal-summit-hero__title-line--main" data-text="COGNOTSAV">
              COGNOTSAV
            </span>
            <span className="portal-summit-hero__title-line portal-summit-hero__title-line--year" data-text="2K26">
              2K26
            </span>
          </h1>
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

          <div className="portal-summit-hero__actions portal-summit-hero__actions--desktop">
            <a href="#registration-panel" className="portal-summit-hero__action portal-summit-hero__action--primary">
              Register Now
              <ArrowRight size={16} />
            </a>
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

export default HeroSection;
