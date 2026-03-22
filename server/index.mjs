import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import nodemailer from 'nodemailer';
import XLSX from 'xlsx';
import { randomUUID } from 'node:crypto';
import dns from 'node:dns';
import fs from 'node:fs/promises';
import path from 'node:path';
import { initDatabase, pool } from './db.mjs';

dns.setDefaultResultOrder('ipv4first');
const dnsLookup = dns.promises.lookup;

const app = express();
const port = Number(process.env.PORT || 8787);
const adminAccessKey = process.env.ADMIN_ACCESS_KEY || 'change-this-admin-key';
const rawEventAdminKeys = String(process.env.EVENT_ADMIN_KEYS_JSON || process.env.EVENT_ADMIN_KEYS || '').trim();
const storageRoot = path.resolve(
  process.env.RAILWAY_VOLUME_MOUNT_PATH || process.env.STORAGE_ROOT || process.cwd(),
);
const usesExplicitPersistentStorage = Boolean(
  String(process.env.RAILWAY_VOLUME_MOUNT_PATH || process.env.STORAGE_ROOT || '').trim(),
);
const uploadsDir = path.join(storageRoot, 'uploads', 'payment-proofs');
const backupsDir = path.join(storageRoot, 'backups');
const smtpProvider = String(process.env.SMTP_PROVIDER || '').trim().toLowerCase();
const defaultSmtpHost = smtpProvider === 'gmail' ? 'smtp.gmail.com' : '';
const defaultSmtpPort = smtpProvider === 'gmail' ? 587 : 587;
const defaultSmtpSecure = false;
const smtpHost = String(process.env.SMTP_HOST || defaultSmtpHost).trim();
const smtpPort = Number(process.env.SMTP_PORT || defaultSmtpPort);
const smtpSecure = String(process.env.SMTP_SECURE || String(defaultSmtpSecure)).trim().toLowerCase() === 'true';
const smtpUser = String(process.env.SMTP_USER || '').trim();
const smtpPass = String(process.env.SMTP_PASS || '').trim();
const smtpFromEmail = String(process.env.SMTP_FROM_EMAIL || smtpUser || '').trim();
const smtpFromName = String(process.env.SMTP_FROM_NAME || 'CEAS COGNOTSAV').trim();
const publicAppUrl = String(process.env.PUBLIC_APP_URL || 'https://cognotsav2026.in').trim().replace(/\/+$/, '');
const resendApiKey = String(process.env.RESEND_API_KEY || '').trim();
const brevoApiKey = String(process.env.BREVO_API_KEY || '').trim();
const resendConfigured = Boolean(resendApiKey && smtpFromEmail);
const brevoConfigured = Boolean(brevoApiKey && smtpFromEmail);
const smtpConfigured = Boolean(smtpHost && smtpPort && smtpFromEmail);
const IST_OFFSET_MINUTES = 330;
const EVENT_START_REMINDER_WINDOW_MS = 60 * 60 * 1000;
const REGISTRATION_CLOSING_WINDOW_MS = 24 * 60 * 60 * 1000;
const SMART_NOTIFICATION_POLL_MS = Number(process.env.SMART_NOTIFICATION_POLL_MS || 5 * 60 * 1000);
const LOW_SLOT_ALERT_THRESHOLD = Number(process.env.LOW_SLOT_ALERT_THRESHOLD || 5);
const BACKUP_POLL_MS = Number(process.env.BACKUP_POLL_MS || 24 * 60 * 60 * 1000);
const monthIndexByShortName = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

function parseEventAdminKeys(rawValue) {
  if (!rawValue) return new Map();

  try {
    const parsed = JSON.parse(rawValue);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return new Map(
        Object.entries(parsed)
          .filter(([slug, key]) => String(slug || '').trim() && typeof key === 'string' && key.trim())
          .map(([slug, key]) => [String(slug).trim(), String(key).trim()]),
      );
    }
  } catch {
    // Fall back to the simple delimited format below.
  }

  return new Map(
    rawValue
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const separator = entry.includes('=') ? '=' : ':';
        const [slug, key] = entry.split(separator);
        return [String(slug || '').trim(), String(key || '').trim()];
      })
      .filter(([slug, key]) => slug && key),
  );
}

const eventAdminKeys = parseEventAdminKeys(rawEventAdminKeys);

function resolveAdminAccess(key) {
  const normalizedKey = String(key || '').trim();
  if (!normalizedKey) return null;

  if (normalizedKey === adminAccessKey) {
    return { mode: 'global', eventSlug: null };
  }

  for (const [eventSlug, eventKey] of eventAdminKeys.entries()) {
    if (normalizedKey === eventKey) {
      return { mode: 'event', eventSlug };
    }
  }

  return null;
}

async function buildAdminAccessPayload(access) {
  if (!access || access.mode === 'global') {
    return {
      mode: 'global',
      event_slug: null,
      event_name: null,
      can_export: true,
      can_manage_backups: true,
      can_manage_broadcasts: true,
      can_manage_announcements: true,
    };
  }

  const result = await pool.query(
    `
      SELECT slug, name
      FROM events
      WHERE slug = $1
      LIMIT 1
    `,
    [access.eventSlug],
  );

  return {
    mode: 'event',
    event_slug: access.eventSlug,
    event_name: result.rows[0]?.name || access.eventSlug,
    can_export: true,
    can_manage_backups: false,
    can_manage_broadcasts: false,
    can_manage_announcements: false,
  };
}

async function resolveSmtpConnectHost(host) {
  if (!host) return host;

  try {
    const result = await dnsLookup(host, { family: 4 });
    return result.address || host;
  } catch {
    return host;
  }
}

function buildTransportOptions({ label, host, connectHost, port, secure }) {
  return {
    label,
    options: {
      host: connectHost,
      port,
      secure,
      requireTLS: !secure,
      auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
      tls: {
        minVersion: 'TLSv1.2',
        ...(connectHost !== host ? { servername: host } : {}),
      },
    },
  };
}

const smtpPrimaryConnectHost = smtpConfigured ? await resolveSmtpConnectHost(smtpHost) : '';
const smtpTransportDefinitions = [];

if (smtpConfigured) {
  smtpTransportDefinitions.push(
    buildTransportOptions({
      label: `primary:${smtpHost}:${smtpPort}:${smtpSecure ? 'secure' : 'starttls'}`,
      host: smtpHost,
      connectHost: smtpPrimaryConnectHost,
      port: smtpPort,
      secure: smtpSecure,
    }),
  );

  if (smtpProvider === 'gmail' && (smtpPort !== 587 || smtpSecure)) {
    const fallbackHost = 'smtp.gmail.com';
    const fallbackConnectHost = await resolveSmtpConnectHost(fallbackHost);
    smtpTransportDefinitions.push(
      buildTransportOptions({
        label: 'gmail-fallback:smtp.gmail.com:587:starttls',
        host: fallbackHost,
        connectHost: fallbackConnectHost,
        port: 587,
        secure: false,
      }),
    );
  }
}

const mailTransports = smtpTransportDefinitions.map((definition) => ({
  label: definition.label,
  transport: nodemailer.createTransport(definition.options),
}));
const emailConfigured = Boolean(resendConfigured || brevoConfigured || mailTransports.length !== 0);

async function sendPortalMail(message) {
  if (resendConfigured) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: message.from,
        to: Array.isArray(message.to) ? message.to : [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        typeof payload?.message === 'string'
          ? `Resend API error: ${payload.message}`
          : `Resend API error (HTTP ${response.status})`,
      );
    }

    return {
      messageId: payload?.id || null,
      provider: 'resend',
    };
  }

  if (brevoConfigured) {
    const toRecipients = (Array.isArray(message.to) ? message.to : [message.to])
      .map((recipient) => {
        if (typeof recipient === 'string') {
          return { email: recipient };
        }

        if (recipient && typeof recipient === 'object' && recipient.email) {
          return {
            email: recipient.email,
            ...(recipient.name ? { name: recipient.name } : {}),
          };
        }

        return null;
      })
      .filter(Boolean);

    const sender = {
      email: smtpFromEmail,
      ...(smtpFromName ? { name: smtpFromName } : {}),
    };

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender,
        to: toRecipients,
        subject: message.subject,
        htmlContent: message.html,
        textContent: message.text,
        ...(message.replyTo
          ? {
              replyTo:
                typeof message.replyTo === 'string'
                  ? { email: message.replyTo }
                  : message.replyTo,
            }
          : {}),
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        typeof payload?.message === 'string'
          ? `Brevo API error: ${payload.message}`
          : `Brevo API error (HTTP ${response.status})`,
      );
    }

    return {
      messageId: payload?.messageId || null,
      provider: 'brevo',
    };
  }

  let lastError = null;

  for (const candidate of mailTransports) {
    try {
      return await candidate.transport.sendMail(message);
    } catch (error) {
      lastError = error;
      console.error(`SMTP transport failed (${candidate.label})`, error);
    }
  }

  throw lastError || new Error('SMTP transport is not configured.');
}

app.use(cors());
app.use(express.json({ limit: '8mb' }));
app.use('/uploads', express.static(path.join(storageRoot, 'uploads')));
app.use(express.static(path.resolve(process.cwd(), 'dist')));

app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
});

