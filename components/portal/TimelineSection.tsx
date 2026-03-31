import React, { useMemo } from 'react';
import { CalendarDays, Clock3, Cpu, Gamepad2, MapPin, MonitorUp, Rocket, Search, Sparkles, Trophy, Users } from 'lucide-react';
import { getEventLiveState, getTeamLabel, parsePortalEventDate, shellClassName } from './utils';
import type { EventRecord } from './types';

type TimelineSectionProps = {
  standalone?: boolean;
  events: EventRecord[];
};

type TimelineTone = 'cyan' | 'violet' | 'amber' | 'rose' | 'emerald' | 'blue';

type TimelineEntry = {
  event: EventRecord;
  tone: TimelineTone;
  isFocused: boolean;
  focusLabel: string;
};

const toneSequence: TimelineTone[] = ['cyan', 'violet', 'amber', 'rose', 'emerald', 'blue'];

const toneByCategory: Partial<Record<string, TimelineTone>> = {
  Technical: 'cyan',
  Gaming: 'violet',
  Fun: 'amber',
  Sports: 'emerald',
};

const eventIconBySlug: Record<string, typeof CalendarDays> = {
  'bgmi-esports': Gamepad2,
  'ff-esports': Gamepad2,
  'tech-kbc': Cpu,
  'googler-hunt': Search,
  techxcelerate: Rocket,
  utopia: MonitorUp,
  'rang-manch': Sparkles,
  'squid-game': Trophy,
};

const fallbackIconByCategory: Record<string, typeof CalendarDays> = {
  Technical: Cpu,
  Gaming: Gamepad2,
  Fun: Sparkles,
  Sports: Trophy,
};

function getCurrentEventSlug(events: EventRecord[], now: Date) {
  const orderedEvents = events
    .map((event) => ({
      event,
      eventDate: parsePortalEventDate(event.date_label, event.time_label),
    }))
    .filter((entry): entry is { event: EventRecord; eventDate: Date } => Boolean(entry.eventDate))
    .sort((left, right) => left.eventDate.getTime() - right.eventDate.getTime());

  const liveEntry = orderedEvents.find(({ eventDate }) => {
    const endAt = eventDate.getTime() + 4 * 60 * 60 * 1000;
    return now.getTime() >= eventDate.getTime() && now.getTime() < endAt;
  });

  if (liveEntry) {
    return liveEntry.event.slug;
  }

  const upcomingEntry = orderedEvents.find(({ eventDate }) => eventDate.getTime() >= now.getTime());
  if (upcomingEntry) {
    return upcomingEntry.event.slug;
  }

  return orderedEvents.at(-1)?.event.slug ?? null;
}

function getTimelineTone(event: EventRecord, index: number): TimelineTone {
  return toneByCategory[event.category] ?? toneSequence[index % toneSequence.length];
}

function getTimelineIcon(event: EventRecord) {
  return eventIconBySlug[event.slug] || fallbackIconByCategory[event.category] || CalendarDays;
}

function getTimelineFocusLabel(event: EventRecord, now: Date) {
  const liveState = getEventLiveState(event, now);

  if (liveState.tone === 'live') return 'Live Now';
  if (liveState.tone === 'muted') return 'Wrapped';
  return 'Next Up';
}

function getTimelineDateRange(events: EventRecord[]) {
  const dates = Array.from(new Set(events.map((event) => event.date_label)));

  if (dates.length === 0) return 'Schedule pending';
  if (dates.length === 1) return dates[0];

  return `${dates[0]} • ${dates[dates.length - 1]}`;
}

function chunkTimelineRows(entries: TimelineEntry[]) {
  const rows: Array<{ left: TimelineEntry | null; right: TimelineEntry | null; isFocused: boolean }> = [];

  for (let index = 0; index < entries.length; index += 2) {
    const left = entries[index] ?? null;
    const right = entries[index + 1] ?? null;

    rows.push({
      left,
      right,
      isFocused: Boolean(left?.isFocused || right?.isFocused),
    });
  }

  return rows;
}

