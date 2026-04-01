import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowLeft, ArrowRight, BarChart3, CheckCircle2, ChevronDown, ChevronUp, Clock3,
  Copy, Download, Eye, EyeOff, FileSpreadsheet, HardDriveDownload, Hash, IndianRupee, Mail,
  Megaphone, MoreVertical, RotateCcw, Save, Search, Send, ShieldCheck, Trash2, Users, XCircle,
} from 'lucide-react';
import type {
  AdminAccessScope,
  AdminNotificationSummary,
  AdminRegistration,
  BackupSnapshot,
  EventRecord,
  PortalAnnouncement,
} from './types';
import { formatBytes, formatCurrency, shellClassName } from './utils';

type AdminAccessMode = 'global' | 'event';
type AdminView = 'overview' | 'events' | 'verification' | 'broadcast' | 'backup';

type Props = {
  adminAccessMode: AdminAccessMode;
  adminMainKey: string;
  adminEventKey: string;
  adminEventKeySlug: string;
  adminScope: AdminAccessScope | null;
  adminRows: AdminRegistration[];
  events: EventRecord[];
  announcements: PortalAnnouncement[];
  backups: BackupSnapshot[];
  adminLoading: boolean;
  adminError: string;
  onAdminAccessModeChange: (value: AdminAccessMode) => void;
  onAdminMainKeyChange: (value: string) => void;
  onAdminEventKeyChange: (value: string) => void;
  onAdminEventKeySlugChange: (value: string) => void;
  onLoadAdminRows: () => void;
  onDownload: (format: 'csv' | 'xlsx', eventSlug?: string) => void;
  onStatusChange: (registrationId: string, status: 'verified' | 'rejected' | 'pending') => void;
  onDeleteRegistration: (registrationId: string) => void;
  onToggleEventRegistrationState: (eventSlug: string, enabled: boolean) => void;
  onSaveReviewNote: (registrationId: string, reviewNote: string) => void;
  onResendStatusEmail: (registrationId: string) => void;
  onSendBroadcast: (payload: { title: string; message: string; eventSlug: string; isPinned: boolean }) => void;
  onDeleteAnnouncement: (announcementId: string) => void;
  onRunBackup: () => void;
  onDownloadBackup: (fileName: string) => void;
};

type StatusFilter = 'all' | 'pending' | 'verified' | 'waitlisted' | 'rejected';

const groupedScopedEventSlugs: Record<string, string[]> = {
  techxcelerate: ['techxcelerate', 'techxcelerate-poster-presentation'],
  'techxcelerate-poster-presentation': ['techxcelerate', 'techxcelerate-poster-presentation'],
};

const statusStyles: Record<string, string> = {
  pending: 'border-amber-300/25 bg-amber-400/10 text-amber-100',
  verified: 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100',
  waitlisted: 'border-fuchsia-300/25 bg-fuchsia-400/10 text-fuchsia-100',
  rejected: 'border-rose-300/25 bg-rose-400/10 text-rose-100',
};

