import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Menu, X } from 'lucide-react';
import { AdminRegistrationsPage } from './components/portal/AdminRegistrationsPage.tsx';
import { AnnouncementArchiveSection } from './components/portal/AnnouncementArchiveSection.tsx';
import { HeroSection } from './components/portal/HeroSection.tsx';
import { TimelinePage } from './components/portal/TimelinePage.tsx';
import { CompetitionGridSection } from './components/portal/CompetitionGridSection.tsx';
import { EventRegistrationPanel } from './components/portal/EventRegistrationPanel.tsx';
import { TrackerAdminPanel } from './components/portal/TrackerAdminPanel.tsx';
import { PortalFooter } from './components/portal/PortalFooter.tsx';
import type {
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

const CANVAS_PARTICLE_COUNT = 56;

function PortalBackgroundCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let width = 0;
    let height = 0;
    let animationFrame = 0;
    const pointer = { x: -9999, y: -9999 };
    const particleCount = Math.min(CANVAS_PARTICLE_COUNT, window.innerWidth < 640 ? 32 : CANVAS_PARTICLE_COUNT);

    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00045,
      vy: (Math.random() - 0.5) * 0.00045,
      radius: Math.random() * 1.8 + 1.1,
      hue: [195, 220, 280, 320][Math.floor(Math.random() * 4)],
    }));

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);

      for (const particle of particles) {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0 || particle.x > 1) particle.vx *= -1;
        if (particle.y < 0 || particle.y > 1) particle.vy *= -1;

        const px = particle.x * width;
        const py = particle.y * height;
        const pointerDistance = Math.hypot(pointer.x - px, pointer.y - py);
        const glowBoost = pointerDistance < 140 ? 0.22 : 0;

        context.beginPath();
        context.fillStyle = `hsla(${particle.hue}, 92%, 68%, ${0.18 + glowBoost})`;
        context.shadowBlur = 12;
        context.shadowColor = `hsla(${particle.hue}, 95%, 70%, 0.28)`;
        context.arc(px, py, particle.radius + glowBoost * 7, 0, Math.PI * 2);
        context.fill();
      }

      context.shadowBlur = 0;
      for (let index = 0; index < particles.length; index += 1) {
        const a = particles[index];
        const ax = a.x * width;
        const ay = a.y * height;

        for (let next = index + 1; next < particles.length; next += 1) {
          const b = particles[next];
          const bx = b.x * width;
          const by = b.y * height;
          const distance = Math.hypot(ax - bx, ay - by);

          if (distance < 150) {
            const alpha = 1 - distance / 150;
            context.beginPath();
            context.strokeStyle = `rgba(103, 180, 255, ${alpha * 0.08})`;
            context.lineWidth = 1;
            context.moveTo(ax, ay);
            context.lineTo(bx, by);
            context.stroke();
          }
        }
      }

      animationFrame = window.requestAnimationFrame(draw);
    };

    const handleMove = (event: MouseEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    };

    const handleLeave = () => {
      pointer.x = -9999;
      pointer.y = -9999;
    };

    resize();
    draw();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMove, { passive: true });
    window.addEventListener('mouseout', handleLeave);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseout', handleLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="portal-network-canvas" aria-hidden="true" />;
}

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

  if (requiresTeamName && !form.teamName.trim()) errors.teamName = 'Enter your team name.';
  if (!form.collegeName.trim()) errors.collegeName = 'College name is required.';
  if (!form.departmentName.trim()) errors.departmentName = 'Department is required.';
  if (!form.yearOfStudy.trim()) errors.yearOfStudy = 'Year or semester is required.';
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

    if (!participant.email.trim()) {
      errors[`${prefix}.email`] = `Participant ${index + 1} email is required.`;
    } else if (!emailPattern.test(participant.email.trim())) {
      errors[`${prefix}.email`] = `Participant ${index + 1} email is invalid.`;
    }

    if (!participant.phone.trim()) {
      errors[`${prefix}.phone`] = `Participant ${index + 1} phone is required.`;
    } else if (!phonePattern.test(participant.phone.trim())) {
      errors[`${prefix}.phone`] = `Participant ${index + 1} phone must be 10 digits.`;
    }
  });

  return errors;
}