function buildRegistrationCode() {
  return `CGN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function requireAdmin(req, res, next) {
  const key = req.header('x-admin-key');
  const access = resolveAdminAccess(key);
  if (!access) {
    return res.status(401).json({ error: 'Invalid admin access key.' });
  }
  req.adminAccess = access;
  return next();
}

function hasScopedEventAccess(req, eventSlug) {
  if (!req.adminAccess || req.adminAccess.mode !== 'event') {
    return true;
  }

  return req.adminAccess.eventSlug === eventSlug;
}

function resolveAdminExportScope(req) {
  const requestedEventSlug = String(req.query?.eventSlug || '').trim();

  if (req.adminAccess?.mode === 'event') {
    return {
      scopeClause: 'WHERE r.event_slug = $1',
      scopeParams: [req.adminAccess.eventSlug],
      eventSlug: req.adminAccess.eventSlug,
    };
  }

  if (requestedEventSlug) {
    return {
      scopeClause: 'WHERE r.event_slug = $1',
      scopeParams: [requestedEventSlug],
      eventSlug: requestedEventSlug,
    };
  }

  return {
    scopeClause: '',
    scopeParams: [],
    eventSlug: null,
  };
}

function buildAdminExportFileName(extension, eventSlug) {
  return eventSlug
    ? `participant-registrations-${String(eventSlug).trim()}.${extension}`
    : `participant-registrations.${extension}`;
}

function getPaymentStatusLabel(status) {
  if (status === 'verified') return 'Verified';
  if (status === 'rejected') return 'Rejected';
  if (status === 'waitlisted') return 'Waitlisted';
  return 'Pending verification';
}

function parseEventDateTime(dateLabel, timeLabel) {
  const dateMatch = String(dateLabel || '').match(/^(\d{1,2})\s([A-Za-z]{3})\s(\d{4})$/);
  const timeMatch = String(timeLabel || '').match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!dateMatch || !timeMatch) {
    return null;
  }

  const day = Number(dateMatch[1]);
  const monthIndex = monthIndexByShortName[dateMatch[2]];
  const year = Number(dateMatch[3]);
  const hour12 = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const meridiem = timeMatch[3].toUpperCase();

  if (monthIndex === undefined) {
    return null;
  }

  let hour24 = hour12 % 12;
  if (meridiem === 'PM') {
    hour24 += 12;
  }

  const utcTimestamp = Date.UTC(year, monthIndex, day, hour24, minute) - IST_OFFSET_MINUTES * 60 * 1000;
  return new Date(utcTimestamp);
}

function formatMinutesUntilStart(minutes) {
  if (minutes <= 1) return 'less than 1 minute';
  if (minutes < 60) return `${Math.ceil(minutes)} minutes`;
  const hours = Math.floor(minutes / 60);
  const remainder = Math.ceil(minutes % 60);
  if (remainder <= 0) return `${hours} hour${hours === 1 ? '' : 's'}`;
  return `${hours} hour${hours === 1 ? '' : 's'} ${remainder} minute${remainder === 1 ? '' : 's'}`;
}

function buildInviteToken() {
  return randomUUID().replaceAll('-', '');
}

function buildQrValue(registrationCode) {
  return registrationCode;
}

function getEventSlotSnapshot(event, registrationsCount) {
  if (event.max_slots === null) {
    return { isFull: false, remainingSlots: null };
  }

  const remainingSlots = Math.max(Number(event.max_slots) - Number(registrationsCount || 0), 0);
  return {
    isFull: remainingSlots <= 0,
    remainingSlots,
  };
}

function resolveRegistrationAmount(event, participantCount) {
  if (event?.slug === 'rang-manch') {
    return Math.max(1, Number(participantCount) || 1) * 50;
  }

  return Number(event?.registration_fee || 0);
}

async function savePaymentScreenshot(dataUrl, registrationCode) {
  if (!dataUrl) return null;

  const match = String(dataUrl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid payment screenshot format.');
  }

  const mimeType = match[1];
  const extension = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
  const fileName = `${registrationCode.toLowerCase()}-${Date.now()}.${extension}`;
  const filePath = path.join(uploadsDir, fileName);

  await fs.writeFile(filePath, Buffer.from(match[2], 'base64'));
  return `/uploads/payment-proofs/${fileName}`;
}

async function fetchActiveEventsWithCounts() {
  const result = await pool.query(
    `
      SELECT
        e.*,
        COUNT(r.id) FILTER (WHERE r.status NOT IN ('rejected', 'waitlisted'))::int AS registrations_count,
        COUNT(r.id) FILTER (WHERE r.status = 'waitlisted')::int AS waitlist_count
      FROM events e
      LEFT JOIN registrations r ON r.event_slug = e.slug
      WHERE e.is_active = TRUE
      GROUP BY e.id
      ORDER BY e.id ASC
    `,
  );

  return result.rows;
}

function buildSmartAlerts(events, now = new Date()) {
  const alerts = [];

  for (const event of events) {
    const eventStart = parseEventDateTime(event.date_label, event.time_label);
    if (!eventStart) continue;

    const diffMs = eventStart.getTime() - now.getTime();
    if (diffMs <= 0) continue;

    const minutesUntilStart = Math.ceil(diffMs / (60 * 1000));
    const remainingSlots =
      event.max_slots === null ? null : Math.max(Number(event.max_slots) - Number(event.registrations_count || 0), 0);
    const dynamicLowSlotThreshold =
      event.max_slots === null ? LOW_SLOT_ALERT_THRESHOLD : Math.max(LOW_SLOT_ALERT_THRESHOLD, Math.ceil(Number(event.max_slots) * 0.1));
    const lowSlots = remainingSlots !== null && remainingSlots > 0 && remainingSlots <= dynamicLowSlotThreshold;
    const registrationClosingSoon = diffMs <= REGISTRATION_CLOSING_WINDOW_MS;

    if (diffMs <= EVENT_START_REMINDER_WINDOW_MS) {
      alerts.push({
        id: `event-starting-soon:${event.slug}`,
        kind: 'event-starting-soon',
        severity: 'critical',
        title: `${event.name} starts in ${formatMinutesUntilStart(minutesUntilStart)}`,
        message: `${event.venue} / ${event.date_label} / ${event.time_label}. Registered participants should be ready to join and check their inbox for reminders.`,
        event_slug: event.slug,
        event_name: event.name,
        starts_at: eventStart.toISOString(),
        minutes_until_start: minutesUntilStart,
        remaining_slots: remainingSlots,
        cta_label: 'Open tracker',
        cta_href: '#tracker',
      });
    }

    if (registrationClosingSoon || lowSlots) {
      const pieces = [];

      if (registrationClosingSoon) {
        pieces.push(`Registration window is entering its final ${Math.max(1, Math.ceil(diffMs / (60 * 60 * 1000)))} hour${Math.ceil(diffMs / (60 * 60 * 1000)) === 1 ? '' : 's'}.`);
      }

      if (lowSlots) {
        pieces.push(`${remainingSlots} slot${remainingSlots === 1 ? '' : 's'} remaining.`);
      }

      alerts.push({
        id: `registration-closing-soon:${event.slug}`,
        kind: 'registration-closing-soon',
        severity: lowSlots || diffMs <= 6 * 60 * 60 * 1000 ? 'critical' : 'warning',
        title: `${event.name} registration closing soon`,
        message: `${pieces.join(' ')} Register before the event fills up or reaches its start window.`,
        event_slug: event.slug,
        event_name: event.name,
        starts_at: eventStart.toISOString(),
        minutes_until_start: minutesUntilStart,
        remaining_slots: remainingSlots,
        cta_label: 'Register now',
        cta_href: '#registration-panel',
      });
    }
  }

  const severityRank = { critical: 0, warning: 1, info: 2 };

  return alerts
    .sort((left, right) => {
      const severityDiff = severityRank[left.severity] - severityRank[right.severity];
      if (severityDiff !== 0) return severityDiff;
      return new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime();
    })
    .slice(0, 6);
}

function formatStatusTitle(status) {
  if (status === 'verified') return 'Registration Verified';
  if (status === 'rejected') return 'Registration Needs Attention';
  if (status === 'waitlisted') return 'Added to Waitlist';
  return 'Registration Under Review';
}

function buildEmailInfoGrid(items) {
  return items
    .map(
      (item) => `
        <div style="border-radius:18px;padding:14px 16px;background:linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04));border:1px solid rgba(255,255,255,0.08);box-shadow:inset 0 1px 0 rgba(255,255,255,0.04);">
          <div style="font-size:10px;letter-spacing:0.24em;text-transform:uppercase;color:#94a3b8;font-weight:700;">${item.label}</div>
          <div style="margin-top:6px;color:${item.valueColor || '#ffffff'};font-size:${item.compact ? '13px' : '16px'};line-height:${item.compact ? '1.6' : '1.45'};font-weight:700;word-break:break-word;">${item.value}</div>
        </div>
      `,
    )
    .join('');
}

function buildPortalEmailHtml({
  overline,
  title,
  intro,
  accentGradient,
  accentTone,
  badgeLabel = '',
  sections = [],
  notice = '',
  bodyAfterGrid = '',
  footerCopy = 'Thank you for participating in CEAS COGNOTSAV 2026.',
}) {
  const logoUrl = `${publicAppUrl.replace(/\/$/, '')}/images/ceasposter.jpeg`;
  const safeBadge = badgeLabel ? `<div style="display:inline-flex;align-items:center;border-radius:999px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.06);padding:8px 12px;font-size:11px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:${accentTone};">${badgeLabel}</div>` : '';
  const safeNotice = notice
    ? `<div style="margin-top:18px;border-radius:18px;padding:16px;background:linear-gradient(135deg,rgba(251,191,36,0.12),rgba(251,191,36,0.06));border:1px solid rgba(251,191,36,0.18);color:#fef3c7;line-height:1.7;">${notice}</div>`
    : '';
  const safeAfterGrid = bodyAfterGrid
    ? `<div style="margin-top:18px;color:#cbd5e1;line-height:1.75;">${bodyAfterGrid}</div>`
    : '';

  return `
    <div style="margin:0;padding:30px 16px;background:radial-gradient(circle at top left,rgba(251,191,36,0.16),transparent 22%),radial-gradient(circle at bottom right,rgba(34,211,238,0.14),transparent 22%),linear-gradient(180deg,#08111f 0%,#0f172a 100%);font-family:Inter,Arial,sans-serif;color:#e2e8f0;">
      <div style="max-width:680px;margin:0 auto;border-radius:28px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);background:linear-gradient(145deg,#111827,#171b2e);box-shadow:0 30px 72px rgba(2,8,23,0.38);">
        <div style="position:relative;padding:22px 24px 24px;background:${accentGradient};border-bottom:1px solid rgba(255,255,255,0.08);">
          <div style="position:absolute;right:-30px;top:-20px;width:180px;height:180px;background:url('${logoUrl}') center/contain no-repeat;opacity:0.08;pointer-events:none;"></div>
          <div style="display:flex;align-items:center;gap:14px;position:relative;z-index:1;">
            <div style="width:64px;height:64px;border-radius:20px;padding:5px;background:linear-gradient(180deg,rgba(255,255,255,0.24),rgba(203,213,225,0.1));border:1px solid rgba(255,255,255,0.16);box-shadow:inset 0 1px 0 rgba(255,255,255,0.48),0 12px 24px rgba(2,8,23,0.2);">
              <img src="${logoUrl}" alt="CEAS logo" style="display:block;width:100%;height:100%;object-fit:cover;border-radius:16px;" />
            </div>
            <div>
              <div style="font-size:10px;letter-spacing:0.38em;text-transform:uppercase;color:#bfdbfe;font-weight:700;">Computer Engineering Association</div>
              <div style="margin-top:6px;font-family:Orbitron,Inter,Arial,sans-serif;font-size:24px;line-height:1.1;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#ffffff;">CEAS COGNOTSAV 2026</div>
            </div>
          </div>
          <div style="position:relative;z-index:1;margin-top:18px;">
            <div style="font-size:11px;letter-spacing:0.34em;text-transform:uppercase;color:#dbeafe;font-weight:700;">${overline}</div>
            <h1 style="margin:12px 0 0;font-size:30px;line-height:1.12;color:#ffffff;">${title}</h1>
          </div>
        </div>
        <div style="position:relative;padding:24px;">
          <div style="position:absolute;inset:0;background:url('${logoUrl}') center/240px no-repeat;opacity:0.04;pointer-events:none;"></div>
          <div style="position:relative;z-index:1;">
            ${safeBadge}
            <div style="margin-top:${badgeLabel ? '18px' : '0'};color:#cbd5e1;line-height:1.75;">${intro}</div>
            <div style="margin-top:18px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;">
              ${sections.join('')}
            </div>
            ${safeNotice}
            ${safeAfterGrid}
            <div style="margin-top:22px;border-radius:18px;padding:16px;background:linear-gradient(135deg,rgba(59,130,246,0.12),rgba(168,85,247,0.1));border:1px solid rgba(96,165,250,0.18);color:#dbeafe;line-height:1.7;">
              ${footerCopy}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function buildStatusEmail(registration) {
  const eventLine = `${registration.event_name} / ${registration.date_label} / ${registration.time_label}`;
  const salutation = registration.contact_name || registration.team_name || 'Participant';
  const statusTitle = formatStatusTitle(registration.status);

  const introByStatus = {
    verified:
      `Your registration for ${registration.event_name} has been verified successfully.`,
    rejected:
      `We reviewed your registration for ${registration.event_name}, but we could not verify the payment details yet. Please review the details below and connect with the organizers if needed.`,
    waitlisted:
      `This event is currently full, so your registration has been placed on the waitlist for ${registration.event_name}. We will notify you if a slot opens up.`,
    pending:
      `Your registration for ${registration.event_name} is currently under review. Thank you for your patience while the organizer team completes verification.`,
  };

  const nextStepByStatus = {
    verified:
      'Please keep your registration code handy and report to the venue on time on the event day.',
    rejected:
      'You can reply with the correct payment proof or contact the event organizers with your transaction reference.',
    waitlisted:
      'Keep your registration code ready. If a slot opens, the organizer team can promote your registration automatically.',
    pending:
      'No action is required from your side right now unless an organizer contacts you for clarification.',
  };

  const subject = `${statusTitle} - ${registration.event_name} - ${registration.registration_code}`;
  const intro = introByStatus[registration.status] || introByStatus.pending;
  const nextStep = nextStepByStatus[registration.status] || nextStepByStatus.pending;
  const reviewNoteLine = registration.review_note ? `Organizer note: ${registration.review_note}` : null;
  const text = [
    `Hi ${salutation},`,
    '',
    intro,
    '',
    `Registration code: ${registration.registration_code}`,
    `Team name: ${registration.team_name}`,
    `Event: ${registration.event_name}`,
    `Schedule: ${eventLine}`,
    `Venue: ${registration.venue}`,
    `Current status: ${getPaymentStatusLabel(registration.status)}`,
    ...(registration.status === 'verified'
      ? [
          `Amount paid: INR ${registration.total_amount}`,
          `Payment reference: ${registration.payment_reference || 'Pending manual entry'}`,
        ]
      : []),
    ...(reviewNoteLine ? ['', reviewNoteLine] : []),
    '',
    nextStep,
    '',
    'Thank you for participating in CEAS COGNOTSAV 2026.',
    'CEAS Registration Team',
  ].join('\n');

  const accentColor =
    registration.status === 'verified'
      ? '#34d399'
      : registration.status === 'rejected'
        ? '#fb7185'
        : '#fbbf24';

  const safeSalutation = escapeHtml(salutation);
  const safeStatusTitle = escapeHtml(statusTitle);
  const safeIntro = escapeHtml(intro);
  const safeNextStep = escapeHtml(nextStep);
  const safeRegistrationCode = escapeHtml(registration.registration_code);
  const safeTeamName = escapeHtml(registration.team_name);
  const safeEventName = escapeHtml(registration.event_name);
  const safeEventLine = escapeHtml(eventLine);
  const safeVenue = escapeHtml(registration.venue);
  const safeStatusLabel = escapeHtml(getPaymentStatusLabel(registration.status));
  const safePaymentReference = escapeHtml(registration.payment_reference || 'Pending manual entry');
  const safeTotalAmount = escapeHtml(`INR ${registration.total_amount}`);
  const verifiedPassQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    `COGNOTSAV|${registration.registration_code}|${registration.event_name}|${registration.venue}`,
  )}`;
  const verifiedPassInstructions = registration.status === 'verified'
    ? `
        <div style="margin-top:18px;border-radius:20px;padding:18px;background:linear-gradient(135deg,rgba(16,185,129,0.12),rgba(34,211,238,0.1));border:1px solid rgba(52,211,153,0.18);color:#ecfdf5;line-height:1.75;">
          <strong style="display:block;margin-bottom:8px;font-size:15px;color:#ffffff;">Official verified pass issued</strong>
          Your official event pass is now available in this email. Please download or save this email as a PDF, and show the QR code plus your registration code at event time.
        </div>
        <div style="margin-top:16px;border-radius:20px;padding:18px;background:linear-gradient(180deg,rgba(15,23,42,0.78),rgba(255,255,255,0.04));border:1px solid rgba(255,255,255,0.08);text-align:center;">
          <div style="display:inline-flex;border-radius:18px;background:#ffffff;padding:10px;box-shadow:0 14px 30px rgba(2,8,23,0.18);">
            <img src="${verifiedPassQrUrl}" alt="Verified pass QR" style="display:block;width:170px;height:170px;" />
          </div>
          <div style="margin-top:12px;font-size:12px;color:#cbd5e1;line-height:1.65;">Show this QR with registration code <strong style="color:#ffffff;">${safeRegistrationCode}</strong> during venue verification.</div>
        </div>
      `
    : '';

  const gridSections = buildEmailInfoGrid([
    { label: 'Registration code', value: safeRegistrationCode },
    { label: 'Team name', value: safeTeamName },
    { label: 'Event', value: safeEventName },
    { label: 'Schedule', value: safeEventLine, compact: true },
    { label: 'Venue', value: safeVenue, compact: true },
    { label: 'Current status', value: safeStatusLabel, valueColor: accentColor },
    ...(registration.status === 'verified'
      ? [
          { label: 'Amount paid', value: safeTotalAmount },
          { label: 'Payment reference', value: safePaymentReference, compact: true },
        ]
      : []),
  ]);

  const html = buildPortalEmailHtml({
    overline: 'Registration Update',
    title: safeStatusTitle,
    intro: `Hi ${safeSalutation},<br /><br />${safeIntro}`,
    accentGradient: 'linear-gradient(90deg,rgba(59,130,246,0.2),rgba(168,85,247,0.16),rgba(236,72,153,0.18))',
    accentTone: accentColor,
    badgeLabel: safeStatusLabel,
    sections: [gridSections],
    notice: registration.review_note ? `Organizer note: ${escapeHtml(registration.review_note)}` : '',
    bodyAfterGrid: `${safeNextStep}${verifiedPassInstructions}`,
  });

  return {
    subject,
    text,
    html,
    preview: text.slice(0, 280),
  };
}

async function logRegistrationNotification({
  registrationId,
  notificationType = 'status-update',
  channel = 'email',
  recipient,
  subject,
  messagePreview,
  relatedStatus,
  deliveryStatus,
  errorMessage = null,
  providerMessageId = null,
}) {
  const result = await pool.query(
    `
      INSERT INTO registration_notifications (
        id, registration_id, notification_type, channel, recipient, subject,
        message_preview, related_status, delivery_status, provider_message_id, error_message
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING notification_type, channel, recipient, related_status, delivery_status, provider_message_id, error_message, created_at
    `,
    [
      randomUUID(),
      registrationId,
      notificationType,
      channel,
      recipient,
      subject,
      messagePreview,
      relatedStatus,
      deliveryStatus,
      providerMessageId,
      errorMessage,
    ],
  );

  return result.rows[0];
}

async function registrationNotificationExists(registrationId, notificationType, relatedStatus) {
  const result = await pool.query(
    `
      SELECT 1
      FROM registration_notifications
      WHERE registration_id = $1
        AND notification_type = $2
        AND related_status = $3
      LIMIT 1
    `,
    [registrationId, notificationType, relatedStatus],
  );

  return result.rowCount > 0;
}

async function getNotificationReadyRegistration(registrationId) {
  const result = await pool.query(
    `
      SELECT
        r.id,
        r.event_slug,
        r.registration_code,
        r.team_name,
        r.contact_name,
        r.contact_email,
        r.contact_phone,
        r.payment_reference,
        r.total_amount,
        r.status,
        r.review_note,
        e.name AS event_name,
        e.date_label,
        e.time_label,
        e.venue
      FROM registrations r
      JOIN events e ON e.slug = r.event_slug
      WHERE r.id = $1
      LIMIT 1
    `,
    [registrationId],
  );

  return result.rows[0] ?? null;
}

async function sendStatusNotification(registration) {
  if (!registration) return null;

  const email = buildStatusEmail(registration);

  if (!emailConfigured) {
    return logRegistrationNotification({
      registrationId: registration.id,
      notificationType: 'status-update',
      recipient: registration.contact_email,
      subject: email.subject,
      messagePreview: email.preview,
      relatedStatus: registration.status,
      deliveryStatus: 'skipped',
      errorMessage: 'Transactional email is not configured yet.',
    });
  }

  try {
    const info = await sendPortalMail({
      from: smtpFromName ? `"${smtpFromName}" <${smtpFromEmail}>` : smtpFromEmail,
      to: registration.contact_email,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });

    return logRegistrationNotification({
      registrationId: registration.id,
      notificationType: 'status-update',
      recipient: registration.contact_email,
      subject: email.subject,
      messagePreview: email.preview,
      relatedStatus: registration.status,
      deliveryStatus: 'sent',
      providerMessageId: info.messageId || null,
    });
  } catch (error) {
    return logRegistrationNotification({
      registrationId: registration.id,
      notificationType: 'status-update',
      recipient: registration.contact_email,
      subject: email.subject,
      messagePreview: email.preview,
      relatedStatus: registration.status,
      deliveryStatus: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown email delivery error.',
    });
  }
}

function buildEventStartReminderEmail(registration, eventStart) {
  const eventLine = `${registration.event_name} / ${registration.date_label} / ${registration.time_label}`;
  const salutation = registration.contact_name || registration.team_name || 'Participant';
  const formattedStartTime = eventStart.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  });
  const subject = `Reminder: ${registration.event_name} starts in about 1 hour`;
  const text = [
    `Hi ${salutation},`,
    '',
    `Quick reminder: ${registration.event_name} is scheduled to begin in about 1 hour.`,
    '',
    `Registration code: ${registration.registration_code}`,
    `Event: ${registration.event_name}`,
    `Schedule: ${eventLine}`,
    `Starts at: ${formattedStartTime} IST`,
    `Venue: ${registration.venue}`,
    '',
    'Please arrive a little early and keep your registration code handy for verification.',
    '',
    'All the best, and thank you for participating in CEAS COGNOTSAV 2026.',
    'CEAS Registration Team',
  ].join('\n');

  const html = buildPortalEmailHtml({
    overline: 'Event Reminder',
    title: `${escapeHtml(registration.event_name)} starts in about 1 hour`,
    intro: `Hi ${escapeHtml(salutation)},<br /><br />Your verified registration is all set. Please be ready to join the event shortly.`,
    accentGradient: 'linear-gradient(90deg,rgba(34,211,238,0.18),rgba(59,130,246,0.18),rgba(168,85,247,0.18))',
    accentTone: '#67e8f9',
    badgeLabel: 'Starts Soon',
    sections: [
      buildEmailInfoGrid([
        { label: 'Registration code', value: escapeHtml(registration.registration_code) },
        { label: 'Event', value: escapeHtml(registration.event_name) },
        { label: 'Starts at', value: escapeHtml(`${formattedStartTime} IST`) },
        { label: 'Venue', value: escapeHtml(registration.venue), compact: true },
      ]),
    ],
    bodyAfterGrid: 'Please arrive a little early and keep your registration code handy for event-day verification.',
  });

  return {
    subject,
    text,
    html,
    preview: text.slice(0, 280),
  };
}

async function sendEventStartReminderNotification(registration, eventStart) {
  const reminderKey = 'event-start-1-hour';
  const alreadySent = await registrationNotificationExists(registration.id, 'event-reminder', reminderKey);
  if (alreadySent) {
    return null;
  }

  const email = buildEventStartReminderEmail(registration, eventStart);

  if (!emailConfigured) {
    return logRegistrationNotification({
      registrationId: registration.id,
      notificationType: 'event-reminder',
      recipient: registration.contact_email,
      subject: email.subject,
      messagePreview: email.preview,
      relatedStatus: reminderKey,
      deliveryStatus: 'skipped',
      errorMessage: 'Transactional email is not configured yet.',
    });
  }

  try {
    const info = await sendPortalMail({
      from: smtpFromName ? `"${smtpFromName}" <${smtpFromEmail}>` : smtpFromEmail,
      to: registration.contact_email,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });

    return logRegistrationNotification({
      registrationId: registration.id,
      notificationType: 'event-reminder',
      recipient: registration.contact_email,
      subject: email.subject,
      messagePreview: email.preview,
      relatedStatus: reminderKey,
      deliveryStatus: 'sent',
      providerMessageId: info.messageId || null,
    });
  } catch (error) {
    return logRegistrationNotification({
      registrationId: registration.id,
      notificationType: 'event-reminder',
      recipient: registration.contact_email,
      subject: email.subject,
      messagePreview: email.preview,
      relatedStatus: reminderKey,
      deliveryStatus: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown reminder delivery error.',
    });
  }
}

async function processSmartNotifications() {
  const result = await pool.query(
    `
      SELECT
        r.id,
        r.registration_code,
        r.team_name,
        r.contact_name,
        r.contact_email,
        r.status,
        e.name AS event_name,
        e.date_label,
        e.time_label,
        e.venue
      FROM registrations r
      JOIN events e ON e.slug = r.event_slug
      WHERE r.status = 'verified'
        AND e.is_active = TRUE
    `,
  );

  const now = new Date();
  for (const registration of result.rows) {
    const eventStart = parseEventDateTime(registration.date_label, registration.time_label);
    if (!eventStart) continue;

    const diffMs = eventStart.getTime() - now.getTime();
    if (diffMs <= 0 || diffMs > EVENT_START_REMINDER_WINDOW_MS) {
      continue;
    }

    await sendEventStartReminderNotification(registration, eventStart);
  }
}

function startSmartNotificationWorker() {
  const run = () => {
    processSmartNotifications().catch((error) => {
      console.error('Smart notification worker failed', error);
    });
  };

  run();
  const timer = setInterval(run, SMART_NOTIFICATION_POLL_MS);
  if (typeof timer.unref === 'function') {
    timer.unref();
  }
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return entities[character] || character;
  });
}

function formatAttendanceStatusLabel(status) {
  if (status === 'arrived') return 'Arrived';
  if (status === 'checked-in') return 'Checked in';
  if (status === 'absent') return 'Absent';
  if (status === 'completed') return 'Completed';
  return 'Registered';
}

function buildRegistrationTimeline(registration, notifications) {
  const reminderNotification = [...notifications]
    .reverse()
    .find((notification) => notification.notification_type === 'event-reminder' && notification.delivery_status === 'sent');

  const verificationLabel =
    registration.status === 'waitlisted'
      ? 'Waitlisted'
      : registration.status === 'rejected'
        ? 'Needs correction'
        : 'Verified';

  const verificationState =
    registration.status === 'verified'
      ? 'done'
      : registration.status === 'rejected'
        ? 'attention'
        : registration.status === 'waitlisted'
          ? 'current'
          : 'pending';

  const verificationDescription =
    registration.status === 'verified'
      ? 'Your entry has been approved and the QR pass is ready for event-day check-in.'
      : registration.status === 'rejected'
        ? registration.review_note || 'The organizer requested an update to the payment proof or transaction details.'
        : registration.status === 'waitlisted'
          ? `The event is currently full, so your registration is queued${registration.waitlist_position ? ` at waitlist position ${registration.waitlist_position}` : ''}.`
          : 'This step unlocks after the organizer verifies your payment proof.';

  const attendanceState =
    registration.attendance_status === 'registered'
      ? registration.status === 'verified'
        ? 'current'
        : 'pending'
      : registration.attendance_status === 'absent'
        ? 'attention'
        : 'done';

  return [
    {
      id: 'submitted',
      label: 'Submitted',
      description: `Registration created for ${registration.event_name}.`,
      at: registration.created_at,
      state: 'done',
    },
    {
      id: 'payment-review',
      label: 'Payment under review',
      description:
        registration.status === 'pending'
          ? 'The organizer team is reviewing the submitted payment details.'
          : 'The payment review stage has been completed.',
      at: registration.status === 'pending' ? null : registration.updated_at || registration.created_at,
      state: registration.status === 'pending' ? 'current' : 'done',
    },
    {
      id: 'verification',
      label: verificationLabel,
      description: verificationDescription,
      at:
        registration.status === 'verified'
          ? registration.verified_at || registration.updated_at || registration.created_at
          : registration.status === 'pending'
            ? null
            : registration.updated_at || registration.created_at,
      state: verificationState,
    },
    {
      id: 'reminder',
      label: 'Reminder sent',
      description: reminderNotification
        ? 'A reminder email was delivered before the event start time.'
        : 'This step activates automatically close to the event start.',
      at: reminderNotification?.created_at || null,
      state: reminderNotification
        ? 'done'
        : registration.status === 'verified'
          ? 'current'
          : 'pending',
    },
    {
      id: 'attendance',
      label: formatAttendanceStatusLabel(registration.attendance_status),
      description:
        registration.attendance_status === 'registered'
          ? 'The organizer will mark your event-day attendance here.'
          : `Event-day attendance is marked as ${formatAttendanceStatusLabel(registration.attendance_status).toLowerCase()}.`,
      at: registration.attendance_marked_at || null,
      state: attendanceState,
    },
  ];
}

async function fetchLookupRegistrations(query) {
  const normalized = query.toLowerCase();
  const result = await pool.query(
    `
      SELECT
        r.id,
        r.registration_code,
        r.team_name,
        r.contact_name,
        r.contact_email,
        r.payment_method,
        r.payment_reference,
        r.status,
        r.created_at,
        r.updated_at,
        r.verified_at,
        r.review_note,
        r.attendance_status,
        r.attendance_marked_at,
        r.total_amount,
        r.invite_token,
        e.name AS event_name,
        e.slug AS event_slug,
        e.date_label,
        e.time_label,
        e.venue,
        CASE
          WHEN r.status = 'waitlisted' THEN (
            SELECT COUNT(*)::int
            FROM registrations waitlisted
            WHERE waitlisted.event_slug = r.event_slug
              AND waitlisted.status = 'waitlisted'
              AND (
                waitlisted.created_at < r.created_at OR
                (waitlisted.created_at = r.created_at AND waitlisted.id <= r.id)
              )
          )
          ELSE NULL
        END AS waitlist_position
      FROM registrations r
      JOIN events e ON e.slug = r.event_slug
      WHERE LOWER(r.registration_code) = $1
         OR LOWER(r.contact_email) = $1
      ORDER BY r.created_at DESC
    `,
    [normalized],
  );

  if (result.rowCount === 0) {
    return [];
  }

  const registrationIds = result.rows.map((row) => row.id);
  const notificationsResult = await pool.query(
    `
      SELECT
        registration_id,
        notification_type,
        related_status,
        delivery_status,
        created_at
      FROM registration_notifications
      WHERE registration_id = ANY($1::text[])
      ORDER BY created_at ASC
    `,
    [registrationIds],
  );

  const notificationsByRegistrationId = new Map();
  for (const notification of notificationsResult.rows) {
    const collection = notificationsByRegistrationId.get(notification.registration_id) || [];
    collection.push(notification);
    notificationsByRegistrationId.set(notification.registration_id, collection);
  }

  return result.rows.map((row) => {
    const notifications = notificationsByRegistrationId.get(row.id) || [];

    return {
      ...row,
      qr_value: buildQrValue(row.registration_code),
      invite_link: row.invite_token ? `#join-team/${row.invite_token}` : null,
      timeline: buildRegistrationTimeline(row, notifications),
    };
  });
}

