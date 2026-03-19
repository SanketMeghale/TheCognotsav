import React from 'react';
import { ArrowRight, CheckCircle2, Copy, CreditCard, Download, QrCode, Save, Sparkles, Upload } from 'lucide-react';
import type { EventRecord, ParticipantDraft, RegistrationReceipt } from './types';
import { formatCurrency, getEventHeatLevel, getTeamLabel } from './utils';

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

const categoryThemes: Record<string, { accent: string; badge: string; button: string; surface: string; progress: string }> = {
  Technical: {
    accent: 'from-sky-500/18 via-cyan-400/10 to-blue-500/10',
    badge: 'border-sky-300/20 bg-sky-400/14 text-sky-100',
    button: 'border-sky-400/20 bg-sky-400/12 text-sky-100',
    surface: 'from-sky-500/12 via-cyan-400/6 to-transparent',
    progress: 'from-sky-400 via-cyan-400 to-blue-400',
  },
  Gaming: {
    accent: 'from-fuchsia-500/18 via-purple-500/10 to-pink-500/10',
    badge: 'border-fuchsia-300/20 bg-fuchsia-400/14 text-fuchsia-100',
    button: 'border-fuchsia-400/20 bg-fuchsia-400/12 text-fuchsia-100',
    surface: 'from-fuchsia-500/12 via-purple-500/6 to-transparent',
    progress: 'from-fuchsia-400 via-purple-400 to-pink-400',
  },
  Fun: {
    accent: 'from-amber-500/18 via-orange-500/10 to-rose-500/10',
    badge: 'border-amber-300/20 bg-amber-400/14 text-amber-100',
    button: 'border-amber-400/20 bg-amber-400/12 text-amber-100',
    surface: 'from-amber-500/12 via-orange-500/6 to-transparent',
    progress: 'from-amber-400 via-orange-400 to-pink-400',
  },
};

