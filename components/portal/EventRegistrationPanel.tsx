import React from 'react';
import { ArrowRight, CheckCircle2, Clock3, Copy, CreditCard, Download, MapPin, Phone, QrCode, Save, ShieldCheck, Sparkles, Trophy, Upload, Users } from 'lucide-react';
import type { EventRecord, ParticipantDraft, RegistrationReceipt } from './types';
import { formatCurrency, getTeamLabel } from './utils';

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

const handbookBySlug: Record<string, {
  theme: string;
  overview: string;
  highlights: string[];
  rules: string[];
  contact?: string[];
}> = {
  'rang-manch': {
    theme: 'Art of Expression',
    overview:
      'Rangmanch is a solo or group stage-performance competition focused on acting, expressive ability, and confidence on stage. It is designed for theatre, drama, and performance-driven entries.',
    highlights: ['Solo or group format', '5 minute stage slot', 'Rs 50 solo and Rs 200 up to 5 members', 'Performance-first judging'],
    rules: ['Express emotions, ideas, and stories clearly through acting', 'Report before the event start time', 'Maintain stage discipline and follow organizer instructions'],
  },
  'squid-game': {
    theme: 'Survival and Strategy',
    overview:
      'Squid Game is an individual elimination event with multiple themed rounds that test speed, decision-making, teamwork under pressure, and survival instincts.',
    highlights: ['Individual competition', 'Rounds include mingle, tug of war, battleship, dalgona, and red light green light', 'Rs 50 per participant', 'Judges decision is final'],
    rules: ['No cheating or unfair play', 'Eliminated players cannot re-enter', 'Players must be present before the event starts', 'Failure to follow instructions leads to elimination'],
  },
  techxcelerate: {
    theme: 'Future Tech and Innovation',
    overview:
      'TechXcelerate combines poster presentation and project or paper presentation into a showcase for innovation, technical understanding, and communication quality.',
    highlights: ['Poster competition at Rs 50 per participant', 'Project or paper presentation at Rs 200 per team', 'Project demo or PPT allowed', 'Presentation plus Q and A based judging'],
    rules: ['All submissions must be original', 'Bring laptop, model, or backup presentation as needed', 'Paper format should follow standard structure', 'Late entries will not be accepted'],
  },
  'bgmi-esports': {
    theme: 'Enter the Arena. Survive the Battle.',
    overview:
      'Runbhumi eSports is a squad-based competitive gaming event for BGMI and Free Fire, built around strategy, survival, kill points, and final-stage qualification.',
    highlights: ['4 players per team', 'Qualifier plus final structure', 'Kill points and placement points both matter', 'Seminar Hall venue'],
    rules: ['No cheating, hacking, or unfair play', 'Same team must play throughout', 'No restart for network issues', 'Players must join rooms on time'],
    contact: ['Harshad Dike - 9322665964', 'Rutvik Shinde - 9168277048', 'Sanket Meghale - 9356776307'],
  },
  'ff-esports': {
    theme: 'Enter the Arena. Survive the Battle.',
    overview:
      'Runbhumi eSports is a squad-based competitive gaming event for BGMI and Free Fire, built around strategy, survival, kill points, and final-stage qualification.',
    highlights: ['4 players per team', 'Qualifier plus final structure', 'Kill points and placement points both matter', 'Seminar Hall venue'],
    rules: ['No cheating, hacking, or unfair play', 'Same team must play throughout', 'No restart for network issues', 'Players must join rooms on time'],
    contact: ['Harshad Dike - 9322665964', 'Rutvik Shinde - 9168277048', 'Sanket Meghale - 9356776307'],
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

export const EventRegistrationPanel: React.FC<Props> = ({ selectedEvent, teamSize, form, submitting, successMessage, errorMessage, successReceipt, draftRecovered, validationErrors, touchedFields, paymentScreenshotName, paymentScreenshotReady, onDownloadPass, onDismissDraftRecovered, onFieldBlur, onPaymentScreenshotChange, onTeamSizeChange, onFormFieldChange, onParticipantChange, onSubmit }) => {
  const showError = (field: string) => (touchedFields[field] ? validationErrors[field] : '');
  const selectedTheme = selectedEvent ? categoryThemes[selectedEvent.category] || categoryThemes.Technical : categoryThemes.Technical;
  const selectedHandbook = selectedEvent ? handbookBySlug[selectedEvent.slug] : null;
  const upiLink = selectedEvent?.payment_upi ? `upi://pay?pa=${selectedEvent.payment_upi}&pn=${encodeURIComponent(selectedEvent.payment_payee || selectedEvent.name)}&am=${selectedEvent.registration_fee}&cu=INR&tn=${encodeURIComponent(selectedEvent.name)}` : '';
  const qrUrl = upiLink ? `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(upiLink)}` : '';

  return (
    <section id="registration-panel">
      <div className="portal-glow-card portal-glass rounded-[1.8rem] p-4 sm:p-5 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-purple-200/80 sm:text-[11px]">Competition Details</p>
            <h3 className="portal-title-lg mt-2 font-semibold text-white">
              {selectedEvent ? selectedEvent.name : 'Choose a competition to continue.'}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {selectedEvent
                ? 'Review the event handbook summary first, then continue to registration.'
                : 'Tap any competition card to open its modern detail panel and registration form.'}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300">
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-3">1. Choose</div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-3">2. Review</div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-3">3. Register</div>
          </div>
        </div>

        {selectedEvent ? (
          <form id="registration-form-start" onSubmit={onSubmit} className="mt-5 space-y-4">
            {draftRecovered ? <div className="flex items-start justify-between gap-3 rounded-[1.4rem] border border-sky-300/20 bg-sky-400/10 px-4 py-4 text-sm text-sky-100"><div className="flex items-start gap-3"><Save size={18} className="mt-0.5 shrink-0" /><div><p className="font-semibold">Draft restored</p><p className="mt-1 text-sky-100/80">Your saved details are back on this device.</p></div></div><button type="button" onClick={onDismissDraftRecovered} className="text-xs uppercase tracking-[0.16em] text-sky-100/70">Dismiss</button></div> : null}

            <div className={`rounded-[1.5rem] border border-white/10 bg-gradient-to-br p-4 ${selectedTheme.surface}`}>
              <div className="grid gap-3 sm:grid-cols-3">
                <div><p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Selected event</p><p className="mt-2 text-base font-semibold text-white">{selectedEvent.name}</p></div>
                <div><p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Schedule</p><p className="mt-2 text-sm font-medium text-white">{selectedEvent.date_label}</p><p className="mt-1 text-sm text-slate-300">{selectedEvent.time_label}</p></div>
                <div><p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Fee and venue</p><p className="mt-2 text-sm font-medium text-white">{formatCurrency(selectedEvent.registration_fee)}</p><p className="mt-1 text-sm text-slate-300">{selectedEvent.venue}</p></div>
              </div>
            </div>

            <div className="portal-form-card">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Event Handbook</p>
                  <p className="mt-1 text-base font-semibold text-white">
                    {selectedHandbook?.theme || 'Key details'}
                  </p>
                </div>
                <a href="#registration-form-start" className={`inline-flex items-center justify-center rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] ${selectedTheme.button}`}>
                  Register for this event
                </a>
              </div>

              <p className="mt-4 text-sm leading-7 text-slate-300">
                {selectedHandbook?.overview || selectedEvent.description}
              </p>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] p-4">
                  <Users size={18} className="text-cyan-200" />
                  <p className="mt-3 text-sm font-semibold text-white">Format</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{getTeamLabel(selectedEvent)}</p>
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] p-4">
                  <Clock3 size={18} className="text-fuchsia-200" />
                  <p className="mt-3 text-sm font-semibold text-white">Schedule</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{selectedEvent.date_label} at {selectedEvent.time_label}</p>
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] p-4">
                  <MapPin size={18} className="text-amber-200" />
                  <p className="mt-3 text-sm font-semibold text-white">Venue</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{selectedEvent.venue}</p>
                </div>
              </div>

              {selectedHandbook?.highlights?.length ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-[1.3rem] border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex items-center gap-2">
                      <Trophy size={16} className="text-yellow-200" />
                      <p className="text-sm font-semibold text-white">Highlights</p>
                    </div>
                    <div className="mt-3 space-y-2">
                      {selectedHandbook.highlights.map((item) => (
                        <div key={item} className="rounded-[1rem] border border-white/8 bg-black/15 px-3 py-3 text-sm text-slate-300">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.3rem] border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={16} className="text-cyan-200" />
                      <p className="text-sm font-semibold text-white">Rules and notes</p>
                    </div>
                    <div className="mt-3 space-y-2">
                      {(selectedHandbook.rules || []).map((item) => (
                        <div key={item} className="rounded-[1rem] border border-white/8 bg-black/15 px-3 py-3 text-sm text-slate-300">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {selectedHandbook?.contact?.length ? (
                <div className="mt-4 rounded-[1.3rem] border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex items-center gap-2">
                    <Phone size={16} className="text-emerald-200" />
                    <p className="text-sm font-semibold text-white">Contact coordinators</p>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {selectedHandbook.contact.map((item) => (
                      <div key={item} className="rounded-[1rem] border border-white/8 bg-black/15 px-3 py-3 text-sm text-slate-300">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
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
