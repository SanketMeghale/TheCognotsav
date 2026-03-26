import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowLeft, BarChart3, CheckCircle2, Clock3, Download,
  Eye, EyeOff, FileSpreadsheet, HardDriveDownload, Mail, Megaphone,
  RotateCcw, Save, Search, Send, ShieldCheck, Trash2, Users, XCircle,
} from 'lucide-react';
import type { AdminAccessScope, AdminNotificationSummary, AdminRegistration, BackupSnapshot, EventRecord, PortalAnnouncement } from './types';
import { formatBytes, formatCurrency, shellClassName } from './utils';

type AdminAccessMode = 'global' | 'event';

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
  onSaveReviewNote: (registrationId: string, reviewNote: string) => void;
  onResendStatusEmail: (registrationId: string) => void;
  onSendBroadcast: (payload: { title: string; message: string; eventSlug: string; isPinned: boolean }) => void;
  onDeleteAnnouncement: (announcementId: string) => void;
  onRunBackup: () => void;
  onDownloadBackup: (fileName: string) => void;
};

type StatusFilter = 'all' | 'pending' | 'verified' | 'waitlisted' | 'rejected';

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

function buildEventAliases(...values: Array<string | null | undefined>) {
  const aliases = new Set<string>();

  values.forEach((value) => {
    const raw = String(value || '').trim();
    if (!raw) return;

    const normalized = normalizeEventToken(raw);
    if (normalized) aliases.add(normalized);

    const withoutBrackets = raw.replace(/\([^)]*\)/g, ' ').trim();
    const normalizedWithoutBrackets = normalizeEventToken(withoutBrackets);
    if (normalizedWithoutBrackets) aliases.add(normalizedWithoutBrackets);

    normalized
      .split('-')
      .filter(Boolean)
      .forEach((part) => aliases.add(part));

    normalizedWithoutBrackets
      .split('-')
      .filter(Boolean)
      .forEach((part) => aliases.add(part));
  });

  return aliases;
}

