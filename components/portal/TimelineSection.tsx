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
  sourceSlugs: string[];
};

type TimelineSourceEvent = {
  event: EventRecord;
  sortAt: number;
  sourceSlugs: string[];
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
  'ranbhoomi-esports-combined': Gamepad2,
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

  return `${dates[0]} - ${dates[dates.length - 1]}`;
}

function getTimelineEventTimestamp(event: EventRecord) {
  return parsePortalEventDate(event.date_label, event.time_label)?.getTime() ?? Number.MAX_SAFE_INTEGER;
}

function combineTimelineLabel(primary: string, secondary: string, separator: string) {
  return primary === secondary ? primary : `${primary}${separator}${secondary}`;
}

function mergeTimelineEvents(events: EventRecord[]): TimelineSourceEvent[] {
  const baseEntries = events.map((event) => ({
    event,
    sortAt: getTimelineEventTimestamp(event),
    sourceSlugs: [event.slug],
  }));

  const bgmiEvent = events.find((event) => event.slug === 'bgmi-esports');
  const freeFireEvent = events.find((event) => event.slug === 'ff-esports');

  if (!bgmiEvent || !freeFireEvent) {
    return baseEntries;
  }

  const mergedEvent: EventRecord = {
    ...bgmiEvent,
    slug: 'ranbhoomi-esports-combined',
    name: 'Ranbhoomi: BGMI + Free Fire',
    date_label: combineTimelineLabel(bgmiEvent.date_label, freeFireEvent.date_label, ' / '),
    time_label: combineTimelineLabel(bgmiEvent.time_label, freeFireEvent.time_label, ' / '),
    venue: combineTimelineLabel(bgmiEvent.venue, freeFireEvent.venue, ' / '),
    registration_enabled: bgmiEvent.registration_enabled || freeFireEvent.registration_enabled,
    registrations_count: bgmiEvent.registrations_count + freeFireEvent.registrations_count,
    waitlist_count: bgmiEvent.waitlist_count + freeFireEvent.waitlist_count,
    coordinators: [...bgmiEvent.coordinators, ...freeFireEvent.coordinators].filter(
      (coordinator, index, coordinators) =>
        coordinators.findIndex((entry) => entry.name === coordinator.name && entry.phone === coordinator.phone) === index,
    ),
  };

  return [
    ...baseEntries.filter((entry) => entry.event.slug !== 'bgmi-esports' && entry.event.slug !== 'ff-esports'),
    {
      event: mergedEvent,
      sortAt: Math.min(getTimelineEventTimestamp(bgmiEvent), getTimelineEventTimestamp(freeFireEvent)),
      sourceSlugs: ['bgmi-esports', 'ff-esports'],
    },
  ];
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

function TimelineEventCard({ entry, side, compact = false }: { entry: TimelineEntry; side: 'left' | 'right'; compact?: boolean }) {
  const { event, tone, isFocused, focusLabel } = entry;
  const Icon = getTimelineIcon(event);

  return (
    <div className={`portal-cosmos-timeline__card-wrap portal-cosmos-timeline__card-wrap--${side} ${compact ? 'portal-cosmos-timeline__card-wrap--compact' : ''} portal-cosmos-timeline__tone--${tone}`}>
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

    return mergeTimelineEvents(events)
      .sort((left, right) => left.sortAt - right.sortAt)
      .map(({ event, sourceSlugs }, index) => {
        const focusedEvent = sourceSlugs.includes(focusSlug ?? '')
          ? events.find((sourceEvent) => sourceEvent.slug === focusSlug) ?? event
          : event;

        return {
          event,
          sourceSlugs,
          tone: getTimelineTone(event, index),
          isFocused: Boolean(focusSlug && sourceSlugs.includes(focusSlug)),
          focusLabel: sourceSlugs.includes(focusSlug ?? '') ? getTimelineFocusLabel(focusedEvent, now) : '',
        };
      });
  }, [events, now]);

  const timelineRows = useMemo(() => chunkTimelineRows(timelineEntries), [timelineEntries]);
  const dateRange = useMemo(() => getTimelineDateRange(events), [events]);
  const uniqueDates = useMemo(() => new Set(events.map((event) => event.date_label)).size, [events]);

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

        <div className="portal-cosmos-timeline__board portal-cosmos-timeline__board--desktop">
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

        <div className="portal-cosmos-timeline__board-mobile">
          {timelineEntries.map((entry) => (
            <div key={`timeline-mobile-${entry.event.slug}`} className="portal-cosmos-timeline__mobile-row">
              <div className="portal-cosmos-timeline__mobile-rail">
                <span className={`portal-cosmos-timeline__node ${entry.isFocused ? 'is-focused' : ''}`} />
              </div>
              <TimelineEventCard entry={entry} side="right" compact />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TimelineSection;