function TimelineEventCard({ entry, side }: { entry: TimelineEntry; side: 'left' | 'right' }) {
  const { event, tone, isFocused, focusLabel } = entry;
  const Icon = getTimelineIcon(event);

  return (
    <div className={`portal-cosmos-timeline__card-wrap portal-cosmos-timeline__card-wrap--${side} portal-cosmos-timeline__tone--${tone}`}>
      <article className={`portal-cosmos-timeline-card ${isFocused ? 'is-focused' : ''}`}>
        <div className="portal-cosmos-timeline-card__date-pill">{event.date_label}</div>

        <div className="portal-cosmos-timeline-card__body">
          <div className="portal-cosmos-timeline-card__icon-shell">
            <Icon size={24} />
          </div>

          <div className="portal-cosmos-timeline-card__copy">
            <div className="portal-cosmos-timeline-card__title-row">
              <h4>{event.name}</h4>
              {isFocused ? <span className="portal-cosmos-timeline-card__focus-chip">{focusLabel}</span> : null}
            </div>

            <p className="portal-cosmos-timeline-card__time">{event.time_label}</p>

            <div className="portal-cosmos-timeline-card__meta">
              <span>
                <MapPin size={13} />
                {event.venue}
              </span>
              <span>
                <Users size={13} />
                {getTeamLabel(event)}
              </span>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}

export const TimelineSection: React.FC<TimelineSectionProps> = ({ standalone = false, events }) => {
  const now = new Date();

  const timelineEntries = useMemo(() => {
    const focusSlug = getCurrentEventSlug(events, now);

    return [...events]
      .sort((left, right) => {
        const leftTime = parsePortalEventDate(left.date_label, left.time_label)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const rightTime = parsePortalEventDate(right.date_label, right.time_label)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return leftTime - rightTime;
      })
      .map((event, index) => ({
        event,
        tone: getTimelineTone(event, index),
        isFocused: focusSlug === event.slug,
        focusLabel: focusSlug === event.slug ? getTimelineFocusLabel(event, now) : '',
      }));
  }, [events, now]);

  const timelineRows = useMemo(() => chunkTimelineRows(timelineEntries), [timelineEntries]);
  const dateRange = useMemo(() => getTimelineDateRange(timelineEntries.map((entry) => entry.event)), [timelineEntries]);
  const uniqueDates = useMemo(() => new Set(timelineEntries.map((entry) => entry.event.date_label)).size, [timelineEntries]);

  if (events.length === 0) {
    return (
      <section id={standalone ? undefined : 'timeline'} className={standalone ? '' : `${shellClassName} py-4 md:py-8`}>
        <div className="portal-cosmos-timeline portal-cosmos-timeline--empty">
          <p className="portal-cosmos-timeline__eyebrow">Timeline unavailable</p>
          <p className="portal-cosmos-timeline__empty-copy">The event schedule is still loading. Refresh in a moment to see the full timeline.</p>
        </div>
      </section>
    );
  }

  return (
    <section id={standalone ? undefined : 'timeline'} className={standalone ? '' : `${shellClassName} py-4 md:py-8`}>
      <div className={`portal-cosmos-timeline ${standalone ? 'portal-cosmos-timeline--standalone' : ''}`}>
        <div className="portal-cosmos-timeline__hero">
          <p className="portal-cosmos-timeline__eyebrow">CEAS PRESENTS</p>
          <h3 className="portal-cosmos-timeline__title">COGNOTSAV-2K26</h3>
          <p className="portal-cosmos-timeline__subtitle">State-Level Technical Event Timeline</p>

          <div className="portal-cosmos-timeline__summary">
            <span>
              <CalendarDays size={14} />
              {dateRange}
            </span>
            <span>{timelineEntries.length} Events</span>
            <span>{uniqueDates} Days</span>
          </div>
        </div>

        <div className="portal-cosmos-timeline__board">
          {timelineRows.map((row, rowIndex) => (
            <div key={`timeline-row-${rowIndex}`} className="portal-cosmos-timeline__row">
              <div className="portal-cosmos-timeline__lane portal-cosmos-timeline__lane--left">
                {row.left ? <TimelineEventCard entry={row.left} side="left" /> : null}
              </div>

              <div className="portal-cosmos-timeline__center">
                <span className={`portal-cosmos-timeline__node ${row.isFocused ? 'is-focused' : ''}`} />
              </div>

              <div className="portal-cosmos-timeline__lane portal-cosmos-timeline__lane--right">
                {row.right ? <TimelineEventCard entry={row.right} side="right" /> : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TimelineSection;
