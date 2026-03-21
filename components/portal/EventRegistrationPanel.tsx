import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Clock3, Copy, CreditCard, Download, ExternalLink,
  Info, MapPin, QrCode, Save, Sparkles, Trophy, Upload, Users,
} from 'lucide-react';
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

const categoryThemes: Record<string, { badge: string; button: string; surface: string; glow: string }> = {
  Technical: {
    badge: 'border-sky-300/20 bg-sky-400/14 text-sky-100',
    button: 'border-sky-400/20 bg-sky-400/12 text-sky-100',
    surface: 'from-sky-500/12 via-cyan-400/8 to-transparent',
    glow: 'shadow-[0_24px_60px_rgba(56,189,248,0.12)]',
  },
  Gaming: {
    badge: 'border-fuchsia-300/20 bg-fuchsia-400/14 text-fuchsia-100',
    button: 'border-fuchsia-400/20 bg-fuchsia-400/12 text-fuchsia-100',
    surface: 'from-fuchsia-500/12 via-purple-500/8 to-transparent',
    glow: 'shadow-[0_24px_60px_rgba(217,70,239,0.12)]',
  },
  Fun: {
    badge: 'border-amber-300/20 bg-amber-400/14 text-amber-100',
    button: 'border-amber-400/20 bg-amber-400/12 text-amber-100',
    surface: 'from-amber-500/12 via-orange-500/8 to-transparent',
    glow: 'shadow-[0_24px_60px_rgba(251,146,60,0.12)]',
  },
};