function matchesEventAlias(row: Pick<AdminRegistration, 'event_slug' | 'event_name'>, event: Pick<EventRecord, 'slug' | 'name'>) {
  const rowAliases = buildEventAliases(row.event_slug, row.event_name);
  const eventAliases = buildEventAliases(event.slug, event.name);

  for (const alias of eventAliases) {
    if (rowAliases.has(alias)) {
      return true;
    }
  }

  const rowCombined = Array.from(rowAliases).join(' ');
  return Array.from(eventAliases).some((alias) => alias.length > 3 && rowCombined.includes(alias));
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

export const AdminRegistrationsPage: React.FC<Props> = ({ adminAccessMode, adminMainKey, adminEventKey, adminEventKeySlug, adminScope, adminRows, events, announcements, backups, adminLoading, adminError, onAdminAccessModeChange, onAdminMainKeyChange, onAdminEventKeyChange, onAdminEventKeySlugChange, onLoadAdminRows, onDownload, onStatusChange, onDeleteRegistration, onSaveReviewNote, onResendStatusEmail, onSendBroadcast, onDeleteAnnouncement, onRunBackup, onDownloadBackup }) => {
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
  const hasResolvedAccess = Boolean(adminScope);
  const activeDraftKey = adminAccessMode === 'global' ? adminMainKey : adminEventKey;
  const selectedDraftEventName = events.find((event) => event.slug === adminEventKeySlug)?.name || '';
  const canSubmitAccess = adminAccessMode === 'global'
    ? Boolean(adminMainKey.trim())
    : Boolean(adminEventKeySlug && adminEventKey.trim());
  const canShowBroadcastTools = hasResolvedAccess && adminScope?.can_manage_broadcasts !== false;
  const canShowBackupTools = hasResolvedAccess && adminScope?.can_manage_backups !== false;
  const accessSummary = adminScope?.mode === 'event'
    ? `Scoped access active for ${scopedEventName || 'the selected event'}. Only that event's entries are visible below.`
    : 'Main key verified. All event content and organizer controls are available.';

  useEffect(() => {
    setEventFilter(scopedEventSlug || 'all');
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
      const matchesSearch = [row.registration_code, row.team_name, row.contact_name, row.contact_email, row.event_name, row.review_note ?? '', row.payment_reference ?? '']
        .some((value) => value.toLowerCase().includes(normalizedSearch));

      return matchesStatus && matchesEvent && matchesSearch;
    });
  }, [adminRows, eventFilter, events, searchQuery, statusFilter]);
  const totalParticipants = adminRows.reduce((sum, row) => sum + row.participants.length, 0);
  const busiestEvent = useMemo(() => Object.entries(adminRows.reduce<Record<string, number>>((collection, row) => ({ ...collection, [row.event_name]: (collection[row.event_name] || 0) + 1 }), {})).sort((left, right) => right[1] - left[1])[0] || null, [adminRows]);
  const approvalRate = counts.all ? Math.round((counts.verified / counts.all) * 100) : 0;
  const topTrackedEvents = useMemo(() => [...eventBuckets].sort((left, right) => right.total - left.total).slice(0, 4), [eventBuckets]);

  useEffect(() => {
    if (expandedRowId && !filteredRows.some((row) => row.id === expandedRowId)) {
      setExpandedRowId(null);
    }
  }, [expandedRowId, filteredRows]);

  return (
    <main className={`${shellClassName} space-y-4 pb-10 md:space-y-8 md:pb-20`}>
      <section className="portal-glow-card portal-glass rounded-[1.5rem] p-4 md:rounded-[2rem] md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <a href="#overview" className="magnetic-button inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200"><ArrowLeft size={16} />Back to portal</a>
            <div className="portal-admin-lockup">
              <div className="portal-admin-lockup__frame">
                <div className="portal-admin-lockup__core" aria-hidden="true">
                  <span className="portal-admin-lockup__icon">
                    <ShieldCheck size={15} />
                  </span>
                  <span className="portal-admin-lockup__monogram">AX</span>
                </div>
              </div>
              <div>
                <p className="portal-admin-lockup__overline">CEAS Organizer Console</p>
                <p className="portal-admin-lockup__meta">Official operations workspace for registrations, announcements, and verification.</p>
              </div>
            </div>
            <p className="mt-5 text-[11px] uppercase tracking-[0.35em] text-blue-300/80">Admin workspace</p>
            <h2 className="mt-2 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text font-orbitron text-2xl font-black uppercase text-transparent md:text-4xl">Operations dashboard</h2>
          </div>
          {hasResolvedAccess ? (
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <a href="#admin-analytics" className="rounded-[1.4rem] border border-cyan-300/14 bg-cyan-400/10 p-4 transition hover:-translate-y-0.5 hover:border-cyan-300/24"><p className="text-xs uppercase tracking-[0.24em] text-cyan-100/80">Registrations</p><p className="mt-2 text-3xl font-black text-white">{counts.all}</p></a>
              <a href="#admin-analytics" className="rounded-[1.4rem] border border-fuchsia-300/14 bg-fuchsia-400/10 p-4 transition hover:-translate-y-0.5 hover:border-fuchsia-300/24"><p className="text-xs uppercase tracking-[0.24em] text-fuchsia-100/80">Participants</p><p className="mt-2 text-3xl font-black text-white">{totalParticipants}</p></a>
              <a href="#admin-verification" className="rounded-[1.4rem] border border-emerald-300/14 bg-emerald-400/10 p-4 transition hover:-translate-y-0.5 hover:border-emerald-300/24"><p className="text-xs uppercase tracking-[0.24em] text-emerald-100/80">Verified</p><p className="mt-2 text-3xl font-black text-white">{counts.verified}</p></a>
              <a href="#admin-analytics" className="rounded-[1.4rem] border border-yellow-300/14 bg-yellow-400/10 p-4 transition hover:-translate-y-0.5 hover:border-yellow-300/24"><p className="text-xs uppercase tracking-[0.24em] text-yellow-100/80">Busiest event</p><p className="mt-2 text-sm font-semibold text-white">{busiestEvent ? `${busiestEvent[0]} (${busiestEvent[1]})` : 'Waiting to load'}</p></a>
            </div>
          ) : null}
        </div>
        <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-black/20 p-4 md:p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <button type="button" onClick={() => onAdminAccessModeChange('global')} className={`rounded-[1.35rem] border px-4 py-4 text-left transition ${adminAccessMode === 'global' ? 'border-cyan-300/28 bg-cyan-400/12 text-white' : 'border-white/10 bg-white/5 text-slate-200'}`}>
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/80">Option 1</p>
              <p className="mt-2 text-lg font-bold text-white">Main key</p>
            </button>
            <button type="button" onClick={() => onAdminAccessModeChange('event')} className={`rounded-[1.35rem] border px-4 py-4 text-left transition ${adminAccessMode === 'event' ? 'border-fuchsia-300/28 bg-fuchsia-400/12 text-white' : 'border-white/10 bg-white/5 text-slate-200'}`}>
              <p className="text-xs uppercase tracking-[0.22em] text-fuchsia-100/80">Option 2</p>
              <p className="mt-2 text-lg font-bold text-white">Particular event key</p>
            </button>
          </div>

          <div className={`mt-4 grid gap-4 ${adminAccessMode === 'event' ? 'xl:grid-cols-[0.9fr_1.1fr_auto]' : 'xl:grid-cols-[1.1fr_auto]'}`}>
            {adminAccessMode === 'event' ? (
              <label className="block rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
                <span className="mb-2 block text-sm text-slate-200">Select competition</span>
                <select value={adminEventKeySlug} onChange={(event) => onAdminEventKeySlugChange(event.target.value)} className="floating-field-input">
                  <option value="">Choose an event</option>
                  {events.map((event) => <option key={event.slug} value={event.slug}>{event.name}</option>)}
                </select>
                <p className="mt-3 text-xs text-slate-400">{selectedDraftEventName ? `Key will be matched against ${selectedDraftEventName}.` : 'Each competition can have its own verification key.'}</p>
              </label>
            ) : null}
            <FloatingField label={adminAccessMode === 'global' ? 'Enter main admin key' : 'Enter selected event key'} icon={<ShieldCheck size={18} />} type="password" value={activeDraftKey} onChange={adminAccessMode === 'global' ? onAdminMainKeyChange : onAdminEventKeyChange} />
            <button type="button" onClick={onLoadAdminRows} disabled={adminLoading || !canSubmitAccess} className="animated-gradient-button rounded-2xl px-5 py-3 font-bold text-slate-950 disabled:opacity-60">{adminLoading ? 'Verifying...' : adminAccessMode === 'global' ? 'Show all content' : 'Open event verification'}</button>
          </div>
          {hasResolvedAccess ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="flex-1 rounded-2xl border border-emerald-300/18 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">{accessSummary}</div>
              <label className="block min-w-[240px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">Download scope</span>
                <select value={exportEventSlug} onChange={(event) => setExportEventSlug(event.target.value)} disabled={Boolean(scopedEventSlug)} className="floating-field-input disabled:opacity-70">
                  <option value="all">All competitions</option>
                  {events.map((event) => <option key={`export-${event.slug}`} value={event.slug}>{event.name}</option>)}
                </select>
              </label>
              <button type="button" onClick={() => onDownload('csv', exportEventSlug === 'all' ? undefined : exportEventSlug)} disabled={!hasResolvedAccess || adminScope?.can_export === false} className="magnetic-button inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-300/12 bg-white/5 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"><Download size={16} />CSV</button>
              <button type="button" onClick={() => onDownload('xlsx', exportEventSlug === 'all' ? undefined : exportEventSlug)} disabled={!hasResolvedAccess || adminScope?.can_export === false} className="magnetic-button inline-flex items-center justify-center gap-2 rounded-2xl border border-fuchsia-300/12 bg-white/5 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"><FileSpreadsheet size={16} />Excel</button>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-3 text-sm text-slate-400">
              Enter a valid key and load the records. Compact verification cards will appear below.
            </div>
          )}
        </div>
        {adminError ? <div className="mt-5 rounded-2xl border border-rose-400/25 bg-gradient-to-r from-rose-500/14 to-orange-500/8 px-4 py-3 text-sm text-rose-100">{adminError}</div> : null}
      </section>
      <div className="flex flex-wrap gap-2">
        <a href="#admin-analytics" className="magnetic-button rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white">Analytics</a>
        <a href="#admin-verification" className="magnetic-button rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white">Verification</a>
        {canShowBroadcastTools ? <a href="#admin-broadcast" className="magnetic-button rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white">Broadcast</a> : null}
      </div>

      <section id="admin-analytics" className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div data-reveal="up" className="portal-glow-card portal-glass rounded-[1.5rem] p-4 md:rounded-[2rem] md:p-6">
          <div className="flex items-center gap-3"><BarChart3 size={18} className="text-cyan-200" /><div><h3 className="text-xl font-bold text-white">Admin analytics</h3><p className="text-sm text-slate-400">Short overview for approvals and event load.</p></div></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.4rem] border border-amber-300/16 bg-amber-400/10 p-4"><p className="text-xs uppercase tracking-[0.2em] text-amber-100/80">Pending</p><p className="mt-2 text-2xl font-bold text-white">{counts.pending}</p></div>
            <div className="rounded-[1.4rem] border border-fuchsia-300/16 bg-fuchsia-400/10 p-4"><p className="text-xs uppercase tracking-[0.2em] text-fuchsia-100/80">Waitlisted</p><p className="mt-2 text-2xl font-bold text-white">{counts.waitlisted}</p></div>
            <div className="rounded-[1.4rem] border border-rose-300/16 bg-rose-400/10 p-4"><p className="text-xs uppercase tracking-[0.2em] text-rose-100/80">Rejected</p><p className="mt-2 text-2xl font-bold text-white">{counts.rejected}</p></div>
            <div className="rounded-[1.4rem] border border-cyan-300/16 bg-cyan-400/10 p-4"><p className="text-xs uppercase tracking-[0.2em] text-cyan-100/80">Approval rate</p><p className="mt-2 text-2xl font-bold text-white">{approvalRate}%</p></div>
          </div>
          <div className="mt-5 rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">Top competitions</p>
              <span className="text-xs uppercase tracking-[0.2em] text-slate-400">{eventBuckets.length} active events</span>
            </div>
            <div className="mt-4 space-y-3">
              {topTrackedEvents.length > 0 ? topTrackedEvents.map((event, index) => (
                <div key={event.slug} className="flex items-center justify-between gap-3 rounded-[1.15rem] border border-white/8 bg-white/[0.04] px-4 py-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Rank 0{index + 1}</p>
                    <p className="mt-1 font-semibold text-white">{event.name}</p>
                  </div>
                  <div className="text-right text-xs uppercase tracking-[0.16em] text-slate-300">
                    <p>{event.total} total</p>
                    <p className="mt-1 text-slate-500">{event.pending} pending / {event.verified} verified</p>
                  </div>
                </div>
              )) : <div className="rounded-[1.15rem] border border-dashed border-white/10 bg-black/10 px-4 py-4 text-sm text-slate-400">Analytics will appear after records load.</div>}
            </div>
          </div>
        </div>

        <div data-reveal="up" className="space-y-4 md:space-y-6">
          {canShowBroadcastTools ? <div id="admin-broadcast" className="portal-glow-card portal-glass rounded-[1.5rem] p-4 md:rounded-[2rem] md:p-6">
            <div className="flex items-center gap-3"><Megaphone size={18} className="text-fuchsia-200" /><h3 className="text-xl font-bold text-white">Broadcast center</h3></div>
            <div className="mt-5 grid gap-4">
              <label className="block rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
                <span className="mb-2 block text-sm text-slate-200">Target event</span>
                <select value={broadcastEventSlug} onChange={(event) => setBroadcastEventSlug(event.target.value)} className="floating-field-input">
                  <option value="">All verified participants</option>
                  {events.map((event) => <option key={event.slug} value={event.slug}>{event.name}</option>)}
                </select>
              </label>
              <label className="floating-field block"><input value={broadcastTitle} onChange={(event) => setBroadcastTitle(event.target.value)} placeholder=" " className="floating-field-input" /><span className="floating-field-label">Broadcast title</span></label>
              <label className="floating-field block"><textarea value={broadcastMessage} onChange={(event) => setBroadcastMessage(event.target.value)} placeholder=" " rows={4} className="floating-field-input min-h-[120px] resize-none" /><span className="floating-field-label">Broadcast message</span></label>
              <label className="inline-flex items-center gap-3 rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"><input type="checkbox" checked={broadcastPinned} onChange={(event) => setBroadcastPinned(event.target.checked)} /> Pin this on the public portal</label>
              <button type="button" onClick={() => onSendBroadcast({ title: broadcastTitle, message: broadcastMessage, eventSlug: broadcastEventSlug, isPinned: broadcastPinned })} className="animated-gradient-button inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 font-bold text-slate-950"><Send size={16} />Publish and send</button>
            </div>
          </div> : null}

          {canShowBackupTools ? <div className="portal-glow-card portal-glass rounded-[1.5rem] p-4 md:rounded-[2rem] md:p-6">
            <div className="flex items-center gap-3"><HardDriveDownload size={18} className="text-yellow-200" /><h3 className="text-xl font-bold text-white">Backups and archive</h3></div>
            <div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={onRunBackup} className="magnetic-button inline-flex items-center gap-2 rounded-2xl border border-yellow-300/18 bg-yellow-400/10 px-4 py-3 text-sm font-bold text-yellow-100"><HardDriveDownload size={16} />Run backup now</button></div>
            <div className="mt-5 space-y-3">
              {backups.slice(0, 4).map((backup) => <div key={backup.file_name} className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold text-white">{backup.file_name}</p><p className="mt-1 text-sm text-slate-400">{new Date(backup.created_at).toLocaleString()} / {formatBytes(backup.size_bytes)} / {backup.trigger}</p></div><button type="button" onClick={() => onDownloadBackup(backup.file_name)} className="magnetic-button rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white">Download</button></div></div>)}
            </div>
            <div className="mt-5 space-y-3">
              {announcements.slice(0, 3).map((announcement) => <div key={announcement.id} className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex flex-wrap items-center gap-2">{announcement.is_pinned ? <span className="rounded-full border border-yellow-300/20 bg-yellow-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-yellow-100">Pinned</span> : null}{announcement.event_name ? <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-200">{announcement.event_name}</span> : null}</div><button type="button" onClick={() => onDeleteAnnouncement(announcement.id)} className="magnetic-button inline-flex items-center gap-2 rounded-xl border border-rose-300/18 bg-rose-400/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-rose-100"><Trash2 size={14} />Delete</button></div><p className="mt-3 font-semibold text-white">{announcement.title}</p><p className="mt-2 text-sm text-slate-300">{announcement.message}</p></div>)}
            </div>
          </div> : null}
        </div>
      </section>

      <section id="admin-verification" data-reveal="up" className="portal-glow-card portal-glass rounded-[1.5rem] p-4 md:rounded-[2rem] md:p-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-blue-300/80">Registration operations</p>
            <h3 className="mt-2 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text font-orbitron text-3xl font-black uppercase text-transparent">Proof review and approval</h3>
          </div>
          <div className="w-full max-w-xl"><FloatingField label="Search by team, code, event, or participant" icon={<Search size={18} />} value={searchQuery} onChange={setSearchQuery} /></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {([['all', 'All', counts.all], ['pending', 'Pending', counts.pending], ['verified', 'Verified', counts.verified], ['waitlisted', 'Waitlisted', counts.waitlisted], ['rejected', 'Rejected', counts.rejected]] as const).map(([value, label, count]) => (
            <button key={value} type="button" onClick={() => setStatusFilter(value)} className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] transition ${statusFilter === value ? 'border-blue-300/30 bg-gradient-to-r from-blue-500/18 via-purple-500/16 to-pink-500/18 text-white' : 'border-white/10 bg-white/5 text-slate-200 hover:border-blue-300/20 hover:text-white'}`}>
              {label} ({count})
            </button>
          ))}
        </div>
        <div className="mt-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/80">Competition-wise verification</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" onClick={() => { setExpandedRowId(null); setEventFilter(scopedEventSlug || 'all'); }} disabled={Boolean(scopedEventSlug)} className={`rounded-[1.2rem] border px-4 py-3 text-left text-sm transition disabled:opacity-70 ${eventFilter === (scopedEventSlug || 'all') ? 'border-cyan-300/24 bg-cyan-400/10 text-white' : 'border-white/10 bg-white/5 text-slate-200'}`}>
              <span className="block font-semibold">All competitions</span>
              <span className="mt-1 block text-xs uppercase tracking-[0.16em] text-slate-400">{scopedEventSlug ? `Locked to ${scopedEventName || 'assigned event'}` : `${counts.all} registrations`}</span>
            </button>
            {eventBuckets.map((event) => (
              <button key={event.slug} type="button" onClick={() => { setExpandedRowId(null); setEventFilter(event.slug); }} disabled={Boolean(scopedEventSlug && scopedEventSlug !== event.slug)} className={`rounded-[1.2rem] border px-4 py-3 text-left text-sm transition disabled:opacity-50 ${eventFilter === event.slug ? 'border-fuchsia-300/24 bg-fuchsia-400/10 text-white' : 'border-white/10 bg-white/5 text-slate-200'}`}>
                <span className="block font-semibold">{event.name}</span>
                <span className="mt-1 block text-xs uppercase tracking-[0.16em] text-slate-400">{event.total} total / {event.pending} pending / {event.verified} verified</span>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-6 space-y-4">
          {filteredRows.map((row) => (
            <article key={row.id} className="rounded-[1.7rem] border border-white/10 bg-[linear-gradient(145deg,rgba(12,20,35,0.92),rgba(18,27,45,0.82))] p-4 md:p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <button type="button" onClick={() => setExpandedRowId((current) => current === row.id ? null : row.id)} className="min-w-0 text-left">
                        <p className="truncate text-lg font-semibold text-white">{row.team_name}</p>
                        <span className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200">
                          {row.registration_code}
                          <Eye size={12} className="text-cyan-200" />
                        </span>
                      </button>
                      <p className="mt-2 text-sm text-slate-300">{row.event_name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{row.date_label} / {row.time_label}</p>
                      <p className="mt-2 text-xs text-cyan-100/80">Click the team name or code to {expandedRowId === row.id ? 'hide' : 'show'} verification details.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${statusStyles[row.status] || 'border-white/10 bg-white/5 text-white'}`}>{prettyStatus(row.status)}</span>
                      <span className="rounded-full border border-blue-300/18 bg-blue-400/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-blue-100">{row.participants.length} participants</span>
                      {row.duplicate_email_count > 0 ? <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-amber-100"><AlertTriangle size={12} />Email x{row.duplicate_email_count}</span> : null}
                      {row.duplicate_phone_count > 0 ? <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-amber-100"><AlertTriangle size={12} />Phone x{row.duplicate_phone_count}</span> : null}
                      {row.duplicate_payment_count > 0 ? <span className="inline-flex items-center gap-2 rounded-full border border-rose-300/20 bg-rose-400/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-rose-100"><AlertTriangle size={12} />Payment x{row.duplicate_payment_count}</span> : null}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-[1.2rem] border border-white/10 bg-black/20 p-3">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Lead contact</p>
                      <p className="mt-2 text-sm font-semibold text-white">{row.contact_name}</p>
                      <p className="mt-1 truncate text-sm text-slate-300">{row.contact_email}</p>
                    </div>
                    <div className="rounded-[1.2rem] border border-white/10 bg-black/20 p-3">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Venue</p>
                      <p className="mt-2 text-sm font-semibold text-white">{row.venue}</p>
                      <p className="mt-1 text-sm text-slate-300">{row.contact_phone}</p>
                    </div>
                    <div className="rounded-[1.2rem] border border-white/10 bg-black/20 p-3">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Payment</p>
                      <p className="mt-2 text-sm font-semibold text-white">{formatCurrency(row.total_amount)}</p>
                      <p className="mt-1 truncate text-sm text-slate-300">{row.payment_reference || 'No payment reference'}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[220px] xl:grid-cols-1">
                  <button type="button" onClick={() => onResendStatusEmail(row.id)} className="magnetic-button inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-300/20 bg-blue-500/10 px-4 py-3 text-sm font-bold text-blue-100"><RotateCcw size={16} />Resend email</button>
                  <button type="button" onClick={() => onStatusChange(row.id, 'verified')} className="magnetic-button inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-100"><CheckCircle2 size={16} />Approve</button>
                  <button type="button" onClick={() => onStatusChange(row.id, 'pending')} className="magnetic-button inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm font-bold text-amber-100"><Clock3 size={16} />Pending</button>
                  <button type="button" onClick={() => onStatusChange(row.id, 'rejected')} className="magnetic-button inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm font-bold text-rose-100"><XCircle size={16} />Reject</button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Delete registration ${row.registration_code} for ${row.team_name}? This cannot be undone.`)) {
                        onDeleteRegistration(row.id);
                      }
                    }}
                    className="magnetic-button inline-flex items-center justify-center gap-2 rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>

              {expandedRowId === row.id ? (
                <div className="mt-5 border-t border-white/10 pt-5">
                  <div className="grid gap-4 xl:grid-cols-[1.04fr_0.96fr]">
                    <div className="space-y-4">
                      <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-white"><Users size={16} className="text-blue-300" />Participants ({row.participants.length})</div>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          {row.participants.map((participant) => (
                            <div key={`${row.id}-${participant.email}`} className="rounded-[1.1rem] border border-white/10 bg-black/20 p-3">
                              <p className="font-semibold text-white">{participant.fullName}</p>
                              <p className="mt-2 text-sm text-slate-300">{participant.email}</p>
                              <p className="mt-1 text-sm text-slate-300">{participant.phone}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                        <div className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
                          <div className="flex items-center gap-2"><Save size={16} className="text-amber-200" /><p className="text-sm font-semibold text-white">Review notes</p></div>
                          <textarea value={reviewDrafts[row.id] ?? row.review_note ?? ''} onChange={(event) => setReviewDrafts((current) => ({ ...current, [row.id]: event.target.value }))} rows={4} className="floating-field-input mt-4 min-h-[112px] resize-none" placeholder="Add a short note for this verification..." />
                          <button type="button" onClick={() => onSaveReviewNote(row.id, reviewDrafts[row.id] ?? row.review_note ?? '')} className="magnetic-button mt-4 inline-flex items-center gap-2 rounded-2xl border border-amber-300/18 bg-amber-400/10 px-4 py-3 text-sm font-bold text-amber-100"><Save size={16} />Save note</button>
                        </div>
                        <div className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
                          <div className="flex items-center gap-2"><Mail size={16} className="text-fuchsia-300" /><p className="text-sm font-semibold text-white">Notification center</p></div>
                          <div className="mt-4"><NotificationPanel notification={row.latest_notification} /></div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4 text-center">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Registration code</p>
                        <p className="mt-2 font-orbitron text-lg font-bold text-white">{row.registration_code}</p>
                        <p className="mt-3 text-sm leading-6 text-slate-300">
                          Venue verification now relies on the official pass details and registration code.
                        </p>
                      </div>

                      {row.payment_screenshot_path && !brokenProofs[row.id] ? (
                        <button type="button" onClick={() => setProofModal(row)} className="group block w-full overflow-hidden rounded-[1.35rem] border border-cyan-300/12 bg-white/5 text-left">
                          <img src={row.payment_screenshot_path} alt={`${row.team_name} payment proof`} onError={() => setBrokenProofs((current) => ({ ...current, [row.id]: true }))} className="h-48 w-full object-cover transition duration-500 group-hover:scale-105" />
                          <div className="flex items-center justify-between px-4 py-3 text-sm text-cyan-100"><span>Open payment screenshot</span><Eye size={16} /></div>
                        </button>
                      ) : (
                        <div className="rounded-[1.35rem] border border-dashed border-white/10 bg-black/10 p-5 text-sm text-slate-400">{row.payment_screenshot_path ? 'Payment screenshot is missing from storage. On Railway, attach persistent storage or older uploads can disappear after restart/redeploy.' : 'No payment screenshot uploaded for this registration.'}</div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </article>
          ))}
          {adminRows.length === 0 && !adminLoading ? <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-black/10 p-5 text-sm text-slate-400">Load the admin records to review proofs, approve entries, and run exports.</div> : null}
          {adminRows.length > 0 && filteredRows.length === 0 && !adminLoading ? <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-black/10 p-5 text-sm text-slate-400">No registrations match the current search or status filter.</div> : null}
        </div>
      </section>
      {proofModal ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(5,8,16,0.88)] px-4 py-6 backdrop-blur-md"><div className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(12,20,35,0.98),rgba(18,27,45,0.96))] p-5 md:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[11px] uppercase tracking-[0.3em] text-cyan-200/80">Payment proof zoom</p><h4 className="mt-2 text-xl font-bold text-white">{proofModal.team_name}</h4></div><button type="button" onClick={() => setProofModal(null)} className="magnetic-button rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white">Close</button></div><div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]"><div className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-black/20 p-3"><img src={proofModal.payment_screenshot_path || ''} alt={`${proofModal.team_name} payment proof`} className="w-full rounded-[1.2rem] object-contain" /></div><div className="space-y-4"><div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4"><p className="text-xs uppercase tracking-[0.2em] text-slate-400">Reference</p><p className="mt-2 break-all font-semibold text-white">{proofModal.payment_reference || 'No payment reference'}</p></div><div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4"><p className="text-xs uppercase tracking-[0.2em] text-slate-400">Contact</p><p className="mt-2 text-white">{proofModal.contact_name}</p><p className="mt-1 text-slate-300">{proofModal.contact_email}</p><p className="mt-1 text-slate-300">{proofModal.contact_phone}</p></div></div></div></div></div> : null}
      </main>
  );
};