async function fetchAnnouncements({ includeExpired = false, limit = 16, eventSlug = null, includeGeneral = true } = {}) {
  const clauses = [];
  const params = [];
  let paramIndex = 1;
  if (!includeExpired) {
    clauses.push('(a.starts_at IS NULL OR a.starts_at <= NOW())');
    clauses.push('(a.expires_at IS NULL OR a.expires_at >= NOW())');
  }

  if (eventSlug) {
    params.push(eventSlug);
    clauses.push(includeGeneral ? `(a.event_slug = $${paramIndex} OR a.event_slug IS NULL)` : `a.event_slug = $${paramIndex}`);
    paramIndex += 1;
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  params.push(limit);
  const result = await pool.query(
    `
      SELECT
        a.id,
        a.title,
        a.message,
        a.event_slug,
        a.is_pinned,
        a.created_by,
        a.starts_at,
        a.expires_at,
        a.created_at,
        e.name AS event_name
      FROM portal_announcements a
      LEFT JOIN events e ON e.slug = a.event_slug
      ${whereClause}
      ORDER BY a.is_pinned DESC, a.created_at DESC
      LIMIT $${paramIndex}
    `,
    params,
  );

  return result.rows;
}

async function createAnnouncement({
  title,
  message,
  eventSlug = null,
  isPinned = false,
  createdBy = null,
  startsAt = null,
  expiresAt = null,
}) {
  const result = await pool.query(
    `
      INSERT INTO portal_announcements (
        id, title, message, event_slug, is_pinned, created_by, starts_at, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, title, message, event_slug, is_pinned, created_by, starts_at, expires_at, created_at
    `,
    [
      randomUUID(),
      String(title || '').trim(),
      String(message || '').trim(),
      eventSlug || null,
      Boolean(isPinned),
      createdBy || null,
      startsAt || null,
      expiresAt || null,
    ],
  );

  return result.rows[0] || null;
}

async function deleteAnnouncement(announcementId) {
  const result = await pool.query(
    `
      DELETE FROM portal_announcements
      WHERE id = $1
      RETURNING id
    `,
    [String(announcementId || '').trim()],
  );

  return result.rows[0] || null;
}

function buildBroadcastEmail(registration, announcement) {
  const eventLine = `${registration.event_name} / ${registration.date_label} / ${registration.time_label}`;
  const salutation = registration.contact_name || registration.team_name || 'Participant';
  const safeTitle = escapeHtml(announcement.title);
  const safeMessage = escapeHtml(announcement.message).replaceAll('\n', '<br />');
  const subject = `${announcement.title} - ${registration.event_name}`;
  const preview = `${announcement.title}: ${announcement.message}`.slice(0, 280);
  const text = [
    `Hi ${salutation},`,
    '',
    announcement.title,
    '',
    announcement.message,
    '',
    `Event: ${registration.event_name}`,
    `Schedule: ${eventLine}`,
    `Venue: ${registration.venue}`,
    `Registration code: ${registration.registration_code}`,
    '',
    'Please keep checking the participant portal for the latest official updates.',
    'CEAS Registration Team',
  ].join('\n');

  const html = buildPortalEmailHtml({
    overline: 'Organizer Broadcast',
    title: safeTitle,
    intro: `Hi ${escapeHtml(salutation)},<br /><br />${safeMessage}`,
    accentGradient: 'linear-gradient(90deg,rgba(59,130,246,0.2),rgba(236,72,153,0.16),rgba(251,191,36,0.18))',
    accentTone: '#fde68a',
    badgeLabel: announcement.is_pinned ? 'Priority Update' : 'Latest Update',
    sections: [
      buildEmailInfoGrid([
        { label: 'Event', value: escapeHtml(registration.event_name) },
        { label: 'Schedule', value: escapeHtml(eventLine), compact: true },
        { label: 'Venue', value: escapeHtml(registration.venue), compact: true },
        { label: 'Registration code', value: escapeHtml(registration.registration_code) },
      ]),
    ],
    bodyAfterGrid: 'Please keep checking the participant portal for the latest official updates.',
  });

  return {
    subject,
    text,
    html,
    preview,
  };
}

async function sendBroadcastAnnouncement({
  title,
  message,
  eventSlug = null,
  isPinned = false,
  startsAt = null,
  expiresAt = null,
  createdBy = null,
}) {
  console.log('Creating announcement...');
  const announcement = await createAnnouncement({
    title,
    message,
    eventSlug,
    isPinned,
    startsAt,
    expiresAt,
    createdBy,
  });

  if (!announcement) {
    throw new Error('Failed to create announcement');
  }

  console.log('Announcement created:', announcement.id);

  const result = await pool.query(
    `
      SELECT
        r.id,
        r.registration_code,
        r.team_name,
        r.contact_name,
        r.contact_email,
        e.name AS event_name,
        e.date_label,
        e.time_label,
        e.venue
      FROM registrations r
      JOIN events e ON e.slug = r.event_slug
      WHERE r.status = 'verified'
        AND ($1::text IS NULL OR r.event_slug = $1)
      ORDER BY r.created_at ASC
    `,
    [eventSlug],
  );

  console.log(`Found ${result.rowCount} verified registrations to notify`);

  const stats = {
    total: result.rowCount,
    sent: 0,
    failed: 0,
    skipped: 0,
  };

  for (const registration of result.rows) {
    const email = buildBroadcastEmail(registration, announcement);
    if (!emailConfigured) {
      console.log('Transactional email not configured, skipping email to:', registration.contact_email);
      await logRegistrationNotification({
        registrationId: registration.id,
        notificationType: 'broadcast',
        recipient: registration.contact_email,
        subject: email.subject,
        messagePreview: email.preview,
        relatedStatus: announcement.id,
        deliveryStatus: 'skipped',
        errorMessage: 'Transactional email is not configured yet.',
      });
      stats.skipped += 1;
      continue;
    }

    try {
      console.log('Sending email to:', registration.contact_email);
      const info = await sendPortalMail({
        from: smtpFromName ? `"${smtpFromName}" <${smtpFromEmail}>` : smtpFromEmail,
        to: registration.contact_email,
        subject: email.subject,
        text: email.text,
        html: email.html,
      });

      await logRegistrationNotification({
        registrationId: registration.id,
        notificationType: 'broadcast',
        recipient: registration.contact_email,
        subject: email.subject,
        messagePreview: email.preview,
        relatedStatus: announcement.id,
        deliveryStatus: 'sent',
        providerMessageId: info.messageId || null,
      });
      stats.sent += 1;
      console.log('Email sent successfully to:', registration.contact_email);
    } catch (error) {
      console.error('Email send failed to:', registration.contact_email, error.message);
      await logRegistrationNotification({
        registrationId: registration.id,
        notificationType: 'broadcast',
        recipient: registration.contact_email,
        subject: email.subject,
        messagePreview: email.preview,
        relatedStatus: announcement.id,
        deliveryStatus: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown broadcast delivery error.',
      });
      stats.failed += 1;
    }
  }

  console.log('Broadcast stats:', stats);
  return { announcement, stats };
}

async function listBackupSnapshots() {
  const entries = await fs.readdir(backupsDir, { withFileTypes: true });
  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.json'))
      .map(async (entry) => {
        const filePath = path.join(backupsDir, entry.name);
        const stats = await fs.stat(filePath);
        const trigger = entry.name.includes('-auto.json') ? 'auto' : 'manual';

        return {
          file_name: entry.name,
          created_at: stats.mtime.toISOString(),
          size_bytes: stats.size,
          trigger,
        };
      }),
  );

  return files.sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
}

