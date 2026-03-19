import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Sparkles, Target, Trophy } from 'lucide-react';
import { shellClassName } from './utils';

type Props = {
  totalEvents: number;
  totalRegistrations: number;
  totalRemainingSlots: number;
};

const eventDate = new Date('2026-04-07T09:00:00');

const spotlightCards = [
  {
    label: 'Our Vision',
    title: 'Innovate with confidence',
    detail: 'A portal experience that feels polished, trustworthy, and ready for a flagship fest.',
    icon: Target,
    accent: 'from-cyan-400/20 via-blue-500/18 to-purple-600/12',
    border: 'border-cyan-300/20',
    iconTone: 'text-cyan-200',
  },
  {
    label: 'Our Mission',
    title: 'Code. Compete. Conquer.',
    detail: 'From first click to final confirmation pass, every step stays clear and high energy.',
    icon: Sparkles,
    accent: 'from-pink-500/20 via-purple-500/18 to-magenta-600/12',
    border: 'border-pink-300/20',
    iconTone: 'text-pink-200',
  },
  {
    label: 'Participant Promise',
    title: 'Fast flows, fewer doubts',
    detail: 'Live slots, event-specific payments, and instant tracking give teams more confidence.',
    icon: Trophy,
    accent: 'from-yellow-400/20 via-orange-500/18 to-red-600/12',
    border: 'border-yellow-300/20',
    iconTone: 'text-yellow-200',
  },
];

const highlightTracks = [
  {
    label: 'Hackathon',
    detail: 'Problem solving under pressure',
    accent: 'border-cyan-400/24 bg-cyan-500/16 text-cyan-100',
  },
  {
    label: 'Esports',
    detail: 'Competitive gaming brackets',
    accent: 'border-purple-400/24 bg-purple-500/16 text-purple-100',
  },
  {
    label: 'Project Expo',
    detail: 'Builds, demos, and showcases',
    accent: 'border-pink-400/24 bg-pink-500/16 text-pink-100',
  },
  {
    label: 'UTOPIA',
    detail: 'Energy beyond the classroom',
    accent: 'border-yellow-400/24 bg-yellow-500/16 text-yellow-100',
  },
];

const posterTags = ['Live registrations', 'Event-wise payments', 'Instant tracker'];

const countdownAccents = [
  'from-cyan-500/20 via-blue-500/16 to-indigo-600/12 border-cyan-400/18',
  'from-purple-500/20 via-pink-500/16 to-magenta-600/12 border-purple-400/18',
  'from-yellow-500/22 via-orange-500/16 to-red-600/12 border-yellow-400/18',
  'from-pink-500/20 via-purple-500/16 to-violet-600/12 border-pink-400/18',
];

