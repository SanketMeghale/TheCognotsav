import React from 'react';
import {
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileSpreadsheet,
  QrCode,
  Search,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import type { AdminRegistration, LookupResult } from './types';
import { formatCurrency } from './utils';

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
};

const statusStyles: Record<string, string> = {
  pending: 'border-amber-300/25 bg-amber-400/10 text-amber-100',
  verified: 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100',
  rejected: 'border-rose-300/25 bg-rose-400/10 text-rose-100',
  waitlisted: 'border-fuchsia-300/25 bg-fuchsia-400/10 text-fuchsia-100',
};

function prettyStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
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
}) => {
  const pendingRows = adminRows.filter((row) => row.status === 'pending');
  const verifiedRows = adminRows.filter((row) => row.status === 'verified');
  const rejectedRows = adminRows.filter((row) => row.status === 'rejected');

  return (
    <section id="tracker" className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr] xl:gap-6">
      <div data-reveal="left" className="portal-glow-card portal-glass rounded-[1.6rem] p-4 md:rounded-[2rem] md:p-8">
        <p className="text-[11px] uppercase tracking-[0.35em] text-blue-300/80">Registration lookup</p>
        <h3 className="portal-title-lg mt-2 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text font-orbitron font-black uppercase text-transparent">
          Track your status
        </h3>
        <p className="mt-3 text-sm leading-6 text-slate-200 md:leading-7">
          Participants can search by registration code or contact email and instantly see where their
          payment review stands.
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
          {lookupResults.map((result) => (
            <div
              key={result.id}
              data-reveal="up"
              className={`tilt-card rounded-[1.5rem] border p-5 backdrop-blur-md ${
                result.status === 'verified'
                  ? 'border-emerald-300/16 bg-gradient-to-r from-emerald-400/10 to-cyan-400/8'
                  : result.status === 'rejected'
                    ? 'border-rose-300/16 bg-gradient-to-r from-rose-400/10 to-orange-400/8'
                    : result.status === 'waitlisted'
                      ? 'border-fuchsia-300/16 bg-gradient-to-r from-fuchsia-400/10 to-purple-400/8'
                    : 'border-cyan-300/10 bg-gradient-to-r from-cyan-400/10 to-fuchsia-400/8'
              }`}
            >
              <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr] xl:gap-5">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-lg font-bold text-white">{result.team_name}</p>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${
                        statusStyles[result.status] || 'border-white/10 bg-white/5 text-slate-100'
                      }`}
                    >
                      {prettyStatus(result.status)}
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
                  <p className="mt-2 text-sm text-slate-200">{result.event_name}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {result.registration_code} / {result.contact_email}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {result.date_label} / {result.time_label} / {result.venue}
                  </p>

                  {result.review_note ? (
                    <div className="mt-4 rounded-2xl border border-amber-300/18 bg-amber-400/10 p-4 text-sm text-amber-100">
                      Organizer note: {result.review_note}
                    </div>
                  ) : null}

                  <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-black/18 p-4">
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
                  <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 text-center">
                    <div className="inline-flex rounded-2xl border border-blue-300/20 bg-blue-400/10 p-3 text-blue-100">
                      <QrCode size={18} />
                    </div>
                    <div className="mt-4 rounded-[1.5rem] bg-white p-4">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(result.qr_value)}`}
                        alt={`${result.registration_code} QR`}
                        className="mx-auto h-36 w-36 sm:h-40 sm:w-40 md:h-44 md:w-44"
                      />
                    </div>
                    <p className="mt-4 text-xs uppercase tracking-[0.24em] text-slate-400">Event-day entry pass</p>
                    <p className="mt-2 font-orbitron text-xl font-black text-white">{result.registration_code}</p>
                  </div>

                  <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4 text-sm text-slate-200">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Submitted</p>
                    <p className="mt-2">{new Date(result.created_at).toLocaleString()}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-400">Payment reference</p>
                    <p className="mt-2 break-all text-white">{result.payment_reference || 'No payment reference available'}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {lookupTouched && !lookupLoading && lookupResults.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-black/10 p-5 text-sm text-slate-400">
              No registration matched that code or email yet.
            </div>
          ) : null}
        </div>
      </div>

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
    </section>
  );
};
