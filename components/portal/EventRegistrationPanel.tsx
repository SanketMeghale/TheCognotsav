import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Clock3, Copy, CreditCard, Download, ExternalLink,
  Eye, Info, MapPin, Phone, QrCode, Smartphone, Sparkles, Trophy, Upload, Users,
} from 'lucide-react';
import type { EventRecord, ParticipantDraft, RegistrationReceipt } from './types';
import { formatCurrency, getEventLiveState, getTeamLabel } from './utils';

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
  onBackToEvents: () => void;
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
    highlights: ['Solo or group format', '5 minute stage slot', 'Rs 50 per participant', 'Performance-first judging'],
    rules: ['Express emotions and ideas clearly through acting', 'Report before the event start time', 'Maintain stage discipline and follow organizer instructions'],
    handbookUrl: '/handbooks/rangmanch.pdf',
    quickDetails: ['Format: Solo / Team', 'Fee: Rs 50 per participant', 'Stage Time: 5 minutes'],
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
    contact: ['Rutvik Shinde - 9168277048', 'Sanket Meghale - 9356776307'],
    quickDetails: ['Format: Squad of 4', 'Mode: Qualifier + Final', 'Scoring: Kill + placement'],
  },
  'ff-esports': {
    theme: 'Enter the Arena. Survive the Battle.',
    overview: 'Squad-based arena event driven by strategy, survival, kills, and final-stage qualification.',
    highlights: ['4 players per team', 'Qualifier plus final structure', 'Kill points and placement points both matter', 'Seminar Hall venue'],
    rules: ['No cheating, hacking, or unfair play', 'Same team must play throughout', 'No restart for network issues', 'Players must join rooms on time'],
    handbookUrl: '/handbooks/runbhumi-esports.pdf',
    contact: ['Rutvik Shinde - 9168277048', 'Sanket Meghale - 9356776307'],
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

function resolveEventAmount(event: EventRecord, participantCount: number) {
  if (event.slug === 'rang-manch') {
    return Math.max(1, participantCount) * 50;
  }

  return Number(event.registration_fee || 0);
}

function resolveCustomQrObjectPosition(eventSlug: string) {
  switch (eventSlug) {
    case 'squid-game':
      return 'center 45%';
    case 'tech-kbc':
      return 'center 50%';
    case 'techxcelerate':
    case 'utopia':
    case 'googler-hunt':
      return 'center 52%';
    default:
      return 'center center';
  }
}

function resolveCustomQrScale(eventSlug: string) {
  switch (eventSlug) {
    case 'tech-kbc':
      return 1.22;
    default:
      return 1;
  }
}

export const EventRegistrationPanel: React.FC<Props> = ({
  selectedEvent, teamSize, form, submitting, successMessage, errorMessage, successReceipt,
  validationErrors, touchedFields, paymentScreenshotName, paymentScreenshotReady, onDownloadPass,
  onFieldBlur, onPaymentScreenshotChange, onTeamSizeChange,
  onBackToEvents, onFormFieldChange, onParticipantChange, onSubmit,
}) => {
  const passCardRef = useRef<HTMLDivElement | null>(null);
  const eventTopRef = useRef<HTMLDivElement | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [paymentCopyState, setPaymentCopyState] = useState<'upi' | 'amount' | 'link' | null>(null);
  const [now, setNow] = useState(() => new Date());
  const showError = (field: string) => (touchedFields[field] ? validationErrors[field] : '');
  const selectedTheme = selectedEvent ? categoryThemes[selectedEvent.category] || categoryThemes.Technical : categoryThemes.Technical;
  const selectedHandbook = selectedEvent ? handbookBySlug[selectedEvent.slug] : null;
  const payableAmount = selectedEvent ? resolveEventAmount(selectedEvent, teamSize) : 0;
  const customQrImagePath = selectedEvent?.payment_qr_image_path?.trim() || '';
  const hasCustomQrImage = Boolean(customQrImagePath);
  const customQrObjectPosition = selectedEvent ? resolveCustomQrObjectPosition(selectedEvent.slug) : 'center center';
  const customQrScale = selectedEvent ? resolveCustomQrScale(selectedEvent.slug) : 1;
  const upiLink = selectedEvent?.payment_upi ? `upi://pay?pa=${selectedEvent.payment_upi}&pn=${encodeURIComponent(selectedEvent.payment_payee || selectedEvent.name)}&am=${payableAmount}&cu=INR&tn=${encodeURIComponent(selectedEvent.name)}` : '';
  const qrUrl = upiLink ? `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(upiLink)}` : '';
  const paymentQrSrc = hasCustomQrImage ? customQrImagePath : qrUrl;
  const canOpenPaymentApp = typeof window !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent);
  const isSoloEvent = selectedEvent.min_members === 1 && !selectedEvent.is_team_event;
  const registrationPaused = selectedEvent.registration_enabled === false;
  const scrollBehavior = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 'auto'
    : 'smooth';
  const scrollToRegistrationForm = () => {
    if (typeof window === 'undefined') return;

    const formSection = document.getElementById('portal-registration-form');
    if (!formSection) return;

    const top = formSection.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top: Math.max(top, 0), behavior: scrollBehavior });
  };

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setCodeCopied(false);
  }, [successReceipt?.registrationCode]);

  useEffect(() => {
    if (!paymentCopyState || typeof window === 'undefined') return undefined;

    const timer = window.setTimeout(() => setPaymentCopyState(null), 1800);
    return () => window.clearTimeout(timer);
  }, [paymentCopyState]);

  useEffect(() => {
    if (!successReceipt || !passCardRef.current || typeof window === 'undefined') return;

    const animationFrame = window.requestAnimationFrame(() => {
      passCardRef.current?.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
      passCardRef.current?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [scrollBehavior, successReceipt]);

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCodeCopied(true);
    } catch {
      setCodeCopied(false);
    }
  };

  const handleCopyPaymentValue = async (value: string, type: 'upi' | 'amount' | 'link') => {
    try {
      await navigator.clipboard.writeText(value);
      setPaymentCopyState(type);
    } catch {
      setPaymentCopyState(null);
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

  const liveState = getEventLiveState(selectedEvent, now);
  const handbookCtaLabel = selectedHandbook?.handbookUrl?.toLowerCase().endsWith('.pdf') ? 'Download PDF' : 'Download Handbook';
  const quickDetails = selectedHandbook?.quickDetails?.slice(0, 3) || [];
  const eventStoryPoints = selectedHandbook?.highlights?.slice(0, 3) || [];
  const rulePreview = selectedHandbook?.rules?.slice(0, 3) || [];
  const handbookReady = Boolean(selectedHandbook?.handbookUrl);
  const posterMetaItems = [
    { label: 'Date', value: selectedEvent.date_label, Icon: Clock3 },
    { label: 'Team', value: getTeamLabel(selectedEvent), Icon: Users },
    { label: 'Fee', value: formatCurrency(payableAmount), Icon: CreditCard },
    { label: 'Venue', value: selectedEvent.venue, Icon: MapPin },
    { label: 'Status', value: liveState.label, Icon: Clock3 },
    { label: 'Countdown', value: liveState.countdown, Icon: Sparkles },
  ];

  return (
    <section id="registration-panel">
      <div ref={eventTopRef} className="portal-event-page">
        <div className="portal-event-page__main">
          <section className={`portal-event-showcase portal-glow-card portal-glass ${selectedTheme.glow}`}>
            <div className="portal-event-showcase__poster portal-event-showcase__poster--wide">
              <img src={selectedEvent.poster_path} alt={selectedEvent.name} loading="eager" decoding="async" className="h-full w-full object-cover" />
              <div className="portal-event-showcase__poster-overlay" />
              <div className="portal-event-poster-meta">
                {posterMetaItems.map(({ label, value, Icon }) => (
                  <div key={label} className="portal-event-poster-meta__item">
                    <div className="portal-event-poster-meta__head">
                      <Icon size={13} />
                      <span>{label}</span>
                    </div>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div className="portal-event-showcase__cta-row">
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={scrollToRegistrationForm}
                  disabled={registrationPaused}
                  className="portal-register-cta inline-flex w-full items-center justify-center gap-2"
                >
                  {registrationPaused ? 'Registration Paused' : 'Register Now'}
                  <ArrowRight size={16} />
                </button>
                {selectedEvent.intro_video_url ? (
                  <a
                    href={selectedEvent.intro_video_url}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-[1.2rem] border px-4 py-3 text-sm font-bold transition sm:max-w-[220px] ${selectedTheme.button}`}
                  >
                    <ExternalLink size={16} />
                    Watch Trailer
                  </a>
                ) : null}
              </div>
            </div>
            <div className="portal-event-showcase__content">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onBackToEvents}
                  className="magnetic-button inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white"
                >
                  <ArrowLeft size={14} />
                  Back
                </button>
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

              <div className="portal-event-inline-info portal-event-inline-info--hero mt-6">
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
                  <span className="portal-event-inline-info__value">{formatCurrency(payableAmount)}</span>
                </div>
                <div className="portal-event-inline-info__item">
                  <MapPin size={15} className="text-amber-200" />
                  <span className="portal-event-inline-info__label">Venue</span>
                  <span className="portal-event-inline-info__value">{selectedEvent.venue}</span>
                </div>
                <div className="portal-event-inline-info__item">
                  <Clock3 size={15} className="text-amber-200" />
                  <span className="portal-event-inline-info__label">Status</span>
                  <span className="portal-event-inline-info__value">{liveState.label}</span>
                </div>
                <div className="portal-event-inline-info__item">
                  <Sparkles size={15} className="text-amber-200" />
                  <span className="portal-event-inline-info__label">Countdown</span>
                  <span className="portal-event-inline-info__value">{liveState.countdown}</span>
                </div>
              </div>

              {selectedEvent.coordinators?.length ? (
                <div className="portal-event-contact-strip">
                  <p className="portal-event-contact-strip__label">Coordination Contacts</p>
                  <div className="portal-event-contact-strip__grid">
                    {selectedEvent.coordinators.map((coordinator) => {
                      const telValue = coordinator.phone.replace(/\D+/g, '');
                      return (
                        <a
                          key={`${selectedEvent.slug}-${coordinator.name}-${coordinator.phone}`}
                          href={`tel:${telValue}`}
                          className="portal-event-contact-strip__item"
                        >
                          <span className="portal-event-contact-strip__name">{coordinator.name}</span>
                          <span className="portal-event-contact-strip__phone">{coordinator.phone}</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <section className="portal-event-section portal-event-section--prep portal-glow-card portal-glass" data-reveal="up">
            <div className="portal-event-warning-banner">
              <AlertTriangle size={18} className="shrink-0" />
              <span>Please read the handbook before you register.</span>
            </div>
            <div className="portal-event-section__head">
              <BookOpen size={18} className="text-cyan-200" />
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Before You Register</p>
                <h3 className="mt-1 text-lg font-semibold text-cyan-100">Rules, format, and event essentials</h3>
              </div>
            </div>
            {quickDetails.length || eventStoryPoints.length ? (
              <div className="portal-event-prep-layout">
                {quickDetails.length ? (
                  <div className="portal-event-prep-group">
                    <p className="portal-event-prep-group__label">Event Essentials</p>
                    <div className="portal-event-prep-chip-wrap">
                      {quickDetails.map((item) => (
                        <div key={item} className="portal-event-prep-chip">
                          <Trophy size={14} className="text-amber-200" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {eventStoryPoints.length ? (
                  <div className="portal-event-prep-group">
                    <p className="portal-event-prep-group__label">Highlights</p>
                    <div className="portal-event-prep-list portal-event-prep-list--compact">
                      {eventStoryPoints.map((item) => (
                        <div key={item} className="portal-event-prep-list__item">
                          <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-cyan-200" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            {rulePreview.length ? (
              <div className="portal-event-handbook-list portal-event-handbook-list--framed">
                {rulePreview.map((rule) => (
                  <div key={rule} className="portal-event-handbook-list__item">
                    <CheckCircle2 size={15} className="text-cyan-200" />
                    <span>{rule}</span>
                  </div>
                ))}
              </div>
            ) : null}
            {handbookReady ? (
              <div className="portal-event-handbook-actions">
                <a
                  href={selectedHandbook?.handbookUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="portal-event-handbook-button portal-event-handbook-button--ghost"
                >
                  <Eye size={16} />
                  View Online
                </a>
                <a
                  href={selectedHandbook?.handbookUrl}
                  download
                  className="portal-event-handbook-button portal-event-handbook-button--primary"
                >
                  <Download size={16} />
                  {handbookCtaLabel}
                </a>
              </div>
            ) : (
              <div className="portal-event-note-list__item mt-5">
                <Info size={15} className="mt-0.5 shrink-0 text-amber-200" />
                <span>Full handbook is not attached for this event yet.</span>
              </div>
            )}
          </section>

        </div>

        <aside className="portal-event-page__sidebar" data-reveal="right">
          <form id="portal-registration-form" onSubmit={onSubmit} className="portal-event-form-shell space-y-4">
              <div className="portal-event-form-intro">
                <p className="portal-event-form-intro__kicker">Registration Desk</p>
                <h3 className="portal-event-form-intro__title">Secure your slot for {selectedEvent.name}</h3>
                <p className="portal-event-form-intro__text">
                  Submit your team details and payment proof once. Organizers review it manually and confirm your entry.
                </p>
                <div className="portal-event-form-intro__grid">
                  <div className="portal-event-form-intro__metric">
                    <span>Entry Fee</span>
                    <strong>{formatCurrency(payableAmount)}</strong>
                  </div>
                  <div className="portal-event-form-intro__metric">
                    <span>Team Format</span>
                    <strong>{getTeamLabel(selectedEvent)}</strong>
                  </div>
                  <div className="portal-event-form-intro__metric">
                    <span>Review</span>
                    <strong>Manual verification</strong>
                  </div>
                </div>
              </div>

              <SectionCard title="Start with the basics" subtitle="Team Setup">
                <div className="grid gap-3 sm:grid-cols-2">
                  {!isSoloEvent && selectedEvent.max_members > selectedEvent.min_members ? (
                    <label className="block">
                      <span className="mb-2 block text-sm text-slate-200">Team size</span>
                      <select value={teamSize} onChange={(event) => onTeamSizeChange(Number(event.target.value))} className="floating-field-input">
                        {Array.from({ length: selectedEvent.max_members - selectedEvent.min_members + 1 }, (_, index) => selectedEvent.min_members + index).map((size) => <option key={size} value={size}>{size} participants</option>)}
                      </select>
                    </label>
                  ) : !isSoloEvent ? (
                    <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.05] px-4 py-4 text-sm text-slate-200">
                      Fixed team size: {selectedEvent.min_members}
                    </div>
                  ) : null}
                  <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.05] px-4 py-4 text-sm text-slate-200">
                    Review flow: payment proof is checked by admins after submission.
                  </div>
                  {isSoloEvent ? null : (
                    <div className="sm:col-span-2">
                      <FloatingField label="Team name" value={form.teamName} onChange={(value) => onFormFieldChange('teamName', value)} onBlur={() => onFieldBlur('teamName')} error={showError('teamName')} required />
                    </div>
                  )}
                  <FloatingField label="College name" value={form.collegeName} onChange={(value) => onFormFieldChange('collegeName', value)} onBlur={() => onFieldBlur('collegeName')} error={showError('collegeName')} required />
                </div>
              </SectionCard>

              <SectionCard title={isSoloEvent ? 'Participant details' : 'Who should organizers reach?'} subtitle={isSoloEvent ? 'Contact' : 'Lead Contact'}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FloatingField label={isSoloEvent ? 'Full name' : 'Leader name'} value={form.contactName} onChange={(value) => onFormFieldChange('contactName', value)} onBlur={() => onFieldBlur('contactName')} error={showError('contactName')} required />
                  <FloatingField label={isSoloEvent ? 'Phone number' : 'Leader phone'} value={form.contactPhone} onChange={(value) => onFormFieldChange('contactPhone', value)} onBlur={() => onFieldBlur('contactPhone')} error={showError('contactPhone')} required />
                  <div className="sm:col-span-2">
                    <FloatingField label={isSoloEvent ? 'Email' : 'Leader email'} value={form.contactEmail} onChange={(value) => onFormFieldChange('contactEmail', value)} onBlur={() => onFieldBlur('contactEmail')} error={showError('contactEmail')} type="email" required />
                  </div>
                </div>
              </SectionCard>

              {!isSoloEvent ? (
                <SectionCard title="Add team members" subtitle="Member Names">
                  <div className="mb-4 inline-flex rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-200">{teamSize} total</div>
                  <div className="space-y-3">
                    {form.participants.slice(1).map((participant, index) => (
                      <div key={index + 1} className="rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-sm font-semibold text-white">Member {index + 2} name</p>
                        <div className="mt-4">
                          <FloatingField label="Full name" value={participant.fullName} onChange={(value) => onParticipantChange(index + 1, 'fullName', value)} onBlur={() => onFieldBlur(`participants.${index + 1}.fullName`)} error={showError(`participants.${index + 1}.fullName`)} required />
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              ) : null}

              <SectionCard title="Pay and upload proof" subtitle="Payment">
                <div className="grid gap-4">
                  <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.05] p-4">
                    <div className="flex items-center gap-2">
                      <Smartphone size={16} className="text-cyan-200" />
                      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Payment Methods</p>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <a
                        href={upiLink || '#'}
                        className={`magnetic-button flex items-center justify-center gap-2 rounded-[1.15rem] border px-4 py-3 text-sm font-semibold ${upiLink ? 'border-emerald-300/18 bg-emerald-400/10 text-emerald-100' : 'pointer-events-none border-white/10 bg-white/5 text-slate-400 opacity-70'}`}
                      >
                        <Smartphone size={16} />
                        {canOpenPaymentApp ? 'Open UPI App' : 'UPI App on Mobile'}
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopyPaymentValue(String(payableAmount), 'amount')}
                        className="magnetic-button flex items-center justify-center gap-2 rounded-[1.15rem] border border-blue-300/18 bg-blue-400/10 px-4 py-3 text-sm font-semibold text-blue-100"
                      >
                        <Copy size={16} />
                        {paymentCopyState === 'amount' ? 'Amount Copied' : 'Copy Amount'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyPaymentValue(selectedEvent.payment_upi || '', 'upi')}
                        disabled={!selectedEvent.payment_upi}
                        className="magnetic-button flex items-center justify-center gap-2 rounded-[1.15rem] border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        <Copy size={16} />
                        {paymentCopyState === 'upi' ? 'UPI Copied' : 'Copy UPI ID'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyPaymentValue(upiLink, 'link')}
                        disabled={!upiLink}
                        className="magnetic-button flex items-center justify-center gap-2 rounded-[1.15rem] border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        <Copy size={16} />
                        {paymentCopyState === 'link' ? 'Link Copied' : 'Copy Payment Link'}
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">Google Pay</span>
                      <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">PhonePe</span>
                      <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">Paytm</span>
                      <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">Any UPI App</span>
                    </div>
                    <p className="mt-3 text-xs leading-6 text-slate-300">
                      {upiLink
                        ? <>On mobile, use <span className="font-semibold text-white">Open UPI App</span>. On laptop, scan the QR below using any UPI app on your phone, then submit the transaction ID and screenshot.</>
                        : <>Scan the QR below using any UPI app on your phone, then submit the transaction ID and screenshot for verification.</>}
                    </p>
                  </div>

                  <div className={`rounded-[1.35rem] border border-white/10 bg-gradient-to-br p-4 ${selectedTheme.surface}`}>
                    <div className="flex items-center gap-2 text-white">
                      <QrCode size={18} />
                      <p className="text-sm font-semibold">Event payment QR</p>
                    </div>
                    <div className={`mt-4 flex items-center justify-center overflow-hidden rounded-[1.4rem] p-4 ${hasCustomQrImage ? 'aspect-square bg-white' : 'aspect-square bg-white'}`}>
                      {paymentQrSrc ? (
                        <img
                          src={paymentQrSrc}
                          alt={`${selectedEvent.name} payment QR`}
                          className={hasCustomQrImage ? 'h-full w-full rounded-[1rem] object-cover' : 'h-full w-full max-w-[14rem] object-contain'}
                          style={hasCustomQrImage ? { objectPosition: customQrObjectPosition, transform: `scale(${customQrScale})` } : undefined}
                        />
                      ) : (
                        <div className="h-full w-full max-w-[14rem] rounded-[1.2rem] bg-slate-200/30" />
                      )}
                    </div>
                  </div>

                  <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.05] p-4">
                    <div className="flex items-center gap-2">
                      <CreditCard size={16} className="text-cyan-200" />
                      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">UPI Details</p>
                    </div>
                    <div className="mt-3 rounded-[1.15rem] border border-amber-300/16 bg-amber-400/10 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Payable Amount</p>
                      <p className="mt-2 text-lg font-semibold text-white">{formatCurrency(payableAmount)}</p>
                      {selectedEvent.slug === 'rang-manch' ? <p className="mt-1 text-xs text-slate-300">Calculated at Rs 50 per participant.</p> : null}
                    </div>
                    {selectedEvent.payment_upi ? (
                      <div className="mt-3 rounded-[1.15rem] border border-white/10 bg-black/20 p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">UPI ID</p>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <p className="break-all text-sm font-semibold text-white">{selectedEvent.payment_upi}</p>
                          <button type="button" onClick={() => navigator.clipboard.writeText(selectedEvent.payment_upi || '')} className="magnetic-button rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white">
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>
                    ) : null}
                    <div className="mt-3 rounded-[1.15rem] border border-white/10 bg-black/20 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Payee Name</p>
                      <p className="mt-2 text-sm font-semibold text-white">{selectedEvent.payment_payee || selectedEvent.name}</p>
                    </div>
                    {!selectedEvent.payment_upi && hasCustomQrImage ? (
                      <p className="mt-3 text-xs leading-6 text-slate-300">
                        Use the QR image above to complete payment for this event.
                      </p>
                    ) : null}
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
              {registrationPaused ? <div className="rounded-[1.35rem] border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">Registration is currently stopped for this event by the organizer. Please check updates or contact the coordinators before trying again.</div> : null}

              <button type="submit" disabled={submitting || registrationPaused} className="animated-gradient-button inline-flex w-full items-center justify-center rounded-2xl px-6 py-4 text-base font-bold text-slate-950 disabled:opacity-60">
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
                        Your registration is under review. The official pass will be sent to your email after verification. Please download it and show it at event time.
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

                  <div className="mt-4 rounded-[1.15rem] border border-white/10 bg-black/20 p-4 text-sm leading-7 text-slate-300">
                    <p className="font-semibold text-white">Short instructions</p>
                    <p className="mt-2">Keep the registration code safe and watch your email. After organizer verification, your official pass will be sent there. Download it and show it at event time.</p>
                  </div>

                  <div className="mt-4 rounded-2xl border border-cyan-300/16 bg-cyan-400/10 px-5 py-3 text-sm font-semibold leading-6 text-cyan-100">
                    Official pass will be sent by email after verification.
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

          {selectedEvent.coordinators?.length ? (
            <section className="portal-event-section portal-glow-card portal-glass">
              <div className="portal-event-section__head">
                <Phone size={17} className="text-emerald-200" />
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Contacts</p>
                  <h3 className="mt-1 text-lg font-semibold text-white">Need help before you submit?</h3>
                </div>
              </div>
              <div className="mt-5 grid gap-3">
                {selectedEvent.coordinators.map((coordinator) => {
                  const telValue = coordinator.phone.replace(/\D+/g, '');
                  return (
                    <a key={`${selectedEvent.slug}-sidebar-${coordinator.name}-${coordinator.phone}`} href={`tel:${telValue}`} className="portal-event-sidebar-contact">
                      <span className="portal-event-sidebar-contact__name">{coordinator.name}</span>
                      <span className="portal-event-sidebar-contact__phone">{coordinator.phone}</span>
                    </a>
                  );
                })}
              </div>
            </section>
          ) : null}
        </aside>
      </div>

    </section>
  );
};
