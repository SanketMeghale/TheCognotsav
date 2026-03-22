import React, { useEffect, useMemo, useState } from 'react';
import { Activity, BellRing, Clock3, RadioTower, Sparkles } from 'lucide-react';
import type { EventRecord, PortalAlert } from './types';
import { getEventLiveState, parsePortalEventDate, shellClassName } from './utils';

type Props = {
  events: EventRecord[];
  alerts: PortalAlert[];
  loadingEvents: boolean;
  loadingAlerts: boolean;
};

const toneStyles = {
  open: 'border-emerald-300/18 bg-emerald-400/10 text-emerald-100',
  warning: 'border-amber-300/18 bg-amber-400/10 text-amber-100',
  critical: 'border-rose-300/18 bg-rose-400/10 text-rose-100',
  live: 'border-cyan-300/18 bg-cyan-400/10 text-cyan-100',
  muted: 'border-slate-300/12 bg-slate-400/10 text-slate-200',
} as const;

export const LiveCommandCenter: React.FC<Props> = ({ events, alerts, loadingEvents, loadingAlerts }) => {
  const [now, setNow] = useState(() => new Date());

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

  const reportingTodayCount = useMemo(
    () => events.filter((event) => getEventLiveState(event, now).tone === 'critical').length,
    [events, now],
  );

  const totalRegistrations = useMemo(
    () => events.reduce((sum, event) => sum + Number(event.registrations_count || 0), 0),
    [events],
  );

  const feedItems = useMemo(() => {
    if (alerts.length > 0) {
      return alerts.map((alert) => alert.title);
    }

    return events.slice(0, 6).map((event) => {
      const liveState = getEventLiveState(event, now);
      return `${event.name} • ${liveState.label} • ${liveState.countdown}`;
    });
  }, [alerts, events, now]);

  return (
    <section id="command-center" className="py-1 md:py-2">
      <div className={shellClassName}>
        <div className="portal-glow-card overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(4,10,26,0.95),rgba(10,18,37,0.92)_48%,rgba(6,20,35,0.95))] p-4 shadow-[0_28px_80px_rgba(2,8,23,0.28)] md:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/18 bg-cyan-400/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100">
                <RadioTower size={14} />
                Live Command Center
              </div>
              <h3 className="mt-3 text-2xl font-black text-white md:text-3xl">Event-day pulse across the portal</h3>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
                Track the next event start, live competition windows, active alerts, and current registration energy in one place.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs uppercase tracking-[0.2em] text-slate-300">
              <Sparkles size={14} className="text-amber-200" />
              {loadingEvents || loadingAlerts ? 'Syncing live data' : `Updated ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.05] p-4">
              <div className="flex items-center gap-2 text-slate-400">
                <Activity size={16} className="text-cyan-300" />
                <p className="text-[11px] uppercase tracking-[0.18em]">Live Now</p>
              </div>
              <p className="mt-3 text-3xl font-black text-white">{liveCount}</p>
              <p className="mt-2 text-sm text-slate-300">{reportingTodayCount} more in reporting/closing window</p>
            </div>
            <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.05] p-4">
              <div className="flex items-center gap-2 text-slate-400">
                <Clock3 size={16} className="text-amber-200" />
                <p className="text-[11px] uppercase tracking-[0.18em]">Next Event</p>
              </div>
              <p className="mt-3 text-base font-bold text-white">{nextEvent?.name || 'Waiting for schedule'}</p>
              <p className="mt-2 text-sm text-slate-300">
                {nextEvent ? getEventLiveState(nextEvent, now).countdown : 'No upcoming event found.'}
              </p>
            </div>
            <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.05] p-4">
              <div className="flex items-center gap-2 text-slate-400">
                <BellRing size={16} className="text-fuchsia-200" />
                <p className="text-[11px] uppercase tracking-[0.18em]">Active Alerts</p>
              </div>
              <p className="mt-3 text-3xl font-black text-white">{alerts.length}</p>
              <p className="mt-2 text-sm text-slate-300">Real-time reminders and closing-window notices.</p>
            </div>
            <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.05] p-4">
              <div className="flex items-center gap-2 text-slate-400">
                <Sparkles size={16} className="text-emerald-200" />
                <p className="text-[11px] uppercase tracking-[0.18em]">Registrations</p>
              </div>
              <p className="mt-3 text-3xl font-black text-white">{totalRegistrations}</p>
              <p className="mt-2 text-sm text-slate-300">Combined approved and pending event entries so far.</p>
            </div>
          </div>

          <div className="mt-5 portal-live-strip">
            <div className="portal-live-strip__track">
              {[...feedItems, ...feedItems].map((item, index) => (
                <div key={`${item}-${index}`} className="portal-live-pill">
                  <span className="portal-live-dot" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {!loadingEvents && nextEvent ? (
            <div className="mt-5 flex flex-wrap gap-3">
              {(() => {
                const nextState = getEventLiveState(nextEvent, now);
                return (
                  <>
                    <span className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold ${toneStyles[nextState.tone]}`}>
                      {nextState.label}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-slate-200">
                      {nextEvent.date_label} / {nextEvent.time_label}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-slate-200">
                      {nextState.countdown}
                    </span>
                  </>
                );
              })()}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default LiveCommandCenter;
