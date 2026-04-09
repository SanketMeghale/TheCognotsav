import React from 'react';
import {
  ChevronDown,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileSpreadsheet,
  Search,
  ShieldCheck,
  Trophy,
  XCircle,
} from 'lucide-react';
import type { AdminRegistration, LookupResult } from './types';
import { isEventConcluded } from './utils';

type Props = {
  lookupQuery: string;
  lookupLoading: boolean;
  lookupTouched: boolean;
  lookupResults: LookupResult[];
  adminKey: string;
  adminRows: AdminRegistration[];
  adminLoading: boolean;
  adminError: string;
  onLookupQueryChange: (value: string) => void;
  onLookup: (event: React.FormEvent) => void;
  onAdminKeyChange: (value: string) => void;
  onLoadAdminRows: () => void;
  onDownload: (format: 'csv' | 'xlsx') => void;
  onStatusChange: (registrationId: string, status: 'verified' | 'rejected' | 'pending') => void;
  showAdmin?: boolean;
};

const statusStyles: Record<string, string> = {
  pending: 'border-amber-300/25 bg-amber-400/10 text-amber-100',
  verified: 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100',
  rejected: 'border-rose-300/25 bg-rose-400/10 text-rose-100',
  waitlisted: 'border-fuchsia-300/25 bg-fuchsia-400/10 text-fuchsia-100',
};

const certificateCardThemes = [
  {
    shell: 'border-cyan-300/40 bg-gradient-to-br from-cyan-500/20 via-slate-900/90 to-indigo-500/15 shadow-xl',
    avatar: 'from-cyan-300 to-sky-400',
    button: 'border-cyan-200/55 bg-gradient-to-r from-cyan-500/90 to-indigo-500/85 text-white shadow-lg',
  },
  {
    shell: 'border-fuchsia-300/40 bg-gradient-to-br from-fuchsia-500/20 via-slate-900/90 to-pink-500/15 shadow-xl',
    avatar: 'from-fuchsia-300 to-pink-400',
    button: 'border-fuchsia-200/55 bg-gradient-to-r from-fuchsia-500/90 to-pink-500/85 text-white shadow-lg',
  },
  {
    shell: 'border-amber-300/45 bg-gradient-to-br from-amber-500/22 via-slate-900/90 to-orange-500/18 shadow-xl',
    avatar: 'from-amber-300 to-orange-400',
    button: 'border-amber-200/55 bg-gradient-to-r from-amber-500/90 to-orange-500/85 text-white shadow-lg',
  },
  {
    shell: 'border-emerald-300/45 bg-gradient-to-br from-emerald-500/22 via-slate-900/90 to-teal-500/16 shadow-xl',
    avatar: 'from-emerald-300 to-teal-400',
    button: 'border-emerald-200/55 bg-gradient-to-r from-emerald-500/90 to-teal-500/85 text-white shadow-lg',
  },
];

function prettyStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function buildCertificateHref(registrationCode: string, participantIndex: number) {
  return `/certificate/${encodeURIComponent(registrationCode)}?participant=${participantIndex}&download=true`;
}

function FloatingSearchField({
  label,
  icon,
  value,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="floating-field block">
      <span className="pointer-events-none absolute left-4 top-[1.15rem] text-cyan-200/70">{icon}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder=" "
        className="floating-field-input pl-11"
      />
      <span className="floating-field-label left-11">{label}</span>
    </label>
  );
}

