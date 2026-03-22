import React, { useEffect, useMemo, useState } from 'react';
import { BellRing, CalendarClock, Eye, EyeOff, Pin, Radio } from 'lucide-react';
import type { EventRecord, PortalAlert, PortalAnnouncement } from './types';
import { getEventLiveState, parsePortalEventDate } from './utils';

type Props = {
  announcements: PortalAnnouncement[];
  events: EventRecord[];
  alerts: PortalAlert[];
  loading: boolean;
};

export const AnnouncementArchiveSection: React.FC<Props> = ({ announcements, events, alerts, loading }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const featured = announcements.slice(0, 4);
  const lead = featured[0] ?? null;
  const secondary = featured.slice(1, 4);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const nextEvent = useMemo(
    () =>
      [...events]
        .filter((event) => {
          const eventDate = parsePortalEventDate(event.date_label, event.time_label);
          return eventDate ? eventDate.getTime() > now.getTime() : false;
        })
        .sort((left, right) => {
          const leftDate = parsePortalEventDate(left.date_label, left.time_label);
          const rightDate = parsePortalEventDate(right.date_label, right.time_label);
          return (leftDate?.getTime() || 0) - (rightDate?.getTime() || 0);
        })[0] ?? null,
    [events, now],
  );

  const liveCount = useMemo(
    () => events.filter((event) => getEventLiveState(event, now).tone === 'live').length,
    [events, now],
  );

  const stripItems = useMemo(() => {
    const alertItems = alerts.slice(0, 3).map((alert) => alert.title);
    const statusItems = [
      `Live now: ${liveCount}`,
      nextEvent ? `Next: ${nextEvent.name} • ${getEventLiveState(nextEvent, now).countdown}` : 'Next: schedule syncing',
      `Updates: ${announcements.length}`,
    ];

    return [...statusItems, ...alertItems];
  }, [alerts, announcements.length, liveCount, nextEvent, now]);

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

      <div className="mt-4 portal-live-strip">
        <div className="portal-live-strip__track">
          {[...stripItems, ...stripItems].map((item, index) => (
            <div key={`${item}-${index}`} className="portal-live-pill">
              <span className="portal-live-dot" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={() => setCollapsed((current) => !current)}
          className="magnetic-button inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-100"
        >
          {collapsed ? <Eye size={13} /> : <EyeOff size={13} />}
          {collapsed ? 'Show Updates' : 'Hide Updates'}
        </button>
      </div>

      {collapsed ? null : loading ? (
        <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-black/10 p-5 text-sm text-slate-300">
          Loading announcements...
        </div>
      ) : null}

      {!collapsed && !loading && announcements.length === 0 ? (
        <div className="mt-5 rounded-[1.5rem] border border-dashed border-white/10 bg-black/10 p-5 text-sm text-slate-400">
          No organizer announcements have been published yet.
        </div>
      ) : null}

      {!collapsed && !loading && lead ? (
        <div className="mt-5 space-y-4">
          <div className="portal-update-marquee">
            <div className="portal-update-marquee__track">
              {[...featured, ...featured].map((announcement, index) => (
                <div key={`${announcement.id}-${index}`} className="portal-update-marquee__pill">
                  <span className="portal-live-dot" />
                  <span>{announcement.title}</span>
                  {announcement.event_name ? <span className="text-cyan-200/80">{announcement.event_name}</span> : null}
                </div>
              ))}
            </div>
          </div>

          <div className="portal-update-layout">
            <article className="portal-update-lead">
              <div className="flex flex-wrap items-center gap-2">
                {lead.is_pinned ? (
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
                {lead.event_name ? (
                  <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/80">
                    {lead.event_name}
                  </span>
                ) : null}
              </div>
              <h4 className="mt-4 portal-title-lg font-bold text-white">{lead.title}</h4>
              <p className="mt-3 text-sm leading-7 text-slate-300">{lead.message}</p>
              <div className="mt-4 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                <CalendarClock size={12} />
                {new Date(lead.created_at).toLocaleString()}
              </div>
            </article>

            <div className="portal-update-stack">
              {secondary.map((announcement) => (
                <article key={announcement.id} className="portal-update-stack__card">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-cyan-200/85">
                    <span className="portal-live-dot" />
                    {announcement.event_name || 'General update'}
                  </div>
                  <h5 className="mt-3 text-sm font-semibold text-white">{announcement.title}</h5>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-300">{announcement.message}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};