async function writeBackupSnapshot(trigger = 'manual') {
  const [events, announcements] = await Promise.all([
    fetchActiveEventsWithCounts(),
    fetchAnnouncements({ includeExpired: true, limit: 100 }),
  ]);

  const registrationsResult = await pool.query(
    `
      SELECT
        r.id,
        r.registration_code,
        r.event_slug,
        r.team_name,
        r.college_name,
        r.department_name,
        r.year_of_study,
        r.contact_name,
        r.contact_email,
        r.contact_phone,
        r.payment_method,
        r.payment_reference,
        r.total_amount,
        r.status,
        r.review_note,
        r.attendance_status,
        r.created_at,
        r.updated_at,
        e.name AS event_name,
        e.date_label,
        e.time_label,
        e.venue,
        COALESCE(
          json_agg(
            json_build_object(
              'fullName', p.full_name,
              'email', p.email,
              'phone', p.phone,
              'isLead', p.is_lead
            )
            ORDER BY p.id
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'::json
        ) AS participants
      FROM registrations r
      JOIN events e ON e.slug = r.event_slug
      LEFT JOIN registration_participants p ON p.registration_id = r.id
      GROUP BY r.id, e.name, e.date_label, e.time_label, e.venue
      ORDER BY r.created_at DESC
    `,
  );

  const createdAt = new Date();
  const stamp = createdAt.toISOString().replaceAll(':', '-').replaceAll('.', '-');
  const safeTrigger = trigger === 'auto' ? 'auto' : 'manual';
  const fileName = `portal-backup-${stamp}-${safeTrigger}.json`;
  const filePath = path.join(backupsDir, fileName);
  const payload = {
    created_at: createdAt.toISOString(),
    trigger: safeTrigger,
    registrations: registrationsResult.rows,
    events,
    announcements,
  };

  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
  const stats = await fs.stat(filePath);

  return {
    file_name: fileName,
    created_at: stats.mtime.toISOString(),
    size_bytes: stats.size,
    trigger: safeTrigger,
  };
}