export const HeroSection: React.FC<Props> = ({ totalEvents, totalRegistrations, totalRemainingSlots }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const diff = Math.max(eventDate.getTime() - now, 0);
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

  const countdownBlocks = useMemo(
    () => [
      { label: 'Days', value: timeLeft.days },
      { label: 'Hours', value: timeLeft.hours },
      { label: 'Minutes', value: timeLeft.minutes },
      { label: 'Seconds', value: timeLeft.seconds },
    ],
    [timeLeft],
  );

  const festivalStats = useMemo(
    () => [
      {
        label: 'Live Events',
        value: String(totalEvents),
        accent: 'from-blue-500/18 via-cyan-400/12 to-transparent',
        textTone: 'text-blue-100',
      },
      {
        label: 'Registrations',
        value: String(totalRegistrations),
        accent: 'from-purple-500/18 via-pink-500/12 to-transparent',
        textTone: 'text-purple-100',
      },
      {
        label: 'Open Slots',
        value: String(totalRemainingSlots),
        accent: 'from-cyan-500/18 via-blue-500/12 to-transparent',
        textTone: 'text-cyan-100',
      },
      {
        label: 'Prize Pool',
        value: 'Rs 1 Lakh+',
        accent: 'from-yellow-500/18 via-orange-400/12 to-transparent',
        textTone: 'text-yellow-100',
      },
      {
        label: 'Fest Days',
        value: '2',
        accent: 'from-purple-500/18 via-violet-400/12 to-transparent',
        textTone: 'text-violet-100',
      },
      {
        label: 'Campus Reach',
        value: '1500+',
        accent: 'from-pink-500/18 via-rose-400/12 to-transparent',
        textTone: 'text-pink-100',
      },
    ],
    [totalEvents, totalRegistrations, totalRemainingSlots],
  );

  return (
    <section id="overview" className={`${shellClassName} hero-layout py-8 md:py-12 xl:py-14`}>
      <div
        data-reveal="left"
        className="portal-glow-card portal-glass relative overflow-hidden rounded-[2.6rem] p-6 md:p-8 xl:p-10"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_24%),radial-gradient(circle_at_82%_18%,rgba(168,85,247,0.16),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.12),transparent_24%)]" />
        <div className="absolute -left-10 bottom-0 h-56 w-56 rounded-full bg-blue-500/18 blur-[110px]" />
        <div className="absolute -right-12 top-10 h-64 w-64 rounded-full bg-purple-500/16 blur-[120px]" />
        <div className="absolute inset-x-[8%] top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" />

        <div className="relative z-10 flex h-full flex-col gap-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex w-fit items-center gap-3 rounded-full border border-blue-400/18 bg-blue-500/10 px-5 py-3 text-sm text-blue-100 shadow-[0_0_25px_rgba(59,130,246,0.18)]">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-yellow-300" />
              CEAS COGNOTSAV 2026
            </div>
          </div>

          <div data-reveal="up" className="max-w-4xl">
            <p className="text-[11px] uppercase tracking-[0.38em] text-blue-300/80">Our Legacy</p>
            <h2 className="mt-5 font-orbitron text-[clamp(2.15rem,5.4vw,4.1rem)] font-black uppercase leading-[1.03]">
              <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Where Engineering
              </span>
              <br />
              <span className="bg-gradient-to-r from-cyan-300 via-white to-yellow-300 bg-clip-text text-transparent">
                Meets Excellence
              </span>
            </h2>

            <p className="mt-6 max-w-[44rem] text-[clamp(1rem,1.3vw,1.12rem)] leading-8 text-slate-100/95 md:leading-9">
              COGNOTSAV is the flagship technical festival of the Computer Engineering Department at Dr.
              Vithalrao Vikhe Patil College of Engineering, Ahilyanagar. It gives students a premium stage
              to showcase innovation, technical skill, and competitive energy.
            </p>
            <p className="mt-4 max-w-[42rem] text-[clamp(0.98rem,1.08vw,1.05rem)] leading-8 text-slate-300">
              Through competitions, esports, project exhibitions, and UTOPIA, the fest pushes teams to
              collaborate, create, and perform beyond the classroom.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              {highlightTracks.map((track) => (
                <div
                  key={track.label}
                  className={`rounded-full border px-4 py-2 text-sm font-medium backdrop-blur-md ${track.accent}`}
                >
                  {track.label}
                </div>
              ))}
            </div>
          </div>

          <div className="hero-spotlight-grid">
            {spotlightCards.map((card, index) => {
              const Icon = card.icon;

              return (
                <div
                  key={card.label}
                  data-reveal="up"
                  className={`tilt-card rounded-[1.8rem] border bg-gradient-to-br p-5 shadow-[0_20px_55px_rgba(2,8,23,0.16)] backdrop-blur-xl ${card.border} ${card.accent}`}
                  style={{ animationDelay: `${index * 0.14}s` }}
                >
                  <div className={`flex items-center gap-3 ${card.iconTone}`}>
                    <Icon size={18} />
                    <p className="text-[11px] uppercase tracking-[0.35em]">{card.label}</p>
                  </div>
                  <p className="mt-4 text-[1.35rem] font-semibold text-white">{card.title}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-200">{card.detail}</p>
                </div>
              );
            })}
          </div>

          <div className="hero-stat-grid">
            {festivalStats.map((card, index) => (
              <div
                key={card.label}
                data-reveal="up"
                className={`tilt-card floating-card rounded-[1.65rem] border border-white/10 bg-gradient-to-br ${card.accent} p-5 shadow-[0_20px_50px_rgba(2,8,23,0.16)] backdrop-blur-xl`}
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                <p className="text-sm text-slate-200/88">{card.label}</p>
                <p className={`mt-2 font-orbitron text-3xl font-black ${card.textTone}`}>{card.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="hero-side-grid min-w-0">
        <div
          data-reveal="right"
          className="group relative overflow-hidden rounded-[2.25rem] bg-gradient-to-br from-blue-500/28 via-purple-500/10 to-pink-500/24 p-px shadow-[0_30px_95px_rgba(2,8,23,0.28)]"
        >
          <div className="absolute -right-8 top-8 h-36 w-36 rounded-full bg-blue-500/18 blur-[90px]" />
          <div className="absolute -left-8 bottom-10 h-40 w-40 rounded-full bg-purple-500/16 blur-[95px]" />
          <div className="relative overflow-hidden rounded-[calc(2.25rem-1px)] border border-white/12 bg-[linear-gradient(165deg,rgba(13,19,36,0.76),rgba(9,15,29,0.56))] backdrop-blur-2xl transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_36px_110px_rgba(56,189,248,0.16)]">
            <div className="absolute inset-x-[12%] top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-90" />
            <div className="relative overflow-hidden">
              <img
                src="/images/ceasposter.jpeg"
                alt="CEAS COGNOTSAV 2026 poster"
                className="block h-[26rem] w-full object-cover object-center transition duration-500 group-hover:scale-[1.03] md:h-[30rem]"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,17,29,0.04),rgba(7,17,29,0.2)_34%,rgba(7,17,29,0.92))]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.28),transparent_24%),radial-gradient(circle_at_20%_30%,rgba(59,130,246,0.18),transparent_30%)]" />
              <div className="absolute right-5 top-5 rounded-full border border-white/14 bg-white/8 px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-white/90 backdrop-blur-md">
                Official Poster
              </div>
              <div className="absolute inset-x-0 bottom-0 p-6 md:p-7">
                <p className="text-[11px] uppercase tracking-[0.35em] text-blue-300/80">Flagship Fest</p>
                <h3 className="mt-3 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text font-orbitron text-2xl font-black uppercase text-transparent md:text-[2rem]">
                  Code. Compete. Conquer.
                </h3>
                <p className="mt-3 max-w-md text-sm leading-7 text-slate-200">
                  A sharper visual stage for registrations, event discovery, live payments, and participant
                  momentum.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {posterTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/12 bg-black/25 px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-white/82 backdrop-blur-md"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div data-reveal="right" className="portal-glow-card portal-glass rounded-[2rem] p-6 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 max-w-full">
                <p className="text-[11px] uppercase tracking-[0.35em] text-blue-300/80">Countdown</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">07-08 April 2026</h3>
              <p className="mt-2 max-w-sm text-sm leading-7 text-slate-300">
                Keep registrations open, payments ready, and participants informed as the fest window gets
                closer.
              </p>
            </div>
            <div className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-slate-100 backdrop-blur-md">
              <CalendarDays size={16} className="mr-2 inline" />
              Ahilyanagar
            </div>
          </div>

          <div className="hero-countdown-grid mt-6">
            {countdownBlocks.map((block, index) => (
              <div
                key={block.label}
                data-reveal="up"
                className={`tilt-card floating-card rounded-[1.45rem] border bg-gradient-to-br p-4 text-center shadow-[0_16px_42px_rgba(2,8,23,0.16)] backdrop-blur-xl ${countdownAccents[index]}`}
                style={{ animationDelay: `${index * 0.16}s` }}
              >
                <p className="text-[11px] uppercase tracking-[0.25em] text-slate-300">{block.label}</p>
                <p className="mt-2 font-orbitron text-3xl font-black text-white">{block.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div data-reveal="right" className="portal-glow-card portal-glass rounded-[2rem] p-6 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-purple-300/80">Festival Spectrum</p>
              <h3 className="mt-2 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text font-orbitron text-2xl font-black uppercase text-transparent">
                Tracks across tech, play, and showcase
              </h3>
            </div>
            <div className="rounded-full border border-yellow-400/16 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-100">
              CE Department
            </div>
          </div>

          <div className="hero-highlight-grid mt-6">
            {highlightTracks.map((track) => (
              <div
                key={track.label}
                className={`rounded-[1.45rem] border px-4 py-4 shadow-[0_16px_42px_rgba(2,8,23,0.14)] backdrop-blur-xl ${track.accent}`}
              >
                <p className="text-sm font-semibold text-white">{track.label}</p>
                <p className="mt-2 text-sm leading-6 text-slate-200">{track.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
