import React, { useMemo, useState } from 'react';
import { AlertTriangle, BellRing, Clock3, Sparkles, X } from 'lucide-react';
import type { PortalAlert } from './types';
import { shellClassName } from './utils';

type Props = {
  alerts: PortalAlert[];
  loading: boolean;
};

const toneStyles: Record<PortalAlert['severity'], string> = {
  info: 'border-blue-300/18 bg-blue-500/10 text-blue-100',
  warning: 'border-yellow-300/18 bg-yellow-500/10 text-yellow-100',
  critical: 'border-rose-300/18 bg-rose-500/10 text-rose-100',
};

const cardStyles: Record<PortalAlert['severity'], string> = {
  info: 'from-blue-500/14 via-cyan-400/10 to-transparent border-blue-300/12',
  warning: 'from-yellow-500/14 via-orange-400/10 to-transparent border-yellow-300/12',
  critical: 'from-rose-500/14 via-pink-500/10 to-transparent border-rose-300/12',
};

function getAlertIcon(alert: PortalAlert) {
  if (alert.kind === 'event-starting-soon') return Clock3;
  if (alert.severity === 'critical') return AlertTriangle;
  return BellRing;
}

export const SmartAlertsPanel: React.FC<Props> = ({ alerts, loading }) => {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  const visibleAlerts = useMemo(
    () =>
      alerts.filter(
        (alert) => !dismissedIds.includes(alert.id),
      ),
    [alerts, dismissedIds],
  );

  return (
    <section id="smart-alerts" className="py-4 md:py-5">
      <div className={`${shellClassName}`}>
        <div className="portal-glow-card portal-glass overflow-hidden rounded-[2rem] p-5 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
            </div>
          </div>

          {loading ? (
            <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 text-sm text-slate-300">
              Checking for live event alerts...
            </div>
          ) : visibleAlerts.length > 0 && (
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {visibleAlerts.map((alert) => {
                const Icon = getAlertIcon(alert);

                return (
                  <article
                    key={alert.id}
                    data-reveal="up"
                    className={`tilt-card rounded-[1.6rem] border bg-gradient-to-br p-5 shadow-[0_20px_55px_rgba(2,8,23,0.16)] backdrop-blur-xl ${cardStyles[alert.severity]}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className={`rounded-2xl border p-3 ${toneStyles[alert.severity]}`}>
                          <Icon size={18} />
                        </div>
                        <div>
                          <div className={`inline-flex rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.22em] ${toneStyles[alert.severity]}`}>
                            {alert.kind === 'event-starting-soon' ? 'Event starts soon' : 'Registration closing soon'}
                          </div>
                          <p className="mt-3 text-lg font-bold text-white">{alert.title}</p>
                          <p className="mt-2 text-sm leading-7 text-slate-200">{alert.message}</p>
                          <p className="mt-3 text-xs uppercase tracking-[0.22em] text-slate-400">
                            {alert.event_name}
                            {alert.remaining_slots !== null ? ` / ${alert.remaining_slots} slots left` : ''}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setDismissedIds((current) => [...current, alert.id])}
                        className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:text-white"
                        aria-label="Dismiss alert"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="inline-flex items-center gap-2 text-sm text-slate-300">
                        <Sparkles size={15} className="text-cyan-300" />
                        {alert.minutes_until_start !== null
                          ? `Starts in about ${Math.max(alert.minutes_until_start, 1)} minutes`
                          : 'Watch this event closely'}
                      </div>

                      <a
                        href={alert.cta_href}
                        className="magnetic-button rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white"
                      >
                        {alert.cta_label}
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