function startBackupWorker() {
  const run = () => {
    writeBackupSnapshot('auto').catch((error) => {
      console.error('Backup worker failed', error);
    });
  };

  run();
  const timer = setInterval(run, BACKUP_POLL_MS);
  if (typeof timer.unref === 'function') {
    timer.unref();
  }
}

async function promoteNextWaitlistedRegistration(eventSlug) {
  const waitlistResult = await pool.query(
    `
      SELECT id
      FROM registrations
      WHERE event_slug = $1
        AND status = 'waitlisted'
      ORDER BY created_at ASC, id ASC
      LIMIT 1
    `,
    [eventSlug],
  );

  if (waitlistResult.rowCount === 0) {
    return null;
  }

  const registrationId = waitlistResult.rows[0].id;
  await pool.query(
    `
      UPDATE registrations
      SET status = 'pending',
          updated_at = NOW()
      WHERE id = $1
    `,
    [registrationId],
  );

  const registration = await getNotificationReadyRegistration(registrationId);
  const notification = await sendStatusNotification(registration);
  const refreshedRegistration = await fetchAdminRegistrationById(registrationId);

  return {
    registration: refreshedRegistration,
    notification,
  };
}

async function fetchAdminRegistrations(whereClause = '', params = []) {
  const result = await pool.query(
    `
      SELECT
        r.id,
        r.registration_code,
        r.team_name,
        r.college_name,
        r.department_name,
        r.year_of_study,
        r.contact_name,
        r.contact_email,
        r.contact_phone,
        r.payment_method,
        r.payment_reference,
        r.payment_screenshot_path,
        r.payment_provider_order_id,
        r.payment_provider_payment_id,
        r.total_amount,
        r.status,
        r.notes,
        r.review_note,
        r.attendance_status,
        r.attendance_marked_at,
        r.verified_at,
        r.created_at,
        r.updated_at,
        e.name AS event_name,
        e.slug AS event_slug,
        e.date_label,
        e.time_label,
        e.venue,
        e.max_slots,
        CASE
          WHEN r.status = 'waitlisted' THEN (
            SELECT COUNT(*)::int
            FROM registrations waitlisted
            WHERE waitlisted.event_slug = r.event_slug
              AND waitlisted.status = 'waitlisted'
              AND (
                waitlisted.created_at < r.created_at OR
                (waitlisted.created_at = r.created_at AND waitlisted.id <= r.id)
              )
          )
          ELSE NULL
        END AS waitlist_position,
        (
          SELECT COUNT(*)::int
          FROM registrations duplicate_email
          WHERE LOWER(duplicate_email.contact_email) = LOWER(r.contact_email)
            AND duplicate_email.id <> r.id
            AND duplicate_email.status <> 'rejected'
        ) AS duplicate_email_count,
        (
          SELECT COUNT(*)::int
          FROM registrations duplicate_phone
          WHERE duplicate_phone.contact_phone = r.contact_phone
            AND duplicate_phone.id <> r.id
            AND duplicate_phone.status <> 'rejected'
        ) AS duplicate_phone_count,
        (
          SELECT COUNT(*)::int
          FROM registrations duplicate_payment
          WHERE duplicate_payment.payment_reference = r.payment_reference
            AND duplicate_payment.id <> r.id
            AND duplicate_payment.payment_reference IS NOT NULL
            AND duplicate_payment.status <> 'rejected'
        ) AS duplicate_payment_count,
        MAX(latest_notification.channel) AS latest_notification_channel,
        MAX(latest_notification.recipient) AS latest_notification_recipient,
        MAX(latest_notification.related_status) AS latest_notification_related_status,
        MAX(latest_notification.delivery_status) AS latest_notification_delivery_status,
        MAX(latest_notification.provider_message_id) AS latest_notification_provider_message_id,
        MAX(latest_notification.error_message) AS latest_notification_error_message,
        MAX(latest_notification.created_at)::timestamptz AS latest_notification_created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'fullName', p.full_name,
              'email', p.email,
              'phone', p.phone,
              'isLead', p.is_lead
            )
            ORDER BY p.id
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'::json
        ) AS participants
      FROM registrations r
      JOIN events e ON e.slug = r.event_slug
      LEFT JOIN LATERAL (
        SELECT
          n.channel,
          n.recipient,
          n.related_status,
          n.delivery_status,
          n.provider_message_id,
          n.error_message,
          n.created_at
        FROM registration_notifications n
        WHERE n.registration_id = r.id
          AND n.notification_type = 'status-update'
        ORDER BY n.created_at DESC
        LIMIT 1
      ) latest_notification ON TRUE
      LEFT JOIN registration_participants p ON p.registration_id = r.id
      ${whereClause}
      GROUP BY r.id, e.name, e.slug, e.date_label, e.time_label, e.venue, e.max_slots
      ORDER BY
        CASE
          WHEN r.status = 'pending' THEN 1
          WHEN r.status = 'verified' THEN 2
          WHEN r.status = 'waitlisted' THEN 3
          WHEN r.status = 'rejected' THEN 4
          ELSE 5
        END,
        r.created_at DESC
    `,
    params,
  );

  return result.rows.map((row) => {
    const hasNotification = Boolean(
      row.latest_notification_delivery_status ||
        row.latest_notification_created_at ||
        row.latest_notification_error_message ||
        row.latest_notification_recipient,
    );

    return {
      ...row,
      qr_value: buildQrValue(row.registration_code),
      latest_notification: hasNotification
        ? {
            channel: row.latest_notification_channel,
            recipient: row.latest_notification_recipient,
            related_status: row.latest_notification_related_status,
            delivery_status: row.latest_notification_delivery_status,
            provider_message_id: row.latest_notification_provider_message_id,
            error_message: row.latest_notification_error_message,
            created_at: row.latest_notification_created_at,
          }
        : null,
    };
  });
}