export const App: React.FC = () => {
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
  const [adminRows, setAdminRows] = useState<AdminRegistration[]>([]);
  const [backupSnapshots, setBackupSnapshots] = useState<BackupSnapshot[]>([]);
  const [adminAnnouncements, setAdminAnnouncements] = useState<PortalAnnouncement[]>([]);
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [form, setForm] = useState<FormState>({
    teamName: '',
    collegeName: '',
    departmentName: '',
    yearOfStudy: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    paymentReference: '',
    notes: '',
    participants: makeParticipants(1),
  });

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

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((element) => {
        element.classList.add('is-visible');
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      {
        threshold: 0.14,
        rootMargin: '0px 0px -8% 0px',
      },
    );

    const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    targets.forEach((target, index) => {
      target.style.transitionDelay = `${Math.min(index % 5, 4) * 70}ms`;
      observer.observe(target);
    });

    return () => observer.disconnect();
  }, [events.length, adminRows.length, hashRoute, lookupResults.length]);

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

  const eventPageSlug = hashRoute.startsWith('#events/') ? hashRoute.slice('#events/'.length) : '';
  const isAdminPage = hashRoute.startsWith('#admin-registrations');
  const isTimelinePage = hashRoute === '#timeline';
  const isEventPage = Boolean(eventPageSlug);

  useEffect(() => {
    if (isEventPage && eventPageSlug && events.some((event) => event.slug === eventPageSlug)) {
      setSelectedEventSlug(eventPageSlug);
    }
  }, [eventPageSlug, events, isEventPage]);

  const totalRegistrations = events.reduce((sum, event) => sum + event.registrations_count, 0);
  const totalRemainingSlots = events.reduce(
    (sum, event) => sum + Math.max((event.max_slots ?? 0) - event.registrations_count, 0),
    0,
  );
  const visibleAnnouncements = announcements
    .filter((announcement) => isAnnouncementActive(announcement))
    .slice(0, 8);

  useEffect(() => {
    if (successReceipt) {
      setShowSuccessModal(true);
    }
  }, [successReceipt]);

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
    setShowSuccessModal(false);
    setPaymentScreenshotDataUrl(null);
    setPaymentScreenshotName('');
    if (typeof window !== 'undefined') {
      window.location.hash = `#events/${slug}`;
    }
    setMobileMenuOpen(false);
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
    setForm((current) => ({ ...current, [field]: value }));
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
    const printWindow = window.open('', '_blank', 'width=920,height=760');
    if (!printWindow) return;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(receipt.qrValue)}`;
    const statusLabel =
      receipt.status === 'waitlisted'
        ? `Waitlisted${receipt.waitlistPosition ? ` (#${receipt.waitlistPosition})` : ''}`
        : receipt.status === 'verified'
          ? 'Verified'
          : 'Pending review';

    const passHtml = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>CEAS COGNOTSAV Registration Pass</title>
          <style>
            body { font-family: Inter, Arial, sans-serif; background: #07111d; color: #f8fafc; margin: 0; padding: 36px; }
            .card { max-width: 840px; margin: 0 auto; padding: 34px; border-radius: 28px; border: 1px solid rgba(125,211,252,0.28); background: linear-gradient(135deg, rgba(8,19,27,0.95), rgba(15,23,42,0.98)); }
            .eyebrow { font-size: 12px; letter-spacing: 0.35em; text-transform: uppercase; color: #7dd3fc; font-weight: 700; }
            h1 { font-size: 40px; margin: 14px 0 10px; }
            p { color: #cbd5e1; }
            .hero { display: grid; grid-template-columns: 1.25fr 0.75fr; gap: 20px; align-items: start; }
            .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-top: 26px; }
            .cell { border-radius: 18px; padding: 18px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); }
            .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.22em; color: #94a3b8; margin-bottom: 8px; }
            .value { font-size: 20px; color: #fff; font-weight: 700; word-break: break-word; }
            .qr { border-radius: 22px; padding: 18px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); text-align: center; }
            .status { display: inline-block; margin-top: 16px; border-radius: 999px; padding: 8px 14px; background: rgba(59,130,246,0.12); color: #dbeafe; font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; }
            .footer { margin-top: 24px; border-radius: 18px; padding: 18px; background: rgba(125,211,252,0.1); }
            @media (max-width: 720px) { .hero, .grid { grid-template-columns: 1fr; } }
            @media print { body { background: white; color: black; padding: 0; } .card { background: white; color: black; border-color: #cbd5e1; } .value { color: black; } p, .footer { color: #111827; background: #f8fafc; } }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="eyebrow">CEAS COGNOTSAV Confirmation Pass</div>
            <div class="hero">
              <div>
                <h1>${receipt.eventName}</h1>
                <p>Your registration has been submitted successfully. Keep this pass for verification and live status tracking.</p>
                <div class="status">${statusLabel}</div>
              </div>
              <div class="qr">
                <img src="${qrUrl}" alt="Registration QR" style="width:200px;height:200px;margin:0 auto;" />
                <div class="label" style="margin-top:16px;">Scan on event day</div>
                <div class="value" style="font-size:16px;">${receipt.registrationCode}</div>
              </div>
            </div>
            <div class="grid">
              <div class="cell"><div class="label">Registration Code</div><div class="value">${receipt.registrationCode}</div></div>
              <div class="cell"><div class="label">Team Name</div><div class="value">${receipt.teamName}</div></div>
              <div class="cell"><div class="label">Lead Contact</div><div class="value">${receipt.contactName}</div></div>
              <div class="cell"><div class="label">Email</div><div class="value">${receipt.contactEmail}</div></div>
              <div class="cell"><div class="label">Schedule</div><div class="value">${receipt.dateLabel} / ${receipt.timeLabel}</div></div>
              <div class="cell"><div class="label">Venue</div><div class="value">${receipt.venue}</div></div>
              <div class="cell"><div class="label">Amount Paid</div><div class="value">INR ${receipt.totalAmount}</div></div>
              <div class="cell"><div class="label">Payment Reference</div><div class="value">${receipt.paymentReference || 'Pending manual entry'}</div></div>
            </div>
            <div class="footer">Submitted on ${receipt.submittedAt}. Use ${receipt.registrationCode} in the tracker to check verification status instantly.</div>
          </div>
          <script>window.onload = function(){ window.print(); }</script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(passHtml);
    printWindow.document.close();
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
          departmentName: form.departmentName,
          yearOfStudy: form.yearOfStudy,
          contactName: form.contactName,
          contactEmail: form.contactEmail,
          contactPhone: form.contactPhone,
          paymentMethod: 'upi',
          paymentReference: form.paymentReference,
          paymentScreenshotDataUrl,
          notes: form.notes,
          participants: form.participants,
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
      setSuccessReceipt({
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
      });
      setForm({
        teamName: '',
        collegeName: '',
        departmentName: '',
        yearOfStudy: '',
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
    setAdminLoading(true);
    setAdminError('');
    try {
      const [rowsResponse, announcementsResponse, backupsResponse] = await Promise.all([
        fetch('/api/admin/registrations', {
          headers: { 'x-admin-key': adminKey },
        }),
        fetch('/api/admin/announcements', {
          headers: { 'x-admin-key': adminKey },
        }),
        fetch('/api/admin/backups', {
          headers: { 'x-admin-key': adminKey },
        }),
      ]);

      const [{ data: rowsPayload, rawText: rowsText }, { data: announcementsPayload, rawText: announcementsText }, { data: backupsPayload, rawText: backupsText }] = await Promise.all([
        readApiBody<AdminRegistration[]>(rowsResponse),
        readApiBody<PortalAnnouncement[]>(announcementsResponse),
        readApiBody<BackupSnapshot[]>(backupsResponse),
      ]);

      if (!rowsResponse.ok) {
        throw new Error(getApiErrorMessage(rowsResponse, rowsPayload, rowsText, 'Failed to load registrations.'));
      }

      if (!Array.isArray(rowsPayload)) {
        throw new Error('Failed to load registrations. The server returned an invalid response.');
      }

      if (!announcementsResponse.ok) {
        throw new Error(getApiErrorMessage(announcementsResponse, announcementsPayload, announcementsText, 'Failed to load announcements.'));
      }

      if (!backupsResponse.ok) {
        throw new Error(getApiErrorMessage(backupsResponse, backupsPayload, backupsText, 'Failed to load backups.'));
      }

      setAdminRows(rowsPayload);
      setAdminAnnouncements(Array.isArray(announcementsPayload) ? announcementsPayload : []);
      setBackupSnapshots(Array.isArray(backupsPayload) ? backupsPayload : []);
    } catch (error) {
      setAdminRows([]);
      setAdminAnnouncements([]);
      setBackupSnapshots([]);
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

  const downloadAdminFile = async (format: 'csv' | 'xlsx') => {
    try {
      const endpoint = format === 'csv' ? '/api/admin/export.csv' : '/api/admin/export.xlsx';
      const response = await fetch(endpoint, {
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
      anchor.download =
        format === 'csv' ? 'participant-registrations.csv' : 'participant-registrations.xlsx';
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

      {loadingEvents && events.length === 0 && !isAdminPage && !isTimelinePage ? (
        <div className="portal-loader-overlay">
          <div className="portal-loader-card">
            <div className="portal-loader-ring" />
            <p className="mt-4 text-sm font-semibold text-white">Loading competitions...</p>
          </div>
        </div>
      ) : null}

      {showSuccessModal && successReceipt ? (
        <div className="portal-modal-backdrop px-4" onClick={() => setShowSuccessModal(false)}>
          <div className="portal-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-emerald-400/12 p-3 text-emerald-200">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-200/75">Registration Successful</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{successReceipt.eventName}</h3>
                  <p className="mt-2 text-sm text-slate-300">Save the registration code and use tracker anytime.</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowSuccessModal(false)} className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-slate-200">
                Close
              </button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.05] p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Registration Code</p>
                <p className="mt-2 text-2xl font-semibold text-white">{successReceipt.registrationCode}</p>
              </div>
              <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.05] p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Lead Contact</p>
                <p className="mt-2 text-base font-semibold text-white">{successReceipt.contactName}</p>
                <p className="mt-1 text-sm text-slate-300">{successReceipt.contactEmail}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => downloadConfirmationPass(successReceipt)} className="animated-gradient-button inline-flex flex-1 items-center justify-center rounded-2xl px-5 py-3 font-bold text-slate-950">
                Download Pass
                <ArrowRight size={16} />
              </button>
              <a href="#tracker" onClick={() => setShowSuccessModal(false)} className="magnetic-button inline-flex flex-1 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 font-semibold text-white">
                Open Tracker
              </a>
            </div>
          </div>
        </div>
      ) : null}

      <header className="sticky top-0 z-30 px-3 pt-3 sm:px-4 md:px-0">
        <div className={`${shellClassName} portal-nav-shell`}>
          <a href="#overview" className="flex min-w-0 items-center gap-3 rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-3 py-2 transition hover:border-cyan-300/28 hover:bg-white/[0.08]">
            <div className="h-11 w-11 overflow-hidden rounded-[0.95rem] border border-cyan-300/20 bg-white/10 p-1">
              <img src="/images/ceasposter.jpeg" alt="CEAS COGNOTSAV logo" className="h-full w-full rounded-[0.75rem] object-cover" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[10px] uppercase tracking-[0.24em] text-cyan-200/80 sm:text-[11px]">Computer Engineering Association</p>
              <h1 className="portal-brand-mark truncate text-sm text-white sm:text-base">CEAS COGNOTSAV 2026</h1>
            </div>
          </a>

          <nav className="hidden items-center gap-5 text-sm lg:flex">
            <a href="#overview" className="portal-nav-link">Home</a>
            <a href="#registration-panel" className="portal-nav-link">Competitions</a>
            <a href="#tracker" className="portal-nav-link">Tracker</a>
            <a href="#announcement-archive" className="portal-nav-link">Updates</a>
            <a href="#timeline" className="portal-nav-link">Timeline</a>
            <a href="#admin-registrations" className="portal-nav-link">Admin</a>
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <a href="#registration-panel" className="animated-gradient-button inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-bold text-slate-950">
              Register
              <ArrowRight size={14} />
            </a>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((current) => !current)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-slate-100 lg:hidden"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {mobileMenuOpen ? (
          <div className={`${shellClassName} mt-2 lg:hidden`}>
            <div className="portal-mobile-menu">
              <a href="#overview" onClick={() => setMobileMenuOpen(false)} className="portal-mobile-nav-pill text-center">Home</a>
              <a href="#registration-panel" onClick={() => setMobileMenuOpen(false)} className="portal-mobile-nav-pill text-center">Competitions</a>
              <a href="#tracker" onClick={() => setMobileMenuOpen(false)} className="portal-mobile-nav-pill text-center">Tracker</a>
              <a href="#announcement-archive" onClick={() => setMobileMenuOpen(false)} className="portal-mobile-nav-pill text-center">Updates</a>
              <a href="#timeline" onClick={() => setMobileMenuOpen(false)} className="portal-mobile-nav-pill text-center">Timeline</a>
              <a href="#admin-registrations" onClick={() => setMobileMenuOpen(false)} className="portal-mobile-nav-pill text-center">Admin</a>
            </div>
          </div>
        ) : null}
      </header>
      {isAdminPage ? (
        <AdminRegistrationsPage
          adminKey={adminKey}
          adminRows={adminRows}
          events={events}
          announcements={adminAnnouncements}
          backups={backupSnapshots}
          adminLoading={adminLoading}
          adminError={adminError}
          onAdminKeyChange={setAdminKey}
          onLoadAdminRows={loadAdminRows}
          onDownload={downloadAdminFile}
          onStatusChange={updateAdminStatus}
          onAttendanceChange={updateAttendance}
          onSaveReviewNote={saveReviewNote}
          onResendStatusEmail={resendAdminStatusEmail}
          onSendBroadcast={sendBroadcast}
          onRunBackup={runBackup}
          onDownloadBackup={downloadBackupFile}
        />
      ) : isTimelinePage ? (
        <TimelinePage />
      ) : isEventPage && selectedEvent ? (
        <main className={`${shellClassName} space-y-5 pb-28 pt-4 md:space-y-8 md:pb-16`}>
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
            onFormFieldChange={updateFormField}
            onParticipantChange={handleParticipantChange}
            onSubmit={handleSubmit}
          />
        </main>
      ) : (
        <>
          <main className={`${shellClassName} space-y-5 pb-28 md:space-y-8 md:pb-16`}>
            <HeroSection
              totalEvents={events.length}
              totalRemainingSlots={totalRemainingSlots}
            />

            <div className={`${shellClassName} portal-section-divider`} aria-hidden="true" />

            <AnnouncementArchiveSection
              announcements={visibleAnnouncements}
              loading={loadingAnnouncements}
            />

            <div className={`${shellClassName} portal-section-divider portal-section-divider--angled`} aria-hidden="true" />

            <CompetitionGridSection
              events={events}
              loadingEvents={loadingEvents}
              selectedEventSlug={selectedEventSlug}
              onSelectEvent={handleSelectEvent}
            />

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
              onAdminKeyChange={setAdminKey}
              onLoadAdminRows={loadAdminRows}
              onDownload={downloadAdminFile}
              showAdmin={false}
            />
          </main>
        </>
      )}

      <PortalFooter />

      {!isAdminPage && !isTimelinePage ? (
        <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(0.8rem+env(safe-area-inset-bottom,0px))] md:hidden">
          <div className="rounded-[1.8rem] border border-white/10 bg-[rgba(8,12,22,0.92)] p-2 shadow-[0_18px_60px_rgba(2,8,23,0.35)] backdrop-blur-2xl">
            <div className="grid grid-cols-4 gap-2">
            <a href="#overview" className="rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-100">
              Home
            </a>
            <a href="#registration-panel" className="animated-gradient-button inline-flex items-center justify-center rounded-2xl px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-950">
              Register
            </a>
            <a href="#tracker" className="rounded-2xl border border-purple-400/20 bg-purple-500/14 px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-purple-100">
              Track
            </a>
            <a href="#admin-registrations" className="rounded-2xl border border-cyan-400/20 bg-cyan-500/14 px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
              Admin
            </a>
          </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default App;