export const TrackerAdminPanel: React.FC<Props> = ({
  lookupQuery,
  lookupLoading,
  lookupTouched,
  lookupResults,
  adminKey,
  adminRows,
  adminLoading,
  adminError,
  onLookupQueryChange,
  onLookup,
  onAdminKeyChange,
  onLoadAdminRows,
  onDownload,
  onStatusChange,
  showAdmin = true,
}) => {
  const pendingRows = adminRows.filter((row) => row.status === 'pending');
  const verifiedRows = adminRows.filter((row) => row.status === 'verified');
  const rejectedRows = adminRows.filter((row) => row.status === 'rejected');
  const [expandedLookupDetails, setExpandedLookupDetails] = React.useState<Record<string, boolean>>({});

  const handleDownloadAllCertificates = (registrationCode: string, participantCount: number) => {
    for (let index = 0; index < participantCount; index += 1) {
      window.open(buildCertificateHref(registrationCode, index), '_blank', 'noopener,noreferrer');
    }
  };

  const toggleLookupDetails = (registrationId: string) => {
    setExpandedLookupDetails((current) => ({
      ...current,
      [registrationId]: !current[registrationId],
    }));
  };

  return (
    <section id="tracker" className={`grid gap-5 ${showAdmin ? 'xl:grid-cols-[0.92fr_1.08fr] xl:gap-6' : ''}`}>
      <div data-reveal="left" className="portal-glow-card portal-glass rounded-[1.6rem] p-4 md:rounded-[2rem] md:p-8">
        <div className="portal-admin-lockup portal-admin-lockup--compact">
          <div className="portal-admin-lockup__frame">
            <div className="portal-admin-lockup__core" aria-hidden="true">
              <span className="portal-admin-lockup__icon">
                <ShieldCheck size={15} />
              </span>
            </div>
          </div>
        </div>
        <p className="text-[11px] uppercase tracking-[0.35em] text-blue-300/80">Certificate Hub</p>
        <h3 className="portal-title-lg mt-2 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text font-orbitron font-black uppercase text-transparent">
          Certificates Ready!
        </h3>
        <p className="mt-3 text-sm leading-6 text-slate-200 md:leading-7">
          Download your participation certificates instantly and check approval status from one place.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full border border-blue-400/16 bg-blue-500/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-blue-100">
            Code lookup
          </span>
          <span className="rounded-full border border-purple-400/16 bg-purple-500/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-purple-100">
            Email lookup
          </span>
          <span className="rounded-full border border-pink-400/16 bg-pink-500/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-pink-100">
            Live status
          </span>
        </div>

        <form onSubmit={onLookup} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <FloatingSearchField
              label="Enter registration code or contact email"
              icon={<Search size={18} />}
              value={lookupQuery}
              onChange={onLookupQueryChange}
            />
          </div>
          <button
            type="submit"
            disabled={lookupLoading || !lookupQuery.trim()}
            className="animated-gradient-button rounded-2xl px-5 py-3 font-bold text-slate-950 disabled:opacity-60 sm:min-w-[10rem]"
          >
            {lookupLoading ? 'Searching...' : 'Search'}
          </button>
        </form>

        <div className="mt-6 space-y-4">
          {lookupResults.map((result) => {
            const certificateReady = result.status === 'verified' && isEventConcluded(result) && result.participants.length > 0;
            const certificateNote = result.status !== 'verified'
              ? 'Certificates are available only for verified registrations.'
              : !isEventConcluded(result)
                ? 'Certificates will unlock after the event has concluded.'
                : result.participants.length === 0
                  ? 'Participant names are still syncing for this registration.'
                  : 'Each participant can download an individual participation certificate below.';
            const detailsOpen = Boolean(expandedLookupDetails[result.id]);
            const heroTitle = certificateReady ? 'Your Certificates Are Ready!' : 'Certificate Status';

            return (
              <div
                key={result.id}
                data-reveal="up"
                className="tilt-card overflow-hidden rounded-[1.7rem] bg-transparent p-0 shadow-none md:border md:border-white/10 md:bg-gradient-to-br md:from-fuchsia-500/10 md:via-slate-950/95 md:to-cyan-500/10 md:p-5 md:shadow-2xl"
              >
                <div className="rounded-[1.55rem] border-0 bg-transparent p-0 shadow-none md:border md:border-white/12 md:bg-gradient-to-br md:from-fuchsia-500/12 md:via-slate-950/95 md:to-cyan-500/12 md:p-5 md:shadow-2xl">
                  <div className="rounded-[1.5rem] border border-fuchsia-300/45 bg-gradient-to-br from-fuchsia-500/24 via-indigo-500/14 to-cyan-500/24 p-4 shadow-[0_0_28px_rgba(80,180,255,0.18)] md:rounded-[1.4rem] md:border-fuchsia-300/35 md:bg-gradient-to-r md:from-fuchsia-500/18 md:via-indigo-500/10 md:to-cyan-500/16 md:shadow-xl">
                    <div className="flex flex-col gap-3 md:gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <div className="flex items-start gap-3 md:gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-fuchsia-300/40 bg-gradient-to-br from-amber-300 via-yellow-300 to-orange-400 text-slate-950 shadow-[0_0_20px_rgba(255,181,64,0.35)] md:h-14 md:w-14 md:border-fuchsia-300/30 md:shadow-xl">
                          <Trophy size={24} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-[0.28em] text-fuchsia-100/80 md:text-[11px] md:tracking-[0.32em]">Participation certificates</p>
                          <h4 className="mt-1 max-w-[12rem] text-[1.8rem] font-black leading-[1.05] tracking-tight text-white sm:max-w-none sm:text-2xl md:text-[2rem]">{heroTitle}</h4>
                          <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-200 sm:text-sm sm:leading-6">{certificateNote}</p>
                        </div>
                      </div>

                      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
                        <span
                          className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${
                            statusStyles[result.status] || 'border-white/10 bg-white/5 text-slate-100'
                          }`}
                        >
                          {prettyStatus(result.status)}
                        </span>
                        {certificateReady ? (
                          <button
                            type="button"
                            onClick={() => handleDownloadAllCertificates(result.registration_code, result.participants.length)}
                            className="magnetic-button inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-200/55 bg-gradient-to-r from-cyan-500 via-indigo-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_26px_rgba(87,220,255,0.22)] sm:w-auto sm:shadow-lg"
                          >
                            <Download size={15} />
                            Download All Certificates
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 hidden flex-wrap gap-2 sm:flex">
                      <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-100">
                        {result.event_name}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-100">
                        {result.registration_code}
                      </span>
                      {result.waitlist_position ? (
                        <span className="rounded-full border border-fuchsia-300/20 bg-fuchsia-400/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-fuchsia-100">
                          Queue #{result.waitlist_position}
                        </span>
                      ) : null}
                      {result.payment_method ? (
                        <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-cyan-100">
                          {result.payment_method}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {certificateReady ? (
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      {result.participants.map((participant, index) => {
                        const theme = certificateCardThemes[index % certificateCardThemes.length];

                        return (
                          <div
                            key={`${result.id}-certificate-${index}`}
                            className={`rounded-[1.45rem] border p-4 shadow-[0_0_26px_rgba(120,160,255,0.14)] ${theme.shell}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${theme.avatar} text-base font-black text-slate-950 shadow-[0_10px_24px_rgba(255,255,255,0.16)]`}>
                                {participant.fullName.trim().charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-base font-bold text-white sm:text-lg">{participant.fullName}</p>
                                <div className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-emerald-200 sm:text-sm">
                                  <CheckCircle2 size={14} />
                                  <span>Verified</span>
                                </div>
                              </div>
                            </div>

                            <a
                              href={buildCertificateHref(result.registration_code, index)}
                              target="_blank"
                              rel="noreferrer"
                              className={`magnetic-button mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold ${theme.button}`}
                            >
                              <Download size={15} />
                              Download Certificate
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-[1.35rem] border border-dashed border-white/12 bg-black/15 px-4 py-4 text-sm leading-6 text-slate-300">
                      {certificateNote}
                    </div>
                  )}
                </div>

                <div className={`mt-4 border border-white/10 bg-white/[0.04] ${detailsOpen ? 'rounded-[1.35rem]' : 'rounded-full'}`}>
                  <button
                    type="button"
                    onClick={() => toggleLookupDetails(result.id)}
                    className={`flex w-full flex-col items-center justify-center gap-2 px-4 text-center ${detailsOpen ? 'py-4' : 'py-3.5'}`}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <ChevronDown className={`text-slate-300 transition-transform ${detailsOpen ? 'rotate-180' : ''}`} size={17} />
                      <span>{detailsOpen ? 'Hide Registration Details' : 'View Registration Details'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="hidden rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200 sm:inline-flex">
                        {result.registration_code}
                      </span>
                      <span className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                        {detailsOpen ? 'Tap to collapse' : 'Tap to expand'}
                      </span>
                    </div>
                  </button>

                  {detailsOpen ? (
                    <div className="border-t border-white/10 px-4 pb-4 pt-4">
                      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
                        <div className="space-y-4">
                          <div className="rounded-[1.25rem] border border-white/10 bg-black/20 p-4">
                            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Registration overview</p>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              <div>
                                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Team</p>
                                <p className="mt-1 text-sm font-semibold text-white">{result.team_name}</p>
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Contact</p>
                                <p className="mt-1 text-sm text-white">{result.contact_email}</p>
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Schedule</p>
                                <p className="mt-1 text-sm text-slate-200">{result.date_label} / {result.time_label}</p>
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Venue</p>
                                <p className="mt-1 text-sm text-slate-200">{result.venue}</p>
                              </div>
                            </div>
                          </div>

                          {result.review_note ? (
                            <div className="rounded-[1.25rem] border border-amber-300/18 bg-amber-400/10 p-4 text-sm text-amber-100">
                              Organizer note: {result.review_note}
                            </div>
                          ) : null}

                          <div className="rounded-[1.25rem] border border-white/10 bg-black/20 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-white">Participant timeline</p>
                              <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                                Attendance: {result.attendance_status}
                              </span>
                            </div>
                            <div className="mt-4 space-y-3">
                              {result.timeline.map((entry) => (
                                <div key={entry.id} className="flex gap-3">
                                  <div
                                    className={`mt-1 h-3 w-3 rounded-full ${
                                      entry.state === 'done'
                                        ? 'bg-emerald-300'
                                        : entry.state === 'current'
                                          ? 'bg-cyan-300'
                                          : entry.state === 'attention'
                                            ? 'bg-rose-300'
                                            : 'bg-slate-500'
                                    }`}
                                  />
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-white">{entry.label}</p>
                                    <p className="text-sm text-slate-300">{entry.description}</p>
                                    {entry.at ? (
                                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                                        {new Date(entry.at).toLocaleString()}
                                      </p>
                                    ) : null}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-5 text-center">
                            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Event-day entry pass</p>
                            <p className="mt-2 font-orbitron text-xl font-black text-white">{result.registration_code}</p>
                            <p className="mt-3 text-sm leading-6 text-slate-300">
                              Verification uses this registration code and the official participant details.
                            </p>
                          </div>

                          <div className="rounded-[1.25rem] border border-white/10 bg-black/20 p-4 text-sm text-slate-200">
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Submitted</p>
                            <p className="mt-2">{new Date(result.created_at).toLocaleString()}</p>
                            <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-400">Payment reference</p>
                            <p className="mt-2 break-all text-white">{result.payment_reference || 'No payment reference available'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}

          {lookupTouched && !lookupLoading && lookupResults.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-black/10 p-5 text-sm text-slate-400">
              No registration matched that code or email yet.
            </div>
          ) : null}
        </div>
      </div>

      {showAdmin ? (
      <div data-reveal="right" className="portal-glow-card portal-glass rounded-[1.6rem] p-4 md:rounded-[2rem] md:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-blue-300/80">Admin payment operations</p>
            <h3 className="portal-title-lg mt-2 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text font-orbitron font-black uppercase text-transparent">
              Verify and export
            </h3>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200 backdrop-blur-md">
            Priority queue
          </div>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-blue-400/12 bg-gradient-to-r from-blue-500/10 via-purple-500/8 to-pink-500/10 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-500/15 p-3 text-blue-100">
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-blue-100/80">Organizer Controls</p>
              <p className="mt-1 text-sm text-slate-200">
                Pending UPI payments surface here first so admins can review screenshots and act faster.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto]">
          <FloatingSearchField
            label="Enter admin access key"
            icon={<ShieldCheck size={18} />}
            value={adminKey}
            onChange={onAdminKeyChange}
          />
          <button
            type="button"
            onClick={onLoadAdminRows}
            disabled={adminLoading || !adminKey.trim()}
            className="animated-gradient-button rounded-2xl px-5 py-3 font-bold text-slate-950 disabled:opacity-60"
          >
            {adminLoading ? 'Loading...' : 'Load records'}
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:flex sm:flex-wrap">
          <button
            type="button"
            onClick={() => onDownload('csv')}
            disabled={!adminKey.trim()}
            className="magnetic-button inline-flex items-center gap-2 rounded-2xl border border-cyan-300/12 bg-white/5 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            <Download size={16} />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => onDownload('xlsx')}
            disabled={!adminKey.trim()}
            className="magnetic-button inline-flex items-center gap-2 rounded-2xl border border-fuchsia-300/12 bg-white/5 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            <FileSpreadsheet size={16} />
            Export Excel
          </button>
          <a
            href="#admin-registrations"
            className="magnetic-button inline-flex items-center gap-2 rounded-2xl border border-yellow-300/12 bg-white/5 px-4 py-3 text-sm font-bold text-white"
          >
            <Eye size={16} />
            Open full admin page
          </a>
        </div>

        {adminError ? (
          <div className="mt-5 rounded-2xl border border-rose-400/25 bg-gradient-to-r from-rose-500/14 to-orange-500/8 px-4 py-3 text-sm text-rose-100">
            {adminError}
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-amber-300/16 bg-amber-400/10 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-amber-100/80">Pending</p>
            <p className="mt-2 text-2xl font-bold text-white">{pendingRows.length}</p>
          </div>
          <div className="rounded-2xl border border-emerald-300/16 bg-emerald-400/10 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/80">Verified</p>
            <p className="mt-2 text-2xl font-bold text-white">{verifiedRows.length}</p>
          </div>
          <div className="rounded-2xl border border-rose-300/16 bg-rose-400/10 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-rose-100/80">Rejected</p>
            <p className="mt-2 text-2xl font-bold text-white">{rejectedRows.length}</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {pendingRows.slice(0, 6).map((row) => (
            <div
              key={row.id}
              data-reveal="up"
              className="tilt-card rounded-[1.5rem] border border-white/10 bg-[linear-gradient(145deg,rgba(12,20,35,0.92),rgba(18,27,45,0.82))] p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-lg font-bold text-white">{row.team_name}</p>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200">
                      {row.registration_code}
                    </span>
                    <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${statusStyles[row.status]}`}>
                      {prettyStatus(row.status)}
                    </span>
                    <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-cyan-100">
                      {row.payment_method || 'manual'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-200">
                    {row.event_name} / {row.college_name}
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    {row.contact_name} / {row.contact_email} / {row.contact_phone}
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-200">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Amount</p>
                      <p className="mt-2 font-semibold text-white">{formatCurrency(row.total_amount)}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                        {row.participants.length} participants
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-200">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Payment reference</p>
                      <p className="mt-2 break-all text-white">{row.payment_reference || 'Waiting for reference'}</p>
                    </div>
                  </div>
                </div>

                <div className="w-full max-w-xs space-y-3">
                  {row.payment_screenshot_path ? (
                    <a
                      href={row.payment_screenshot_path}
                      target="_blank"
                      rel="noreferrer"
                      className="group block overflow-hidden rounded-[1.5rem] border border-cyan-300/12 bg-white/5"
                    >
                      <img
                        src={row.payment_screenshot_path}
                        alt={`${row.team_name} payment proof`}
                        className="h-48 w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                      <div className="flex items-center justify-between px-4 py-3 text-sm text-cyan-100">
                        <span>View payment proof</span>
                        <Eye size={16} />
                      </div>
                    </a>
                  ) : (
                    <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-black/10 p-5 text-sm text-slate-400">
                      No screenshot uploaded for this registration yet.
                    </div>
                  )}

                  <div className="grid gap-3">
                    <button
                      type="button"
                      onClick={() => onStatusChange(row.id, 'verified')}
                      className="magnetic-button inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-100"
                    >
                      <CheckCircle2 size={16} />
                      Approve payment
                    </button>
                    <button
                      type="button"
                      onClick={() => onStatusChange(row.id, 'pending')}
                      className="magnetic-button inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm font-bold text-amber-100"
                    >
                      <Clock3 size={16} />
                      Keep pending
                    </button>
                    <button
                      type="button"
                      onClick={() => onStatusChange(row.id, 'rejected')}
                      className="magnetic-button inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm font-bold text-rose-100"
                    >
                      <XCircle size={16} />
                      Reject payment
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {adminRows.length > 0 && pendingRows.length === 0 && !adminLoading ? (
            <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-black/10 p-5 text-sm text-slate-400">
              No registrations are waiting for payment review right now.
            </div>
          ) : null}

          {adminRows.length === 0 && !adminLoading ? (
            <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-black/10 p-5 text-sm text-slate-400">
              Load the admin records to preview payments, approve entries, and export reports.
            </div>
          ) : null}
        </div>
      </div>
      ) : null}
    </section>
  );
};