async function fetchAdminRegistrationById(registrationId, eventSlug = null) {
  const rows = eventSlug
    ? await fetchAdminRegistrations('WHERE r.id = $1 AND r.event_slug = $2', [registrationId, eventSlug])
    : await fetchAdminRegistrations('WHERE r.id = $1', [registrationId]);
  return rows[0] ?? null;
}

app.get('/api/health', async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true });
});

app.get('/api/events', async (_req, res) => {
  const rows = await fetchActiveEventsWithCounts();
  res.json(rows);
});

app.get('/api/alerts', async (_req, res) => {
  const events = await fetchActiveEventsWithCounts();
  const alerts = buildSmartAlerts(events);
  res.json(alerts);
});

app.get('/api/announcements', async (_req, res) => {
  const rows = await fetchAnnouncements({ includeExpired: true, limit: 20 });
  res.json(rows);
});

app.get('/api/registrations/lookup', async (req, res) => {
  const query = String(req.query.query || '').trim();
  if (!query) {
    return res.json([]);
  }

  const rows = await fetchLookupRegistrations(query);
  res.json(rows);
});

app.post('/api/registrations', async (req, res) => {
  const {
    eventSlug,
    teamName,
    collegeName,
    departmentName,
    yearOfStudy,
    contactName,
    contactEmail,
    contactPhone,
    paymentReference,
    paymentScreenshotDataUrl,
    notes,
    participants,
  } = req.body || {};

  if (
    !eventSlug ||
    !teamName ||
    !collegeName ||
    !departmentName ||
    !yearOfStudy ||
    !contactName ||
    !contactEmail ||
    !contactPhone ||
    !Array.isArray(participants) ||
    participants.length === 0
  ) {
    return res.status(400).json({ error: 'Missing required registration fields.' });
  }

  if (!paymentReference || !paymentScreenshotDataUrl) {
    return res.status(400).json({ error: 'UPI payment requires a transaction ID and screenshot.' });
  }

  const eventResult = await pool.query(
    `SELECT * FROM events WHERE slug = $1 AND is_active = TRUE`,
    [eventSlug],
  );

  const event = eventResult.rows[0];
  if (!event) {
    return res.status(404).json({ error: 'Selected event is not available.' });
  }

  if (participants.length < event.min_members || participants.length > event.max_members) {
    return res.status(400).json({
      error: `This event accepts ${event.min_members} to ${event.max_members} participants.`,
    });
  }

  const registrationId = randomUUID();
  const registrationCode = buildRegistrationCode();
  const inviteToken = buildInviteToken();
  const totalAmount = resolveRegistrationAmount(event, participants.length);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (paymentReference) {
      const duplicatePaymentResult = await client.query(
        `
          SELECT registration_code
          FROM registrations
          WHERE payment_reference = $1
            AND status <> 'rejected'
          LIMIT 1
        `,
        [String(paymentReference).trim()],
      );

      if (duplicatePaymentResult.rowCount > 0) {
        throw new Error('This transaction ID is already linked to another registration. Please verify your payment reference.');
      }
    }

    let initialStatus = 'pending';
    let waitlistPosition = null;
    if (event.max_slots !== null) {
      const slotResult = await client.query(
        `
          SELECT
            COUNT(*) FILTER (WHERE status NOT IN ('rejected', 'waitlisted'))::int AS registration_count,
            COUNT(*) FILTER (WHERE status = 'waitlisted')::int AS waitlist_count
          FROM registrations
          WHERE event_slug = $1
        `,
        [eventSlug],
      );
      const registrationCount = slotResult.rows[0]?.registration_count ?? 0;
      const waitlistCount = slotResult.rows[0]?.waitlist_count ?? 0;

      if (registrationCount >= event.max_slots) {
        initialStatus = 'waitlisted';
        waitlistPosition = waitlistCount + 1;
      }
    }

    const paymentScreenshotPath = await savePaymentScreenshot(paymentScreenshotDataUrl, registrationCode);

    await client.query(
      `
        INSERT INTO registrations (
          id, registration_code, event_slug, team_name, college_name, department_name,
          year_of_study, contact_name, contact_email, contact_phone, payment_method,
          payment_reference, payment_screenshot_path, payment_provider_order_id,
          payment_provider_payment_id, payment_provider_signature, total_amount, status, notes, invite_token
        )
        VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16,
          $17, $18, $19, $20
        )
      `,
      [
        registrationId,
        registrationCode,
        eventSlug,
        String(teamName).trim(),
        String(collegeName).trim(),
        String(departmentName).trim(),
        String(yearOfStudy).trim(),
        String(contactName).trim(),
        normalizeEmail(contactEmail),
        String(contactPhone).trim(),
        'upi',
        paymentReference ? String(paymentReference).trim() : null,
        paymentScreenshotPath,
        null,
        null,
        null,
        totalAmount,
        initialStatus,
        notes ? String(notes).trim() : null,
        inviteToken,
      ],
    );

    for (let index = 0; index < participants.length; index += 1) {
      const participant = participants[index];
      if (!participant?.fullName || !participant?.email || !participant?.phone) {
        throw new Error('Participant details are incomplete.');
      }

      await client.query(
        `
          INSERT INTO registration_participants (
            registration_id, full_name, email, phone, is_lead
          )
          VALUES ($1, $2, $3, $4, $5)
        `,
        [
          registrationId,
          String(participant.fullName).trim(),
          normalizeEmail(participant.email),
          String(participant.phone).trim(),
          index === 0,
        ],
      );
    }

    await client.query('COMMIT');
    const notification = await sendStatusNotification({
      id: registrationId,
      registration_code: registrationCode,
      team_name: String(teamName).trim(),
      contact_name: String(contactName).trim(),
      contact_email: normalizeEmail(contactEmail),
      contact_phone: String(contactPhone).trim(),
      payment_reference: paymentReference ? String(paymentReference).trim() : null,
      total_amount: totalAmount,
      status: initialStatus,
      review_note: null,
      event_name: event.name,
      date_label: event.date_label,
      time_label: event.time_label,
      venue: event.venue,
    });

    return res.status(201).json({
      success: true,
      registrationCode,
      eventName: event.name,
      totalAmount,
      paymentStatus: getPaymentStatusLabel(initialStatus),
      status: initialStatus,
      waitlistPosition,
      qrValue: buildQrValue(registrationCode),
      inviteLink: event.is_team_event ? `#join-team/${inviteToken}` : null,
      notification,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Registration failed.',
    });
  } finally {
    client.release();
  }
});