function prettyStatus(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizeEventToken(value: string | null | undefined) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getScopedEventSlugs(eventSlug: string | null | undefined) {
  const normalizedSlug = normalizeEventToken(eventSlug);
  if (!normalizedSlug) {
    return [];
  }

  return groupedScopedEventSlugs[normalizedSlug] || [normalizedSlug];
}

function resolveAdminEventSlug(row: Pick<AdminRegistration, 'event_slug' | 'event_name' | 'total_amount' | 'participants' | 'notes' | 'review_note'>) {
  const rowSlug = normalizeEventToken(row.event_slug);
  if (rowSlug !== 'techxcelerate') {
    return rowSlug;
  }

  const noteBlob = `${row.event_name || ''} ${row.notes || ''} ${row.review_note || ''}`.toLowerCase();
  if (noteBlob.includes('poster')) {
    return 'techxcelerate-poster-presentation';
  }

  const participantCount = Array.isArray(row.participants) ? row.participants.length : 0;
  if (Number(row.total_amount) > 0 && Number(row.total_amount) < 200 && participantCount > 0 && participantCount <= 2) {
    return 'techxcelerate-poster-presentation';
  }

  return rowSlug;
}

function resolveAdminEventName(row: Pick<AdminRegistration, 'event_slug' | 'event_name' | 'total_amount' | 'participants' | 'notes' | 'review_note'>, events: EventRecord[]) {
  const effectiveSlug = resolveAdminEventSlug(row);
  return events.find((event) => normalizeEventToken(event.slug) === effectiveSlug)?.name || row.event_name;
}

function matchesEventAlias(row: Pick<AdminRegistration, 'event_slug' | 'event_name' | 'total_amount' | 'participants' | 'notes' | 'review_note'>, event: Pick<EventRecord, 'slug' | 'name'>) {
  const rowSlug = resolveAdminEventSlug(row);
  const eventSlug = normalizeEventToken(event.slug);
  if (rowSlug && eventSlug) {
    return rowSlug === eventSlug;
  }

  const rowName = normalizeEventToken(row.event_name);
  const eventName = normalizeEventToken(event.name);
  return Boolean(rowName && eventName && rowName === eventName);
}

function NotificationPanel({ notification }: { notification: AdminNotificationSummary | null | undefined }) {
  if (!notification) return <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-black/10 p-4 text-sm text-slate-400">No status email logged yet.</div>;
  const tone = notification.delivery_status === 'sent' ? 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100' : notification.delivery_status === 'failed' ? 'border-rose-300/25 bg-rose-400/10 text-rose-100' : 'border-amber-300/25 bg-amber-400/10 text-amber-100';
  return <div className="rounded-[1.2rem] border border-white/10 bg-black/20 p-4"><span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.2em] ${tone}`}>{notification.delivery_status || 'queued'}</span><p className="mt-3 text-sm text-slate-300">{notification.recipient || 'No recipient'}</p>{notification.error_message ? <p className="mt-2 text-sm text-amber-100">{notification.error_message}</p> : null}</div>;
}

function FloatingField({ label, icon, value, type = 'text', onChange }: { label: string; icon: React.ReactNode; value: string; type?: 'text' | 'password'; onChange: (value: string) => void }) {
  const [revealed, setRevealed] = useState(false);
  const effectiveType = type === 'password' ? (revealed ? 'text' : 'password') : type;

  return (
    <label className="floating-field block">
      <span className="pointer-events-none absolute left-4 top-[1.15rem] text-cyan-200/70">{icon}</span>
      <input type={effectiveType} value={value} onChange={(event) => onChange(event.target.value)} placeholder=" " className={`floating-field-input ${type === 'password' ? 'pl-11 pr-12' : 'pl-11'}`} />
      <span className="floating-field-label left-11">{label}</span>
      {type === 'password' ? (
        <button
          type="button"
          onClick={() => setRevealed((current) => !current)}
          className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/10 hover:text-white"
          aria-label={revealed ? 'Hide key' : 'Show key'}
        >
          {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      ) : null}
    </label>
  );
}

function compactReference(value: string | null | undefined) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return 'Not added';
  }

  if (normalized.length <= 12) {
    return normalized.toUpperCase();
  }

  return `${normalized.slice(0, 10).toUpperCase()}...`;
}

export const AdminRegistrationsPage: React.FC<Props> = ({ adminAccessMode, adminMainKey, adminEventKey, adminEventKeySlug, adminScope, adminRows, events, announcements, backups, adminLoading, adminError, onAdminAccessModeChange, onAdminMainKeyChange, onAdminEventKeyChange, onAdminEventKeySlugChange, onLoadAdminRows, onDownload, onStatusChange, onDeleteRegistration, onToggleEventRegistrationState, onSaveReviewNote, onResendStatusEmail, onSendBroadcast, onDeleteAnnouncement, onRunBackup, onDownloadBackup }) => {
  const [activeView, setActiveView] = useState<AdminView>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [eventFilter, setEventFilter] = useState('all');
  const [proofModal, setProofModal] = useState<AdminRegistration | null>(null);
  const [brokenProofs, setBrokenProofs] = useState<Record<string, boolean>>({});
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, string>>({});
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastEventSlug, setBroadcastEventSlug] = useState('');
  const [broadcastPinned, setBroadcastPinned] = useState(true);
  const [exportEventSlug, setExportEventSlug] = useState('all');
  const scopedEventSlug = adminScope?.mode === 'event' ? adminScope.event_slug : null;
  const scopedEventName = adminScope?.mode === 'event' ? adminScope.event_name : null;
  const isGlobalAccess = adminScope?.mode !== 'event';
  const scopedAllowedSlugs = useMemo(() => getScopedEventSlugs(scopedEventSlug), [scopedEventSlug]);
  const hasResolvedAccess = Boolean(adminScope);
  const activeDraftKey = adminAccessMode === 'global' ? adminMainKey : adminEventKey;
  const selectedDraftEventName = events.find((event) => event.slug === adminEventKeySlug)?.name || '';
  const canSubmitAccess = adminAccessMode === 'global'
    ? Boolean(adminMainKey.trim())
    : Boolean(adminEventKeySlug && adminEventKey.trim());
  const canDeleteRegistrations = hasResolvedAccess && adminScope?.can_delete_registrations !== false;
  const canManageEventControls = hasResolvedAccess && adminScope?.can_manage_event_controls !== false;
  const canShowBroadcastTools = hasResolvedAccess && adminScope?.can_manage_broadcasts !== false;
  const canShowBackupTools = hasResolvedAccess && adminScope?.can_manage_backups !== false;
  const accessSummary = adminScope?.mode === 'event'
    ? `Scoped access active for ${scopedEventName || 'the selected event'}. Only that event's entries are visible below.`
    : 'Main key verified. All event content and organizer controls are available.';

  useEffect(() => {
    setEventFilter('all');
  }, [scopedEventSlug]);

  useEffect(() => {
    setExportEventSlug(scopedEventSlug || 'all');
  }, [scopedEventSlug]);

  const counts = useMemo(() => ({ all: adminRows.length, pending: adminRows.filter((row) => row.status === 'pending').length, verified: adminRows.filter((row) => row.status === 'verified').length, waitlisted: adminRows.filter((row) => row.status === 'waitlisted').length, rejected: adminRows.filter((row) => row.status === 'rejected').length }), [adminRows]);
  const eventBuckets = useMemo(() => events.map((event) => {
    const rowsForEvent = adminRows.filter((row) => matchesEventAlias(row, event));

    return {
      slug: event.slug,
      name: event.name,
      total: rowsForEvent.length,
      pending: rowsForEvent.filter((row) => row.status === 'pending').length,
      verified: rowsForEvent.filter((row) => row.status === 'verified').length,
    };
  }).filter((event) => event.total > 0), [adminRows, events]);
  const filteredRows = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const normalizedEventFilter = normalizeEventToken(eventFilter);
    const activeEvent = events.find((event) => normalizeEventToken(event.slug) === normalizedEventFilter) || null;

    return adminRows.filter((row) => {
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
      const matchesEvent = eventFilter === 'all'
        || (activeEvent ? matchesEventAlias(row, activeEvent) : normalizeEventToken(row.event_slug) === normalizedEventFilter);
      const matchesSearch = [row.registration_code, row.team_name, row.contact_name, row.contact_email, row.event_name, row.review_note ?? '', row.payment_reference ?? '', row.registration_source ?? '']
        .some((value) => value.toLowerCase().includes(normalizedSearch));

      return matchesStatus && matchesEvent && matchesSearch;
    });
  }, [adminRows, eventFilter, events, searchQuery, statusFilter]);
  const totalParticipants = adminRows.reduce((sum, row) => sum + row.participants.length, 0);
  const busiestEvent = useMemo(() => Object.entries(adminRows.reduce<Record<string, number>>((collection, row) => {
    const eventName = resolveAdminEventName(row, events);
    return { ...collection, [eventName]: (collection[eventName] || 0) + 1 };
  }, {})).sort((left, right) => right[1] - left[1])[0] || null, [adminRows, events]);
  const topTrackedEvents = useMemo(() => [...eventBuckets].sort((left, right) => right.total - left.total).slice(0, 4), [eventBuckets]);
  const recentBackup = backups[0] ?? null;
  const adminViews = useMemo(() => {
    if (!isGlobalAccess) {
      return [
        { key: 'verification', label: 'Registrations', icon: ShieldCheck },
      ] as Array<{ key: AdminView; label: string; icon: typeof BarChart3 }>;
    }

    const views: Array<{ key: AdminView; label: string; icon: typeof BarChart3 }> = [
      { key: 'overview', label: 'Overview', icon: BarChart3 },
      { key: 'verification', label: 'Registrations', icon: ShieldCheck },
    ];

    if (canManageEventControls) {
      views.splice(1, 0, { key: 'events', label: 'Events', icon: Users });
    }
    if (canShowBroadcastTools) {
      views.push({ key: 'broadcast', label: 'Broadcast', icon: Megaphone });
    }
    if (canShowBackupTools) {
      views.push({ key: 'backup', label: 'Backup', icon: HardDriveDownload });
    }

    return views;
  }, [canManageEventControls, canShowBackupTools, canShowBroadcastTools, isGlobalAccess]);
  const eventControlRows = useMemo(() => events.map((event) => {
    const registrationsCount = Number(event.registrations_count || 0);
    const remainingSlots = event.max_slots === null ? null : Math.max(event.max_slots - registrationsCount, 0);

    return {
      ...event,
      remainingSlots,
    };
  }), [events]);
  useEffect(() => {
    if (expandedRowId && !filteredRows.some((row) => row.id === expandedRowId)) {
      setExpandedRowId(null);
    }
  }, [expandedRowId, filteredRows]);

  useEffect(() => {
    if (!adminViews.some((view) => view.key === activeView)) {
      setActiveView(adminViews[0]?.key ?? 'overview');
    }
  }, [activeView, adminViews]);

  useEffect(() => {
    if (!isGlobalAccess) {
      setActiveView('verification');
    }
  }, [isGlobalAccess]);

  const copyToClipboard = (value: string | null | undefined) => {
    const normalized = String(value || '').trim();
    if (!normalized || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      return;
    }

    navigator.clipboard.writeText(normalized).catch(() => {});
  };

  return (
    <main className={`${shellClassName} portal-admin-page space-y-4 pb-10 md:space-y-8 md:pb-20`}>
      <section className="portal-admin-shell portal-admin-shell--hero portal-glow-card portal-glass rounded-[1.5rem] p-4 md:rounded-[2rem] md:p-8">
        <div className="portal-admin-hero-top">
          <div className="portal-admin-hero-copy">
            <a href="#overview" className="portal-admin-hero-back magnetic-button inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200"><ArrowLeft size={16} />Back to portal</a>
            <p className="portal-admin-hero-kicker">COGNOTSAV ADMIN</p>
            <h2 className="portal-admin-hero-title">Operations Dashboard</h2>
          </div>
          {hasResolvedAccess ? (
            <div className="portal-admin-kpi-grid grid grid-cols-1 gap-3 sm:grid-cols-1">
              <a href={isGlobalAccess ? '#admin-overview' : '#admin-verification'} className="portal-admin-kpi portal-admin-kpi--hero">
                <span className="portal-admin-kpi__value">{counts.all}</span>
                <span className="portal-admin-kpi__label">Registrations</span>
                <ArrowRight size={17} />
              </a>
            </div>
          ) : null}
        </div>
        <div className="portal-admin-hero-divider" aria-hidden="true" />
        <div className="portal-admin-access-panel mt-6 rounded-[1.6rem] border border-white/10 bg-black/20 p-4 md:p-5">
          <div className="portal-admin-access-mode-row">
            <div className="portal-admin-access-mode-tabs grid gap-3 md:grid-cols-2">
              <button type="button" onClick={() => onAdminAccessModeChange('global')} className={`portal-admin-mode rounded-[1.35rem] border px-4 py-4 text-left transition ${adminAccessMode === 'global' ? 'is-active' : ''}`}>
                <p className="text-lg font-bold text-white">Main Key</p>
              </button>
              <button type="button" onClick={() => onAdminAccessModeChange('event')} className={`portal-admin-mode rounded-[1.35rem] border px-4 py-4 text-left transition ${adminAccessMode === 'event' ? 'is-active' : ''}`}>
                <p className="text-lg font-bold text-white">Event Key</p>
              </button>
            </div>
          </div>

          <div className="portal-admin-access-grid mt-4">
            <div className={`portal-admin-access-shell portal-admin-access-shell--primary ${adminAccessMode === 'event' ? 'portal-admin-access-shell--event' : ''}`}>
              {adminAccessMode === 'event' ? (
                <label className="portal-admin-access-select block rounded-[1.2rem] border border-white/10 bg-white/5 p-3">
                  <span className="portal-admin-access-label mb-2 block text-[11px] uppercase tracking-[0.2em] text-slate-400">Competition</span>
                  <select value={adminEventKeySlug} onChange={(event) => onAdminEventKeySlugChange(event.target.value)} className="floating-field-input">
                    <option value="">Choose an event</option>
                    {events.map((event) => <option key={event.slug} value={event.slug}>{event.name}</option>)}
                  </select>
                </label>
              ) : null}
              <div className="portal-admin-access-field">
                <FloatingField label={adminAccessMode === 'global' ? 'Enter main admin key' : 'Enter selected event key'} icon={<ShieldCheck size={18} />} type="password" value={activeDraftKey} onChange={adminAccessMode === 'global' ? onAdminMainKeyChange : onAdminEventKeyChange} />
              </div>
              <button type="button" onClick={onLoadAdminRows} disabled={adminLoading || !canSubmitAccess} className="portal-admin-access-submit animated-gradient-button rounded-2xl px-5 py-3 font-bold text-slate-950 disabled:opacity-60">
                {adminLoading ? 'Verifying...' : 'Show content'}
              </button>
              <p className="portal-admin-access-hint text-xs text-slate-400">{selectedDraftEventName ? `Key will be matched against ${selectedDraftEventName}.` : 'Each competition can have its own verification key.'}</p>
            </div>

            <div className="portal-admin-access-shell portal-admin-access-shell--secondary">
              <label className="portal-admin-export-select block rounded-[1.2rem] border border-white/10 bg-white/5 p-3">
                <span className="portal-admin-access-label mb-2 block text-[11px] uppercase tracking-[0.2em] text-slate-400">Filter / export</span>
                <select value={exportEventSlug} onChange={(event) => setExportEventSlug(event.target.value)} disabled={Boolean(scopedEventSlug)} className="floating-field-input disabled:opacity-70">
                  <option value="all">All competitions</option>
                  {events.map((event) => <option key={`export-${event.slug}`} value={event.slug}>{event.name}</option>)}
                </select>
              </label>
              <div className="portal-admin-export-actions">
                <button type="button" onClick={() => onDownload('csv', exportEventSlug === 'all' ? undefined : exportEventSlug)} disabled={!hasResolvedAccess || adminScope?.can_export === false} className="portal-admin-export-button magnetic-button inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-300/12 bg-white/5 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"><Download size={16} />CSV</button>
                <button type="button" onClick={() => onDownload('xlsx', exportEventSlug === 'all' ? undefined : exportEventSlug)} disabled={!hasResolvedAccess || adminScope?.can_export === false} className="portal-admin-export-button portal-admin-export-button--gold magnetic-button inline-flex items-center justify-center gap-2 rounded-2xl border border-fuchsia-300/12 bg-white/5 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"><FileSpreadsheet size={16} />Excel</button>
              </div>
            </div>
          </div>
          <div className={`portal-admin-access-summary mt-3 rounded-2xl border px-4 py-3 text-sm ${
            hasResolvedAccess
              ? 'border-emerald-300/18 bg-emerald-400/10 text-emerald-100'
              : 'border-dashed border-white/10 bg-black/10 text-slate-400'
          }`}>
            {hasResolvedAccess
              ? accessSummary
              : 'Enter a valid key and load the records. Compact verification cards will appear below.'}
          </div>
        </div>
        {adminError ? <div className="mt-5 rounded-2xl border border-rose-400/25 bg-gradient-to-r from-rose-500/14 to-orange-500/8 px-4 py-3 text-sm text-rose-100">{adminError}</div> : null}
      </section>
      {hasResolvedAccess ? (
        <>
        <div className="portal-admin-tabs-shell portal-admin-jumpnav portal-admin-jumpnav--dock">
          <div className="portal-admin-tabs-track">
            {adminViews.map((view) => {
              const Icon = view.icon;
              const active = activeView === view.key;

              return (
                <button
                  key={view.key}
                  type="button"
                  onClick={() => setActiveView(view.key)}
                  className={`magnetic-button portal-admin-tab ${active ? 'is-active' : ''}`}
                >
                  <Icon size={16} />
                  <span>{view.label}</span>
                </button>
              );
            })}
          </div>
          <div className="portal-admin-tabs-status">
            <span>{adminScope?.mode === 'event' ? `Scoped: ${scopedEventName || 'Event'}` : 'Main access active'}</span>
            <span>{counts.all} registrations</span>
          </div>
        </div>

      {activeView === 'overview' && isGlobalAccess ? (
        <section id="admin-overview" className="space-y-4">
          <div
            data-reveal="up"
            className="portal-admin-overview-hero portal-admin-shell portal-glow-card portal-glass rounded-[1.7rem] p-5 text-center md:rounded-[2.2rem] md:p-8"
          >
            <div className="portal-admin-overview-hero__icon mx-auto inline-flex h-16 w-16 items-center justify-center rounded-[1.25rem] border border-white/10 text-cyan-100 shadow-[0_18px_40px_rgba(2,8,23,0.18)]">
              <BarChart3 size={30} />
            </div>
            <p className="portal-admin-overview-hero__label mt-5 text-lg font-semibold text-slate-300">Total Registrations</p>
            <strong className="portal-admin-overview-hero__value mt-3 block text-white">{counts.all}</strong>
          </div>

          <div
            data-reveal="up"
            className="portal-admin-overview-leaderboard portal-admin-shell portal-admin-shell--analytics portal-glow-card portal-glass rounded-[1.7rem] p-4 md:rounded-[2rem] md:p-6"
          >
            <div className="flex items-center gap-4">
              <div className="portal-admin-overview-leaderboard__badge inline-flex h-14 w-14 items-center justify-center rounded-[1.15rem] border border-white/10 text-fuchsia-100">
                <BarChart3 size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">Top Competitions</h3>
                <p className="mt-1 text-sm text-slate-400">Highest registration flow across events.</p>
              </div>
            </div>

            <div className="portal-admin-overview-leaderboard__panel mt-5 rounded-[1.35rem] border border-white/10 p-3 md:p-4">
              {topTrackedEvents.length > 0 ? (
                <div className="space-y-1">
                  {topTrackedEvents.slice(0, 5).map((event, index) => (
                    <button
                      key={event.slug}
                      type="button"
                      onClick={() => {
                        setEventFilter(event.slug);
                        setExpandedRowId(null);
                        setActiveView('verification');
                      }}
                      className="portal-admin-overview-leaderboard__row flex w-full items-center justify-between gap-3 rounded-[1.05rem] px-3 py-3 text-left md:px-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={`portal-admin-overview-rank portal-admin-overview-rank--${index + 1 > 3 ? 'other' : index + 1}`}>
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-lg font-semibold text-white">{event.name}</p>
                        </div>
                      </div>
                      <span className="portal-admin-overview-total text-2xl font-semibold text-cyan-300">{event.total}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="portal-admin-empty-state rounded-[1.15rem] border border-dashed border-white/10 bg-black/10 px-4 py-4 text-sm text-slate-400">
                  Analytics will appear after records load.
                </div>
              )}
            </div>
          </div>

          {announcements.length > 0 ? (
            <div className="portal-admin-shell portal-glow-card portal-glass rounded-[1.5rem] p-4 md:rounded-[2rem] md:p-6">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xl font-bold text-white">Pinned updates</h3>
                <span className="text-xs uppercase tracking-[0.2em] text-slate-500">{announcements.length} items</span>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                {announcements.slice(0, 3).map((announcement) => <div key={announcement.id} className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex flex-wrap items-center gap-2">{announcement.is_pinned ? <span className="rounded-full border border-yellow-300/20 bg-yellow-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-yellow-100">Pinned</span> : null}{announcement.event_name ? <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-200">{announcement.event_name}</span> : null}</div><button type="button" onClick={() => onDeleteAnnouncement(announcement.id)} className="magnetic-button inline-flex items-center gap-2 rounded-xl border border-rose-300/18 bg-rose-400/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-rose-100"><Trash2 size={14} />Delete</button></div><p className="mt-3 font-semibold text-white">{announcement.title}</p><p className="mt-2 text-sm text-slate-300">{announcement.message}</p></div>)}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {activeView === 'events' && canManageEventControls ? (
        <section id="admin-event-controls" data-reveal="up" className="portal-glow-card portal-glass rounded-[1.5rem] p-4 md:rounded-[2rem] md:p-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-blue-300/80">Event controls</p>
              <h3 className="mt-2 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text font-orbitron text-3xl font-black uppercase text-transparent">Stop or restart registrations</h3>
            </div>
          </div>

          <div className="portal-admin-control-grid mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {eventControlRows.map((event) => {
              const isOpen = event.registration_enabled;
              const noSeatsLeft = event.remainingSlots !== null && event.remainingSlots <= 0;

              return (
                <article key={event.slug} className="portal-admin-control-card rounded-[1.3rem] border border-white/10 bg-[linear-gradient(145deg,rgba(12,20,35,0.92),rgba(18,27,45,0.82))] p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-white">{event.name}</p>
                      <p className="portal-admin-control-copy mt-1 text-xs text-slate-400">{event.date_label} / {event.time_label} / {event.venue}</p>
                    </div>
                    <span className={`portal-admin-control-status rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${
                      isOpen
                        ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100'
                        : 'border-rose-300/20 bg-rose-400/10 text-rose-100'
                    }`}>
                      {isOpen ? 'Open' : 'Stopped'}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {isOpen ? (
                      <button
                        type="button"
                        onClick={() => onToggleEventRegistrationState(event.slug, false)}
                        className="magnetic-button inline-flex items-center justify-center rounded-xl border border-rose-300/20 bg-rose-400/10 px-3.5 py-2 text-xs font-bold uppercase tracking-[0.16em] text-rose-100"
                      >
                        Stop
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onToggleEventRegistrationState(event.slug, true)}
                        disabled={noSeatsLeft}
                        title={noSeatsLeft ? 'No seats left' : undefined}
                        className="magnetic-button inline-flex items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-3.5 py-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-100 disabled:opacity-50"
                      >
                        Restart
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {activeView === 'broadcast' && canShowBroadcastTools ? (
        <section id="admin-broadcast" data-reveal="up" className="portal-admin-shell portal-glow-card portal-glass rounded-[1.5rem] p-4 md:rounded-[2rem] md:p-6">
          <div className="flex items-center gap-3"><Megaphone size={18} className="text-fuchsia-200" /><div><h3 className="text-xl font-bold text-white">Broadcast center</h3><p className="text-sm text-slate-400">Send updates without opening a long stacked form.</p></div></div>
          <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_0.88fr]">
            <div className="grid gap-4">
              <label className="block rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
                <span className="mb-2 block text-sm text-slate-200">Target event</span>
                <select value={broadcastEventSlug} onChange={(event) => setBroadcastEventSlug(event.target.value)} className="floating-field-input">
                  <option value="">All verified participants</option>
                  {events.map((event) => <option key={event.slug} value={event.slug}>{event.name}</option>)}
                </select>
              </label>
              <label className="floating-field block"><input value={broadcastTitle} onChange={(event) => setBroadcastTitle(event.target.value)} placeholder=" " className="floating-field-input" /><span className="floating-field-label">Broadcast title</span></label>
              <label className="floating-field block"><textarea value={broadcastMessage} onChange={(event) => setBroadcastMessage(event.target.value)} placeholder=" " rows={5} className="floating-field-input min-h-[140px] resize-none" /><span className="floating-field-label">Broadcast message</span></label>
              <label className="inline-flex items-center gap-3 rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"><input type="checkbox" checked={broadcastPinned} onChange={(event) => setBroadcastPinned(event.target.checked)} /> Pin this on the public portal</label>
              <button type="button" onClick={() => onSendBroadcast({ title: broadcastTitle, message: broadcastMessage, eventSlug: broadcastEventSlug, isPinned: broadcastPinned })} className="animated-gradient-button inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 font-bold text-slate-950"><Send size={16} />Publish and send</button>
            </div>
            <div className="space-y-4">
              <div className="portal-admin-shell portal-admin-shell--backup rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-fuchsia-200/80">Pinned updates</p>
                <div className="mt-4 space-y-3">
                  {announcements.slice(0, 3).map((announcement) => (
                    <div key={`broadcast-${announcement.id}`} className="rounded-[1.1rem] border border-white/10 bg-white/[0.04] p-3">
                      <p className="font-semibold text-white">{announcement.title}</p>
                      <p className="mt-2 text-sm text-slate-300">{announcement.message}</p>
                    </div>
                  ))}
                  {announcements.length === 0 ? <div className="portal-admin-empty-state rounded-[1.15rem] border border-dashed border-white/10 bg-black/10 px-4 py-4 text-sm text-slate-400">No pinned announcements yet.</div> : null}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {activeView === 'backup' && canShowBackupTools ? (
        <section id="admin-backup" data-reveal="up" className="portal-admin-shell portal-glow-card portal-glass rounded-[1.5rem] p-4 md:rounded-[2rem] md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-yellow-200/80">Recovery center</p>
              <h3 className="mt-2 bg-gradient-to-r from-yellow-200 via-amber-300 to-orange-300 bg-clip-text font-orbitron text-3xl font-black uppercase text-transparent">Backup and download</h3>
            </div>
            <button type="button" onClick={onRunBackup} className="magnetic-button inline-flex items-center justify-center gap-2 rounded-2xl border border-yellow-300/18 bg-yellow-400/10 px-4 py-3 text-sm font-bold text-yellow-100"><HardDriveDownload size={16} />Run backup</button>
          </div>
          <div className="mt-5 grid gap-4 xl:grid-cols-[0.98fr_1.02fr]">
            <div className="portal-admin-backup-card rounded-[1.4rem] border border-white/10 p-4">
              {recentBackup ? (
                <>
                  <p className="font-semibold text-white">{recentBackup.file_name}</p>
                  <p className="mt-2 text-sm text-slate-400">{new Date(recentBackup.created_at).toLocaleString()}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{formatBytes(recentBackup.size_bytes)} / {recentBackup.trigger}</p>
                  <button type="button" onClick={() => onDownloadBackup(recentBackup.file_name)} className="animated-gradient-button mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-slate-950"><Download size={16} />Download latest</button>
                </>
              ) : (
                <div className="portal-admin-empty-state rounded-[1.15rem] border border-dashed border-white/10 bg-black/10 px-4 py-4 text-sm text-slate-400">No backup snapshot available yet.</div>
              )}
            </div>
            <div className="portal-admin-shell rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Recent backup files</p>
              <div className="mt-4 space-y-3">
                {backups.slice(0, 5).map((backup) => (
                  <div key={backup.file_name} className="portal-admin-subrow rounded-[1.05rem] border border-white/10 px-4 py-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-white">{backup.file_name}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{new Date(backup.created_at).toLocaleString()} / {formatBytes(backup.size_bytes)}</p>
                      </div>
                      <button type="button" onClick={() => onDownloadBackup(backup.file_name)} className="magnetic-button inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white"><Download size={14} />Download</button>
                    </div>
                  </div>
                ))}
                {backups.length === 0 ? <div className="portal-admin-empty-state rounded-[1.15rem] border border-dashed border-white/10 bg-black/10 px-4 py-4 text-sm text-slate-400">No backup history yet.</div> : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {activeView === 'verification' ? (
      <section id="admin-verification" data-reveal="up" className="portal-admin-shell portal-admin-shell--verification portal-glow-card portal-glass rounded-[1.5rem] p-4 md:rounded-[2rem] md:p-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-blue-300/80">Registration operations</p>
            <h3 className="mt-2 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text font-orbitron text-3xl font-black uppercase text-transparent">Proof review and approval</h3>
          </div>
          <div className="w-full max-w-xl"><FloatingField label="Search by team, code, event, or participant" icon={<Search size={18} />} value={searchQuery} onChange={setSearchQuery} /></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {([['all', 'All', counts.all], ['pending', 'Pending', counts.pending], ['verified', 'Verified', counts.verified], ['waitlisted', 'Waitlisted', counts.waitlisted], ['rejected', 'Rejected', counts.rejected]] as const).map(([value, label, count]) => (
            <button key={value} type="button" onClick={() => setStatusFilter(value)} className={`portal-admin-filter-chip rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] transition ${statusFilter === value ? 'border-blue-300/30 bg-gradient-to-r from-blue-500/18 via-purple-500/16 to-pink-500/18 text-white' : 'border-white/10 bg-white/5 text-slate-200 hover:border-blue-300/20 hover:text-white'}`}>
              {label} ({count})
            </button>
          ))}
        </div>
        <div className="mt-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/80">Competition-wise verification</p>
          <div className="portal-admin-event-strip mt-3 flex gap-3 overflow-x-auto pb-1">
            <button type="button" onClick={() => { setExpandedRowId(null); setEventFilter('all'); }} className={`portal-admin-event-pill rounded-[1.1rem] border px-4 py-3 text-left text-sm transition ${eventFilter === 'all' ? 'border-cyan-300/24 bg-cyan-400/10 text-white' : 'border-white/10 bg-white/5 text-slate-200'}`}>
              <span className="block font-semibold">All</span>
              <span className="mt-1 block text-xs uppercase tracking-[0.16em] text-slate-400">{scopedEventSlug ? `${counts.all} scoped` : `${counts.all} total`}</span>
            </button>
            {eventBuckets.map((event) => (
              <button key={event.slug} type="button" onClick={() => { setExpandedRowId(null); setEventFilter(event.slug); }} disabled={Boolean(scopedAllowedSlugs.length > 0 && !scopedAllowedSlugs.includes(event.slug))} className={`portal-admin-event-pill rounded-[1.1rem] border px-4 py-3 text-left text-sm transition disabled:opacity-50 ${eventFilter === event.slug ? 'border-fuchsia-300/24 bg-fuchsia-400/10 text-white' : 'border-white/10 bg-white/5 text-slate-200'}`}>
                <span className="block font-semibold">{event.name}</span>
                <span className="mt-1 block text-xs uppercase tracking-[0.16em] text-slate-400">{event.total} total</span>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-6 space-y-4">
          {filteredRows.map((row) => (
            <article key={row.id} className="portal-admin-entry rounded-[1.7rem] border border-white/10 bg-[linear-gradient(145deg,rgba(12,20,35,0.92),rgba(18,27,45,0.82))] p-4 md:p-5">
              <div className="portal-admin-entry__header flex flex-col gap-4">
                <div className="portal-admin-entry__topline flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => setExpandedRowId((current) => current === row.id ? null : row.id)} className="portal-admin-entry__trigger min-w-0 text-left">
                        <p className="truncate text-[1.65rem] font-semibold text-white">{row.team_name}</p>
                      </button>
                      <span className={`portal-admin-entry__badge rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.2em] ${statusStyles[row.status] || 'border-white/10 bg-white/5 text-white'}`}>{prettyStatus(row.status)}</span>
                    </div>
                    <div className="portal-admin-entry__quickline mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-300">
                      <span>{resolveAdminEventName(row, events)}</span>
                      <span className="portal-admin-entry__meta-dot" aria-hidden="true" />
                      <span>{row.participants.length} {row.participants.length === 1 ? 'Participant' : 'Participants'}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedRowId((current) => current === row.id ? null : row.id)}
                    className="portal-admin-entry__menu magnetic-button inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200"
                    aria-label={expandedRowId === row.id ? 'Hide details' : 'Show details'}
                  >
                    {expandedRowId === row.id ? <ChevronUp size={18} /> : <MoreVertical size={18} />}
                  </button>
                </div>

                {row.duplicate_email_count > 0 || row.duplicate_phone_count > 0 || row.duplicate_payment_count > 0 ? (
                  <div className="portal-admin-entry__warning-row flex flex-wrap gap-2">
                    {row.duplicate_email_count > 0 ? <span className="portal-admin-entry__badge inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-amber-100"><AlertTriangle size={12} />Email x{row.duplicate_email_count}</span> : null}
                    {row.duplicate_phone_count > 0 ? <span className="portal-admin-entry__badge inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-amber-100"><AlertTriangle size={12} />Phone x{row.duplicate_phone_count}</span> : null}
                    {row.duplicate_payment_count > 0 ? <span className="portal-admin-entry__badge inline-flex items-center gap-2 rounded-full border border-rose-300/20 bg-rose-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-rose-100"><AlertTriangle size={12} />Payment x{row.duplicate_payment_count}</span> : null}
                  </div>
                ) : null}

                <div className="portal-admin-entry__summary-shell">
                  <div className="portal-admin-entry__fact portal-admin-entry__fact--wide rounded-[1.1rem] border border-white/10 bg-black/20 px-3 py-3">
                    <span className="portal-admin-entry__fact-icon portal-admin-entry__fact-icon--mail"><Mail size={16} /></span>
                    <div className="portal-admin-entry__fact-copy">
                      <p className="truncate text-base font-semibold text-white">{row.contact_email}</p>
                    </div>
                    <button type="button" onClick={() => copyToClipboard(row.contact_email)} className="portal-admin-entry__copy magnetic-button inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200" aria-label="Copy email">
                      <Copy size={15} />
                    </button>
                  </div>

                  <div className="portal-admin-entry__summary-grid grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
                    <div className="portal-admin-entry__fact portal-admin-entry__fact--txn rounded-[1.1rem] border border-white/10 bg-black/20 px-3 py-3">
                      <span className="portal-admin-entry__fact-icon portal-admin-entry__fact-icon--cyan"><Hash size={16} /></span>
                      <div className="portal-admin-entry__fact-copy">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/72">Txn</p>
                        <p className="mt-1 text-base font-semibold text-cyan-100">{compactReference(row.payment_reference || row.registration_code)}</p>
                      </div>
                      <button type="button" onClick={() => copyToClipboard(row.payment_reference || row.registration_code)} className="portal-admin-entry__copy magnetic-button inline-flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-300/12 bg-cyan-400/10 text-cyan-100" aria-label="Copy transaction reference">
                        <Copy size={15} />
                      </button>
                    </div>

                    <div className="portal-admin-entry__fact portal-admin-entry__fact--amount rounded-[1.1rem] border border-white/10 bg-black/20 px-3 py-3">
                      <span className="portal-admin-entry__fact-icon portal-admin-entry__fact-icon--amber"><IndianRupee size={16} /></span>
                      <div className="portal-admin-entry__fact-copy">
                        <p className="text-xl font-semibold text-white">{formatCurrency(row.total_amount)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="portal-admin-entry__actions portal-admin-entry__actions--spotlight grid grid-cols-4 gap-3">
                  <button type="button" onClick={() => onStatusChange(row.id, 'verified')} className="portal-admin-entry__action portal-admin-entry__action--approve magnetic-button inline-flex flex-col items-center justify-center gap-3 rounded-2xl border px-3 py-3 text-center text-sm font-bold"><span className="portal-admin-entry__action-icon"><CheckCircle2 size={24} /></span><span className="portal-admin-entry__action-label">Approve</span></button>
                  <button type="button" onClick={() => onStatusChange(row.id, 'pending')} className="portal-admin-entry__action portal-admin-entry__action--pending magnetic-button inline-flex flex-col items-center justify-center gap-3 rounded-2xl border px-3 py-3 text-center text-sm font-bold"><span className="portal-admin-entry__action-icon"><Clock3 size={24} /></span><span className="portal-admin-entry__action-label">Pending</span></button>
                  <button type="button" onClick={() => onStatusChange(row.id, 'rejected')} className="portal-admin-entry__action portal-admin-entry__action--reject magnetic-button inline-flex flex-col items-center justify-center gap-3 rounded-2xl border px-3 py-3 text-center text-sm font-bold"><span className="portal-admin-entry__action-icon"><XCircle size={24} /></span><span className="portal-admin-entry__action-label">Reject</span></button>
                  {canDeleteRegistrations ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Delete registration ${row.registration_code} for ${row.team_name}? This cannot be undone.`)) {
                          onDeleteRegistration(row.id);
                        }
                      }}
                      className="portal-admin-entry__action portal-admin-entry__action--delete magnetic-button inline-flex flex-col items-center justify-center gap-3 rounded-2xl border px-3 py-3 text-center text-sm font-bold"
                    >
                      <span className="portal-admin-entry__action-icon"><Trash2 size={24} /></span>
                      <span className="portal-admin-entry__action-label">Delete</span>
                    </button>
                  ) : (
                    <button type="button" onClick={() => onResendStatusEmail(row.id)} className="portal-admin-entry__action portal-admin-entry__action--resend magnetic-button inline-flex flex-col items-center justify-center gap-3 rounded-2xl border px-3 py-3 text-center text-sm font-bold">
                      <span className="portal-admin-entry__action-icon"><RotateCcw size={22} /></span>
                      <span className="portal-admin-entry__action-label">Resend</span>
                    </button>
                  )}
                </div>
              </div>

              {expandedRowId === row.id ? (
                <div className="portal-admin-entry__details mt-5 border-t border-white/10 pt-5">
                  <div className="grid gap-4 xl:grid-cols-[1.04fr_0.96fr]">
                    <div className="space-y-4">
                      <div className="portal-admin-entry__subcard rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-white"><Users size={16} className="text-blue-300" />Participants ({row.participants.length})</div>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          {row.participants.map((participant) => (
                            <div key={`${row.id}-${participant.email}`} className="portal-admin-entry__participant rounded-[1.1rem] border border-white/10 bg-black/20 p-3">
                              <p className="font-semibold text-white">{participant.fullName}</p>
                              <p className="mt-2 text-sm text-slate-300">{participant.email}</p>
                              <p className="mt-1 text-sm text-slate-300">{participant.phone}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                        <div className="portal-admin-entry__subcard rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
                          <div className="flex items-center gap-2"><Save size={16} className="text-amber-200" /><p className="text-sm font-semibold text-white">Review notes</p></div>
                          <textarea value={reviewDrafts[row.id] ?? row.review_note ?? ''} onChange={(event) => setReviewDrafts((current) => ({ ...current, [row.id]: event.target.value }))} rows={4} className="floating-field-input mt-4 min-h-[112px] resize-none" placeholder="Add a short note for this verification..." />
                          <button type="button" onClick={() => onSaveReviewNote(row.id, reviewDrafts[row.id] ?? row.review_note ?? '')} className="magnetic-button mt-4 inline-flex items-center gap-2 rounded-2xl border border-amber-300/18 bg-amber-400/10 px-4 py-3 text-sm font-bold text-amber-100"><Save size={16} />Save note</button>
                        </div>
                        <div className="portal-admin-entry__subcard rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
                          <div className="flex items-center gap-2"><Mail size={16} className="text-fuchsia-300" /><p className="text-sm font-semibold text-white">Notification center</p></div>
                          <div className="mt-4"><NotificationPanel notification={row.latest_notification} /></div>
                          <button type="button" onClick={() => onResendStatusEmail(row.id)} className="magnetic-button mt-4 inline-flex items-center gap-2 rounded-2xl border border-blue-300/18 bg-blue-500/10 px-4 py-3 text-sm font-bold text-blue-100"><RotateCcw size={16} />Resend status email</button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="portal-admin-entry__subcard rounded-[1.35rem] border border-white/10 bg-white/5 p-4 text-center">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Registration code</p>
                        <p className="mt-2 font-orbitron text-lg font-bold text-white">{row.registration_code}</p>
                        <p className="mt-3 text-sm leading-6 text-slate-300">
                          Venue verification now relies on the official pass details and registration code.
                        </p>
                      </div>

                      {row.payment_screenshot_path && !brokenProofs[row.id] ? (
                        <button type="button" onClick={() => setProofModal(row)} className="portal-admin-entry__proof group block w-full overflow-hidden rounded-[1.35rem] border border-cyan-300/12 bg-white/5 text-left">
                          <img src={row.payment_screenshot_path} alt={`${row.team_name} payment proof`} onError={() => setBrokenProofs((current) => ({ ...current, [row.id]: true }))} className="h-48 w-full object-cover transition duration-500 group-hover:scale-105" />
                          <div className="flex items-center justify-between px-4 py-3 text-sm text-cyan-100"><span>Open payment screenshot</span><Eye size={16} /></div>
                        </button>
                      ) : (
                        <div className="portal-admin-empty-state rounded-[1.35rem] border border-dashed border-white/10 bg-black/10 p-5 text-sm text-slate-400">{row.payment_screenshot_path ? 'Payment screenshot is missing from storage. On Railway, attach persistent storage or older uploads can disappear after restart/redeploy.' : 'No payment screenshot uploaded for this registration.'}</div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </article>
          ))}
          {adminRows.length === 0 && !adminLoading ? <div className="portal-admin-empty-state rounded-[1.5rem] border border-dashed border-white/10 bg-black/10 p-5 text-sm text-slate-400">Load the admin records to review proofs, approve entries, and run exports.</div> : null}
          {adminRows.length > 0 && filteredRows.length === 0 && !adminLoading ? <div className="portal-admin-empty-state rounded-[1.5rem] border border-dashed border-white/10 bg-black/10 p-5 text-sm text-slate-400">No registrations match the current search or status filter.</div> : null}
        </div>
      </section>
      ) : null}
        </>
      ) : null}
      {proofModal ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(5,8,16,0.88)] px-4 py-6 backdrop-blur-md"><div className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(12,20,35,0.98),rgba(18,27,45,0.96))] p-5 md:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[11px] uppercase tracking-[0.3em] text-cyan-200/80">Payment proof zoom</p><h4 className="mt-2 text-xl font-bold text-white">{proofModal.team_name}</h4></div><button type="button" onClick={() => setProofModal(null)} className="magnetic-button rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white">Close</button></div><div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]"><div className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-black/20 p-3"><img src={proofModal.payment_screenshot_path || ''} alt={`${proofModal.team_name} payment proof`} className="w-full rounded-[1.2rem] object-contain" /></div><div className="space-y-4"><div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4"><p className="text-xs uppercase tracking-[0.2em] text-slate-400">Reference</p><p className="mt-2 break-all font-semibold text-white">{proofModal.payment_reference || 'No payment reference'}</p></div><div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4"><p className="text-xs uppercase tracking-[0.2em] text-slate-400">Contact</p><p className="mt-2 text-white">{proofModal.contact_name}</p><p className="mt-1 text-slate-300">{proofModal.contact_email}</p><p className="mt-1 text-slate-300">{proofModal.contact_phone}</p></div></div></div></div></div> : null}
      </main>
  );
};
