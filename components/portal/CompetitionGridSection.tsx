import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronDown, CreditCard, ExternalLink, Hourglass, Play, Trophy, Users } from 'lucide-react';
import type { EventRecord } from './types';
import { formatCurrency, getEventLiveState, getTeamLabel } from './utils';

type Props = {
  events: EventRecord[];
  loadingEvents: boolean;
  selectedEventSlug: string;
  onSelectEvent: (slug: string) => void;
};

const categoryThemes: Record<string, { button: string; glow: string; badge: string }> = {
  Technical: {
    button: 'from-sky-400 to-cyan-300 text-slate-950',
    glow: 'shadow-[0_18px_45px_rgba(56,189,248,0.18)]',
    badge: 'bg-sky-400/14 text-sky-100',
  },
  Gaming: {
    button: 'from-fuchsia-400 to-pink-300 text-slate-950',
    glow: 'shadow-[0_18px_45px_rgba(217,70,239,0.18)]',
    badge: 'bg-fuchsia-400/14 text-fuchsia-100',
  },
  Fun: {
    button: 'from-amber-300 to-orange-300 text-slate-950',
    glow: 'shadow-[0_18px_45px_rgba(251,191,36,0.18)]',
    badge: 'bg-amber-400/14 text-amber-100',
  },
};

const filterOrder = ['All', 'Technical', 'Sports', 'Gaming', 'Fun'] as const;
const categoryTaglines: Record<string, string> = {
  Technical: 'Innovate • Present • Accelerate',
  Sports: 'Compete • Perform • Triumph',
  Gaming: 'Squad Up • Survive • Dominate',
  Fun: 'Play • Laugh • Conquer',
};

function getDisplayCategory(event: EventRecord) {
  const name = `${event.name} ${event.description}`.toLowerCase();
  if (event.category.toLowerCase() === 'sports' || /sport/i.test(name)) {
    return 'Sports';
  }

  if (event.category.toLowerCase() === 'gaming' || /runbhumi|esport|bgmi|free fire/i.test(name)) {
    return 'Gaming';
  }

  if (event.category.toLowerCase() === 'fun') {
    return 'Fun';
  }

  return 'Technical';
}