app.patch('/api/admin/registrations/:id/status', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};

  if (!['verified', 'rejected', 'pending', 'waitlisted'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }

  const currentResult = await pool.query(
    `
      SELECT id, status, event_slug
      FROM registrations
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  );

  if (currentResult.rowCount === 0) {
    return res.status(404).json({ error: 'Registration not found.' });
  }

  const previousStatus = currentResult.rows[0].status;
  const eventSlug = currentResult.rows[0].event_slug;

  if (!hasScopedEventAccess(req, eventSlug)) {
    return res.status(403).json({ error: 'This access key can verify registrations only for its assigned event.' });
  }

  await pool.query(
    `
      UPDATE registrations
      SET status = $2,
          verified_at = CASE
            WHEN $2 = 'verified' THEN NOW()
            WHEN $2 IN ('rejected', 'pending', 'waitlisted') THEN NULL
            ELSE verified_at
          END,
          updated_at = NOW()
      WHERE id = $1
    `,
    [id, status],
  );

  let notification = null;
  if (previousStatus !== status) {
    const registration = await getNotificationReadyRegistration(id);
    notification = await sendStatusNotification(registration);
  }

  let promotedRegistration = null;
  if (
    previousStatus !== 'rejected' &&
    previousStatus !== 'waitlisted' &&
    status === 'rejected'
  ) {
    promotedRegistration = await promoteNextWaitlistedRegistration(eventSlug);
  }

  const refreshedRegistration = await fetchAdminRegistrationById(
    id,
    req.adminAccess?.mode === 'event' ? req.adminAccess.eventSlug : null,
  );
  return res.json({
    registration: refreshedRegistration,
    notification,
    promotedRegistration,
    statusChanged: previousStatus !== status,
  });
});

app.patch('/api/admin/registrations/:id/review-note', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const reviewNote = String(req.body?.reviewNote || '').trim();

  const registrationScope = await pool.query(
    `
      SELECT event_slug
      FROM registrations
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  );

  if (registrationScope.rowCount === 0) {
    return res.status(404).json({ error: 'Registration not found.' });
  }

  if (!hasScopedEventAccess(req, registrationScope.rows[0].event_slug)) {
    return res.status(403).json({ error: 'This access key can update only its assigned event registrations.' });
  }

  await pool.query(
    `
      UPDATE registrations
      SET review_note = $2,
          updated_at = NOW()
      WHERE id = $1
    `,
    [id, reviewNote || null],
  );

  const registration = await fetchAdminRegistrationById(
    id,
    req.adminAccess?.mode === 'event' ? req.adminAccess.eventSlug : null,
  );
  if (!registration) {
    return res.status(404).json({ error: 'Registration not found.' });
  }

  return res.json({ registration });
});

app.delete('/api/admin/registrations/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  const registrationScope = await pool.query(
    `
      SELECT id, status, event_slug
      FROM registrations
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  );

  if (registrationScope.rowCount === 0) {
    return res.status(404).json({ error: 'Registration not found.' });
  }

  const registration = registrationScope.rows[0];

  if (!hasScopedEventAccess(req, registration.event_slug)) {
    return res.status(403).json({ error: 'This access key can delete only its assigned event registrations.' });
  }

  await pool.query(
    `
      DELETE FROM registrations
      WHERE id = $1
    `,
    [id],
  );

  let promotedRegistration = null;
  if (registration.status !== 'rejected' && registration.status !== 'waitlisted') {
    promotedRegistration = await promoteNextWaitlistedRegistration(registration.event_slug);
  }

  return res.json({
    success: true,
    id,
    promotedRegistration,
  });
});

app.patch('/api/admin/registrations/:id/attendance', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const attendanceStatus = String(req.body?.attendanceStatus || '').trim().toLowerCase();

  if (!['registered', 'arrived', 'checked-in', 'absent', 'completed'].includes(attendanceStatus)) {
    return res.status(400).json({ error: 'Invalid attendance status.' });
  }

  const registrationScope = await pool.query(
    `
      SELECT event_slug
      FROM registrations
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  );

  if (registrationScope.rowCount === 0) {
    return res.status(404).json({ error: 'Registration not found.' });
  }

  if (!hasScopedEventAccess(req, registrationScope.rows[0].event_slug)) {
    return res.status(403).json({ error: 'This access key can update only its assigned event registrations.' });
  }

  await pool.query(
    `
      UPDATE registrations
      SET attendance_status = $2,
          attendance_marked_at = CASE
            WHEN $2 = 'registered' THEN NULL
            ELSE NOW()
          END,
          updated_at = NOW()
      WHERE id = $1
    `,
    [id, attendanceStatus],
  );

  const registration = await fetchAdminRegistrationById(
    id,
    req.adminAccess?.mode === 'event' ? req.adminAccess.eventSlug : null,
  );
  if (!registration) {
    return res.status(404).json({ error: 'Registration not found.' });
  }

  return res.json({ registration });
});

