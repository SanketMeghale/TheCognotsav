import React, { Suspense, lazy, memo, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ArrowLeft, Bell, Building2, CheckCircle2, Clock3, GraduationCap, House, Search, Sparkles, Trophy } from 'lucide-react';
import { HeroSection } from './components/portal/HeroSection.tsx';
import { CompetitionGridSection } from './components/portal/CompetitionGridSection.tsx';
import type {
  AdminAccessScope,
  AdminNotificationSummary,
  AdminRegistration,
  BackupSnapshot,
  EventRecord,
  LookupResult,
  ParticipantDraft,
  PortalAlert,
  PortalAnnouncement,
  RegistrationReceipt,
} from './components/portal/types.ts';
import { makeParticipants, shellClassName } from './components/portal/utils.ts';

const CHUNK_RELOAD_STORAGE_KEY = 'cognotsav_chunk_reload_attempt_ts';
const CHUNK_RELOAD_COOLDOWN_MS = 60_000;
const SECRET_ADMIN_DOUBLE_TAP_WINDOW_MS = 360;
const SECRET_ADMIN_HOLD_MS = 900;

function getChunkErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return `${error.name} ${error.message}`.trim();
  }

  return typeof error === 'string' ? error : '';
}

function isRecoverableChunkError(error: unknown) {
  const message = getChunkErrorMessage(error);
  return /ChunkLoadError|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Loading chunk [\d]+ failed/i.test(message);
}

function attemptChunkReloadRecovery(error: unknown): Promise<never> {
  if (typeof window === 'undefined' || !isRecoverableChunkError(error)) {
    return Promise.reject(error);
  }

  let lastAttemptAt = 0;

  try {
    lastAttemptAt = Number(window.sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY) ?? '0');
  } catch {
    lastAttemptAt = 0;
  }

  if (Date.now() - lastAttemptAt > CHUNK_RELOAD_COOLDOWN_MS) {
    try {
      window.sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, String(Date.now()));
    } catch {
      // Ignore storage access issues and still attempt a one-time reload.
    }

    window.location.reload();
    return new Promise<never>(() => {});
  }

  return Promise.reject(error);
}

function loadLazyModule<T>(loader: () => Promise<T>) {
  return loader().catch((error) => attemptChunkReloadRecovery(error));
}

const loadAdminRegistrationsPage = () => import('./components/portal/AdminRegistrationsPage.tsx');
const loadAnnouncementArchiveSection = () => import('./components/portal/AnnouncementArchiveSection.tsx');
const loadTimelinePage = () => import('./components/portal/TimelinePage.tsx');
const loadEventRegistrationPanel = () => import('./components/portal/EventRegistrationPanel.tsx');
const loadFAQSection = () => import('./components/portal/FAQSection.tsx');
const loadTrackerAdminPanel = () => import('./components/portal/TrackerAdminPanel.tsx');
const loadPortalFooter = () => import('./components/portal/PortalFooter.tsx');

const AdminRegistrationsPage = lazy(() => loadLazyModule(loadAdminRegistrationsPage).then((module) => ({ default: module.AdminRegistrationsPage })));
const AnnouncementArchiveSection = lazy(() => loadLazyModule(loadAnnouncementArchiveSection).then((module) => ({ default: module.AnnouncementArchiveSection })));
const TimelinePage = lazy(() => loadLazyModule(loadTimelinePage).then((module) => ({ default: module.TimelinePage })));
const EventRegistrationPanel = lazy(() => loadLazyModule(loadEventRegistrationPanel).then((module) => ({ default: module.EventRegistrationPanel })));
const FAQSection = lazy(() => loadLazyModule(loadFAQSection).then((module) => ({ default: module.FAQSection })));
const TrackerAdminPanel = lazy(() => loadLazyModule(loadTrackerAdminPanel).then((module) => ({ default: module.TrackerAdminPanel })));
const PortalFooter = lazy(() => loadLazyModule(loadPortalFooter).then((module) => ({ default: module.PortalFooter })));

function scrollToViewportTop() {
  if (typeof window === 'undefined') return;
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function scheduleBrowserIdleTask(task: () => void) {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  type IdleWindow = Window & typeof globalThis & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };

  const idleWindow = window as IdleWindow;

  if (typeof idleWindow.requestIdleCallback === 'function') {
    const idleId = idleWindow.requestIdleCallback(task, { timeout: 1500 });
    return () => {
      if (typeof idleWindow.cancelIdleCallback === 'function') {
        idleWindow.cancelIdleCallback(idleId);
      }
    };
  }

  const timeoutId = window.setTimeout(task, 350);
  return () => window.clearTimeout(timeoutId);
}

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

type FieldErrors = Record<string, string>;
type ApiReadResult<T> = {
  data: T | null;
  rawText: string;
};

const DRAFT_STORAGE_KEY = 'cogno_registration_portal_draft_v1';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\d{10}$/;
const NAV_LINKS = [
  { href: '#overview', label: 'Home' },
  { href: '#registration-panel', label: 'Competitions' },
  { href: '#tracker', label: 'Tracker' },
  { href: '#timeline', label: 'Timeline' },
];
const GALLERY_PHOTOS = [
  {
    image: 'https://res.cloudinary.com/dkxddhawc/image/upload/v1774254050/_39A8389_iqde8k.jpg',
    title: 'Cognotsav Spotlight',
    text: 'A live moment from the CEAS event floor.',
  },
  {
    image: 'https://res.cloudinary.com/dkxddhawc/image/upload/v1774253254/WhatsApp_Image_2025-02-23_at_14.29.05_48110bef_rfgems.jpg',
    title: 'Campus Energy',
    text: 'Students, crowd energy, and on-ground participation.',
  },
  {
    image: 'https://res.cloudinary.com/dkxddhawc/image/upload/v1774253247/WhatsApp_Image_2025-02-23_at_14.38.32_195c4cf7_yyrihu.jpg',
    title: 'Event Highlights',
    text: 'A captured frame from the Cognotsav experience.',
  },
  {
    image: 'https://res.cloudinary.com/dkxddhawc/image/upload/v1774253391/IMG_5035_jsvyai.jpg',
    title: 'Student Participation',
    text: 'Memories from CEAS-led event activities.',
  },
  {
    image: 'https://res.cloudinary.com/dkxddhawc/image/upload/v1774253421/IMG_5282_u0bjoi.jpg',
    title: 'On-Stage Moment',
    text: 'An event-day scene from the department showcase.',
  },
  {
    image: 'https://res.cloudinary.com/dkxddhawc/image/upload/v1774253542/DSC_2915_apz4fe.jpg',
    title: 'Candid Frame',
    text: 'A snapshot reflecting the crowd and atmosphere.',
  },
  {
    image: 'https://res.cloudinary.com/dkxddhawc/image/upload/v1774253537/DSC_2864_uvfscw.jpg',
    title: 'Legacy Capture',
    text: 'A visual memory from a previous Cognotsav event.',
  },
  {
    image: 'https://res.cloudinary.com/dkxddhawc/image/upload/v1774253536/_39A8377_osrfcx.jpg',
    title: 'Department Fest',
    text: 'Scenes from the CE department flagship celebration.',
  },
  {
    image: 'https://res.cloudinary.com/dkxddhawc/image/upload/v1774253535/IMG_5542_sxmqw7.jpg',
    title: 'Crowd and Culture',
    text: 'A gallery frame showing the event-day vibe.',
  },
  {
    image: 'https://res.cloudinary.com/dkxddhawc/image/upload/v1774253533/IMG_5546_hk55de.jpg',
    title: 'Moments That Stayed',
    text: 'A memorable shot from the Cognotsav archive.',
  },
  {
    image: 'https://res.cloudinary.com/dkxddhawc/image/upload/v1774253507/IMG_5398_kl6ih5.jpg',
    title: 'CEAS Archive',
    text: 'One more look into the event legacy collection.',
  },
];

function optimizeCloudinaryImage(url: string, width: number) {
  return url.replace('/image/upload/', `/image/upload/f_auto,q_auto,w_${width},c_limit/`);
}

const DEPARTMENT_GALLERY_PHOTOS = GALLERY_PHOTOS.map((photo) => ({
  ...photo,
  image: optimizeCloudinaryImage(photo.image, 960),
}));

function PortalBackgroundCanvasBase() {
  return <div className="portal-background-image" aria-hidden="true" />;
}

const PortalBackgroundCanvas = memo(PortalBackgroundCanvasBase);

function DepartmentIntroStripBase() {
  return (
    <section className="portal-department-strip rounded-[1.8rem] border border-white/10 p-4 md:rounded-[2rem] md:p-5">
      <div className="portal-department-strip__layout">
        <div className="portal-department-strip__brand">
          <div className="portal-department-strip__logo-frame">
            <img src="/images/ceasposter.jpeg" alt="CEAS logo" loading="lazy" decoding="async" className="portal-department-strip__logo" />
          </div>
          <div className="portal-department-strip__brand-copy">
            <p className="portal-department-strip__kicker">About CEAS / Department</p>
            <h3 className="portal-department-strip__title">CEAS Student Culture Hub</h3>
          </div>
        </div>

        <p className="portal-department-strip__copy">
          CEAS powers student-led tech culture, flagship events, and Cognotsav energy across the department.
        </p>

        <div className="portal-department-strip__chips">
          <span className="portal-department-strip__chip"><Building2 size={14} />Tech-Led</span>
          <span className="portal-department-strip__chip"><GraduationCap size={14} />Student-Run</span>
          <span className="portal-department-strip__chip"><Sparkles size={14} />Cognotsav</span>
        </div>

        <a href="#department" className="portal-premium-button portal-premium-button--secondary portal-department-strip__button">
          Explore CEAS
          <ArrowRight size={15} />
        </a>
      </div>
    </section>
  );
}

const DepartmentIntroStrip = memo(DepartmentIntroStripBase);

