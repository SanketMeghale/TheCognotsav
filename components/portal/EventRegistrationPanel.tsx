import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  CreditCard,
  Download,
  QrCode,
  Save,
  Sparkles,
  TimerReset,
  Upload,
} from 'lucide-react';
import type { EventRecord, ParticipantDraft, RegistrationReceipt } from './types';
import { formatCountdownLabel, formatCurrency, getEventHeatLevel, getTeamLabel } from './utils';

type FormState = {
  teamName: string;
  collegeName: string;
  departmentName: string;
  yearOfStudy: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  paymentReference: string;
  notes: string;
  participants: ParticipantDraft[];
};

type Props = {
  events: EventRecord[];
  loadingEvents: boolean;
  selectedEventSlug: string;
  selectedEvent: EventRecord | null;
  teamSize: number;
  form: FormState;
  submitting: boolean;
  successMessage: string;
  errorMessage: string;
  successReceipt: RegistrationReceipt | null;
  draftRecovered: boolean;
  validationErrors: Record<string, string>;
  touchedFields: Record<string, boolean>;
  paymentScreenshotName: string;
  paymentScreenshotReady: boolean;
  onDownloadPass: (receipt: RegistrationReceipt) => void;
  onDismissDraftRecovered: () => void;
  onFieldBlur: (field: string) => void;
  onPaymentScreenshotChange: (file: File | null) => void;
  onSelectEvent: (slug: string) => void;
  onTeamSizeChange: (size: number) => void;
  onFormFieldChange: (field: keyof FormState, value: string) => void;
  onParticipantChange: (index: number, field: keyof ParticipantDraft, value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
};

const categoryThemes: Record<
  string,
  {
    card: string;
    badge: string;
    slotPanel: string;
    progress: string;
    active: string;
    surface: string;
    signal: string;
  }
> = {
  Technical: {
    card: 'from-blue-500/18 via-cyan-400/10 to-transparent hover:border-blue-400/24',
    badge: 'border-blue-400/20 bg-blue-500/16 text-blue-100',
    slotPanel: 'from-blue-500/12 via-cyan-400/8 to-purple-500/10',
    progress: 'from-blue-400 via-cyan-400 to-purple-400',
    active: 'border-blue-400/24 shadow-[0_0_0_1px_rgba(59,130,246,0.1),0_24px_80px_rgba(59,130,246,0.14)]',
    surface: 'from-blue-500/12 via-cyan-400/6 to-transparent',
    signal: 'border-blue-400/16 bg-blue-500/10 text-blue-100',
  },
  Gaming: {
    card: 'from-purple-500/18 via-pink-500/10 to-transparent hover:border-purple-400/24',
    badge: 'border-purple-400/20 bg-purple-500/16 text-purple-100',
    slotPanel: 'from-purple-500/12 via-pink-500/8 to-blue-500/10',
    progress: 'from-purple-400 via-pink-400 to-blue-400',
    active: 'border-purple-400/24 shadow-[0_0_0_1px_rgba(168,85,247,0.1),0_24px_80px_rgba(168,85,247,0.14)]',
    surface: 'from-purple-500/12 via-pink-500/6 to-transparent',
    signal: 'border-purple-400/16 bg-purple-500/10 text-purple-100',
  },
  Fun: {
    card: 'from-yellow-500/18 via-orange-400/10 to-transparent hover:border-yellow-400/24',
    badge: 'border-yellow-400/20 bg-yellow-500/16 text-yellow-100',
    slotPanel: 'from-yellow-500/14 via-orange-400/10 to-pink-500/10',
    progress: 'from-yellow-400 via-orange-400 to-pink-400',
    active: 'border-yellow-400/24 shadow-[0_0_0_1px_rgba(251,191,36,0.1),0_24px_80px_rgba(251,191,36,0.14)]',
    surface: 'from-yellow-500/14 via-orange-400/6 to-transparent',
    signal: 'border-yellow-400/16 bg-yellow-500/10 text-yellow-100',
  },
};

function FloatingField({
  label,
  value,
  onChange,
  onBlur,
  error,
  type = 'text',
  textarea = false,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string;
  type?: string;
  textarea?: boolean;
  required?: boolean;
}) {
  return (
    <label className="floating-field block">
      {textarea ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          placeholder=" "
          rows={4}
          required={required}
          className={`floating-field-input min-h-[112px] resize-none ${error ? 'field-invalid' : ''}`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          placeholder=" "
          required={required}
          className={`floating-field-input ${error ? 'field-invalid' : ''}`}
        />
      )}
      <span className="floating-field-label">{label}</span>
      {error ? <span className="floating-field-error">{error}</span> : null}
    </label>
  );
}

export const EventRegistrationPanel: React.FC<Props> = ({
  events,
  loadingEvents,
  selectedEventSlug,
  selectedEvent,
  teamSize,
  form,
  submitting,
  successMessage,
  errorMessage,
  successReceipt,
  draftRecovered,
  validationErrors,
  touchedFields,
  paymentScreenshotName,
  paymentScreenshotReady,
  onDownloadPass,
  onDismissDraftRecovered,
  onFieldBlur,
  onPaymentScreenshotChange,
  onSelectEvent,
  onTeamSizeChange,
  onFormFieldChange,
  onParticipantChange,
  onSubmit,
}) => {
  const formAnchorId = 'registration-form-start';
  const upiLink = selectedEvent?.payment_upi
    ? `upi://pay?pa=${selectedEvent.payment_upi}&pn=${encodeURIComponent(selectedEvent.payment_payee || selectedEvent.name)}&am=${selectedEvent.registration_fee}&cu=INR&tn=${encodeURIComponent(selectedEvent.name)}`
    : '';
  const qrUrl = upiLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(upiLink)}`
    : '';
  const showError = (field: string) => (touchedFields[field] ? validationErrors[field] : '');
  const selectedTheme = selectedEvent ? categoryThemes[selectedEvent.category] || categoryThemes.Technical : categoryThemes.Technical;

  return (
    <section id="registration-panel" className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr] xl:gap-6">
      <div data-reveal="left" className="portal-glow-card portal-glass rounded-[1.6rem] p-4 md:rounded-[2rem] md:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-blue-300/80">Events</p>
            <h3 className="portal-title-lg mt-2 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text font-orbitron font-black uppercase text-transparent">
              Choose an event
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 md:leading-7">
              Stronger category accents and clearer slot signals make the selection step easier to scan.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-blue-400/16 bg-blue-500/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-blue-100">
              {events.length} live events
            </span>
            {loadingEvents ? <p className="text-sm text-slate-300">Loading events...</p> : null}
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:mt-6 md:gap-4 md:grid-cols-2">
          {events.map((event) => {
            const active = event.slug === selectedEventSlug;
            const slotsLeft = event.max_slots !== null ? Math.max(event.max_slots - event.registrations_count, 0) : null;
            const theme = categoryThemes[event.category] || categoryThemes.Technical;
            const heat = getEventHeatLevel(event);
            const countdown = formatCountdownLabel(event.date_label, event.time_label);

            return (
              <button
                key={event.slug}
                type="button"
                onClick={() => onSelectEvent(event.slug)}
                data-reveal="up"
                aria-pressed={active}
                className={`tilt-card group relative h-full overflow-hidden rounded-[1.65rem] border bg-[linear-gradient(180deg,rgba(10,18,32,0.94),rgba(10,18,32,0.76))] text-left transition duration-300 ${active ? theme.active : 'border-white/10'}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br opacity-0 transition duration-300 group-hover:opacity-100 ${theme.card}`} />
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${theme.progress}`} />
                <div className="relative flex h-full flex-col">
                  <div className="relative h-36 overflow-hidden sm:h-40 md:h-44">
                    <img src={event.poster_path} alt={event.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#07111d] via-[#07111d]/38 to-transparent" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_24%)]" />
                    <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                      <span className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.22em] backdrop-blur-md ${theme.badge}`}>
                        {event.category}
                      </span>
                      <span className="rounded-full border border-white/12 bg-black/25 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white/84 backdrop-blur-md">
                        {event.registration_fee_label || formatCurrency(event.registration_fee)}
                      </span>
                      <span className={`rounded-full border border-white/12 bg-black/25 px-3 py-1 text-[10px] uppercase tracking-[0.22em] backdrop-blur-md ${heat.accent}`}>
                        {heat.label}
                      </span>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 md:p-5">
                      <h4 className="text-lg font-bold text-white md:text-xl">{event.name}</h4>
                      <span className={`rounded-full border px-3 py-1 text-[11px] backdrop-blur md:text-xs ${theme.badge}`}>
                        {getTeamLabel(event)}
                      </span>
                    </div>
                  </div>
                  <div className="relative flex flex-1 flex-col p-4 md:p-5">
                    <p className="text-sm leading-6 text-slate-200 md:leading-7">{event.description}</p>
                    <div className={`mt-3 rounded-2xl border border-white/10 bg-gradient-to-r p-4 md:mt-4 ${theme.slotPanel}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-white">
                          <TimerReset size={14} />
                          Live slots
                        </div>
                        <span className={`text-xs font-bold uppercase tracking-[0.2em] ${heat.accent}`}>
                          {slotsLeft !== null ? `${slotsLeft} left` : 'Open'}
                        </span>
                      </div>
                      {event.max_slots !== null ? (
                        <>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                            <div className={`h-full rounded-full bg-gradient-to-r ${theme.progress}`} style={{ width: `${heat.fillPercent}%` }} />
                          </div>
                          <p className="mt-2 text-xs text-slate-100/90">{event.registrations_count} of {event.max_slots} slots already reserved</p>
                        </>
                      ) : null}
                      {event.waitlist_count > 0 ? (
                        <p className="mt-2 text-xs text-fuchsia-100">{event.waitlist_count} team(s) already on waitlist</p>
                      ) : null}
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 md:mt-4">
                      <div className={`rounded-2xl border border-white/10 bg-gradient-to-r p-3 text-sm text-slate-100 backdrop-blur-md ${theme.surface}`}>
                        {event.date_label} / {event.time_label}
                      </div>
                      <div className={`rounded-2xl border px-3 py-3 text-sm font-semibold backdrop-blur-md ${theme.signal}`}>
                        {event.registration_fee_label || formatCurrency(event.registration_fee)}
                      </div>
                    </div>
                    <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-[11px] uppercase tracking-[0.22em] text-slate-200 md:text-xs md:tracking-[0.24em]">
                      {countdown}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div id={formAnchorId} data-reveal="right" className="portal-glow-card portal-glass rounded-[1.6rem] p-4 md:rounded-[2rem] md:p-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-blue-300/80">Registration form</p>
            <h3 className="portal-title-lg mt-2 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text font-orbitron font-black uppercase text-transparent">
              Participant details
            </h3>
          </div>
          {selectedEvent ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.22em] ${selectedTheme.signal}`}>
                {selectedEvent.category}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-slate-200 backdrop-blur-md">
                {selectedEvent.venue}
              </span>
            </div>
          ) : null}
        </div>

        {selectedEvent ? (
          <form onSubmit={onSubmit} className="mt-5 space-y-4 md:mt-6 md:space-y-5">
            {draftRecovered ? (
              <div data-reveal="up" className="flex items-start justify-between gap-4 rounded-[1.5rem] border border-blue-400/20 bg-gradient-to-r from-blue-500/14 to-purple-500/10 px-4 py-4 text-sm text-blue-100 backdrop-blur-md">
                <div className="flex items-start gap-3">
                  <Save size={18} className="mt-0.5 text-blue-100" />
                  <div>
                    <p className="font-semibold">Draft restored on this device</p>
                    <p className="mt-1 text-blue-100/80">Your unfinished registration details were recovered automatically. Review and submit when ready.</p>
                  </div>
                </div>
                <button type="button" onClick={onDismissDraftRecovered} className="text-xs uppercase tracking-[0.2em] text-blue-100/70">
                  Dismiss
                </button>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-3 md:gap-4">
              <div data-reveal="up" className={`tilt-card rounded-2xl border border-white/10 bg-gradient-to-br p-4 backdrop-blur-md ${selectedTheme.surface}`}>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Selected event</p>
                <p className="mt-2 text-lg font-bold text-white">{selectedEvent.name}</p>
                <p className="mt-1 text-sm text-slate-200">{getTeamLabel(selectedEvent)}</p>
              </div>
              <div data-reveal="up" className="tilt-card rounded-2xl border border-purple-400/12 bg-gradient-to-br from-purple-500/10 to-transparent p-4 backdrop-blur-md">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Schedule</p>
                <p className="mt-2 text-lg font-bold text-white">{selectedEvent.date_label}</p>
                <p className="mt-1 text-sm text-slate-200">{selectedEvent.time_label}</p>
              </div>
              <div data-reveal="up" className="tilt-card rounded-2xl border border-yellow-400/12 bg-gradient-to-br from-yellow-500/10 to-transparent p-4 backdrop-blur-md">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Fee and slots</p>
                <p className="mt-2 text-lg font-bold text-white">{formatCurrency(selectedEvent.registration_fee)}</p>
                <p className="mt-1 text-sm text-slate-200">
                  {selectedEvent.max_slots !== null ? `${Math.max(selectedEvent.max_slots - selectedEvent.registrations_count, 0)} slots left` : 'Open capacity'}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 md:gap-4">
              {selectedEvent.max_members > selectedEvent.min_members ? (
                <label className={`block rounded-[1.45rem] border border-white/10 bg-gradient-to-r p-4 backdrop-blur-md ${selectedTheme.surface}`}>
                  <span className="mb-2 block text-sm text-slate-200">Team size</span>
                  <select value={teamSize} onChange={(event) => onTeamSizeChange(Number(event.target.value))} className="floating-field-input">
                    {Array.from({ length: selectedEvent.max_members - selectedEvent.min_members + 1 }, (_, index) => selectedEvent.min_members + index).map((size) => (
                      <option key={size} value={size}>{size} participants</option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className={`rounded-[1.45rem] border border-white/10 bg-gradient-to-r px-4 py-4 text-sm text-slate-100 backdrop-blur-md ${selectedTheme.surface}`}>
                  Fixed team size: {selectedEvent.min_members}
                </div>
              )}
              <div className={`rounded-[1.45rem] border px-4 py-4 text-sm backdrop-blur-md ${selectedTheme.signal}`}>
                Registration rule: {getTeamLabel(selectedEvent)}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 md:gap-4">
              {selectedEvent.min_members === 1 && !selectedEvent.is_team_event ? null : (
                <div className="sm:col-span-2">
                  <FloatingField label="Team name" value={form.teamName} onChange={(value) => onFormFieldChange('teamName', value)} onBlur={() => onFieldBlur('teamName')} error={showError('teamName')} required />
                </div>
              )}
              <FloatingField label="College name" value={form.collegeName} onChange={(value) => onFormFieldChange('collegeName', value)} onBlur={() => onFieldBlur('collegeName')} error={showError('collegeName')} required />
              <FloatingField label="Department" value={form.departmentName} onChange={(value) => onFormFieldChange('departmentName', value)} onBlur={() => onFieldBlur('departmentName')} error={showError('departmentName')} required />
              <FloatingField label="Year / semester" value={form.yearOfStudy} onChange={(value) => onFormFieldChange('yearOfStudy', value)} onBlur={() => onFieldBlur('yearOfStudy')} error={showError('yearOfStudy')} required />
              <FloatingField label="Primary contact name" value={form.contactName} onChange={(value) => onFormFieldChange('contactName', value)} onBlur={() => onFieldBlur('contactName')} error={showError('contactName')} required />
              <FloatingField label="Primary contact email" value={form.contactEmail} onChange={(value) => onFormFieldChange('contactEmail', value)} onBlur={() => onFieldBlur('contactEmail')} error={showError('contactEmail')} type="email" required />
              <FloatingField label="Primary contact phone" value={form.contactPhone} onChange={(value) => onFormFieldChange('contactPhone', value)} onBlur={() => onFieldBlur('contactPhone')} error={showError('contactPhone')} required />
              <FloatingField label="Transaction ID / payment reference" value={form.paymentReference} onChange={(value) => onFormFieldChange('paymentReference', value)} onBlur={() => onFieldBlur('paymentReference')} error={showError('paymentReference')} required />
            </div>

            <div className="portal-glass rounded-[1.6rem] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <CreditCard size={16} className="text-blue-200" />
                    <p className="text-[11px] uppercase tracking-[0.3em] text-blue-300/80">Payment desk</p>
                  </div>
                  <p className="mt-2 text-sm text-slate-200">Use the event-specific UPI details and upload payment proof for faster verification.</p>
                </div>
                <div className={`rounded-full border px-4 py-2 text-sm backdrop-blur-md ${selectedTheme.signal}`}>
                  {formatCurrency(selectedEvent.registration_fee)}
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[0.92fr_1.08fr] lg:gap-5">
                <div className={`tilt-card rounded-[1.5rem] border border-white/10 bg-gradient-to-br p-5 backdrop-blur-md ${selectedTheme.surface}`}>
                  <div className="flex items-center gap-2 text-blue-100">
                    <QrCode size={18} />
                    <p className="text-sm font-semibold">Scan event payment QR</p>
                  </div>
                  <div className="mt-4 rounded-[1.6rem] bg-white p-4 shadow-[0_18px_50px_rgba(255,255,255,0.08)]">
                    {qrUrl ? <img src={qrUrl} alt={`${selectedEvent.name} payment QR`} className="mx-auto h-48 w-48 sm:h-52 sm:w-52 md:h-56 md:w-56" /> : <div className="mx-auto h-48 w-48 rounded-2xl bg-slate-200/30 sm:h-52 sm:w-52 md:h-56 md:w-56" />}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="tilt-card rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-md">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-slate-300">UPI details</p>
                    <div className="mt-3 space-y-3">
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">UPI ID</p>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <p className="break-all font-semibold text-white">{selectedEvent.payment_upi || 'Not configured'}</p>
                          {selectedEvent.payment_upi ? (
                            <button type="button" onClick={() => navigator.clipboard.writeText(selectedEvent.payment_upi || '')} className="magnetic-button rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white">
                              <Copy size={14} />
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Payee name</p>
                        <p className="mt-2 font-semibold text-white">{selectedEvent.payment_payee || selectedEvent.name}</p>
                      </div>
                    </div>
                  </div>

                  <div className={`tilt-card rounded-[1.5rem] border border-white/10 bg-gradient-to-br p-5 backdrop-blur-md ${selectedTheme.surface}`}>
                    <label className="block">
                      <span className="mb-2 block text-sm text-slate-200">Upload payment screenshot</span>
                      <span className={`magnetic-button flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-4 text-sm font-semibold ${selectedTheme.signal}`}>
                        <Upload size={16} />
                        {paymentScreenshotName || 'Choose screenshot'}
                        <input type="file" accept="image/*" className="hidden" onChange={(event) => onPaymentScreenshotChange(event.target.files?.[0] || null)} />
                      </span>
                    </label>
                    {paymentScreenshotReady ? (
                      <p className="mt-3 text-sm text-emerald-200">Screenshot attached and ready for admin verification.</p>
                    ) : (
                      <p className="mt-3 text-sm text-slate-300">Upload the screenshot so admins can verify your payment faster.</p>
                    )}
                    {showError('paymentScreenshot') ? <p className="floating-field-error">{showError('paymentScreenshot')}</p> : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="portal-glass rounded-[1.5rem] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-blue-200" />
                    <p className="text-[11px] uppercase tracking-[0.3em] text-blue-300/80">Participants</p>
                  </div>
                  <p className="mt-2 text-sm text-slate-200">Participant one is treated as the lead for export and tracking.</p>
                </div>
                <div className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-slate-200">
                  {teamSize} total
                </div>
              </div>

              <div className="mt-4 space-y-4 md:mt-5">
                {form.participants.map((participant, index) => {
                  const participantTone = index === 0 ? 'border-blue-400/16 bg-gradient-to-br from-blue-500/10 to-transparent' : index % 2 === 1 ? 'border-purple-400/14 bg-gradient-to-br from-purple-500/8 to-transparent' : 'border-yellow-400/14 bg-gradient-to-br from-yellow-500/8 to-transparent';

                  return (
                    <div key={index} data-reveal="up" className={`tilt-card rounded-2xl border p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${participantTone}`}>
                      <p className="text-sm font-bold text-white">
                        Participant {index + 1}
                        {index === 0 ? ' - Lead' : ''}
                      </p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-3 md:gap-4">
                        <FloatingField label="Full name" value={participant.fullName} onChange={(value) => onParticipantChange(index, 'fullName', value)} onBlur={() => onFieldBlur(`participants.${index}.fullName`)} error={showError(`participants.${index}.fullName`)} required />
                        <FloatingField label="Email" value={participant.email} onChange={(value) => onParticipantChange(index, 'email', value)} onBlur={() => onFieldBlur(`participants.${index}.email`)} error={showError(`participants.${index}.email`)} type="email" required />
                        <FloatingField label="Phone" value={participant.phone} onChange={(value) => onParticipantChange(index, 'phone', value)} onBlur={() => onFieldBlur(`participants.${index}.phone`)} error={showError(`participants.${index}.phone`)} required />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <FloatingField label="Organizer notes" value={form.notes} onChange={(value) => onFormFieldChange('notes', value)} onBlur={() => onFieldBlur('notes')} textarea />

            {successMessage ? <div className="rounded-2xl border border-emerald-400/25 bg-gradient-to-r from-emerald-500/14 to-blue-500/10 px-4 py-3 text-sm text-emerald-100">{successMessage}</div> : null}

            {successReceipt ? (
              <div className="rounded-[1.75rem] border border-emerald-400/20 bg-[linear-gradient(145deg,rgba(4,23,18,0.92),rgba(8,35,32,0.84))] p-5 shadow-[0_20px_60px_rgba(16,185,129,0.08)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-emerald-500/15 p-3 text-emerald-300"><CheckCircle2 size={20} /></div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.3em] text-emerald-300/75">Confirmation pass ready</p>
                        <h4 className="mt-1 text-xl font-bold text-white">{successReceipt.eventName}</h4>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-slate-200">Save this registration code and use it in the status tracker below anytime.</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Registration code</p>
                    <p className="mt-1 font-orbitron text-2xl font-black text-blue-200">{successReceipt.registrationCode}</p>
                  </div>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Lead contact</p>
                    <p className="mt-2 text-base font-semibold text-white">{successReceipt.contactName}</p>
                    <p className="mt-1 text-sm text-slate-300">{successReceipt.contactEmail}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Schedule</p>
                    <p className="mt-2 text-base font-semibold text-white">{successReceipt.dateLabel} / {successReceipt.timeLabel}</p>
                    <p className="mt-1 text-sm text-slate-300">{successReceipt.venue}</p>
                  </div>
                </div>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button type="button" onClick={() => onDownloadPass(successReceipt)} className="animated-gradient-button inline-flex flex-1 items-center justify-center rounded-2xl px-5 py-3 font-bold text-slate-950">
                    <Download size={16} />
                    Download pass
                  </button>
                  <button type="button" onClick={() => navigator.clipboard.writeText(successReceipt.registrationCode)} className="magnetic-button inline-flex flex-1 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-bold text-white">
                    <Copy size={16} />
                    Copy code
                  </button>
                </div>
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-200">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Current status</p>
                  <p className="mt-2 text-base font-semibold text-white">
                    {successReceipt.status === 'waitlisted'
                      ? `Waitlisted${successReceipt.waitlistPosition ? ` (#${successReceipt.waitlistPosition})` : ''}`
                      : successReceipt.status === 'verified'
                        ? 'Verified'
                        : 'Pending review'}
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    {successReceipt.status === 'waitlisted'
                      ? 'The event is full right now, but your queue position is saved and admins can auto-promote you if a slot opens.'
                      : 'Keep this QR-ready pass for fast event-day check-in and tracker updates.'}
                  </p>
                </div>
              </div>
            ) : null}

            {errorMessage ? <div className="rounded-2xl border border-rose-400/25 bg-gradient-to-r from-rose-500/14 to-orange-500/8 px-4 py-3 text-sm text-rose-100">{errorMessage}</div> : null}

            <button type="submit" disabled={submitting} className="animated-gradient-button inline-flex w-full items-center justify-center rounded-2xl px-6 py-4 text-base font-bold text-slate-950 disabled:opacity-60">
              {submitting ? 'Submitting registration...' : 'Submit registration'}
              <ArrowRight size={18} />
            </button>
          </form>
        ) : (
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/10 p-6 text-slate-300">Load events to begin registration.</div>
        )}
      </div>
    </section>
  );
};