app.get('/api/admin/registrations', requireAdmin, async (req, res) => {
  const rows =
    req.adminAccess?.mode === 'event'
      ? await fetchAdminRegistrations('WHERE r.event_slug = $1', [req.adminAccess.eventSlug])
      : await fetchAdminRegistrations();
  const access = await buildAdminAccessPayload(req.adminAccess);
  res.json({ rows, access });
});

app.get('/api/admin/announcements', requireAdmin, async (req, res) => {
  const rows = await fetchAnnouncements({
    includeExpired: true,
    limit: 30,
    eventSlug: req.adminAccess?.mode === 'event' ? req.adminAccess.eventSlug : null,
    includeGeneral: true,
  });
  res.json(rows);
});

app.delete('/api/admin/announcements/:id', requireAdmin, async (req, res) => {
  if (req.adminAccess?.mode === 'event') {
    return res.status(403).json({ error: 'Event-scoped access cannot delete updates.' });
  }

  try {
    const announcementId = String(req.params.id || '').trim();

    if (!announcementId) {
      return res.status(400).json({ error: 'Announcement id is required.' });
    }

    const deletedAnnouncement = await deleteAnnouncement(announcementId);
    if (!deletedAnnouncement) {
      return res.status(404).json({ error: 'Announcement not found.' });
    }

    return res.json({ success: true, id: deletedAnnouncement.id });
  } catch (error) {
    console.error('Failed to delete announcement', error);
    return res.status(500).json({ error: 'Failed to delete announcement.' });
  }
});

app.post('/api/admin/broadcasts', requireAdmin, async (req, res) => {
  if (req.adminAccess?.mode === 'event') {
    return res.status(403).json({ error: 'Event-scoped access cannot publish broadcasts.' });
  }

  try {
    const title = String(req.body?.title || '').trim();
    const message = String(req.body?.message || '').trim();
    const eventSlug = String(req.body?.eventSlug || '').trim() || null;
    const isPinned = Boolean(req.body?.isPinned);
    const startsAt = req.body?.startsAt ? String(req.body.startsAt) : null;
    const expiresAt = req.body?.expiresAt ? String(req.body.expiresAt) : null;

    if (!title || !message) {
      return res.status(400).json({ error: 'Broadcast title and message are required.' });
    }

    console.log('Starting broadcast:', { title, message, eventSlug });
    const result = await sendBroadcastAnnouncement({
      title,
      message,
      eventSlug,
      isPinned,
      startsAt,
      expiresAt,
      createdBy: 'Admin',
    });

    console.log('Broadcast completed:', result);
    return res.json(result);
  } catch (error) {
    console.error('Broadcast error:', error);
    return res.status(500).json({ error: 'Failed to send broadcast.' });
  }
});

app.post('/api/admin/registrations/:id/notifications/status-email', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const registration = await getNotificationReadyRegistration(id);

  if (!registration) {
    return res.status(404).json({ error: 'Registration not found.' });
  }

  if (!hasScopedEventAccess(req, registration.event_slug)) {
    return res.status(403).json({ error: 'This access key can email only its assigned event registrations.' });
  }

  const notification = await sendStatusNotification(registration);
  const refreshedRegistration = await fetchAdminRegistrationById(
    id,
    req.adminAccess?.mode === 'event' ? req.adminAccess.eventSlug : null,
  );
  return res.json({
    registration: refreshedRegistration,
    notification,
  });
});

app.get('/api/admin/backups', requireAdmin, async (req, res) => {
  if (req.adminAccess?.mode === 'event') {
    return res.json([]);
  }

  const rows = await listBackupSnapshots();
  res.json(rows);
});

app.post('/api/admin/backups/run', requireAdmin, async (req, res) => {
  if (req.adminAccess?.mode === 'event') {
    return res.status(403).json({ error: 'Event-scoped access cannot create backups.' });
  }

  const backup = await writeBackupSnapshot('manual');
  res.json({ backup });
});

app.get('/api/admin/backups/:fileName', requireAdmin, async (req, res) => {
  if (req.adminAccess?.mode === 'event') {
    return res.status(403).json({ error: 'Event-scoped access cannot download backups.' });
  }

  const safeFileName = path.basename(String(req.params.fileName || ''));
  const filePath = path.join(backupsDir, safeFileName);
  await fs.access(filePath);
  res.download(filePath, safeFileName);
});

app.get('/api/admin/export.csv', requireAdmin, async (req, res) => {
  const { scopeClause, scopeParams, eventSlug } = resolveAdminExportScope(req);
  const result = await pool.query(
    `
      SELECT
        r.registration_code,
        e.name AS event_name,
        r.team_name,
        r.college_name,
        r.department_name,
        r.year_of_study,
        r.contact_name,
        r.contact_email,
        r.contact_phone,
        r.payment_method,
        r.payment_reference,
        r.payment_screenshot_path,
        r.payment_provider_payment_id,
        r.total_amount,
        r.status,
        r.review_note,
        r.attendance_status,
        r.attendance_marked_at,
        r.created_at,
        latest_notification.delivery_status AS latest_notification_delivery_status,
        latest_notification.created_at AS latest_notification_created_at,
        latest_notification.error_message AS latest_notification_error_message,
        COALESCE(string_agg(
          p.full_name || ' <' || p.email || '> (' || p.phone || ')',
          ' | '
          ORDER BY p.id
        ), '') AS participants
      FROM registrations r
      JOIN events e ON e.slug = r.event_slug
      LEFT JOIN LATERAL (
        SELECT delivery_status, created_at, error_message
        FROM registration_notifications n
        WHERE n.registration_id = r.id
          AND n.notification_type = 'status-update'
        ORDER BY n.created_at DESC
        LIMIT 1
      ) latest_notification ON TRUE
      LEFT JOIN registration_participants p ON p.registration_id = r.id
      ${scopeClause}
      GROUP BY r.id, e.name, latest_notification.delivery_status, latest_notification.created_at, latest_notification.error_message
      ORDER BY r.created_at DESC
    `,
    scopeParams,
  );

  const headers = [
    'registration_code',
    'event_name',
    'team_name',
    'college_name',
    'department_name',
    'year_of_study',
    'contact_name',
    'contact_email',
    'contact_phone',
    'payment_method',
    'payment_reference',
    'payment_screenshot_path',
    'payment_provider_payment_id',
    'total_amount',
    'status',
    'review_note',
    'attendance_status',
    'attendance_marked_at',
    'created_at',
    'latest_notification_delivery_status',
    'latest_notification_created_at',
    'latest_notification_error_message',
    'participants',
  ];

  const csvRows = [
    headers.join(','),
    ...result.rows.map((row) =>
      headers
        .map((header) => `"${String(row[header] ?? '').replaceAll('"', '""')}"`)
        .join(','),
    ),
  ];

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${buildAdminExportFileName('csv', eventSlug)}"`);
  res.send(csvRows.join('\n'));
});

app.get('/api/admin/export.xlsx', requireAdmin, async (req, res) => {
  const { scopeClause, scopeParams, eventSlug } = resolveAdminExportScope(req);
  const result = await pool.query(
    `
      SELECT
        r.registration_code AS "Registration Code",
        e.name AS "Event",
        r.team_name AS "Team Name",
        r.college_name AS "College",
        r.department_name AS "Department",
        r.year_of_study AS "Year",
        r.contact_name AS "Contact Name",
        r.contact_email AS "Contact Email",
        r.contact_phone AS "Contact Phone",
        r.payment_method AS "Payment Method",
        r.payment_reference AS "Payment Reference",
        r.payment_provider_payment_id AS "Razorpay Payment ID",
        r.status AS "Status",
        r.review_note AS "Review Note",
        r.attendance_status AS "Attendance",
        r.total_amount AS "Amount",
        r.created_at AS "Created At",
        latest_notification.delivery_status AS "Latest Notification",
        latest_notification.created_at AS "Notification At",
        latest_notification.error_message AS "Notification Error"
      FROM registrations r
      JOIN events e ON e.slug = r.event_slug
      LEFT JOIN LATERAL (
        SELECT delivery_status, created_at, error_message
        FROM registration_notifications n
        WHERE n.registration_id = r.id
          AND n.notification_type = 'status-update'
        ORDER BY n.created_at DESC
        LIMIT 1
      ) latest_notification ON TRUE
      ${scopeClause}
      ORDER BY r.created_at DESC
    `,
    scopeParams,
  );

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(result.rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Registrations');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${buildAdminExportFileName('xlsx', eventSlug)}"`,
  );
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.send(buffer);
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Unexpected server error.' });
});

await initDatabase();
startSmartNotificationWorker();
startBackupWorker();

app.listen(port, () => {
  console.log(`Portal API running on http://localhost:${port}`);
  if (!usesExplicitPersistentStorage) {
    console.warn('Uploads and backups are using the app working directory. On ephemeral hosting, attach persistent storage or uploaded payment screenshots may disappear after restart or redeploy.');
  }
  if (resendConfigured) {
    console.log('Transactional emails enabled via Resend API.');
  } else if (brevoConfigured) {
    console.log('Transactional emails enabled via Brevo API.');
  } else if (smtpConfigured) {
    console.log(`Status emails enabled via ${smtpProvider || smtpHost}.`);
    Promise.all(
      mailTransports.map(async (candidate) => {
        try {
          await candidate.transport.verify();
          console.log(`SMTP ready: ${candidate.label}`);
        } catch (error) {
          console.error(`SMTP verify failed: ${candidate.label}`, error);
        }
      }),
    ).catch(() => {});
  } else {
    console.log('Transactional emails are not configured yet. Add Brevo, Resend, or SMTP settings to enable notifications.');
  }
});
