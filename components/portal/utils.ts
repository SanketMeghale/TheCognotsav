import type { EventRecord, ParticipantDraft } from './types';

export const inputClassName =
  'w-full rounded-2xl border border-white/10 bg-[#0f1824] px-4 py-3 text-white outline-none transition focus:border-cyan-400/60';

export const shellClassName = 'mx-auto w-full max-w-[1320px] px-3 sm:px-5 lg:px-8';

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function getTeamLabel(event: EventRecord) {
  if (event.min_members === event.max_members) {
    return event.min_members === 1 ? 'Solo' : `${event.min_members} members`;
  }

  return `${event.min_members}-${event.max_members} members`;
}

export function makeParticipants(count: number): ParticipantDraft[] {
  return Array.from({ length: count }, () => ({
    fullName: '',
    email: '',
    phone: '',
  }));
}

const IST_OFFSET_MINUTES = 330;
const monthIndexByShortName: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

export function parsePortalEventDate(dateLabel: string, timeLabel: string) {
  const dateMatch = String(dateLabel || '').match(/^(\d{1,2})\s([A-Za-z]{3})\s(\d{4})$/);
  const timeMatch = String(timeLabel || '').match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!dateMatch || !timeMatch) {
    return null;
  }

  const day = Number(dateMatch[1]);
  const monthIndex = monthIndexByShortName[dateMatch[2]];
  const year = Number(dateMatch[3]);
  const hour12 = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const meridiem = timeMatch[3].toUpperCase();

  if (monthIndex === undefined) {
    return null;
  }

  let hour24 = hour12 % 12;
  if (meridiem === 'PM') {
    hour24 += 12;
  }

  return new Date(Date.UTC(year, monthIndex, day, hour24, minute) - IST_OFFSET_MINUTES * 60 * 1000);
}

export function formatCountdownLabel(dateLabel: string, timeLabel: string, now = new Date()) {
  const eventDate = parsePortalEventDate(dateLabel, timeLabel);
  if (!eventDate) {
    return 'Schedule pending';
  }

  const diffMs = eventDate.getTime() - now.getTime();
  if (diffMs <= 0) {
    return 'Started';
  }

  const totalMinutes = Math.ceil(diffMs / (60 * 1000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `Starts in ${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `Starts in ${hours}h ${minutes}m`;
  }

  return `Starts in ${minutes}m`;
}

export type EventLiveState = {
  label: string;
  detail: string;
  countdown: string;
  tone: 'open' | 'warning' | 'critical' | 'live' | 'muted';
};

const EVENT_LIVE_WINDOW_MS = 4 * 60 * 60 * 1000;

export function isEventConcluded(
  event: Pick<EventRecord, 'date_label' | 'time_label'>,
  now = new Date(),
) {
  const eventDate = parsePortalEventDate(event.date_label, event.time_label);
  if (!eventDate) {
    return false;
  }

  return now.getTime() - eventDate.getTime() >= EVENT_LIVE_WINDOW_MS;
}

export function getEventLiveState(event: EventRecord, now = new Date()): EventLiveState {
  const eventDate = parsePortalEventDate(event.date_label, event.time_label);
  if (!eventDate) {
    return {
      label: 'Schedule Pending',
      detail: 'Final event timing will be announced soon.',
      countdown: 'Schedule pending',
      tone: 'muted',
    };
  }

  const diffMs = eventDate.getTime() - now.getTime();
  const sixHoursMs = 6 * 60 * 60 * 1000;
  const oneDayMs = 24 * 60 * 60 * 1000;

  if (diffMs > oneDayMs) {
    return {
      label: 'Registration Open',
      detail: 'Event window is live and registrations are open.',
      countdown: formatCountdownLabel(event.date_label, event.time_label, now),
      tone: 'open',
    };
  }

  if (diffMs > sixHoursMs) {
    return {
      label: 'Closing Soon',
      detail: 'Final prep window is active. Register before the event-day rush.',
      countdown: formatCountdownLabel(event.date_label, event.time_label, now),
      tone: 'warning',
    };
  }

  if (diffMs > 0) {
    return {
      label: 'Reporting Today',
      detail: 'Event-day reporting and coordinator support are active.',
      countdown: formatCountdownLabel(event.date_label, event.time_label, now),
      tone: 'critical',
    };
  }

  if (diffMs > -EVENT_LIVE_WINDOW_MS) {
    return {
      label: 'Live Now',
      detail: 'The event is currently in progress or check-in is underway.',
      countdown: 'Event in progress',
      tone: 'live',
    };
  }

  return {
    label: 'Completed',
    detail: 'Thank you for participating. This event has concluded.',
    countdown: 'Completed',
    tone: 'muted',
  };
}

export function getEventHeatLevel(event: EventRecord) {
  if (event.max_slots === null) {
    return {
      label: 'Open capacity',
      accent: 'text-cyan-100',
      fillPercent: 48,
    };
  }

  const remainingSlots = Math.max(event.max_slots - event.registrations_count, 0);
  const fillPercent = Math.min((event.registrations_count / event.max_slots) * 100, 100);

  if (remainingSlots <= 0) {
    return {
      label: 'Full / waitlist',
      accent: 'text-rose-100',
      fillPercent: 100,
    };
  }

  if (remainingSlots <= Math.max(3, Math.ceil(event.max_slots * 0.1))) {
    return {
      label: 'Almost full',
      accent: 'text-amber-100',
      fillPercent,
    };
  }

  if (fillPercent >= 70) {
    return {
      label: 'Fast filling',
      accent: 'text-fuchsia-100',
      fillPercent,
    };
  }

  return {
    label: 'Open slots',
    accent: 'text-emerald-100',
    fillPercent,
  };
}

export function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
