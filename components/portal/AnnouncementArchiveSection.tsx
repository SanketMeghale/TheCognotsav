import React from 'react';
import { BellRing, CalendarClock, Pin, Radio } from 'lucide-react';
import type { PortalAnnouncement } from './types';

type Props = {
  announcements: PortalAnnouncement[];
  loading: boolean;
};

export const AnnouncementArchiveSection: React.FC<Props> = ({ announcements, loading }) => {
  const featured = announcements.slice(0, 4);

  return (
    <section id="announcement-archive" data-reveal="up" className="portal-glow-card portal-glass overflow-hidden rounded-[2rem] p-4 sm:p-5 md:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/18 bg-fuchsia-400/10 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-fuchsia-100 sm:text-[11px]">
          <Radio size={14} />
          Live Updates
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
        <div className="mt-4 space-y-3">
          <div className="portal-live-strip">
            <div className="portal-live-strip__track">
              {[...featured, ...featured].map((announcement, index) => (
                <div key={`${announcement.id}-${index}`} className="portal-live-pill">
                  <span className="portal-live-dot" />
                  <span className="font-semibold text-white">{announcement.title}</span>
                  {announcement.event_name ? <span className="text-cyan-200/85">{announcement.event_name}</span> : null}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {featured.slice(0, 4).map((announcement, index) => (
              <article key={announcement.id} className={`portal-update-card ${index === 0 ? 'portal-update-card--featured' : ''}`}>
                <div className="flex flex-wrap items-center gap-2">
                  {announcement.is_pinned ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-yellow-300/25 bg-yellow-400/12 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-yellow-100">
                      <Pin size={12} />
                      Priority
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-blue-100">
                      <BellRing size={12} />
                      Update
                    </span>
                  )}
                  {announcement.event_name ? (
                    <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/80">
                      {announcement.event_name}
                    </span>
                  ) : null}
                </div>
                <h5 className="mt-3 text-base font-semibold text-white">{announcement.title}</h5>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-300">{announcement.message}</p>
                <div className="mt-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  <CalendarClock size={12} />
                  {new Date(announcement.created_at).toLocaleString()}
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
};
