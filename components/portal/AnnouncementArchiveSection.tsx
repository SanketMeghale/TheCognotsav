import React from 'react';
import { BellRing, CalendarClock, Pin } from 'lucide-react';
import type { PortalAnnouncement } from './types';

type Props = {
  announcements: PortalAnnouncement[];
  loading: boolean;
};

export const AnnouncementArchiveSection: React.FC<Props> = ({ announcements, loading }) => {
  return (
    <section id="announcement-archive" data-reveal="up" className="portal-glow-card portal-glass rounded-[2rem] p-6 md:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-blue-300/80">Announcement archive</p>
          <h3 className="mt-2 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text font-orbitron text-3xl font-black uppercase text-transparent">
            Official updates
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">
            Reporting-time changes, venue updates, and organizer broadcasts stay visible here so participants can re-check the latest instructions anytime.
          </p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200">
          {announcements.length} notices
        </div>
      </div>

      {loading ? (
        <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-black/10 p-5 text-sm text-slate-300">
          Loading announcements...
        </div>
      ) : null}

      {!loading && announcements.length === 0 ? (
        <div className="mt-6 rounded-[1.5rem] border border-dashed border-white/10 bg-black/10 p-5 text-sm text-slate-400">
          No organizer announcements have been published yet.
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {announcements.map((announcement) => (
          <article
            key={announcement.id}
            data-reveal="up"
            className={`tilt-card rounded-[1.6rem] border p-5 ${
              announcement.is_pinned
                ? 'border-yellow-300/18 bg-gradient-to-br from-yellow-400/12 via-pink-500/10 to-blue-500/10'
                : 'border-white/10 bg-[linear-gradient(145deg,rgba(12,20,35,0.92),rgba(18,27,45,0.82))]'
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              {announcement.is_pinned ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-yellow-300/25 bg-yellow-400/12 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-yellow-100">
                  <Pin size={12} />
                  Pinned
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-blue-100">
                  <BellRing size={12} />
                  Notice
                </span>
              )}
              {announcement.event_name ? (
                <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/80">
                  {announcement.event_name}
                </span>
              ) : null}
            </div>

            <h4 className="mt-4 text-xl font-bold text-white">{announcement.title}</h4>
            <p className="mt-3 text-sm leading-7 text-slate-200">{announcement.message}</p>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-400">
              <span className="inline-flex items-center gap-2">
                <CalendarClock size={14} />
                {new Date(announcement.created_at).toLocaleString()}
              </span>
              {announcement.created_by ? <span>By {announcement.created_by}</span> : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