const handbookBySlug: Record<string, {
  theme: string;
  overview: string;
  highlights: string[];
  rules: string[];
  handbookUrl?: string;
  contact?: string[];
  quickDetails?: string[];
}> = {
  'tech-kbc': {
    theme: 'Digital Minds: The Tech Quiz Challenge',
    overview: 'Fast team quiz built around speed, smart decisions, and hot-seat performance across core and modern technology topics.',
    highlights: ['2 participants per team', 'Up to 10 cycles with Fastest Finger First and Hot Seat rounds', 'Each team starts with 40 points', 'Bonus points available for clearing all hot-seat questions without lifelines'],
    rules: ['Teams must not use personal mobile phones during gameplay', 'No discussion with other teams is allowed', 'Only the submitted answer will be accepted in the FFF stage', 'Any unfair practice can lead to disqualification'],
    handbookUrl: '/handbooks/tech-kbc.pdf',
    quickDetails: ['Format: Team quiz (2 participants)', 'Fee: Rs 100 per team', 'Flow: FFF + Hot Seat + lifelines'],
  },
  'rang-manch': {
    theme: 'Art of Expression',
    overview: 'Stage performance event focused on acting, expression, confidence, and storytelling.',
    highlights: ['Solo or group format', '5 minute stage slot', 'Rs 50 solo and Rs 200 up to 5 members', 'Performance-first judging'],
    rules: ['Express emotions and ideas clearly through acting', 'Report before the event start time', 'Maintain stage discipline and follow organizer instructions'],
    handbookUrl: '/handbooks/rangmanch.pdf',
    quickDetails: ['Format: Solo / Team', 'Fee: Rs 50 / Rs 200', 'Stage Time: 5 minutes'],
  },
  'squid-game': {
    theme: 'Survival and Strategy',
    overview: 'Elimination-format challenge testing speed, decision-making, teamwork, and survival instinct.',
    highlights: ['Individual competition', 'Mingle, Tug of War, Battleship, Dalgona, and Red Light Green Light', 'Rs 50 per participant', 'Judges decision is final'],
    rules: ['No cheating or unfair play', 'Eliminated players cannot re-enter', 'Players must be present before the event starts', 'Failure to follow instructions leads to elimination'],
    handbookUrl: '/handbooks/squid-game.pdf',
    quickDetails: ['Format: Solo', 'Fee: Rs 50', 'Rounds: Multi-stage elimination'],
  },
  techxcelerate: {
    theme: 'Future Tech and Innovation',
    overview: 'Innovation showcase for posters, projects, and papers with strong technical presentation.',
    highlights: ['Poster competition at Rs 50 per participant', 'Project or paper presentation at Rs 200 per team', 'Project demo or PPT allowed', 'Presentation plus Q and A based judging'],
    rules: ['All submissions must be original', 'Bring laptop, model, or backup presentation as needed', 'Paper format should follow standard structure', 'Late entries will not be accepted'],
    handbookUrl: '/handbooks/techxcelerate.docx',
    quickDetails: ['Format: Solo / Team', 'Fee: Rs 50 / Rs 200', 'Type: Poster, Project, Paper'],
  },
  'bgmi-esports': {
    theme: 'Enter the Arena. Survive the Battle.',
    overview: 'Squad-based arena event driven by strategy, survival, kills, and final-stage qualification.',
    highlights: ['4 players per team', 'Qualifier plus final structure', 'Kill points and placement points both matter', 'Seminar Hall venue'],
    rules: ['No cheating, hacking, or unfair play', 'Same team must play throughout', 'No restart for network issues', 'Players must join rooms on time'],
    handbookUrl: '/handbooks/runbhumi-esports.pdf',
    contact: ['Harshad Dike - 9322665964', 'Rutvik Shinde - 9168277048', 'Sanket Meghale - 9356776307'],
    quickDetails: ['Format: Squad of 4', 'Mode: Qualifier + Final', 'Scoring: Kill + placement'],
  },
  'ff-esports': {
    theme: 'Enter the Arena. Survive the Battle.',
    overview: 'Squad-based arena event driven by strategy, survival, kills, and final-stage qualification.',
    highlights: ['4 players per team', 'Qualifier plus final structure', 'Kill points and placement points both matter', 'Seminar Hall venue'],
    rules: ['No cheating, hacking, or unfair play', 'Same team must play throughout', 'No restart for network issues', 'Players must join rooms on time'],
    handbookUrl: '/handbooks/runbhumi-esports.pdf',
    contact: ['Harshad Dike - 9322665964', 'Rutvik Shinde - 9168277048', 'Sanket Meghale - 9356776307'],
    quickDetails: ['Format: Squad of 4', 'Mode: Qualifier + Final', 'Scoring: Kill + placement'],
  },
  'googler-hunt': {
    theme: 'Innovate. Think. Conquer.',
    overview: 'A fast-paced tech treasure hunt where teams solve MCQs, unlock chained questions, and race through knowledge, logic, and clue-based rounds on the event platform.',
    highlights: ['1 to 4 members per team', 'Round 1: Rapid Resolve with 15 MCQs in 30 minutes', 'Round 2: The Chain for the top 5 teams with 11 unlock-based questions', 'Clue system reduces points but helps progress in both rounds'],
    rules: ['The event is hosted entirely on the platform with no internet shortcuts', 'Only the top 5 teams from Round 1 advance to Round 2', 'Wildcard questions can appear and have no clue option', 'Wrong attempts in Round 2 start penalty deductions from the 6th wrong attempt onward'],
    handbookUrl: '/handbooks/googler-hunt.pdf',
    quickDetails: ['Format: Team quiz / treasure hunt', 'Fee: Rs 200 per team', 'Rounds: Rapid Resolve + The Chain'],
  },
  utopia: {
    theme: 'Concept. Code. Conquer.',
    overview: 'A flagship state-level hackathon designed as a high-intensity tech sprint where teams build and present a working MVP under strict time pressure.',
    highlights: ['1 to 5 members per team', '3 hour build phase followed by 2 hour showdown and jury evaluation', 'Cross-institutional teams are allowed', 'AI tools and open-source resources may be used with proper disclosure'],
    rules: ['All development must happen only within the official 3 hour build window', 'Only one registration per team is allowed and no mid-event team switching is permitted', 'Teams must carry valid college ID cards and registration confirmation', 'Misuse of AI tools or professional misconduct is grounds for disqualification'],
    handbookUrl: '/handbooks/utopia.pdf',
    quickDetails: ['Format: Hackathon / MVP sprint', 'Fee: Rs 250 per team', 'Duration: 3 hr build + 2 hr showdown'],
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

export const EventRegistrationPanel: React.FC<Props> = ({
  selectedEvent, teamSize, form, submitting, successMessage, errorMessage, successReceipt, draftRecovered,
  validationErrors, touchedFields, paymentScreenshotName, paymentScreenshotReady, onDownloadPass,
  onDismissDraftRecovered, onFieldBlur, onPaymentScreenshotChange, onTeamSizeChange,
  onFormFieldChange, onParticipantChange, onSubmit,
}) => {
  const passCardRef = useRef<HTMLDivElement | null>(null);
  const eventTopRef = useRef<HTMLDivElement | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const showError = (field: string) => (touchedFields[field] ? validationErrors[field] : '');
  const selectedTheme = selectedEvent ? categoryThemes[selectedEvent.category] || categoryThemes.Technical : categoryThemes.Technical;
  const selectedHandbook = selectedEvent ? handbookBySlug[selectedEvent.slug] : null;
  const upiLink = selectedEvent?.payment_upi ? `upi://pay?pa=${selectedEvent.payment_upi}&pn=${encodeURIComponent(selectedEvent.payment_payee || selectedEvent.name)}&am=${selectedEvent.registration_fee}&cu=INR&tn=${encodeURIComponent(selectedEvent.name)}` : '';
  const qrUrl = upiLink ? `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(upiLink)}` : '';
  const scrollToRegistrationForm = () => {
    if (typeof window === 'undefined') return;

    const formSection = document.getElementById('portal-registration-form');
    if (!formSection) return;

    const top = formSection.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
  };

  useEffect(() => {
    setCodeCopied(false);
  }, [successReceipt?.registrationCode]);

  useEffect(() => {
    if (!successReceipt || !passCardRef.current || typeof window === 'undefined') return;

    const animationFrame = window.requestAnimationFrame(() => {
      passCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      passCardRef.current?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [successReceipt]);

  useLayoutEffect(() => {
    if (typeof window === 'undefined' || !selectedEvent || successReceipt) return;
    eventTopRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
  }, [selectedEvent?.slug, successReceipt]);

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCodeCopied(true);
    } catch {
      setCodeCopied(false);
    }
  };

  if (!selectedEvent) {
    return (
      <section id="registration-panel">
        <div className="portal-glow-card portal-glass rounded-[1.8rem] p-5 text-sm text-slate-300">
          Load events to begin registration.
        </div>
      </section>
    );
  }

  return (
    <section id="registration-panel">
      <div ref={eventTopRef} className="portal-event-layout">
        <div className="portal-event-layout__details space-y-5">
          <section className={`portal-event-showcase portal-glow-card portal-glass ${selectedTheme.glow}`}>
            <div className="portal-event-showcase__poster">
              <img src={selectedEvent.poster_path} alt={selectedEvent.name} loading="eager" decoding="async" className="h-full w-full object-cover" />
              <div className="portal-event-showcase__poster-overlay" />
            </div>
            <div className="portal-event-showcase__content">
              <div className="flex flex-wrap items-center gap-3">
                <a href="#overview" className="magnetic-button inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white">
                  <ArrowLeft size={14} />
                  Back
                </a>
                <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${selectedTheme.badge}`}>
                  {selectedEvent.category}
                </span>
              </div>

              <div className="mt-5">
                <p className="portal-kicker">{selectedHandbook?.theme || 'Event Details'}</p>
                <h2 className="mt-3 portal-title-xl font-black text-white">{selectedEvent.name}</h2>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-200">
                  {selectedHandbook?.overview || selectedEvent.description}
                </p>
              </div>

              <div className="portal-event-inline-info mt-6">
                <div className="portal-event-inline-info__item">
                  <Clock3 size={15} className="text-amber-200" />
                  <span className="portal-event-inline-info__label">Date</span>
                  <span className="portal-event-inline-info__value">{selectedEvent.date_label}</span>
                </div>
                <div className="portal-event-inline-info__item">
                  <Users size={15} className="text-amber-200" />
                  <span className="portal-event-inline-info__label">Team</span>
                  <span className="portal-event-inline-info__value">{getTeamLabel(selectedEvent)}</span>
                </div>
                <div className="portal-event-inline-info__item">
                  <CreditCard size={15} className="text-amber-200" />
                  <span className="portal-event-inline-info__label">Fee</span>
                  <span className="portal-event-inline-info__value">{formatCurrency(selectedEvent.registration_fee)}</span>
                </div>
                <div className="portal-event-inline-info__item">
                  <MapPin size={15} className="text-amber-200" />
                  <span className="portal-event-inline-info__label">Venue</span>
                  <span className="portal-event-inline-info__value">{selectedEvent.venue}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="portal-event-section portal-glow-card portal-glass" data-reveal="up">
            <div className="portal-event-section__head">
              <Info size={17} className="text-amber-200" />
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">About Event</p>
                <h3 className="mt-1 text-lg font-semibold text-white">Quick overview</h3>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              {selectedEvent.description}
            </p>
            {selectedHandbook?.quickDetails?.length ? (
              <div className="portal-event-mini-grid mt-5">
                {selectedHandbook.quickDetails.slice(0, 3).map((item) => (
                  <div key={item} className="portal-event-mini-grid__item">
                    <Trophy size={14} className="text-amber-200" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <section className="portal-event-section portal-glow-card portal-glass" data-reveal="up">
            <div className="portal-event-section__head">
              <BookOpen size={17} className="text-amber-200" />
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Handbook</p>
                <h3 className="mt-1 text-lg font-semibold text-white">Read the full event guide</h3>
              </div>
            </div>
            {selectedHandbook?.handbookUrl ? (
              <a
                href={selectedHandbook.handbookUrl}
                target="_blank"
                rel="noreferrer"
                className="portal-event-handbook-card mt-5"
              >
                <div>
                  <p className="text-sm font-semibold text-white">For details click on this handbook</p>
                  <p className="mt-2 text-sm text-slate-300">Open full rounds, judging flow, rules, coordinator notes, and reporting instructions.</p>
                </div>
                <ExternalLink size={18} className="shrink-0 text-amber-200" />
              </a>
            ) : (
              <div className="portal-event-note-list__item mt-5">
                <Info size={15} className="mt-0.5 shrink-0 text-amber-200" />
                <span>Full handbook is not attached for this event yet.</span>
              </div>
            )}
          </section>
        </div>

        <div className="portal-event-layout__form" data-reveal="right">
          <form id="portal-registration-form" onSubmit={onSubmit} className="portal-event-form-shell space-y-4">
          {draftRecovered ? (
            <div className="flex items-start justify-between gap-3 rounded-[1.4rem] border border-sky-300/20 bg-sky-400/10 px-4 py-4 text-sm text-sky-100">
              <div className="flex items-start gap-3">
                <Save size={18} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Draft restored</p>
                  <p className="mt-1 text-sky-100/80">Your saved details are back on this device.</p>
                </div>
              </div>
              <button type="button" onClick={onDismissDraftRecovered} className="text-xs uppercase tracking-[0.16em] text-sky-100/70">Dismiss</button>
            </div>
          ) : null}

              <SectionCard title="Start with the basics" subtitle="Team Setup">
                <div className="grid gap-3 sm:grid-cols-2">
                  {selectedEvent.max_members > selectedEvent.min_members ? (
                    <label className="block">
                      <span className="mb-2 block text-sm text-slate-200">Team size</span>
                      <select value={teamSize} onChange={(event) => onTeamSizeChange(Number(event.target.value))} className="floating-field-input">
                        {Array.from({ length: selectedEvent.max_members - selectedEvent.min_members + 1 }, (_, index) => selectedEvent.min_members + index).map((size) => <option key={size} value={size}>{size} participants</option>)}
                      </select>
                    </label>
                  ) : (
                    <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.05] px-4 py-4 text-sm text-slate-200">
                      Fixed team size: {selectedEvent.min_members}
                    </div>
                  )}
                  <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.05] px-4 py-4 text-sm text-slate-200">
                    Review flow: payment proof is checked by admins after submission.
                  </div>
                  {selectedEvent.min_members === 1 && !selectedEvent.is_team_event ? null : (
                    <div className="sm:col-span-2">
                      <FloatingField label="Team name" value={form.teamName} onChange={(value) => onFormFieldChange('teamName', value)} onBlur={() => onFieldBlur('teamName')} error={showError('teamName')} required />
                    </div>
                  )}
                  <FloatingField label="College name" value={form.collegeName} onChange={(value) => onFormFieldChange('collegeName', value)} onBlur={() => onFieldBlur('collegeName')} error={showError('collegeName')} required />
                  <FloatingField label="Department" value={form.departmentName} onChange={(value) => onFormFieldChange('departmentName', value)} onBlur={() => onFieldBlur('departmentName')} error={showError('departmentName')} required />
                  <FloatingField label="Year / semester" value={form.yearOfStudy} onChange={(value) => onFormFieldChange('yearOfStudy', value)} onBlur={() => onFieldBlur('yearOfStudy')} error={showError('yearOfStudy')} required />
                </div>
              </SectionCard>

              <SectionCard title="Who should organizers reach?" subtitle="Lead Contact">
                <div className="grid gap-3 sm:grid-cols-2">
                  <FloatingField label="Primary contact name" value={form.contactName} onChange={(value) => onFormFieldChange('contactName', value)} onBlur={() => onFieldBlur('contactName')} error={showError('contactName')} required />
                  <FloatingField label="Primary contact phone" value={form.contactPhone} onChange={(value) => onFormFieldChange('contactPhone', value)} onBlur={() => onFieldBlur('contactPhone')} error={showError('contactPhone')} required />
                  <div className="sm:col-span-2">
                    <FloatingField label="Primary contact email" value={form.contactEmail} onChange={(value) => onFormFieldChange('contactEmail', value)} onBlur={() => onFieldBlur('contactEmail')} error={showError('contactEmail')} type="email" required />
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Add every participant clearly" subtitle="Participants">
                <div className="mb-4 inline-flex rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-200">{teamSize} total</div>
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

              <SectionCard title="Pay and upload proof" subtitle="Payment">
                <div className="grid gap-4">
                  <div className={`rounded-[1.35rem] border border-white/10 bg-gradient-to-br p-4 ${selectedTheme.surface}`}>
                    <div className="flex items-center gap-2 text-white">
                      <QrCode size={18} />
                      <p className="text-sm font-semibold">Event payment QR</p>
                    </div>
                    <div className="mt-4 flex aspect-square items-center justify-center rounded-[1.4rem] bg-white p-4">
                      {qrUrl ? <img src={qrUrl} alt={`${selectedEvent.name} payment QR`} className="h-full w-full max-w-[14rem] object-contain" /> : <div className="h-full w-full max-w-[14rem] rounded-[1.2rem] bg-slate-200/30" />}
                    </div>
                  </div>

                  <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.05] p-4">
                    <div className="flex items-center gap-2">
                      <CreditCard size={16} className="text-cyan-200" />
                      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">UPI Details</p>
                    </div>
                    <div className="mt-3 rounded-[1.15rem] border border-white/10 bg-black/20 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">UPI ID</p>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <p className="break-all text-sm font-semibold text-white">{selectedEvent.payment_upi || 'Not configured'}</p>
                        {selectedEvent.payment_upi ? (
                          <button type="button" onClick={() => navigator.clipboard.writeText(selectedEvent.payment_upi || '')} className="magnetic-button rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white">
                            <Copy size={14} />
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-3 rounded-[1.15rem] border border-white/10 bg-black/20 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Payee Name</p>
                      <p className="mt-2 text-sm font-semibold text-white">{selectedEvent.payment_payee || selectedEvent.name}</p>
                    </div>
                  </div>

                  <div className={`rounded-[1.35rem] border border-white/10 bg-gradient-to-br p-4 ${selectedTheme.surface}`}>
                    <FloatingField label="Transaction ID / payment reference" value={form.paymentReference} onChange={(value) => onFormFieldChange('paymentReference', value)} onBlur={() => onFieldBlur('paymentReference')} error={showError('paymentReference')} required />
                    <label className="mt-4 block">
                      <span className="mb-2 block text-sm text-slate-200">Upload payment screenshot</span>
                      <span className={`portal-event-upload-box magnetic-button flex cursor-pointer items-center justify-center gap-2 rounded-[1.15rem] border border-dashed px-4 py-5 text-sm font-semibold ${selectedTheme.button}`}>
                        <Upload size={16} />
                        {paymentScreenshotName || 'Choose screenshot'}
                        <input type="file" accept="image/*" className="hidden" onChange={(event) => onPaymentScreenshotChange(event.target.files?.[0] || null)} />
                      </span>
                    </label>
                    {paymentScreenshotReady ? <p className="mt-3 text-sm text-emerald-200">Screenshot attached and ready for review.</p> : <p className="mt-3 text-sm text-slate-300">Add a screenshot so organizers can verify faster.</p>}
                    {showError('paymentScreenshot') ? <p className="floating-field-error">{showError('paymentScreenshot')}</p> : null}
                  </div>
                </div>
              </SectionCard>

              {successMessage && !successReceipt ? <div className="rounded-[1.35rem] border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">{successMessage}</div> : null}
              {errorMessage ? <div className="rounded-[1.35rem] border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{errorMessage}</div> : null}

              <button type="submit" disabled={submitting} className="animated-gradient-button inline-flex w-full items-center justify-center rounded-2xl px-6 py-4 text-base font-bold text-slate-950 disabled:opacity-60">
                {submitting ? 'Submitting registration...' : 'Submit registration'}
                <ArrowRight size={18} />
              </button>

              {successReceipt ? (
                <div
                  ref={passCardRef}
                  tabIndex={-1}
                  className="rounded-[1.55rem] border border-emerald-300/20 bg-[linear-gradient(145deg,rgba(4,28,38,0.92),rgba(14,23,39,0.96))] p-4 text-slate-100 shadow-[0_24px_70px_rgba(16,185,129,0.14)] outline-none"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-emerald-400/15 p-3 text-emerald-200">
                      <CheckCircle2 size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-emerald-200/80">Registration Successful</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        Download the pass now and keep the registration code ready for event-day verification.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[1.2rem] border border-cyan-300/16 bg-cyan-400/10 p-4">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-100/80">Registration Code</p>
                    <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="break-all text-lg font-black tracking-[0.08em] text-white">{successReceipt.registrationCode}</p>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(successReceipt.registrationCode)}
                        className="magnetic-button inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-2 text-sm font-semibold text-white"
                      >
                        <Copy size={15} />
                        {codeCopied ? 'Code copied' : 'Copy code'}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.05] p-4">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Competition</p>
                      <p className="mt-2 text-sm font-semibold text-white">{successReceipt.eventName}</p>
                    </div>
                    <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.05] p-4">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Team / Participant</p>
                      <p className="mt-2 text-sm font-semibold text-white">{successReceipt.teamName}</p>
                    </div>
                    <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.05] p-4">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Schedule</p>
                      <p className="mt-2 text-sm font-semibold text-white">{successReceipt.dateLabel}</p>
                      <p className="mt-1 text-sm text-slate-300">{successReceipt.timeLabel}</p>
                    </div>
                    <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.05] p-4">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Venue</p>
                      <p className="mt-2 text-sm font-semibold text-white">{successReceipt.venue}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[1.15rem] border border-white/10 bg-black/20 p-4 text-sm leading-7 text-slate-300">
                    <p className="font-semibold text-white">Short instructions</p>
                    <p className="mt-2">Download the pass, keep the code safe, and watch your email for organizer status updates if they review or change your registration.</p>
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => onDownloadPass(successReceipt)}
                      className="animated-gradient-button inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-5 py-3 font-bold text-slate-950"
                    >
                      <Download size={16} />
                      Download Pass
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(successReceipt.registrationCode)}
                      className="magnetic-button inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 font-semibold text-white"
                    >
                      <Copy size={16} />
                      {codeCopied ? 'Code copied' : 'Copy Registration Code'}
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
                <div className="flex items-center gap-2 text-white">
                  <Sparkles size={16} className="text-yellow-200" />
                  <p className="font-semibold">Verification flow</p>
                </div>
                <p className="mt-3 leading-7">
                  Once submitted, your entry is saved as <span className="font-semibold text-white">pending</span>. Organizers verify the payment proof and send the final update by email.
                </p>
              </div>
          </form>
        </div>
      </div>

    </section>
  );
};