const LAST_YEAR_PHOTO_SLOTS = [
  { label: 'Feature Frame', title: 'Crowd Energy', note: 'Keep your best stage or crowd photo here later.', tone: 'cyan', featured: true },
  { label: 'Campus Vibes', title: 'Walkthrough Shot', note: 'Perfect spot for an ambient candid from last year.', tone: 'violet', featured: false },
  { label: 'Team Moment', title: 'Student Highlights', note: 'Drop a participant or winner photo into this frame.', tone: 'amber', featured: false },
  { label: 'Closing Scene', title: 'Legacy Capture', note: 'Use this for one last memorable Cognotsav moment.', tone: 'pink', featured: false },
] as const;

const LAST_YEAR_PHOTO_CARDS = LAST_YEAR_PHOTO_SLOTS.map((slot, index) => {
  const photo = DEPARTMENT_GALLERY_PHOTOS[index] ?? DEPARTMENT_GALLERY_PHOTOS[0];

  return {
    ...slot,
    image: photo.image,
    title: photo.title,
    note: photo.text,
  };
});

function LastYearPhotosStripBase() {
  return (
    <section className="portal-memory-showcase portal-glow-card portal-glass rounded-[1.8rem] p-4 md:rounded-[2rem] md:p-6" data-reveal="fade-up">
      <div className="portal-memory-showcase__header">
        <div>
          <p className="portal-memory-showcase__kicker">Last Year / Archive</p>
          <h3 className="portal-memory-showcase__title">Last Year at Cognotsav</h3>
        </div>
        <p className="portal-memory-showcase__copy">
          Highlights from last year&apos;s crowd moments, CEAS energy, and on-ground Cognotsav memories.
        </p>
      </div>

      <div className="portal-memory-showcase__grid">
        {LAST_YEAR_PHOTO_CARDS.map(({ label, title, note, tone, featured, image }, index) => (
          <article
            key={title}
            className={`portal-memory-showcase__card portal-memory-showcase__card--${tone} ${featured ? 'is-featured' : ''}`}
          >
            <div className="portal-memory-showcase__card-head">
              <span className="portal-memory-showcase__card-tag">{label}</span>
              <span className="portal-memory-showcase__card-index">{String(index + 1).padStart(2, '0')}</span>
            </div>

            <div className="portal-memory-showcase__media">
              <img
                src={image}
                alt={title}
                loading="lazy"
                decoding="async"
                className="portal-memory-showcase__image"
              />
            </div>

            <div className="portal-memory-showcase__card-copy">
              <h4>{title}</h4>
              <p>{note}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

const LastYearPhotosStrip = memo(LastYearPhotosStripBase);

function PremiumBrochureStripBase() {
  const posterSlides = [
    {
      src: '/images/cognotsav-poster.png',
      alt: 'Cognotsav 2026 official event poster',
      label: 'Official Event Poster',
    },
    {
      src: '/images/cognotsav-rules-poster.png',
      alt: 'Cognotsav 2026 rules and regulations poster',
      label: 'Rules and Regulations',
    },
  ];
  const [activePosterIndex, setActivePosterIndex] = useState(0);

  useEffect(() => {
    posterSlides.forEach((poster) => {
      const image = new Image();
      image.src = poster.src;
    });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActivePosterIndex((current) => (current + 1) % posterSlides.length);
    }, 4500);

    return () => window.clearInterval(timer);
  }, [posterSlides.length]);

  const activePoster = posterSlides[activePosterIndex];

  return (
    <section className="portal-brochure-strip portal-glow-card portal-glass rounded-[1.8rem] p-4 md:rounded-[2rem] md:p-6" data-reveal="fade-up">
      <div className="portal-brochure-poster-stack">
        <div className="portal-brochure-poster-block">
          <div className="portal-brochure-poster-block__topbar">
            <p className="portal-brochure-poster-block__label">{activePoster.label}</p>
            <div className="portal-brochure-poster-block__controls">
              <button
                type="button"
                onClick={() => setActivePosterIndex((current) => (current - 1 + posterSlides.length) % posterSlides.length)}
                className="portal-brochure-poster-block__nav"
                aria-label="Show previous poster"
              >
                <ArrowLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => setActivePosterIndex((current) => (current + 1) % posterSlides.length)}
                className="portal-brochure-poster-block__nav"
                aria-label="Show next poster"
              >
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
          <div className="portal-brochure-poster-frame">
            <div className="portal-brochure-poster-frame__glow" aria-hidden="true" />
            <div className="portal-brochure-poster-frame__inner">
              <img
                src={activePoster.src}
                alt={activePoster.alt}
                loading="eager"
                decoding="sync"
                className="portal-brochure-poster-frame__image"
              />
            </div>
          </div>
          <div className="portal-brochure-poster-block__dots" aria-label="Poster slides">
            {posterSlides.map((poster, index) => (
              <button
                key={poster.src}
                type="button"
                onClick={() => setActivePosterIndex(index)}
                className={`portal-brochure-poster-block__dot ${index === activePosterIndex ? 'is-active' : ''}`}
                aria-label={`Show ${poster.label}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const PremiumBrochureStrip = memo(PremiumBrochureStripBase);

function DepartmentPageBase() {
  return (
    <main className={`${shellClassName} space-y-5 pb-10 pt-4 md:space-y-8 md:pb-14`}>
      <section className="portal-department-page portal-glow-card portal-glass rounded-[1.7rem] p-4 md:rounded-[2rem] md:p-8">
        <div className="portal-department-page__hero">
          <div className="portal-department-page__copy">
            <a href="#overview" className="magnetic-button inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
              <ArrowLeft size={16} />
              Back to portal
            </a>
            <p className="portal-department-page__kicker">Department / CEAS</p>
            <h2 className="portal-department-page__title">Computer Engineering Association of Students</h2>
            <div className="portal-department-page__actions">
              <a href="#registration-panel" className="portal-premium-button portal-premium-button--primary">
                Go To Registration
                <ArrowRight size={15} />
              </a>
              <a href="#timeline" className="portal-premium-button portal-premium-button--secondary">
                View Timeline
              </a>
            </div>
          </div>

          <div className="portal-department-page__hero-card">
            <div className="portal-department-page__hero-logo-frame">
              <img src="/images/ceasposter.jpeg" alt="CEAS logo" loading="eager" decoding="async" className="portal-department-page__hero-logo" />
            </div>
          </div>
        </div>
      </section>

      <section className="portal-department-page__grid">
        <article className="portal-department-page__section portal-glow-card portal-glass rounded-[1.7rem] p-4 md:rounded-[2rem] md:p-6">
          <p className="portal-department-page__section-kicker">Department</p>
          <h3 className="portal-department-page__section-title">Computer Engineering Department</h3>
          <div className="portal-department-page__points">
            <div className="portal-department-page__point">Academic excellence and practical learning</div>
            <div className="portal-department-page__point">Labs, projects, and technical exposure</div>
            <div className="portal-department-page__point">Industry readiness and student development</div>
          </div>
        </article>

        <article className="portal-department-page__section portal-glow-card portal-glass rounded-[1.7rem] p-4 md:rounded-[2rem] md:p-6">
          <p className="portal-department-page__section-kicker">CEAS</p>
          <h3 className="portal-department-page__section-title">Student Leadership and Culture</h3>
          <div className="portal-department-page__points">
            <div className="portal-department-page__point">Student-driven technical initiatives</div>
            <div className="portal-department-page__point">Flagship event planning and execution</div>
            <div className="portal-department-page__point">Collaboration, leadership, and participation</div>
          </div>
        </article>
      </section>

      <LastYearPhotosStrip />
    </main>
  );
}

const DepartmentPage = memo(DepartmentPageBase);

function PortalSectionFallbackBase({ label = 'Loading section...' }: { label?: string }) {
  return (
    <div className="portal-glow-card portal-glass rounded-[1.7rem] p-5">
      <PortalLoader label={label} compact />
    </div>
  );
}

const PortalSectionFallback = memo(PortalSectionFallbackBase);

function DeferredSectionBase({
  children,
  fallback,
  rootMargin = '320px 0px',
  className = '',
}: {
  children: React.ReactNode;
  fallback: React.ReactNode;
  rootMargin?: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [shouldRender, setShouldRender] = useState(() => typeof window !== 'undefined' && !('IntersectionObserver' in window));

  useEffect(() => {
    if (shouldRender || typeof window === 'undefined') {
      return undefined;
    }

    const node = containerRef.current;
    if (!node || !('IntersectionObserver' in window)) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0.01 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin, shouldRender]);

  return (
    <div ref={containerRef} className={className}>
      {shouldRender ? children : fallback}
    </div>
  );
}

const DeferredSection = memo(DeferredSectionBase);

function PortalLoaderBase({ label = 'Loading...', compact = false }: { label?: string; compact?: boolean }) {
  return (
    <div className={`portal-loader-card ${compact ? 'portal-loader-card--compact' : ''}`}>
      <div className="portal-loader-brand">
        <div className="portal-loader-brand__frame">
          <img src="/images/ceasposter.jpeg" alt="CEAS logo" className="portal-loader-brand__image" />
        </div>
        <div className="portal-loader-ring" />
      </div>
      <p className="portal-loader-label">{label}</p>
    </div>
  );
}

const PortalLoader = memo(PortalLoaderBase);

async function readApiBody<T>(response: Response): Promise<ApiReadResult<T>> {
  const rawText = await response.text();
  if (!rawText.trim()) {
    return { data: null, rawText: '' };
  }

  try {
    return { data: JSON.parse(rawText) as T, rawText };
  } catch {
    return { data: null, rawText };
  }
}

function getApiErrorMessage(
  response: Response,
  data: unknown,
  rawText: string,
  fallback: string,
) {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const error = (data as { error?: unknown }).error;
    if (typeof error === 'string' && error.trim()) {
      return error;
    }
  }

  const trimmed = rawText.trim();
  if (trimmed) {
    const looksLikeHtml = /^<!doctype html>|^<html/i.test(trimmed);
    if (looksLikeHtml) {
      return `${fallback} The server returned an invalid response. Please refresh and make sure the API is running.`;
    }

    return trimmed.length > 180 ? `${trimmed.slice(0, 177)}...` : trimmed;
  }

  if (response.status === 401) {
    return 'Invalid admin access key.';
  }

  return `${fallback} (HTTP ${response.status})`;
}

function describeNotificationResult(notification: AdminNotificationSummary | null | undefined) {
  if (!notification) {
    return 'Status updated.';
  }

  if (notification.delivery_status === 'sent') {
    return 'Status updated and confirmation email sent.';
  }

  if (notification.delivery_status === 'failed') {
    return `Status updated, but the email failed: ${notification.error_message || 'delivery error.'}`;
  }

  if (notification.delivery_status === 'skipped') {
    return `Status updated, but the email was skipped: ${notification.error_message || 'email is not configured.'}`;
  }

  return 'Status updated.';
}

function getReceiptStatusLabel(receipt: RegistrationReceipt) {
  if (receipt.status === 'waitlisted') {
    return `Waitlisted${receipt.waitlistPosition ? ` (#${receipt.waitlistPosition})` : ''}`;
  }

  if (receipt.status === 'verified') {
    return 'Verified';
  }

  return 'Pending review';
}

function escapePassHtml(value: string | number | null | undefined) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getReceiptInstructions(receipt: RegistrationReceipt) {
  if (receipt.status === 'verified') {
    return [
      'Download or print this pass before event day.',
      'Show the QR code and registration code at the venue entry desk.',
      'Arrive at least 20 minutes early for verification and check-in.',
    ];
  }

  if (receipt.status === 'waitlisted') {
    return [
      'Keep this code saved while you are on the waitlist.',
      'Track your status regularly from the tracker section.',
      'You will receive an updated email if a confirmed slot opens.',
    ];
  }

  return [
    'Download this pending pass and save the registration code.',
    'Use the tracker to follow payment verification status.',
    'You will continue receiving organizer status updates on your registered email.',
  ];
}

function buildPassWindowHtml(receipt: RegistrationReceipt) {
  const statusLabel = getReceiptStatusLabel(receipt);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(receipt.qrValue)}`;
  const logoUrl = `${window.location.origin}/images/ceasposter.jpeg`;
  const instructions = getReceiptInstructions(receipt);

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>CEAS COGNOTSAV Registration Pass</title>
        <style>
          * { box-sizing: border-box; }
          @page { size: A4; margin: 12mm; }
          body { margin: 0; font-family: Inter, Arial, sans-serif; background: radial-gradient(circle at top left, rgba(251,191,36,0.22), transparent 22%), radial-gradient(circle at bottom right, rgba(34,211,238,0.18), transparent 24%), linear-gradient(180deg, #07111d 0%, #0f172a 100%); color: #e2e8f0; }
          .toolbar { position: sticky; top: 0; z-index: 2; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; padding: 16px 18px; border-bottom: 1px solid rgba(255,255,255,0.08); background: rgba(7, 17, 29, 0.92); backdrop-filter: blur(12px); }
          .toolbar-copy { max-width: 620px; }
          .toolbar-copy h1 { margin: 0; font-size: 18px; color: #fff; }
          .toolbar-copy p { margin: 6px 0 0; font-size: 13px; line-height: 1.6; color: #cbd5e1; }
          .toolbar-actions { display: flex; flex-wrap: wrap; gap: 10px; }
          .toolbar-actions button { border: 1px solid rgba(255,255,255,0.12); border-radius: 999px; padding: 10px 16px; font-size: 13px; font-weight: 700; cursor: pointer; }
          .toolbar-actions .primary { background: linear-gradient(90deg, #67e8f9, #fbbf24); color: #041018; }
          .toolbar-actions .secondary { background: rgba(255,255,255,0.05); color: #e2e8f0; }
          .wrap { padding: 18px 14px 24px; }
          .sheet { position: relative; overflow: hidden; width: min(100%, 794px); min-height: calc(297mm - 24mm); margin: 0 auto; border-radius: 28px; border: 2px solid rgba(125,211,252,0.22); background: linear-gradient(145deg, rgba(7,12,24,0.98), rgba(15,23,42,0.96)); box-shadow: 0 30px 80px rgba(2,8,23,0.42); padding: 22px; page-break-inside: avoid; }
          .sheet::before { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at top right, rgba(251,191,36,0.14), transparent 24%), radial-gradient(circle at left center, rgba(217,70,239,0.12), transparent 22%), linear-gradient(135deg, rgba(34,211,238,0.08), transparent 42%); pointer-events: none; }
          .sheet::after { content: ''; position: absolute; inset: 0; background: url('${escapePassHtml(logoUrl)}') center/280px no-repeat; opacity: 0.06; filter: saturate(0.9); pointer-events: none; }
          .sheet > * { position: relative; z-index: 1; }
          .brand { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border: 1px solid rgba(148,163,184,0.18); border-radius: 22px; background: linear-gradient(180deg, rgba(27,35,52,0.96), rgba(13,19,31,0.98)); box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(255,255,255,0.04), 0 18px 34px rgba(2,8,23,0.24); }
          .brand-logo { width: 62px; height: 62px; border-radius: 20px; padding: 5px; background: linear-gradient(180deg, rgba(255,255,255,0.24), rgba(203,213,225,0.1)); border: 1px solid rgba(255,255,255,0.16); box-shadow: inset 0 1px 0 rgba(255,255,255,0.48), 0 12px 24px rgba(2,8,23,0.2); }
          .brand-logo img { width: 100%; height: 100%; object-fit: cover; border-radius: 18px; }
          .brand-kicker { margin: 0 0 6px; font-size: 10px; letter-spacing: 0.38em; text-transform: uppercase; color: #9bd5ea; font-weight: 700; }
          .brand-title { margin: 0; font-family: Orbitron, Inter, Arial, sans-serif; font-size: 26px; line-height: 1.05; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: #eef6ff; text-shadow: 0 1px 0 rgba(255,255,255,0.24), 0 0 18px rgba(125,211,252,0.12); }
          .hero { display: grid; grid-template-columns: minmax(0, 1.22fr) minmax(180px, 0.78fr); align-items: start; gap: 14px; margin-top: 18px; }
          .event-title { margin: 0; font-size: 25px; color: #fff; }
          .event-copy { margin: 8px 0 0; font-size: 13px; line-height: 1.6; color: #cbd5e1; }
          .status { display: inline-flex; margin-top: 12px; border-radius: 999px; border: 1px solid rgba(251,191,36,0.22); background: linear-gradient(90deg, rgba(34,211,238,0.14), rgba(251,191,36,0.16)); padding: 7px 12px; font-size: 11px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; color: #fef3c7; box-shadow: 0 10px 26px rgba(34,211,238,0.08); }
          .hero-highlights { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 14px; }
          .hero-chip { border-radius: 999px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); padding: 8px 12px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #e2e8f0; }
          .qr-card { border-radius: 22px; border: 1px solid rgba(255,255,255,0.1); background: linear-gradient(180deg, rgba(15,23,42,0.78), rgba(255,255,255,0.04)); padding: 14px; text-align: center; box-shadow: 0 18px 36px rgba(2,8,23,0.22); }
          .qr-frame { display: inline-flex; border-radius: 18px; background: #fff; padding: 10px; }
          .qr-frame img { width: 160px; height: 160px; }
          .qr-card p { margin: 12px 0 0; color: #cbd5e1; font-size: 12px; line-height: 1.5; }
          .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 14px; }
          .cell { border-radius: 18px; border: 1px solid rgba(255,255,255,0.08); background: linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.04)); padding: 13px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.04); }
          .label { font-size: 10px; letter-spacing: 0.24em; text-transform: uppercase; color: #94a3b8; font-weight: 700; }
          .value { margin-top: 6px; font-size: 16px; font-weight: 700; color: #fff; word-break: break-word; }
          .value--small { font-size: 13px; line-height: 1.5; }
          .instructions { margin-top: 14px; border-radius: 18px; border: 1px solid rgba(52,211,153,0.16); background: linear-gradient(135deg, rgba(16,185,129,0.14), rgba(34,211,238,0.1)); padding: 14px; }
          .instructions h2 { margin: 0; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: #a7f3d0; }
          .instructions ol { margin: 10px 0 0; padding-left: 16px; color: #ecfdf5; }
          .instructions li { margin-bottom: 6px; line-height: 1.5; }
          .footer { margin-top: 14px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); background: linear-gradient(135deg, rgba(59,130,246,0.12), rgba(168,85,247,0.1)); padding: 14px; font-size: 12px; line-height: 1.6; color: #dbeafe; }
          @media (max-width: 820px) { .hero, .grid { grid-template-columns: 1fr; } .sheet { padding: 18px; min-height: auto; } .brand-title { font-size: 20px; } .event-title { font-size: 22px; } .qr-frame img { width: 148px; height: 148px; } }
          @media print {
            body { background: #fff; }
            .toolbar { display: none; }
            .wrap { padding: 0; }
            .sheet { width: 100%; min-height: calc(297mm - 24mm); box-shadow: none; border-color: #cbd5e1; background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); color: #0f172a; padding: 14mm 12mm 12mm; }
            .sheet::before { background: radial-gradient(circle at top right, rgba(251,191,36,0.08), transparent 22%), radial-gradient(circle at left center, rgba(59,130,246,0.08), transparent 22%); }
            .sheet::after { opacity: 0.05; filter: grayscale(0.1); }
            .event-title, .value { color: #0f172a; }
            .event-copy, .qr-card p, .footer { color: #334155; }
            .qr-card, .cell, .instructions, .footer { border-color: #dbeafe; background: rgba(248,250,252,0.92); }
            .status { color: #92400e; border-color: #fcd34d; background: linear-gradient(90deg, rgba(254,240,138,0.8), rgba(186,230,253,0.9)); }
            .hero-chip { background: #eef2ff; color: #1e293b; border-color: #cbd5e1; }
          }
        </style>
      </head>
      <body>
        <div class="toolbar">
          <div class="toolbar-copy">
            <h1>Registration Pass Window</h1>
            <p>Review your pass, then use <strong>Print / Save PDF</strong> to download it. Keep the QR and registration code ready for tracker and event-day entry.</p>
          </div>
          <div class="toolbar-actions">
            <button type="button" class="primary" onclick="window.print()">Print / Save PDF</button>
            <button type="button" class="secondary" onclick="window.close()">Close</button>
          </div>
        </div>
        <div class="wrap">
          <div class="sheet">
            <div class="brand">
              <div class="brand-logo">
                <img src="${escapePassHtml(logoUrl)}" alt="CEAS logo" />
              </div>
              <div>
                <p class="brand-kicker">Computer Engineering Association</p>
                <div class="brand-title">CEAS COGNOTSAV 2026</div>
              </div>
            </div>

            <div class="hero">
              <div>
                <h2 class="event-title">${escapePassHtml(receipt.eventName)}</h2>
                <p class="event-copy">Official participant pass for entry, verification, and tracker reference. Keep this one-page pass with you until the event is completed.</p>
                <div class="status">${escapePassHtml(statusLabel)}</div>
                <div class="hero-highlights">
                  <div class="hero-chip">${escapePassHtml(receipt.dateLabel)}</div>
                  <div class="hero-chip">${escapePassHtml(receipt.timeLabel)}</div>
                  <div class="hero-chip">${escapePassHtml(receipt.venue)}</div>
                </div>
              </div>
              <div class="qr-card">
                <div class="qr-frame">
                  <img src="${escapePassHtml(qrUrl)}" alt="Registration QR" />
                </div>
                <p>Scan or show this QR at the verification desk.</p>
              </div>
            </div>

            <div class="grid">
              <div class="cell"><div class="label">Registration Code</div><div class="value">${escapePassHtml(receipt.registrationCode)}</div></div>
              <div class="cell"><div class="label">Team / Participant</div><div class="value">${escapePassHtml(receipt.teamName)}</div></div>
              <div class="cell"><div class="label">Lead Contact</div><div class="value value--small">${escapePassHtml(receipt.contactName)}<br />${escapePassHtml(receipt.contactEmail)}</div></div>
              <div class="cell"><div class="label">Schedule</div><div class="value value--small">${escapePassHtml(receipt.dateLabel)}<br />${escapePassHtml(receipt.timeLabel)}</div></div>
              <div class="cell"><div class="label">Venue</div><div class="value">${escapePassHtml(receipt.venue)}</div></div>
              <div class="cell"><div class="label">Payment Reference</div><div class="value value--small">${escapePassHtml(receipt.paymentReference || 'Pending manual entry')}</div></div>
              <div class="cell"><div class="label">Amount Paid</div><div class="value">INR ${escapePassHtml(receipt.totalAmount)}</div></div>
              <div class="cell"><div class="label">Submitted At</div><div class="value value--small">${escapePassHtml(receipt.submittedAt)}</div></div>
            </div>

            <div class="instructions">
              <h2>Important Instructions</h2>
              <ol>${instructions.map((instruction) => `<li>${escapePassHtml(instruction)}</li>`).join('')}</ol>
            </div>

            <div class="footer">
              Use <strong>${escapePassHtml(receipt.registrationCode)}</strong> in the tracker to check approval status anytime. Organizer status updates will continue on your registered email address.
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

function isAnnouncementActive(announcement: PortalAnnouncement) {
  const now = Date.now();
  const startsAt = announcement.starts_at ? new Date(announcement.starts_at).getTime() : null;
  const expiresAt = announcement.expires_at ? new Date(announcement.expires_at).getTime() : null;

  if (startsAt && startsAt > now) {
    return false;
  }

  if (expiresAt && expiresAt < now) {
    return false;
  }

  return true;
}

function buildValidationErrors(
  form: FormState,
  selectedEvent: EventRecord | null,
  paymentScreenshotReady: boolean,
): FieldErrors {
  const errors: FieldErrors = {};
  const requiresTeamName = Boolean(selectedEvent && (selectedEvent.min_members > 1 || selectedEvent.is_team_event));
  const isSoloEvent = Boolean(selectedEvent && selectedEvent.min_members === 1 && !selectedEvent.is_team_event);

  if (requiresTeamName && !form.teamName.trim()) errors.teamName = 'Enter your team name.';
  if (!form.collegeName.trim()) errors.collegeName = 'College name is required.';
  if (!form.contactName.trim()) errors.contactName = 'Primary contact name is required.';

  if (!form.contactEmail.trim()) {
    errors.contactEmail = 'Primary email is required.';
  } else if (!emailPattern.test(form.contactEmail.trim())) {
    errors.contactEmail = 'Enter a valid email address.';
  }

  if (!form.contactPhone.trim()) {
    errors.contactPhone = 'Primary phone is required.';
  } else if (!phonePattern.test(form.contactPhone.trim())) {
    errors.contactPhone = 'Enter a valid 10-digit phone number.';
  }

  if (!form.paymentReference.trim()) {
    errors.paymentReference = 'Transaction ID is required.';
  } else if (form.paymentReference.trim().length < 6) {
    errors.paymentReference = 'Transaction ID looks too short.';
  }

  if (!paymentScreenshotReady) {
    errors.paymentScreenshot = 'Upload a payment screenshot for faster verification.';
  }

  form.participants.forEach((participant, index) => {
    const prefix = `participants.${index}`;

    if (!participant.fullName.trim()) {
      errors[`${prefix}.fullName`] = `Participant ${index + 1} name is required.`;
    }

    if (isSoloEvent && index === 0) {
      if (!participant.email.trim()) {
        errors[`${prefix}.email`] = 'Email is required.';
      } else if (!emailPattern.test(participant.email.trim())) {
        errors[`${prefix}.email`] = 'Enter a valid email address.';
      }

      if (!participant.phone.trim()) {
        errors[`${prefix}.phone`] = 'Phone number is required.';
      } else if (!phonePattern.test(participant.phone.trim())) {
        errors[`${prefix}.phone`] = 'Enter a valid 10-digit phone number.';
      }
    }
  });

  return errors;
}

export const App: React.FC = () => {
  type AdminAccessMode = 'global' | 'event';

  const [events, setEvents] = useState<EventRecord[]>([]);
  const [portalAlerts, setPortalAlerts] = useState<PortalAlert[]>([]);
  const [announcements, setAnnouncements] = useState<PortalAnnouncement[]>([]);
  const [selectedEventSlug, setSelectedEventSlug] = useState('');
  const [teamSize, setTeamSize] = useState(1);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupResults, setLookupResults] = useState<LookupResult[]>([]);
  const [lookupTouched, setLookupTouched] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successReceipt, setSuccessReceipt] = useState<RegistrationReceipt | null>(null);
  const [draftRecovered, setDraftRecovered] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [adminAccessMode, setAdminAccessMode] = useState<AdminAccessMode>('global');
  const [adminMainKeyDraft, setAdminMainKeyDraft] = useState('');
  const [adminEventKeyDraft, setAdminEventKeyDraft] = useState('');
  const [adminEventKeySlug, setAdminEventKeySlug] = useState('');
  const [adminRows, setAdminRows] = useState<AdminRegistration[]>([]);
  const [backupSnapshots, setBackupSnapshots] = useState<BackupSnapshot[]>([]);
  const [adminAnnouncements, setAdminAnnouncements] = useState<PortalAnnouncement[]>([]);
  const [adminScope, setAdminScope] = useState<AdminAccessScope | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [hashRoute, setHashRoute] = useState(() =>
    typeof window === 'undefined' ? '' : window.location.hash.toLowerCase(),
  );
  const [paymentScreenshotDataUrl, setPaymentScreenshotDataUrl] = useState<string | null>(null);
  const [paymentScreenshotName, setPaymentScreenshotName] = useState('');
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState('');
  const [toastClosing, setToastClosing] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const [navigationLoading, setNavigationLoading] = useState(false);
  const navScrollFrameRef = useRef<number | null>(null);
  const secretAdminLastTapRef = useRef(0);
  const secretAdminHoldTimerRef = useRef<number | null>(null);
  const secretAdminHoldTriggeredRef = useRef(false);
  const [form, setForm] = useState<FormState>({
    teamName: '',
    collegeName: '',
    departmentName: 'Not Provided',
    yearOfStudy: 'Not Provided',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    paymentReference: '',
    notes: '',
    participants: makeParticipants(1),
  });

  useEffect(() => {
    const handleWindowError = (event: ErrorEvent) => {
      void attemptChunkReloadRecovery(event.error ?? event.message).catch(() => undefined);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      void attemptChunkReloadRecovery(event.reason).catch(() => undefined);
    };

    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (navScrollFrameRef.current !== null) {
        return;
      }

      navScrollFrameRef.current = window.requestAnimationFrame(() => {
        navScrollFrameRef.current = null;
        const nextScrolled = window.scrollY > 18;
        setNavScrolled((current) => (current === nextScrolled ? current : nextScrolled));
      });
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (navScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(navScrollFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const response = await fetch('/api/events');
        const { data, rawText } = await readApiBody<EventRecord[]>(response);
        if (!response.ok) {
          throw new Error(getApiErrorMessage(response, data, rawText, 'Failed to load events.'));
        }

        if (!Array.isArray(data)) {
          throw new Error('Failed to load events. The server returned an invalid response.');
        }

        setEvents(data);
      } catch (error) {
        console.error('Failed to load events', error);
      } finally {
        setLoadingEvents(false);
      }
    };

    loadEvents();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    document.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-visible)').forEach((element) => {
      element.classList.add('is-visible');
      element.style.transitionDelay = '0ms';
    });
  }, [hashRoute]);

  useEffect(() => {
    let disposed = false;

    const loadAlerts = async () => {
      try {
        const response = await fetch('/api/alerts');
        const { data, rawText } = await readApiBody<PortalAlert[]>(response);
        if (!response.ok) {
          throw new Error(getApiErrorMessage(response, data, rawText, 'Failed to load smart alerts.'));
        }

        if (!disposed) {
          setPortalAlerts(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Failed to load smart alerts', error);
        if (!disposed) {
          setPortalAlerts([]);
        }
      } finally {
        if (!disposed) {
          setLoadingAlerts(false);
        }
      }
    };

    loadAlerts();
    const timer = window.setInterval(loadAlerts, 60 * 1000);

    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let disposed = false;

    const loadAnnouncements = async () => {
      try {
        const response = await fetch('/api/announcements');
        const { data, rawText } = await readApiBody<PortalAnnouncement[]>(response);
        if (!response.ok) {
          throw new Error(getApiErrorMessage(response, data, rawText, 'Failed to load announcements.'));
        }

        if (!disposed) {
          setAnnouncements(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Failed to load announcements', error);
        if (!disposed) {
          setAnnouncements([]);
        }
      } finally {
        if (!disposed) {
          setLoadingAnnouncements(false);
        }
      }
    };

    loadAnnouncements();
    const timer = window.setInterval(loadAnnouncements, 60 * 1000);

    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (events.length === 0 || typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return;
      if (!raw.trim()) {
        window.localStorage.removeItem(DRAFT_STORAGE_KEY);
        return;
      }

      const parsed = JSON.parse(raw) as {
        selectedEventSlug?: string;
        teamSize?: number;
        form?: Partial<FormState>;
      };

      if (parsed.selectedEventSlug && events.some((event) => event.slug === parsed.selectedEventSlug)) {
        setSelectedEventSlug(parsed.selectedEventSlug);
      }

      if (parsed.form) {
        setForm((current) => ({
          ...current,
          ...parsed.form,
          participants: Array.isArray(parsed.form.participants)
            ? parsed.form.participants
            : current.participants,
        }));
        setDraftRecovered(true);
      }

      if (parsed.teamSize) {
        setTeamSize(parsed.teamSize);
      }
    } catch (error) {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      console.error('Failed to restore draft', error);
    }
  }, [events]);

  const selectedEvent = useMemo(
    () => events.find((event) => event.slug === selectedEventSlug) ?? null,
    [events, selectedEventSlug],
  );

  const validationErrors = useMemo(
    () => buildValidationErrors(form, selectedEvent, Boolean(paymentScreenshotDataUrl)),
    [form, selectedEvent, paymentScreenshotDataUrl],
  );

  useEffect(() => {
    if (!selectedEvent) return;

    setTeamSize((current) => {
      const nextSize = Math.max(
        selectedEvent.min_members,
        Math.min(selectedEvent.max_members, current || selectedEvent.min_members),
      );

      setForm((existing) => ({
        ...existing,
        participants: Array.from({ length: nextSize }, (_, index) => existing.participants[index] ?? {
          fullName: '',
          email: '',
          phone: '',
        }),
      }));

      return nextSize;
    });
  }, [selectedEvent]);

  useEffect(() => {
    if (!selectedEvent || successReceipt || typeof window === 'undefined') return;

    window.localStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({
        selectedEventSlug,
        teamSize,
        form,
      }),
    );
  }, [form, selectedEvent, selectedEventSlug, successReceipt, teamSize]);

  useEffect(() => {
    if (!toastMessage) return;

    const closeTimer = window.setTimeout(() => setToastClosing(true), 3200);
    const cleanupTimer = window.setTimeout(() => {
      setToastMessage('');
      setToastClosing(false);
    }, 3500);

    return () => {
      window.clearTimeout(closeTimer);
      window.clearTimeout(cleanupTimer);
    };
  }, [toastMessage]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const syncHashRoute = () => setHashRoute(window.location.hash.toLowerCase());
    window.addEventListener('hashchange', syncHashRoute);

    return () => window.removeEventListener('hashchange', syncHashRoute);
  }, []);

  useEffect(() => {
    if (!navigationLoading || typeof window === 'undefined') return undefined;

    const timer = window.setTimeout(() => setNavigationLoading(false), 260);
    return () => window.clearTimeout(timer);
  }, [navigationLoading, hashRoute]);

  useEffect(() => scheduleBrowserIdleTask(() => {
    void loadEventRegistrationPanel();
    void loadFAQSection();
    void loadTrackerAdminPanel();
    void loadPortalFooter();
    void loadTimelinePage();
  }), []);

  const eventPageSlug = hashRoute.startsWith('#events/') ? hashRoute.slice('#events/'.length) : '';
  const isAdminPage = hashRoute.startsWith('#admin-registrations');
  const isTimelinePage = hashRoute === '#timeline';
  const isDepartmentPage = hashRoute === '#department';
  const isEventPage = Boolean(eventPageSlug);
  const isFrontLandingPage = !isAdminPage && !isTimelinePage && !isDepartmentPage && !isEventPage;
  const showFrontBottomDock = !isAdminPage && !isEventPage && !isDepartmentPage;
  const activeBottomDock =
    !hashRoute || hashRoute === '#overview'
      ? 'home'
      : hashRoute.startsWith('#registration-panel')
        ? 'events'
      : hashRoute === '#timeline'
          ? 'timeline'
        : hashRoute.startsWith('#tracker')
          ? 'tracker'
          : 'home';

  const openAdminPanel = () => {
    if (typeof window === 'undefined') return;

    const nextHash = '#admin-registrations';
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
    setHashRoute(nextHash);
  };

  const handleSecretAdminTap = () => {
    if (typeof window === 'undefined') return;

    const now = Date.now();
    if (now - secretAdminLastTapRef.current <= SECRET_ADMIN_DOUBLE_TAP_WINDOW_MS) {
      secretAdminLastTapRef.current = 0;
      openAdminPanel();
      return;
    }

    secretAdminLastTapRef.current = now;
  };

  const clearSecretAdminHold = () => {
    if (typeof window === 'undefined') return;

    if (secretAdminHoldTimerRef.current !== null) {
      window.clearTimeout(secretAdminHoldTimerRef.current);
      secretAdminHoldTimerRef.current = null;
    }
  };

  const startSecretAdminHold = () => {
    if (typeof window === 'undefined') return;

    clearSecretAdminHold();
    secretAdminHoldTriggeredRef.current = false;
    secretAdminHoldTimerRef.current = window.setTimeout(() => {
      secretAdminHoldTimerRef.current = null;
      secretAdminHoldTriggeredRef.current = true;
      openAdminPanel();
    }, SECRET_ADMIN_HOLD_MS);
  };

  const handleSecretAdminClick = (event: React.MouseEvent<HTMLElement>) => {
    if (!secretAdminHoldTriggeredRef.current) return;

    event.preventDefault();
    secretAdminHoldTriggeredRef.current = false;
  };

  const handleSecretAdminDoubleClick = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    handleSecretAdminTap();
  };

  const handleSecretAdminTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
    if (secretAdminHoldTriggeredRef.current) {
      event.preventDefault();
      secretAdminHoldTriggeredRef.current = false;
      return;
    }

    handleSecretAdminTap();
    if (secretAdminLastTapRef.current === 0) {
      event.preventDefault();
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleKeydown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        openAdminPanel();
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);

  useEffect(() => {
    return () => {
      clearSecretAdminHold();
    };
  }, []);

  useEffect(() => {
    if (!isEventPage || !eventPageSlug || !events.some((event) => event.slug === eventPageSlug)) {
      return;
    }

    if (selectedEventSlug !== eventPageSlug) {
      setSelectedEventSlug(eventPageSlug);
    }
  }, [eventPageSlug, events, isEventPage, selectedEventSlug]);

  useEffect(() => {
    if (typeof window === 'undefined' || !isEventPage) return;

    const animationFrame = window.requestAnimationFrame(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      scrollToViewportTop();
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [isEventPage, eventPageSlug]);

  useEffect(() => {
    if (typeof window === 'undefined' || !isAdminPage) {
      return;
    }

    scrollToViewportTop();
  }, [isAdminPage, hashRoute]);

  useEffect(() => {
    if (typeof window === 'undefined' || !isDepartmentPage) {
      return;
    }

    scrollToViewportTop();
  }, [isDepartmentPage, hashRoute]);

  useEffect(() => {
    if (typeof window === 'undefined' || !isTimelinePage) {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      scrollToViewportTop();
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [isTimelinePage, hashRoute]);

  const totalRegistrations = events.reduce((sum, event) => sum + event.registrations_count, 0);
  const visibleAnnouncements = announcements
    .filter((announcement) => isAnnouncementActive(announcement))
    .slice(0, 8);

  const markFieldTouched = (field: string) => {
    setTouchedFields((current) => (current[field] ? current : { ...current, [field]: true }));
  };

  const markAllErrorsTouched = () => {
    setTouchedFields((current) => ({
      ...current,
      ...Object.fromEntries(Object.keys(validationErrors).map((key) => [key, true])),
    }));
  };

  const handleSelectEvent = (slug: string) => {
    setSelectedEventSlug(slug);
    setSuccessMessage('');
    setErrorMessage('');
    setSuccessReceipt(null);
    setPaymentScreenshotDataUrl(null);
    setPaymentScreenshotName('');
    if (typeof window !== 'undefined') {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      const nextHash = `#events/${slug}`;
      if (window.location.hash.toLowerCase() !== nextHash.toLowerCase()) {
        window.history.pushState(null, '', nextHash);
      }
      scrollToViewportTop();
      setHashRoute(nextHash.toLowerCase());
    }
  };

  const handleBackToEvents = () => {
    setSuccessMessage('');
    setErrorMessage('');
    setSuccessReceipt(null);
    if (typeof window !== 'undefined') {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      const nextHash = '#registration-panel';
      if (window.location.hash.toLowerCase() !== nextHash) {
        window.history.pushState(null, '', nextHash);
      }
      scrollToViewportTop();
      setHashRoute(nextHash);
    }
  };

  const handleTeamSizeChange = (nextSize: number) => {
    if (!selectedEvent) return;

    const safeSize = Math.max(selectedEvent.min_members, Math.min(selectedEvent.max_members, nextSize));
    setTeamSize(safeSize);
    setForm((current) => ({
      ...current,
      participants: Array.from({ length: safeSize }, (_, index) => current.participants[index] ?? {
        fullName: '',
        email: '',
        phone: '',
      }),
    }));
  };

  const updateFormField = (field: keyof FormState, value: string) => {
    setForm((current) => {
      if (field === 'contactName') {
        return {
          ...current,
          contactName: value,
          participants: current.participants.map((participant, index) =>
            index === 0 ? { ...participant, fullName: value } : participant,
          ),
        };
      }

      if (field === 'contactEmail') {
        return {
          ...current,
          contactEmail: value,
          participants: current.participants.map((participant, index) =>
            index === 0 ? { ...participant, email: value } : participant,
          ),
        };
      }

      if (field === 'contactPhone') {
        return {
          ...current,
          contactPhone: value,
          participants: current.participants.map((participant, index) =>
            index === 0 ? { ...participant, phone: value } : participant,
          ),
        };
      }

      return { ...current, [field]: value };
    });
  };

  const handleParticipantChange = (index: number, field: keyof ParticipantDraft, value: string) => {
    setForm((current) => ({
      ...current,
      participants: current.participants.map((participant, participantIndex) =>
        participantIndex === index ? { ...participant, [field]: value } : participant,
      ),
    }));
  };

  const refreshEvents = async () => {
    const response = await fetch('/api/events');
    const { data, rawText } = await readApiBody<EventRecord[]>(response);
    if (!response.ok) {
      throw new Error(getApiErrorMessage(response, data, rawText, 'Failed to refresh events.'));
    }

    if (!Array.isArray(data)) {
      throw new Error('Failed to refresh events. The server returned an invalid response.');
    }

    setEvents(data);
  };

  const handlePaymentScreenshotChange = async (file: File | null) => {
    markFieldTouched('paymentScreenshot');

    if (!file) {
      setPaymentScreenshotDataUrl(null);
      setPaymentScreenshotName('');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPaymentScreenshotDataUrl(typeof reader.result === 'string' ? reader.result : null);
      setPaymentScreenshotName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const downloadConfirmationPass = (receipt: RegistrationReceipt) => {
    const passWindow = window.open('', 'ceas-registration-pass', 'width=980,height=860');
    if (!passWindow) return;

    passWindow.document.open();
    passWindow.document.write(buildPassWindowHtml(receipt));
    passWindow.document.close();
    passWindow.focus();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedEvent) return;

    markAllErrorsTouched();
    if (Object.keys(validationErrors).length > 0) {
      setErrorMessage('Please fix the highlighted fields before submitting.');
      return;
    }

    setSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const normalizedParticipants = form.participants.map((participant, index) => ({
        fullName: participant.fullName.trim(),
        email: index === 0
          ? form.contactEmail.trim()
          : `member${index + 1}.${selectedEvent.slug}.${Date.now()}@cognotsav.local`,
        phone: form.contactPhone.trim(),
      }));

      const response = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventSlug: selectedEvent.slug,
          teamName:
            selectedEvent.min_members === 1 && !selectedEvent.is_team_event
              ? form.contactName
              : form.teamName,
          collegeName: form.collegeName,
          departmentName: 'Not Provided',
          yearOfStudy: 'Not Provided',
          contactName: form.contactName,
          contactEmail: form.contactEmail,
          contactPhone: form.contactPhone,
          paymentMethod: 'upi',
          paymentReference: form.paymentReference,
          paymentScreenshotDataUrl,
          notes: null,
          participants: normalizedParticipants,
        }),
      });

      const { data: payload, rawText } = await readApiBody<{
        error?: string;
        eventName: string;
        registrationCode: string;
        totalAmount: number;
        status: string;
        waitlistPosition: number | null;
        qrValue: string;
        notification?: AdminNotificationSummary | null;
      }>(response);

      if (!response.ok) {
        throw new Error(getApiErrorMessage(response, payload, rawText, 'Registration failed.'));
      }

      if (!payload) {
        throw new Error('Registration failed. The server returned an empty response.');
      }

      const notificationNote =
        payload.notification?.delivery_status === 'sent'
          ? ' Pending review email sent.'
          : payload.notification?.delivery_status === 'failed'
            ? ` Pending review email failed: ${payload.notification.error_message || 'delivery error.'}`
            : payload.notification?.delivery_status === 'skipped'
              ? ` Pending review email skipped: ${payload.notification.error_message || 'email not configured.'}`
              : '';

      setSuccessMessage(
        `Registration saved for ${payload.eventName}. Reference code: ${payload.registrationCode}.${notificationNote}`,
      );
      setToastClosing(false);
      setToastMessage(`Registration submitted successfully for ${payload.eventName}.${notificationNote}`);
      const nextReceipt: RegistrationReceipt = {
        registrationCode: payload.registrationCode,
        eventName: payload.eventName,
        teamName:
          selectedEvent.min_members === 1 && !selectedEvent.is_team_event
            ? form.contactName
            : form.teamName,
        contactName: form.contactName,
        contactEmail: form.contactEmail,
        paymentReference: form.paymentReference,
        totalAmount: payload.totalAmount,
        submittedAt: new Date().toLocaleString(),
        venue: selectedEvent.venue,
        dateLabel: selectedEvent.date_label,
        timeLabel: selectedEvent.time_label,
        status: payload.status,
        waitlistPosition: payload.waitlistPosition,
        qrValue: payload.qrValue,
      };
      setSuccessReceipt(nextReceipt);
      setForm({
        teamName: '',
        collegeName: '',
        departmentName: 'Not Provided',
        yearOfStudy: 'Not Provided',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        paymentReference: '',
        notes: '',
        participants: makeParticipants(selectedEvent.min_members),
      });
      setTouchedFields({});
      setTeamSize(selectedEvent.min_members);
      setPaymentScreenshotDataUrl(null);
      setPaymentScreenshotName('');
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      }
      await refreshEvents();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLookup = async (event: React.FormEvent) => {
    event.preventDefault();
    setLookupTouched(true);
    setLookupLoading(true);

    try {
      const response = await fetch(`/api/registrations/lookup?query=${encodeURIComponent(lookupQuery)}`);
      const { data, rawText } = await readApiBody<LookupResult[]>(response);
      if (!response.ok) {
        throw new Error(getApiErrorMessage(response, data, rawText, 'Lookup failed.'));
      }

      setLookupResults(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setLookupResults([]);
    } finally {
      setLookupLoading(false);
    }
  };

  const loadAdminRows = async () => {
    const requestedKey =
      adminAccessMode === 'global' ? adminMainKeyDraft.trim() : adminEventKeyDraft.trim();

    if (!requestedKey) {
      setAdminError(
        adminAccessMode === 'global'
          ? 'Enter the main admin key to open the full dashboard.'
          : 'Enter the selected event key to open scoped verification access.',
      );
      return;
    }

    if (adminAccessMode === 'event' && !adminEventKeySlug) {
      setAdminError('Select the competition before entering the event verification key.');
      return;
    }

    setAdminLoading(true);
    setAdminError('');
    setAdminRows([]);
    setAdminAnnouncements([]);
    setBackupSnapshots([]);
    setAdminScope(null);
    try {
      const [rowsResponse, announcementsResponse, backupsResponse] = await Promise.all([
        fetch('/api/admin/registrations', {
          headers: { 'x-admin-key': requestedKey },
        }),
        fetch('/api/admin/announcements', {
          headers: { 'x-admin-key': requestedKey },
        }),
        fetch('/api/admin/backups', {
          headers: { 'x-admin-key': requestedKey },
        }),
      ]);

      const [{ data: rowsPayload, rawText: rowsText }, { data: announcementsPayload, rawText: announcementsText }, { data: backupsPayload, rawText: backupsText }] = await Promise.all([
        readApiBody<{
          rows?: AdminRegistration[];
          access?: AdminAccessScope | null;
        } | AdminRegistration[]>(rowsResponse),
        readApiBody<PortalAnnouncement[]>(announcementsResponse),
        readApiBody<BackupSnapshot[]>(backupsResponse),
      ]);

      if (!rowsResponse.ok) {
        throw new Error(getApiErrorMessage(rowsResponse, rowsPayload, rowsText, 'Failed to load registrations.'));
      }

      const rows = Array.isArray(rowsPayload) ? rowsPayload : Array.isArray(rowsPayload?.rows) ? rowsPayload.rows : null;

      if (!rows) {
        throw new Error('Failed to load registrations. The server returned an invalid response.');
      }

      const access = Array.isArray(rowsPayload) ? null : rowsPayload?.access || null;

      if (!access) {
        throw new Error('The admin access scope was missing from the server response.');
      }

      if (adminAccessMode === 'global' && access.mode !== 'global') {
        throw new Error('This is not the main admin key. Use the main key to show all content.');
      }

      if (adminAccessMode === 'event') {
        if (access.mode !== 'event') {
          throw new Error('This key has full-dashboard access. Switch to the main key option to use it.');
        }

        if (access.event_slug !== adminEventKeySlug) {
          const selectedEventName =
            events.find((event) => event.slug === adminEventKeySlug)?.name || 'the selected event';
          throw new Error(
            `This event key belongs to ${access.event_name || 'another event'}, not ${selectedEventName}.`,
          );
        }
      }

      if (!announcementsResponse.ok) {
        throw new Error(getApiErrorMessage(announcementsResponse, announcementsPayload, announcementsText, 'Failed to load announcements.'));
      }

      if (!backupsResponse.ok) {
        throw new Error(getApiErrorMessage(backupsResponse, backupsPayload, backupsText, 'Failed to load backups.'));
      }

      setAdminKey(requestedKey);
      setAdminRows(rows);
      setAdminAnnouncements(Array.isArray(announcementsPayload) ? announcementsPayload : []);
      setBackupSnapshots(Array.isArray(backupsPayload) ? backupsPayload : []);
      setAdminScope(access);
    } catch (error) {
      setAdminKey('');
      setAdminRows([]);
      setAdminAnnouncements([]);
      setBackupSnapshots([]);
      setAdminScope(null);
      setAdminError(error instanceof Error ? error.message : 'Failed to load registrations.');
    } finally {
      setAdminLoading(false);
    }
  };

  const updateAdminStatus = async (registrationId: string, status: 'verified' | 'rejected' | 'pending') => {
    setAdminError('');
    try {
      const response = await fetch(`/api/admin/registrations/${registrationId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({ status }),
      });
      const { data: payload, rawText } = await readApiBody<{
        error?: string;
        registration?: AdminRegistration;
        notification?: AdminNotificationSummary | null;
        promotedRegistration?: {
          registration?: AdminRegistration;
        } | null;
      }>(response);
      if (!response.ok) {
        throw new Error(getApiErrorMessage(response, payload, rawText, 'Failed to update payment status.'));
      }

      if (!payload?.registration) {
        throw new Error('Payment status was updated, but the refreshed registration details were missing.');
      }

      setAdminRows((current) =>
        current.map((row) => (row.id === registrationId ? payload.registration ?? row : row)),
      );
      setToastClosing(false);
      setToastMessage(
        payload.promotedRegistration?.registration
          ? `${describeNotificationResult(payload.notification)} Next waitlisted team promoted to pending review.`
          : describeNotificationResult(payload.notification),
      );
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : 'Failed to update payment status.');
    }
  };

  const resendAdminStatusEmail = async (registrationId: string) => {
    setAdminError('');
    try {
      const response = await fetch(`/api/admin/registrations/${registrationId}/notifications/status-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
      });
      const { data: payload, rawText } = await readApiBody<{
        error?: string;
        registration?: AdminRegistration;
        notification?: AdminNotificationSummary | null;
      }>(response);

      if (!response.ok) {
        throw new Error(getApiErrorMessage(response, payload, rawText, 'Failed to resend status email.'));
      }

      if (!payload?.registration) {
        throw new Error('The email action finished, but the refreshed registration details were missing.');
      }

      setAdminRows((current) =>
        current.map((row) => (row.id === registrationId ? payload.registration ?? row : row)),
      );
      setToastClosing(false);
      setToastMessage(
        payload.notification?.delivery_status === 'sent'
          ? 'Status email sent successfully.'
          : describeNotificationResult(payload.notification),
      );
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : 'Failed to resend status email.');
    }
  };

  const updateAttendance = async (
    registrationId: string,
    attendanceStatus: 'registered' | 'arrived' | 'checked-in' | 'absent' | 'completed',
  ) => {
    setAdminError('');
    try {
      const response = await fetch(`/api/admin/registrations/${registrationId}/attendance`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({ attendanceStatus }),
      });

      const { data: payload, rawText } = await readApiBody<{
        error?: string;
        registration?: AdminRegistration;
      }>(response);

      if (!response.ok) {
        throw new Error(getApiErrorMessage(response, payload, rawText, 'Failed to update attendance.'));
      }

      if (!payload?.registration) {
        throw new Error('Attendance updated, but the refreshed registration details were missing.');
      }

      setAdminRows((current) =>
        current.map((row) => (row.id === registrationId ? payload.registration ?? row : row)),
      );
      setToastClosing(false);
      setToastMessage(`Attendance marked as ${attendanceStatus}.`);
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : 'Failed to update attendance.');
    }
  };

  const saveReviewNote = async (registrationId: string, reviewNote: string) => {
    setAdminError('');
    try {
      const response = await fetch(`/api/admin/registrations/${registrationId}/review-note`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({ reviewNote }),
      });

      const { data: payload, rawText } = await readApiBody<{
        error?: string;
        registration?: AdminRegistration;
      }>(response);

      if (!response.ok) {
        throw new Error(getApiErrorMessage(response, payload, rawText, 'Failed to save review note.'));
      }

      if (!payload?.registration) {
        throw new Error('The note was saved, but the refreshed registration details were missing.');
      }

      setAdminRows((current) =>
        current.map((row) => (row.id === registrationId ? payload.registration ?? row : row)),
      );
      setToastClosing(false);
      setToastMessage('Review note saved.');
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : 'Failed to save review note.');
    }
  };

  const deleteAdminRegistration = async (registrationId: string) => {
    setAdminError('');
    try {
      const response = await fetch(`/api/admin/registrations/${registrationId}`, {
        method: 'DELETE',
        headers: {
          'x-admin-key': adminKey,
        },
      });

      const { data: payload, rawText } = await readApiBody<{
        error?: string;
        success?: boolean;
        id?: string;
        promotedRegistration?: {
          registration?: AdminRegistration;
        } | null;
      }>(response);

      if (!response.ok) {
        throw new Error(getApiErrorMessage(response, payload, rawText, 'Failed to delete registration.'));
      }

      setAdminRows((current) => {
        const nextRows = current.filter((row) => row.id !== registrationId);
        const promoted = payload?.promotedRegistration?.registration;

        if (!promoted) {
          return nextRows;
        }

        const existingIndex = nextRows.findIndex((row) => row.id === promoted.id);
        if (existingIndex === -1) {
          return [promoted, ...nextRows];
        }

        return nextRows.map((row) => (row.id === promoted.id ? promoted : row));
      });
      setToastClosing(false);
      setToastMessage(
        payload?.promotedRegistration?.registration
          ? 'Registration deleted. Next waitlisted team moved into review.'
          : 'Registration deleted.',
      );
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : 'Failed to delete registration.');
    }
  };

  const toggleEventRegistrationState = async (eventSlug: string, enabled: boolean) => {
    setAdminError('');
    try {
      const response = await fetch(`/api/admin/events/${eventSlug}/registration-state`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({ enabled }),
      });

      const { data: payload, rawText } = await readApiBody<{
        error?: string;
        success?: boolean;
        event?: EventRecord | null;
      }>(response);

      if (!response.ok) {
        throw new Error(getApiErrorMessage(response, payload, rawText, 'Failed to update event registration state.'));
      }

      if (payload?.event) {
        setEvents((current) =>
          current.map((event) => (event.slug === payload.event?.slug ? payload.event : event)),
        );
      } else {
        await refreshEvents();
      }

      setToastClosing(false);
      setToastMessage(enabled ? 'Registration restarted for the selected event.' : 'Registration stopped for the selected event.');
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : 'Failed to update event registration state.');
    }
  };

  const sendBroadcast = async (payload: {
    title: string;
    message: string;
    eventSlug: string;
    isPinned: boolean;
  }) => {
    setAdminError('');
    try {
      const response = await fetch('/api/admin/broadcasts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify(payload),
      });

      const { data, rawText } = await readApiBody<{
        error?: string;
        announcement?: PortalAnnouncement | null;
        stats?: {
          total: number;
          sent: number;
          failed: number;
          skipped: number;
        };
      }>(response);

      if (!response.ok) {
        throw new Error(getApiErrorMessage(response, data, rawText, 'Failed to send broadcast.'));
      }

      if (data?.announcement) {
        setAdminAnnouncements((current) => [data.announcement!, ...current].slice(0, 30));
        setAnnouncements((current) => [data.announcement!, ...current].slice(0, 20));
      }

      setToastClosing(false);
      setToastMessage(
        data?.stats
          ? `Broadcast published. ${data.stats.sent} sent, ${data.stats.failed} failed, ${data.stats.skipped} skipped.`
          : 'Broadcast published.',
      );
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : 'Failed to send broadcast.');
    }
  };

  const deleteAdminAnnouncement = async (announcementId: string) => {
    setAdminError('');
    try {
      const response = await fetch(`/api/admin/announcements/${announcementId}`, {
        method: 'DELETE',
        headers: {
          'x-admin-key': adminKey,
        },
      });

      const { data, rawText } = await readApiBody<{
        error?: string;
        success?: boolean;
        id?: string;
      }>(response);

      if (!response.ok) {
        throw new Error(getApiErrorMessage(response, data, rawText, 'Failed to delete update.'));
      }

      setAdminAnnouncements((current) => current.filter((announcement) => announcement.id !== announcementId));
      setAnnouncements((current) => current.filter((announcement) => announcement.id !== announcementId));
      setToastClosing(false);
      setToastMessage('Update deleted.');
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : 'Failed to delete update.');
    }
  };

  const runBackup = async () => {
    setAdminError('');
    try {
      const response = await fetch('/api/admin/backups/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
      });

      const { data, rawText } = await readApiBody<{
        error?: string;
        backup?: BackupSnapshot;
      }>(response);

      if (!response.ok) {
        throw new Error(getApiErrorMessage(response, data, rawText, 'Failed to create backup.'));
      }

      if (data?.backup) {
        setBackupSnapshots((current) => [data.backup!, ...current]);
      }

      setToastClosing(false);
      setToastMessage('Backup created successfully.');
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : 'Failed to create backup.');
    }
  };

  const downloadBackupFile = async (fileName: string) => {
    setAdminError('');
    try {
      const response = await fetch(`/api/admin/backups/${encodeURIComponent(fileName)}`, {
        headers: { 'x-admin-key': adminKey },
      });

      if (!response.ok) {
        const { data, rawText } = await readApiBody<{ error?: string }>(response);
        throw new Error(getApiErrorMessage(response, data, rawText, 'Backup download failed.'));
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : 'Backup download failed.');
    }
  };

  const downloadAdminFile = async (format: 'csv' | 'xlsx', eventSlug?: string) => {
    try {
      const endpoint = format === 'csv' ? '/api/admin/export.csv' : '/api/admin/export.xlsx';
      const requestUrl = new URL(endpoint, window.location.origin);
      if (eventSlug) {
        requestUrl.searchParams.set('eventSlug', eventSlug);
      }

      const response = await fetch(requestUrl.toString(), {
        headers: { 'x-admin-key': adminKey },
      });

      if (!response.ok) {
        const { data: payload, rawText } = await readApiBody<{ error?: string }>(response);
        throw new Error(getApiErrorMessage(response, payload, rawText, 'Export failed.'));
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      const suffix = eventSlug ? `-${eventSlug}` : '';
      anchor.download =
        format === 'csv' ? `participant-registrations${suffix}.csv` : `participant-registrations${suffix}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : 'Export failed.');
    }
  };

  return (
    <div className="portal-shell portal-page-enter min-h-screen text-slate-100">
      <PortalBackgroundCanvas />
      <div className="portal-orb portal-orb--violet" />
      <div className="portal-orb portal-orb--cyan" />
      <div className="portal-orb portal-orb--blue" />

      {toastMessage ? (
        <div className="fixed inset-x-0 top-5 z-50 flex justify-center px-4">
          <div
            className={`portal-toast flex w-full max-w-md items-center gap-3 rounded-[1.4rem] border border-emerald-300/20 bg-[linear-gradient(145deg,rgba(9,24,27,0.92),rgba(15,23,42,0.92))] px-5 py-4 shadow-[0_20px_60px_rgba(16,185,129,0.18)] backdrop-blur-xl ${toastClosing ? 'is-exiting' : ''}`}
          >
            <div className="rounded-2xl bg-emerald-400/15 p-2 text-emerald-200">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-emerald-200/80">Success</p>
              <p className="mt-1 text-sm text-white">{toastMessage}</p>
            </div>
          </div>
        </div>
      ) : null}

      {loadingEvents && events.length === 0 && isEventPage ? (
        <div className="portal-loader-overlay">
          <PortalLoader label="Loading..." />
        </div>
      ) : null}

      {navigationLoading ? (
        <div className="portal-loader-overlay">
          <PortalLoader label="Loading..." />
        </div>
      ) : null}

      {!isFrontLandingPage ? (
        <header className="sticky top-0 z-30 px-3 pt-3 sm:px-4 md:px-0">
          <div className={`${shellClassName} portal-nav-shell ${navScrolled ? 'is-scrolled' : ''}`}>
            <a
              href="#overview"
              className="portal-brand-card portal-brand-card--nav flex min-w-0 flex-1 items-center gap-3 rounded-[1.4rem] px-3 py-2 transition hover:border-slate-200/18 hover:bg-white/[0.06] lg:flex-none"
              title="Home"
            >
              <div className="portal-brand-logo-frame">
                <img src="/images/ceasposter.jpeg" alt="CEAS COGNOTSAV logo" className="portal-brand-logo-image" />
              </div>
              <div className="portal-brand-copy portal-brand-copy--nav min-w-0">
                <h1 className="portal-brand-mark portal-brand-mark--nav" aria-label="CEAS Cognotsav 2K26">
                  <span className="portal-brand-mark__prefix">CEAS</span>
                  <span className="portal-brand-mark__title">COGNOTSAV</span>
                  <span className="portal-brand-mark__year">2K26</span>
                </h1>
              </div>
            </a>

            <nav className="portal-nav-links hidden lg:flex">
              {NAV_LINKS.map((link) => (
                <a key={link.href} href={link.href} className={`portal-nav-link ${hashRoute === link.href ? 'is-active' : ''}`}>
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="hidden items-center gap-3 lg:flex">
              <a href="#registration-panel" className="portal-premium-button portal-premium-button--primary portal-nav-cta">
                Register
                <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </header>
      ) : null}
      {isAdminPage ? (
        <Suspense fallback={<PortalSectionFallback label="Loading admin panel..." />}>
          <AdminRegistrationsPage
            adminAccessMode={adminAccessMode}
            adminMainKey={adminMainKeyDraft}
            adminEventKey={adminEventKeyDraft}
            adminEventKeySlug={adminEventKeySlug}
            adminScope={adminScope}
            adminRows={adminRows}
            events={events}
            announcements={adminAnnouncements}
            backups={backupSnapshots}
            adminLoading={adminLoading}
            adminError={adminError}
            onAdminAccessModeChange={(value) => {
              setAdminAccessMode(value);
              setAdminError('');
            }}
            onAdminMainKeyChange={(value) => {
              setAdminMainKeyDraft(value);
              setAdminError('');
            }}
            onAdminEventKeyChange={(value) => {
              setAdminEventKeyDraft(value);
              setAdminError('');
            }}
            onAdminEventKeySlugChange={(value) => {
              setAdminEventKeySlug(value);
              setAdminError('');
            }}
            onLoadAdminRows={loadAdminRows}
            onDownload={downloadAdminFile}
            onStatusChange={updateAdminStatus}
            onDeleteRegistration={deleteAdminRegistration}
            onToggleEventRegistrationState={toggleEventRegistrationState}
            onSaveReviewNote={saveReviewNote}
            onResendStatusEmail={resendAdminStatusEmail}
            onSendBroadcast={sendBroadcast}
            onDeleteAnnouncement={deleteAdminAnnouncement}
            onRunBackup={runBackup}
            onDownloadBackup={downloadBackupFile}
          />
        </Suspense>
      ) : isTimelinePage ? (
        <Suspense fallback={<PortalSectionFallback label="Loading timeline..." />}>
          <TimelinePage events={events} />
        </Suspense>
      ) : isDepartmentPage ? (
        <DepartmentPage />
      ) : isEventPage && selectedEvent ? (
        <main className={`${shellClassName} space-y-5 pb-8 pt-4 md:space-y-8 md:pb-12`}>
          <Suspense fallback={<PortalSectionFallback label="Loading event details..." />}>
            <EventRegistrationPanel
              selectedEvent={selectedEvent}
              teamSize={teamSize}
              form={form}
              submitting={submitting}
              successMessage={successMessage}
              errorMessage={errorMessage}
              successReceipt={successReceipt}
              draftRecovered={draftRecovered}
              validationErrors={validationErrors}
              touchedFields={touchedFields}
              onFieldBlur={markFieldTouched}
              onDownloadPass={downloadConfirmationPass}
              onDismissDraftRecovered={() => setDraftRecovered(false)}
              paymentScreenshotName={paymentScreenshotName}
              paymentScreenshotReady={Boolean(paymentScreenshotDataUrl)}
              onPaymentScreenshotChange={handlePaymentScreenshotChange}
              onTeamSizeChange={handleTeamSizeChange}
              onBackToEvents={handleBackToEvents}
              onFormFieldChange={updateFormField}
              onParticipantChange={handleParticipantChange}
              onSubmit={handleSubmit}
            />
          </Suspense>
        </main>
      ) : (
        <>
          <main className={`${shellClassName} space-y-5 pb-8 md:space-y-8 md:pb-12`}>
            <HeroSection
              adminTriggerProps={{
                onClick: handleSecretAdminClick,
                onDoubleClick: handleSecretAdminDoubleClick,
                onTouchEnd: handleSecretAdminTouchEnd,
                onPointerDown: startSecretAdminHold,
                onPointerUp: clearSecretAdminHold,
                onPointerLeave: clearSecretAdminHold,
                onPointerCancel: clearSecretAdminHold,
              }}
            />

            <PremiumBrochureStrip />

            <DepartmentIntroStrip />

            <CompetitionGridSection
              events={events}
              loadingEvents={loadingEvents}
              selectedEventSlug={selectedEventSlug}
              onSelectEvent={handleSelectEvent}
            />

            <DeferredSection className="portal-deferred-section" fallback={<PortalSectionFallback label="Loading tracker..." />}>
              <Suspense fallback={<PortalSectionFallback label="Loading tracker..." />}>
                <TrackerAdminPanel
                  lookupQuery={lookupQuery}
                  lookupLoading={lookupLoading}
                  lookupTouched={lookupTouched}
                  lookupResults={lookupResults}
                  adminKey={adminKey}
                  adminRows={adminRows}
                  adminLoading={adminLoading}
                  adminError={adminError}
                  onStatusChange={updateAdminStatus}
                  onLookupQueryChange={setLookupQuery}
                  onLookup={handleLookup}
                  onAdminKeyChange={(value) => {
                    setAdminKey(value);
                    setAdminScope(null);
                  }}
                  onLoadAdminRows={loadAdminRows}
                  onDownload={downloadAdminFile}
                  showAdmin={false}
                />
              </Suspense>
            </DeferredSection>

            <DeferredSection className="portal-deferred-section" fallback={<PortalSectionFallback label="Loading FAQs..." />}>
              <Suspense fallback={<PortalSectionFallback label="Loading FAQs..." />}>
                <FAQSection />
              </Suspense>
            </DeferredSection>
          </main>
        </>
      )}

      {showFrontBottomDock ? (
        <>
          <div className="portal-bottom-dock-spacer" aria-hidden="true" />
          <div className="portal-bottom-dock-wrap">
            <nav className="portal-bottom-dock" aria-label="Front navigation">
              <a
                href="#overview"
                className={`portal-bottom-dock__item ${activeBottomDock === 'home' ? 'is-active' : ''}`}
              >
                <House size={18} />
                <span>Home</span>
              </a>
              <a
                href="#registration-panel"
                className={`portal-bottom-dock__item ${activeBottomDock === 'events' ? 'is-active' : ''}`}
              >
                <Trophy size={18} />
                <span>Events</span>
              </a>
              <div className="portal-bottom-dock__logo-slot">
                <a
                  href="#overview"
                  className="portal-bottom-dock__logo"
                >
                  <span className="portal-bottom-dock__logo-core">
                    <img src="/images/ceasposter.jpeg" alt="CEAS logo" className="portal-bottom-dock__logo-image" />
                  </span>
                </a>
              </div>
              <a
                href="#timeline"
                className={`portal-bottom-dock__item ${activeBottomDock === 'timeline' ? 'is-active' : ''}`}
              >
                <Clock3 size={18} />
                <span>Timeline</span>
              </a>
              <a
                href="#tracker"
                className={`portal-bottom-dock__item ${activeBottomDock === 'tracker' ? 'is-active' : ''}`}
              >
                <Search size={18} />
                <span>Tracker</span>
              </a>
            </nav>
          </div>
        </>
      ) : null}

      <DeferredSection className="portal-deferred-section" fallback={<PortalSectionFallback label="Loading footer..." />} rootMargin="220px 0px">
        <Suspense fallback={<PortalSectionFallback label="Loading footer..." />}>
          <PortalFooter />
        </Suspense>
      </DeferredSection>

    </div>
  );
};

export default App;