function FloatingField({ label, value, onChange, onBlur, error, type = 'text', textarea = false, required = false }: { label: string; value: string; onChange: (value: string) => void; onBlur: () => void; error?: string; type?: string; textarea?: boolean; required?: boolean }) {
  return (
    <label className="floating-field block">
      {textarea ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} onBlur={onBlur} placeholder=" " rows={4} required={required} className={`floating-field-input min-h-[112px] resize-none ${error ? 'field-invalid' : ''}`} />
      ) : (
        <input type={type} value={value} onChange={(event) => onChange(event.target.value)} onBlur={onBlur} placeholder=" " required={required} className={`floating-field-input ${error ? 'field-invalid' : ''}`} />
      )}
      <span className="floating-field-label">{label}</span>
      {error ? <span className="floating-field-error">{error}</span> : null}
    </label>
  );
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="portal-form-card">
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{subtitle}</p>
      <p className="mt-1 text-base font-semibold text-white">{title}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export const EventRegistrationPanel: React.FC<Props> = ({ events, loadingEvents, selectedEventSlug, selectedEvent, teamSize, form, submitting, successMessage, errorMessage, successReceipt, draftRecovered, validationErrors, touchedFields, paymentScreenshotName, paymentScreenshotReady, onDownloadPass, onDismissDraftRecovered, onFieldBlur, onPaymentScreenshotChange, onSelectEvent, onTeamSizeChange, onFormFieldChange, onParticipantChange, onSubmit }) => {
  const showError = (field: string) => (touchedFields[field] ? validationErrors[field] : '');
  const selectedTheme = selectedEvent ? categoryThemes[selectedEvent.category] || categoryThemes.Technical : categoryThemes.Technical;
  const upiLink = selectedEvent?.payment_upi ? `upi://pay?pa=${selectedEvent.payment_upi}&pn=${encodeURIComponent(selectedEvent.payment_payee || selectedEvent.name)}&am=${selectedEvent.registration_fee}&cu=INR&tn=${encodeURIComponent(selectedEvent.name)}` : '';
  const qrUrl = upiLink ? `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(upiLink)}` : '';

  return (
    <section id="registration-panel" className="grid gap-4 xl:grid-cols-[0.98fr_1.02fr] xl:gap-6">
      <div data-reveal="left" className="portal-glow-card portal-glass rounded-[1.8rem] p-4 sm:p-5 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-200/80 sm:text-[11px]">Competitions</p>
            <h3 className="portal-title-lg mt-2 font-semibold text-white">Pick your event.</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">Browse cards, compare fees and slots, then jump straight into the form.</p>
          </div>
          <div className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-200">{events.length} live</div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {loadingEvents
            ? Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="animate-pulse rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-4">
                  <div className="h-28 rounded-[1.1rem] bg-white/10" />
                  <div className="mt-4 h-4 w-24 rounded-full bg-white/10" />
                  <div className="mt-3 h-5 w-3/4 rounded-full bg-white/10" />
                  <div className="mt-3 h-4 w-full rounded-full bg-white/10" />
                </div>
              ))
            : events.map((event) => {
                const active = event.slug === selectedEventSlug;
                const theme = categoryThemes[event.category] || categoryThemes.Technical;
                const slotsLeft = event.max_slots !== null ? Math.max(event.max_slots - event.registrations_count, 0) : null;
                const heat = getEventHeatLevel(event);
                return (
                  <button key={event.slug} type="button" onClick={() => onSelectEvent(event.slug)} aria-pressed={active} className={`tilt-card group relative overflow-hidden rounded-[1.55rem] border bg-[linear-gradient(180deg,rgba(12,18,34,0.96),rgba(14,20,36,0.84))] text-left transition duration-300 ${active ? 'border-white/20 shadow-[0_24px_60px_rgba(56,189,248,0.16)]' : 'border-white/10 hover:border-white/18'}`}>
                    <div className={`absolute inset-0 bg-gradient-to-br ${theme.accent}`} />
                    <div className="relative">
                      <div className="relative h-36 overflow-hidden">
                        <img src={event.poster_path} alt={event.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,10,21,0.14),rgba(7,10,21,0.84))]" />
                        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                          <span className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.16em] ${theme.badge}`}>{event.category}</span>
                          <span className="rounded-full border border-white/12 bg-black/30 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/86">{formatCurrency(event.registration_fee)}</span>
                        </div>
                      </div>
                      <div className="space-y-4 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="text-base font-semibold text-white sm:text-lg">{event.name}</h4>
                            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">{getTeamLabel(event)}</p>
                          </div>
                          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${theme.badge}`}>{heat.label}</span>
                        </div>
                        <p className="line-clamp-3 text-sm leading-6 text-slate-200">{event.description}</p>
                        <div className="rounded-[1.2rem] border border-white/10 bg-black/18 p-3">
                          <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.16em] text-slate-400"><span>{event.date_label}</span><span>{event.time_label}</span></div>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full bg-gradient-to-r ${theme.progress}`} style={{ width: `${heat.fillPercent}%` }} /></div>
                          <div className="mt-2 flex items-center justify-between gap-3 text-sm text-slate-300"><span>{event.venue}</span><span>{slotsLeft !== null ? `${slotsLeft} left` : 'Open'}</span></div>
                        </div>
                        <div className="flex items-center justify-between gap-3"><span className="text-xs uppercase tracking-[0.18em] text-slate-400">Tap to fill form</span><span className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] ${theme.button}`}>Register</span></div>
                      </div>
                    </div>
                  </button>
                );
              })}
        </div>
      </div>

      <div data-reveal="right" className="portal-glow-card portal-glass rounded-[1.8rem] p-4 sm:p-5 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-purple-200/80 sm:text-[11px]">Registration</p>
            <h3 className="portal-title-lg mt-2 font-semibold text-white">Complete your entry.</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">Fill contact details, upload payment proof, and submit in one clean flow.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300">
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-3">1. Choose</div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-3">2. Pay</div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-3">3. Submit</div>
          </div>
        </div>

        {selectedEvent ? (
          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            {draftRecovered ? <div className="flex items-start justify-between gap-3 rounded-[1.4rem] border border-sky-300/20 bg-sky-400/10 px-4 py-4 text-sm text-sky-100"><div className="flex items-start gap-3"><Save size={18} className="mt-0.5 shrink-0" /><div><p className="font-semibold">Draft restored</p><p className="mt-1 text-sky-100/80">Your saved details are back on this device.</p></div></div><button type="button" onClick={onDismissDraftRecovered} className="text-xs uppercase tracking-[0.16em] text-sky-100/70">Dismiss</button></div> : null}

            <div className={`rounded-[1.5rem] border border-white/10 bg-gradient-to-br p-4 ${selectedTheme.surface}`}>
              <div className="grid gap-3 sm:grid-cols-3">
                <div><p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Selected event</p><p className="mt-2 text-base font-semibold text-white">{selectedEvent.name}</p></div>
                <div><p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Schedule</p><p className="mt-2 text-sm font-medium text-white">{selectedEvent.date_label}</p><p className="mt-1 text-sm text-slate-300">{selectedEvent.time_label}</p></div>
                <div><p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Fee and venue</p><p className="mt-2 text-sm font-medium text-white">{formatCurrency(selectedEvent.registration_fee)}</p><p className="mt-1 text-sm text-slate-300">{selectedEvent.venue}</p></div>
              </div>
            </div>

            <SectionCard title="Start with the basics" subtitle="Team Setup">
              <div className="grid gap-3 sm:grid-cols-2">
                {selectedEvent.max_members > selectedEvent.min_members ? (
                  <label className="block">
                    <span className="mb-2 block text-sm text-slate-200">Team size</span>
                    <select value={teamSize} onChange={(event) => onTeamSizeChange(Number(event.target.value))} className="floating-field-input">
                      {Array.from({ length: selectedEvent.max_members - selectedEvent.min_members + 1 }, (_, index) => selectedEvent.min_members + index).map((size) => <option key={size} value={size}>{size} participants</option>)}
                    </select>
                  </label>
                ) : <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.05] px-4 py-4 text-sm text-slate-200">Fixed team size: {selectedEvent.min_members}</div>}
                <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.05] px-4 py-4 text-sm text-slate-200">Slots rule: {selectedEvent.max_slots !== null ? `${Math.max(selectedEvent.max_slots - selectedEvent.registrations_count, 0)} remaining` : 'Open capacity'}</div>
                {selectedEvent.min_members === 1 && !selectedEvent.is_team_event ? null : <div className="sm:col-span-2"><FloatingField label="Team name" value={form.teamName} onChange={(value) => onFormFieldChange('teamName', value)} onBlur={() => onFieldBlur('teamName')} error={showError('teamName')} required /></div>}
                <FloatingField label="College name" value={form.collegeName} onChange={(value) => onFormFieldChange('collegeName', value)} onBlur={() => onFieldBlur('collegeName')} error={showError('collegeName')} required />
                <FloatingField label="Department" value={form.departmentName} onChange={(value) => onFormFieldChange('departmentName', value)} onBlur={() => onFieldBlur('departmentName')} error={showError('departmentName')} required />
                <FloatingField label="Year / semester" value={form.yearOfStudy} onChange={(value) => onFormFieldChange('yearOfStudy', value)} onBlur={() => onFieldBlur('yearOfStudy')} error={showError('yearOfStudy')} required />
              </div>
            </SectionCard>

            <SectionCard title="Who should organizers reach?" subtitle="Lead Contact">
              <div className="grid gap-3 sm:grid-cols-2">
                <FloatingField label="Primary contact name" value={form.contactName} onChange={(value) => onFormFieldChange('contactName', value)} onBlur={() => onFieldBlur('contactName')} error={showError('contactName')} required />
                <FloatingField label="Primary contact phone" value={form.contactPhone} onChange={(value) => onFormFieldChange('contactPhone', value)} onBlur={() => onFieldBlur('contactPhone')} error={showError('contactPhone')} required />
                <div className="sm:col-span-2"><FloatingField label="Primary contact email" value={form.contactEmail} onChange={(value) => onFormFieldChange('contactEmail', value)} onBlur={() => onFieldBlur('contactEmail')} error={showError('contactEmail')} type="email" required /></div>
              </div>
            </SectionCard>

            <SectionCard title="Pay and upload proof" subtitle="Payment">
              <div className="grid gap-4 lg:grid-cols-[0.86fr_1.14fr]">
                <div className={`rounded-[1.35rem] border border-white/10 bg-gradient-to-br p-4 ${selectedTheme.surface}`}>
                  <div className="flex items-center gap-2 text-white"><QrCode size={18} /><p className="text-sm font-semibold">Event payment QR</p></div>
                  <div className="mt-4 flex aspect-square items-center justify-center rounded-[1.4rem] bg-white p-4">
                    {qrUrl ? <img src={qrUrl} alt={`${selectedEvent.name} payment QR`} className="h-full w-full max-w-[14rem] object-contain" /> : <div className="h-full w-full max-w-[14rem] rounded-[1.2rem] bg-slate-200/30" />}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.05] p-4">
                    <div className="flex items-center gap-2"><CreditCard size={16} className="text-cyan-200" /><p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">UPI Details</p></div>
                    <div className="mt-3 rounded-[1.15rem] border border-white/10 bg-black/20 p-4"><p className="text-xs uppercase tracking-[0.16em] text-slate-500">UPI ID</p><div className="mt-2 flex items-center justify-between gap-3"><p className="break-all text-sm font-semibold text-white">{selectedEvent.payment_upi || 'Not configured'}</p>{selectedEvent.payment_upi ? <button type="button" onClick={() => navigator.clipboard.writeText(selectedEvent.payment_upi || '')} className="magnetic-button rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"><Copy size={14} /></button> : null}</div></div>
                    <div className="mt-3 rounded-[1.15rem] border border-white/10 bg-black/20 p-4"><p className="text-xs uppercase tracking-[0.16em] text-slate-500">Payee Name</p><p className="mt-2 text-sm font-semibold text-white">{selectedEvent.payment_payee || selectedEvent.name}</p></div>
                  </div>
                  <div className={`rounded-[1.35rem] border border-white/10 bg-gradient-to-br p-4 ${selectedTheme.surface}`}>
                    <FloatingField label="Transaction ID / payment reference" value={form.paymentReference} onChange={(value) => onFormFieldChange('paymentReference', value)} onBlur={() => onFieldBlur('paymentReference')} error={showError('paymentReference')} required />
                    <label className="mt-4 block"><span className="mb-2 block text-sm text-slate-200">Upload payment screenshot</span><span className={`magnetic-button flex cursor-pointer items-center justify-center gap-2 rounded-[1.15rem] border border-dashed px-4 py-4 text-sm font-semibold ${selectedTheme.button}`}><Upload size={16} />{paymentScreenshotName || 'Choose screenshot'}<input type="file" accept="image/*" className="hidden" onChange={(event) => onPaymentScreenshotChange(event.target.files?.[0] || null)} /></span></label>
                    {paymentScreenshotReady ? <p className="mt-3 text-sm text-emerald-200">Screenshot attached and ready for review.</p> : <p className="mt-3 text-sm text-slate-300">Add a screenshot so organizers can verify faster.</p>}
                    {showError('paymentScreenshot') ? <p className="floating-field-error">{showError('paymentScreenshot')}</p> : null}
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Add every participant clearly" subtitle="Participants">
              <div className="mb-4 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-200 inline-flex">{teamSize} total</div>
              <div className="space-y-3">
                {form.participants.map((participant, index) => (
                  <div key={index} className={`rounded-[1.35rem] border p-4 ${index === 0 ? 'border-sky-300/14 bg-sky-400/8' : 'border-white/10 bg-white/[0.04]'}`}>
                    <p className="text-sm font-semibold text-white">Participant {index + 1}{index === 0 ? ' - Lead' : ''}</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <FloatingField label="Full name" value={participant.fullName} onChange={(value) => onParticipantChange(index, 'fullName', value)} onBlur={() => onFieldBlur(`participants.${index}.fullName`)} error={showError(`participants.${index}.fullName`)} required />
                      <FloatingField label="Email" value={participant.email} onChange={(value) => onParticipantChange(index, 'email', value)} onBlur={() => onFieldBlur(`participants.${index}.email`)} error={showError(`participants.${index}.email`)} type="email" required />
                      <FloatingField label="Phone" value={participant.phone} onChange={(value) => onParticipantChange(index, 'phone', value)} onBlur={() => onFieldBlur(`participants.${index}.phone`)} error={showError(`participants.${index}.phone`)} required />
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Anything organizers should know?" subtitle="Extra Notes">
              <FloatingField label="Organizer notes" value={form.notes} onChange={(value) => onFormFieldChange('notes', value)} onBlur={() => onFieldBlur('notes')} textarea />
            </SectionCard>

            {successMessage ? <div className="rounded-[1.35rem] border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">{successMessage}</div> : null}
            {successReceipt ? <div className="rounded-[1.45rem] border border-emerald-300/18 bg-[linear-gradient(145deg,rgba(4,23,18,0.88),rgba(10,25,29,0.84))] p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="rounded-2xl bg-emerald-400/12 p-3 text-emerald-200"><CheckCircle2 size={18} /></div><div><p className="text-[10px] uppercase tracking-[0.18em] text-emerald-200/75">Registration code</p><p className="mt-1 text-lg font-semibold text-white">{successReceipt.registrationCode}</p></div></div><div className="flex gap-2"><button type="button" onClick={() => onDownloadPass(successReceipt)} className="magnetic-button inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white"><Download size={14} />Pass</button><button type="button" onClick={() => navigator.clipboard.writeText(successReceipt.registrationCode)} className="magnetic-button inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white"><Copy size={14} />Copy</button></div></div></div> : null}
            {errorMessage ? <div className="rounded-[1.35rem] border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{errorMessage}</div> : null}

            <button type="submit" disabled={submitting} className="animated-gradient-button inline-flex w-full items-center justify-center rounded-2xl px-6 py-4 text-base font-bold text-slate-950 disabled:opacity-60">
              {submitting ? 'Submitting registration...' : 'Submit registration'}
              <ArrowRight size={18} />
            </button>
          </form>
        ) : <div className="mt-5 rounded-[1.4rem] border border-white/10 bg-black/10 p-5 text-sm text-slate-300">Load events to begin registration.</div>}
      </div>
    </section>
  );
};
