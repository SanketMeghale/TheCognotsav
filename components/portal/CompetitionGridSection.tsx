import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, CreditCard, ExternalLink, Play, Trophy, Users } from 'lucide-react';
import type { EventRecord } from './types';
import { formatCurrency, getEventLiveState, getTeamLabel } from './utils';

type Props = {
  events: EventRecord[];
  loadingEvents: boolean;
  selectedEventSlug: string;
  onSelectEvent: (slug: string) => void;
};

const categoryThemes: Record<string, { glow: string; badge: string }> = {
  Technical: {
    glow: 'shadow-[0_18px_45px_rgba(56,189,248,0.18)]',
    badge: 'bg-sky-400/14 text-sky-100',
  },
  Sports: {
    glow: 'shadow-[0_18px_45px_rgba(52,211,153,0.18)]',
    badge: 'bg-emerald-400/14 text-emerald-100',
  },
  Gaming: {
    glow: 'shadow-[0_18px_45px_rgba(217,70,239,0.18)]',
    badge: 'bg-fuchsia-400/14 text-fuchsia-100',
  },
  Fun: {
    glow: 'shadow-[0_18px_45px_rgba(251,191,36,0.18)]',
    badge: 'bg-amber-400/14 text-amber-100',
  },
};

const filterOrder = ['All', 'Gaming', 'Technical', 'Fun', 'Sports'] as const;
const categoryOrder = filterOrder.filter((filter): filter is Exclude<(typeof filterOrder)[number], 'All'> => filter !== 'All');
const categoryTaglines: Record<string, string> = {
  Technical: 'Innovate - Present - Accelerate',
  Sports: 'Compete - Perform - Triumph',
  Gaming: 'Squad up - Survive - Dominate',
  Fun: 'Play - Laugh - Conquer',
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

function getSectionAvailability(events: EventRecord[], now: Date) {
  const states = events.map((event) => getEventLiveState(event, now));

  if (events.some((event, index) => event.registration_enabled !== false && states[index]?.label === 'Registration Open')) {
    return 'Available now';
  }

  if (states.some((state) => /open/i.test(state.label) || /starts/i.test(state.countdown) || /left/i.test(state.countdown))) {
    return 'Opening soon';
  }

  if (events.some((event) => event.registration_enabled !== false)) {
    return 'Live updates';
  }

  return 'Updates soon';
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

  const groupedEvents = useMemo(() => {
    if (activeFilter !== 'All') {
      return [{ category: activeFilter, events: visibleEvents }];
    }

    return categoryOrder
      .map((category) => ({
        category,
        events: visibleEvents.filter((event) => getDisplayCategory(event) === category),
      }))
      .filter((group) => group.events.length > 0);
  }, [activeFilter, visibleEvents]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setActiveVideoSlug(null);
  }, [activeFilter]);

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
        video.volume = 0;
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
      video.volume = 0;
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
                  ? 'bg-gradient-to-r from-sky-400 to-blue-400 text-slate-950 shadow-[0_12px_30px_rgba(59,130,246,0.28)]'
                  : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="portal-competition-groups mt-6">
        {loadingEvents
          ? Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="rounded-[1.8rem] border border-white/10 bg-white/[0.04] p-4">
                <div className="h-56 animate-pulse rounded-[1.4rem] bg-white/10" />
                <div className="mt-4 h-4 w-20 animate-pulse rounded-full bg-white/10" />
                <div className="mt-3 h-6 w-2/3 animate-pulse rounded-full bg-white/10" />
              </div>
            ))
          : groupedEvents.map((group) => {
              const groupTheme = categoryThemes[group.category] || categoryThemes.Technical;

              return (
                <div key={group.category} className="portal-competition-group">
                  <div className="portal-competition-group__header">
                    <div className="portal-competition-group__heading-wrap">
                      <h4 className="portal-competition-group__title">{group.category}</h4>
                      <span className="portal-competition-group__line" aria-hidden="true" />
                    </div>
                    <span className={`portal-competition-group__badge ${groupTheme.badge}`}>
                      {getSectionAvailability(group.events, now)}
                    </span>
                  </div>

                  <div className="portal-competition-group__grid">
                    {group.events.map((event) => {
                      const active = event.slug === selectedEventSlug;
                      const displayCategory = getDisplayCategory(event);
                      const theme = categoryThemes[displayCategory] || categoryThemes.Technical;
                      const liveState = getEventLiveState(event, now);
                      const teamLabel = getTeamLabel(event);
                      const handleOpenEvent = () => onSelectEvent(event.slug);
                      const hasIntroVideo = Boolean(event.intro_video_url);
                      const isVideoActive = activeVideoSlug === event.slug;
                      const statusLabel = event.registration_enabled === false
                        ? 'Registration paused'
                        : liveState.label === 'Registration Open'
                          ? 'Open now'
                          : liveState.label;
                      const subtitle = event.description || categoryTaglines[displayCategory] || categoryTaglines.Technical;
                      const feeLabel = event.registration_fee_label || formatCurrency(event.registration_fee);

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
                          className={`portal-competition-card portal-competition-card--showcase group tilt-card h-full cursor-pointer overflow-hidden rounded-[1.7rem] border text-left transition duration-200 ${
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
                              >
                                <img
                                  src={event.poster_path}
                                  alt={event.name}
                                  loading="lazy"
                                  decoding="async"
                                  className={`portal-competition-card__video-poster ${isVideoActive ? 'is-hidden' : ''}`}
                                />
                                <video
                                  ref={(node) => {
                                    videoRefs.current[event.slug] = node;
                                  }}
                                  className={`portal-competition-card__video ${isVideoActive ? 'is-visible' : ''}`}
                                  preload="metadata"
                                  playsInline
                                  loop
                                  muted
                                  poster={event.poster_path}
                                >
                                  <source src={event.intro_video_url} type="video/mp4" />
                                  Your browser does not support the event intro video.
                                </video>
                              </div>
                            ) : (
                              <img
                                src={event.poster_path}
                                alt={event.name}
                                loading="lazy"
                                decoding="async"
                                className="portal-competition-card__poster h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                              />
                            )}

                            <div className="portal-competition-card__noise" aria-hidden="true" />
                            <div className="portal-competition-card__media-overlay" aria-hidden="true" />
                            <div className="portal-competition-card__media-top">
                              <span className={`portal-competition-card__category-pill ${theme.badge}`}>{displayCategory}</span>
                              {hasIntroVideo ? (
                                <button
                                  type="button"
                                  className={`portal-competition-card__preview-toggle ${isVideoActive ? 'is-active' : ''}`}
                                  onClick={(clickEvent) => {
                                    clickEvent.stopPropagation();
                                    toggleVideoPreview(event.slug);
                                  }}
                                  aria-label={`${isVideoActive ? 'Stop preview' : 'Preview'} for ${event.name}`}
                                >
                                  <Play size={14} />
                                  <span>{isVideoActive ? 'Playing' : 'Preview'}</span>
                                </button>
                              ) : null}
                            </div>
                          </div>

                          <div className="portal-competition-card__body portal-competition-card__body--compact p-5">
                            <div className="portal-competition-card__topline">
                              <span className="portal-competition-card__status">{statusLabel}</span>
                              <span className="portal-competition-card__date-chip">
                                <CalendarDays size={13} />
                                <span>{event.date_label}</span>
                              </span>
                            </div>

                            <div className="portal-competition-card__title-block">
                              <h4 className="portal-competition-card__title">{event.name}</h4>
                              <p className="portal-competition-card__tagline line-clamp-1">{subtitle}</p>
                            </div>

                            <div className="portal-competition-card__meta-list">
                              <div className="portal-competition-card__meta-row portal-competition-card__meta-row--wide portal-competition-card__meta-row--highlight">
                                <Trophy size={14} />
                                <span>{event.prize}</span>
                              </div>
                              <div className="portal-competition-card__meta-row">
                                <Users size={14} />
                                <span>{teamLabel}</span>
                              </div>
                              <div className="portal-competition-card__meta-row">
                                <CreditCard size={14} />
                                <span>Fee {feeLabel}</span>
                              </div>
                              <div className="portal-competition-card__meta-row portal-competition-card__meta-row--wide">
                                <CalendarDays size={14} />
                                <span>{event.time_label}</span>
                              </div>
                            </div>

                            <div className="portal-competition-card__footer portal-competition-card__footer--inline">
                              <span className="portal-competition-card__link-text">Tap card for details</span>
                              <button
                                type="button"
                                onClick={(clickEvent) => {
                                  clickEvent.stopPropagation();
                                  handleOpenEvent();
                                }}
                                className="portal-register-cta portal-register-cta--compact portal-register-cta--card"
                              >
                                {event.registration_enabled === false ? 'View Details' : 'Register Now'}
                                <ExternalLink size={16} />
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
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