export const CompetitionGridSection: React.FC<Props> = memo(({ events, loadingEvents, selectedEventSlug, onSelectEvent }) => {
  const [activeFilter, setActiveFilter] = useState<(typeof filterOrder)[number]>('All');
  const [now, setNow] = useState(() => new Date());
  const [activeVideoSlug, setActiveVideoSlug] = useState<string | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const videoShellRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const visibleEvents = useMemo(
    () => (activeFilter === 'All' ? events : events.filter((event) => getDisplayCategory(event) === activeFilter)),
    [activeFilter, events],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !activeVideoSlug) {
      return undefined;
    }

    const shell = videoShellRefs.current[activeVideoSlug];
    if (!shell) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || entry.intersectionRatio < 0.45) {
          setActiveVideoSlug((current) => (current === activeVideoSlug ? null : current));
        }
      },
      { threshold: [0.45, 0.6] },
    );

    observer.observe(shell);
    return () => observer.disconnect();
  }, [activeVideoSlug]);

  useEffect(() => {
    Object.entries(videoRefs.current).forEach(([slug, video]) => {
      if (!video) {
        return;
      }

      const shouldPlay = slug === activeVideoSlug;

      if (shouldPlay) {
        video.muted = true;
        video.controls = false;
        video.loop = true;
        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {});
        }
        return;
      }

      video.controls = false;
      video.muted = true;
      video.loop = true;
      video.pause();
      video.currentTime = 0;
    });
  }, [activeVideoSlug]);

  const toggleVideoPreview = (slug: string) => {
    setActiveVideoSlug((current) => (current === slug ? null : slug));
  };

  return (
    <section id="registration-panel" className="portal-glow-card rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(5,8,18,0.9))] p-3 sm:p-5 md:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-fuchsia-300/85">Main Attractions</p>
          <h3 className="mt-3 font-orbitron text-3xl font-black text-white sm:text-4xl">
            Featured <span className="bg-gradient-to-r from-cyan-300 to-sky-400 bg-clip-text text-transparent">Competitions</span>
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-[1.5rem] border border-white/10 bg-[rgba(12,16,24,0.92)] p-2 shadow-[0_18px_44px_rgba(2,8,23,0.24)] sm:grid-cols-5">
          {filterOrder.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`rounded-[1rem] px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] transition ${
                activeFilter === filter
                  ? 'bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 shadow-[0_12px_30px_rgba(34,211,238,0.28)]'
                  : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loadingEvents
          ? Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="rounded-[1.8rem] border border-white/10 bg-white/[0.04] p-4">
                <div className="h-56 animate-pulse rounded-[1.4rem] bg-white/10" />
                <div className="mt-4 h-4 w-20 animate-pulse rounded-full bg-white/10" />
                <div className="mt-3 h-6 w-2/3 animate-pulse rounded-full bg-white/10" />
              </div>
            ))
          : visibleEvents.map((event) => {
              const active = event.slug === selectedEventSlug;
              const displayCategory = getDisplayCategory(event);
              const theme = categoryThemes[displayCategory] || categoryThemes.Technical;
              const teamLabel = getTeamLabel(event);
              const liveState = getEventLiveState(event, now);
              const handleOpenEvent = () => onSelectEvent(event.slug);
              const hasIntroVideo = Boolean(event.intro_video_url);
              const isVideoActive = activeVideoSlug === event.slug;
              const statusLabel = liveState.label === 'Registration Open' ? 'OPEN' : liveState.label.toUpperCase();
              const tagline = categoryTaglines[displayCategory] || categoryTaglines.Technical;
              const videoInstruction = isVideoActive ? 'Tap to stop preview' : 'Tap to play preview';

              return (
                <article
                  key={event.slug}
                  role="link"
                  tabIndex={0}
                  onMouseLeave={() => {
                    if (activeVideoSlug === event.slug) {
                      setActiveVideoSlug(null);
                    }
                  }}
                  onBlur={() => {
                    if (activeVideoSlug === event.slug) {
                      setActiveVideoSlug(null);
                    }
                  }}
                  onClick={handleOpenEvent}
                  onKeyDown={(eventKey) => {
                    if (eventKey.key === 'Enter' || eventKey.key === ' ') {
                      eventKey.preventDefault();
                      handleOpenEvent();
                    }
                  }}
                  className={`portal-competition-card group tilt-card h-full cursor-pointer overflow-hidden rounded-[1.9rem] border text-left transition duration-200 ${
                    active ? 'border-cyan-300/36' : 'border-white/10 hover:border-white/18'
                  } ${theme.glow}`}
                >
                  <div className="portal-competition-card__media relative overflow-hidden">
                    {hasIntroVideo ? (
                      <div
                        ref={(node) => {
                          videoShellRefs.current[event.slug] = node;
                        }}
                        className="portal-competition-card__video-shell"
                        onClick={(clickEvent) => {
                          clickEvent.stopPropagation();
                          toggleVideoPreview(event.slug);
                        }}
                        onKeyDown={(keyEvent) => {
                          if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
                            keyEvent.preventDefault();
                            keyEvent.stopPropagation();
                            toggleVideoPreview(event.slug);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label={`${event.name} intro video preview. ${videoInstruction}.`}
                      >
                        <img
                          src={event.poster_path}
                          alt={event.name}
                          loading="lazy"
                          decoding="async"
                          className="portal-competition-card__video-poster"
                        />
                        <video
                          ref={(node) => {
                            videoRefs.current[event.slug] = node;
                          }}
                          className={`portal-competition-card__video ${isVideoActive ? 'is-visible' : ''}`}
                          preload="metadata"
                          playsInline
                          muted
                          loop
                          poster={event.poster_path}
                        >
                          <source src={event.intro_video_url} type="video/mp4" />
                          Your browser does not support the event intro video.
                        </video>
                        <div className="portal-competition-card__video-hint" aria-hidden="true">
                          <span className="portal-competition-card__video-hint-icon">
                            <Play size={16} />
                          </span>
                          <span>{videoInstruction}</span>
                        </div>
                      </div>
                    ) : (
                      <img src={event.poster_path} alt={event.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]" />
                    )}
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(7,10,21,0.02),rgba(7,10,21,0.44)_52%,rgba(7,10,21,0.9))]" />
                    <div className="portal-competition-card__noise" aria-hidden="true" />
                    <div className="absolute right-4 top-4 flex flex-wrap justify-end gap-2">
                      <span className={`rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_10px_24px_rgba(2,8,23,0.24)] ${theme.badge}`}>{displayCategory}</span>
                    </div>
                    {!hasIntroVideo ? (
                      <div className="absolute inset-x-4 bottom-4">
                        <div className="portal-competition-card__hero-caption">
                          <p className="portal-card-title portal-competition-card__hero-title text-white">{event.name}</p>
                          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-200/88">{event.date_label} / {event.time_label}</p>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="portal-competition-card__body p-5">
                    <div className="portal-competition-card__topline">
                      <div className="min-w-0">
                        <h4 className="portal-competition-card__title">{event.name}</h4>
                        <p className="portal-competition-card__tagline">{tagline}</p>
                      </div>
                      <span className="portal-competition-card__status">{statusLabel}</span>
                    </div>

                    <div className="portal-competition-card__schedule mt-5">
                      <div className="portal-competition-card__schedule-row">
                        <CalendarDays size={15} />
                        <span>{event.date_label}</span>
                        <span className="portal-competition-card__meta-dot" />
                        <span>{event.time_label}</span>
                      </div>
                      <div className="portal-competition-card__countdown-pill">
                        <Hourglass size={15} />
                        <span>{liveState.countdown}</span>
                      </div>
                    </div>

                    <p className="portal-competition-card__description mt-5 line-clamp-1 text-sm leading-7 text-slate-300">{event.description}</p>

                    <div className="portal-competition-card__stats mt-5">
                      <div className="portal-competition-card__stat-card">
                        <div className="portal-competition-card__stat-label">
                          <Trophy size={13} />
                          <span>Prize Pool</span>
                        </div>
                        <div className="portal-competition-card__stat-value">{event.prize}</div>
                      </div>
                      <div className="portal-competition-card__stat-card">
                        <div className="portal-competition-card__stat-label">
                          <Users size={13} />
                          <span>Team Size</span>
                        </div>
                        <div className="portal-competition-card__stat-value portal-competition-card__stat-value--accent">{teamLabel}</div>
                      </div>
                    </div>

                    <div className="portal-competition-card__action-row mt-4">
                      <div className="portal-competition-card__stat-card portal-competition-card__stat-card--action">
                        <div className="portal-competition-card__stat-label">
                          <CreditCard size={13} />
                          <span>Fee</span>
                        </div>
                        <div className="portal-competition-card__action-split">
                          <div className="portal-competition-card__stat-value portal-competition-card__stat-value--accent">
                            {event.registration_fee_label || formatCurrency(event.registration_fee)}
                          </div>
                          <span className="portal-competition-card__link-text">View Details</span>
                        </div>
                      </div>
                    </div>

                    <div className="portal-competition-card__footer mt-5">
                      <button
                        type="button"
                        onClick={(clickEvent) => {
                          clickEvent.stopPropagation();
                          handleOpenEvent();
                        }}
                        className="portal-register-cta portal-register-cta--compact w-full"
                      >
                        Register Now
                        <ExternalLink size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={(clickEvent) => {
                          clickEvent.stopPropagation();
                          handleOpenEvent();
                        }}
                        className="portal-competition-card__details-button"
                      >
                        <ChevronDown size={16} />
                        View Details
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
      </div>

      {!loadingEvents && visibleEvents.length === 0 ? (
        <div className="mt-6 rounded-[1.5rem] border border-dashed border-white/10 bg-black/20 p-5 text-center text-sm text-slate-400">
          No competitions are available for this category yet.
        </div>
      ) : null}
    </section>
  );
});

export default CompetitionGridSection;
