import React from 'react';
import { BellRing, CalendarClock, Pin, Radio } from 'lucide-react';
import type { PortalAnnouncement } from './types';

type Props = {
  announcements: PortalAnnouncement[];
  loading: boolean;
};

export const AnnouncementArchiveSection: React.FC<Props> = ({ announcements, loading }) => {
  const featured = announcements.slice(0, 3);

  return (
    <section id="announcement-archive" data-reveal="up" className="portal-glow-card portal-glass overflow-hidden rounded-[2rem] p-4 sm:p-5 md:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/18 bg-fuchsia-400/10 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-fuchsia-100 sm:text-[11px]">
            <Radio size={14} />
            Live Update Desk
          </div>
          <h3 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">Updates and reporting-time changes stay at the top.</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            Venue changes, reporting instructions, and organizer notices are surfaced here first so mobile visitors see them before browsing competitions.
          </p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200">
          {announcements.length} notices
        </div>
      </div>

      {loading ? (
        <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-black/10 p-5 text-sm text-slate-300">
          Loading announcements...
        </div>
      ) : null}

      {!loading && announcements.length === 0 ? (
        <div className="mt-5 rounded-[1.5rem] border border-dashed border-white/10 bg-black/10 p-5 text-sm text-slate-400">
          No organizer announcements have been published yet.
        </div>
      ) : null}

      {!loading && featured.length > 0 ? (
        <div className="mt-5 grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-[1.7rem] border border-yellow-300/18 bg-[linear-gradient(145deg,rgba(251,191,36,0.12),rgba(236,72,153,0.08),rgba(59,130,246,0.08))] p-5">
            <div className="flex flex-wrap items-center gap-2">
              {featured[0].is_pinned ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-yellow-300/25 bg-yellow-400/12 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-yellow-100">
                  <Pin size={12} />
                  Priority
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-blue-100">
                  <BellRing size={12} />
                  Notice
                </span>
              )}
              {featured[0].event_name ? (
                <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/80">
                  {featured[0].event_name}
                </span>
              ) : null}
            </div>

            <h4 className="mt-4 text-xl font-semibold text-white sm:text-2xl">{featured[0].title}</h4>
            <p className="mt-3 text-sm leading-7 text-slate-200">{featured[0].message}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.18em] text-slate-400">
              <span className="inline-flex items-center gap-2">
                <CalendarClock size={14} />
                {new Date(featured[0].created_at).toLocaleString()}
              </span>
              {featured[0].created_by ? <span>By {featured[0].created_by}</span> : null}
            </div>
          </article>

          <div className="grid gap-3">
            {featured.slice(1).map((announcement) => (
              <article key={announcement.id} className="rounded-[1.45rem] border border-white/10 bg-[linear-gradient(145deg,rgba(12,20,35,0.92),rgba(18,27,45,0.82))] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-blue-100">
                    <BellRing size={12} />
                    Update
                  </span>
                  {announcement.event_name ? (
                    <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/80">
                      {announcement.event_name}
                    </span>
                  ) : null}
                </div>
                <h5 className="mt-3 text-base font-semibold text-white">{announcement.title}</h5>
                <p className="mt-2 text-sm leading-6 text-slate-300">{announcement.message}</p>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
};
