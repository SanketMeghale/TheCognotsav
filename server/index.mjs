import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { google } from 'googleapis';
import helmet from 'helmet';
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
const adminAccessKey = String(process.env.ADMIN_ACCESS_KEY || '').trim();
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
const registrationAlertRecipients = String(process.env.REGISTRATION_ALERT_EMAILS || '')
  .split(',')
  .map((value) => normalizeEmail(value))
  .filter(Boolean);
const publicAppUrl = resolveConfiguredPublicAppUrl();
const resendApiKey = String(process.env.RESEND_API_KEY || '').trim();
const brevoApiKey = String(process.env.BREVO_API_KEY || '').trim();
const resendConfigured = Boolean(resendApiKey && smtpFromEmail);
const brevoConfigured = Boolean(brevoApiKey && smtpFromEmail);
const smtpConfigured = Boolean(smtpHost && smtpPort && smtpFromEmail);
const googleSheetsEnabled = String(process.env.GOOGLE_SHEETS_ENABLED || '').trim().toLowerCase() === 'true';
const googleSheetsSpreadsheetId = String(process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '').trim();
const googleServiceAccountEmail = String(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
const googleServiceAccountPrivateKey = String(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '')
  .replace(/\\n/g, '\n')
  .trim();
const googleSheetsConfigured = Boolean(
  googleSheetsEnabled &&
  googleSheetsSpreadsheetId &&
  googleServiceAccountEmail &&
  googleServiceAccountPrivateKey,
);
const googleSheetsHeaders = [
  'registration_id',
  'registration_code',
  'event_name',
  'team_name',
  'contact_name',
  'contact_email',
  'contact_phone',
  'college_name',
  'participants',
  'presentation_mode',
  'project_title',
  'total_amount',
];
let googleSheetsConfigurationWarningShown = false;
let googleSheetsService = null;
const IST_OFFSET_MINUTES = 330;
const EVENT_START_REMINDER_WINDOW_MS = 60 * 60 * 1000;
const REGISTRATION_CLOSING_WINDOW_MS = 24 * 60 * 60 * 1000;
const SMART_NOTIFICATION_POLL_MS = Number(process.env.SMART_NOTIFICATION_POLL_MS || 5 * 60 * 1000);
const LOW_SLOT_ALERT_THRESHOLD = Number(process.env.LOW_SLOT_ALERT_THRESHOLD || 5);
const BACKUP_POLL_MS = Number(process.env.BACKUP_POLL_MS || 24 * 60 * 60 * 1000);
const allowedOriginSet = buildAllowedOriginSet();
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

if (!adminAccessKey) {
  throw new Error('ADMIN_ACCESS_KEY is required. Refusing to start with no default admin key.');
}

function normalizeAppUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function resolveConfiguredPublicAppUrl() {
  const explicitUrl = normalizeAppUrl(process.env.PUBLIC_APP_URL);
  if (explicitUrl) {
    return explicitUrl;
  }

  const railwayPublicDomain = normalizeAppUrl(String(process.env.RAILWAY_PUBLIC_DOMAIN || '').replace(/^https?:\/\//i, ''));
  if (railwayPublicDomain) {
    return `https://${railwayPublicDomain}`;
  }

  return '';
}

function resolveRequestPublicAppUrl(req) {
  if (!req) return '';

  const forwardedProto = String(req.header('x-forwarded-proto') || '').split(',')[0].trim();
  const forwardedHost = String(req.header('x-forwarded-host') || '').split(',')[0].trim();
  const host = forwardedHost || String(req.header('host') || '').trim();
  const protocol = forwardedProto || req.protocol || 'https';

  if (!host) {
    return '';
  }

  return normalizeAppUrl(`${protocol}://${host}`);
}

function resolvePublicAppUrl(req) {
  return publicAppUrl || resolveRequestPublicAppUrl(req) || `http://localhost:${port}`;
}

function buildAllowedOriginSet() {
  const rawConfiguredOrigins = String(process.env.ALLOWED_ORIGINS || '').trim();
  const configuredOrigins = rawConfiguredOrigins
    ? rawConfiguredOrigins.split(',').map((origin) => origin.trim()).filter(Boolean)
    : [];
  const defaults = [
    publicAppUrl,
    'http://localhost:3002',
    'http://127.0.0.1:3002',
    'http://localhost:8787',
    'http://127.0.0.1:8787',
  ];

  return new Set(
    [...defaults, ...configuredOrigins]
      .map((origin) => origin.replace(/\/+$/, ''))
      .filter(Boolean),
  );
}

function isAllowedOrigin(origin) {
  if (!origin) return true;

  const normalizedOrigin = String(origin).trim().replace(/\/+$/, '');
  if (allowedOriginSet.has(normalizedOrigin)) {
    return true;
  }

  try {
    const parsed = new URL(normalizedOrigin);
    if (
      parsed.protocol === 'https:' &&
      (parsed.hostname.endsWith('.vercel.app') || parsed.hostname.endsWith('.railway.app'))
    ) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

function buildRateLimitMessage(message) {
  return { error: message };
}

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
const groupedAdminEventSlugs = new Map([
  ['techxcelerate', ['techxcelerate', 'techxcelerate-poster-presentation']],
  ['techxcelerate-poster-presentation', ['techxcelerate', 'techxcelerate-poster-presentation']],
]);
const techxceleratePresentationLinks = {
  online: 'https://chat.whatsapp.com/DuoLgaR6qKP5Qxk91MSaX9?mode=gi_t',
  offline: 'https://chat.whatsapp.com/FcAY4bfsJO6FxIrmHvFvun?mode=gi_t',
};
const approvedEventGroupInvitesBySlug = {
  utopia: {
    label: 'Utopia Coordination Group',
    description: 'Join the approved Utopia coordination group using the link below.',
    url: 'https://chat.whatsapp.com/C8RKDGK2uzT4X5K14jY2aZ?mode=gi_t',
  },
  'techxcelerate-poster-presentation': {
    label: 'Poster Presentation Group',
    description: 'Join the approved poster presentation WhatsApp group using the link below.',
    url: 'https://chat.whatsapp.com/Hc0jW5nOPdXEumjhKF8DeY?mode=gi_t',
  },
  'rang-manch': {
    label: 'Rangmanch Group',
    description: 'Join the approved Rangmanch WhatsApp group using the link below.',
    url: 'https://chat.whatsapp.com/LvgFchylCdgK5Xbbu1VzDU?mode=gi_t',
  },
  'bgmi-esports': {
    label: 'BGMI Group',
    description: 'Join the approved BGMI WhatsApp group using the link below.',
    url: 'https://chat.whatsapp.com/CyDIwE1Z7ky2r4Wujblsyk?mode=gi_t',
  },
  'ff-esports': {
    label: 'Free Fire Group',
    description: 'Join the approved Free Fire WhatsApp group using the link below.',
    url: 'https://chat.whatsapp.com/HpxDAWRTU5fGXXC0A3o2xz?mode=gi_t',
  },
  'googler-hunt': {
    label: 'Tech Treasure Hunt Group',
    description: 'Join the approved Tech Treasure Hunt WhatsApp group using the link below.',
    url: 'https://chat.whatsapp.com/LZk7ck6HRaaGqR9K5dB5FO?mode=gi_t',
  },
  'tech-kbc': {
    label: 'TechKBC Group',
    description: 'Join the approved TechKBC WhatsApp group using the link below.',
    url: 'https://chat.whatsapp.com/LwAxdDHh7Cy7MsANkykcBV?mode=gi_t',
  },
  'squid-game': {
    label: 'Squid Game Group',
    description: 'Join the approved Squid Game WhatsApp group using the link below.',
    url: 'https://chat.whatsapp.com/E8zUFhcozZQ3BUxIZXtIUT?mode=gi_t',
  },
};

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

function resolveScopedAdminEventSlugs(eventSlug) {
  const normalizedSlug = String(eventSlug || '').trim();
  if (!normalizedSlug) {
    return [];
  }

  return groupedAdminEventSlugs.get(normalizedSlug) || [normalizedSlug];
}

function resolveTechxceleratePresentationLink(registration) {
  if (registration?.event_slug !== 'techxcelerate') {
    return null;
  }

  const presentationMode = String(registration.presentation_mode || '').trim().toLowerCase();
  const url = techxceleratePresentationLinks[presentationMode];
  if (!url) {
    return null;
  }

  return {
    mode: presentationMode,
    label: presentationMode === 'online' ? 'Online presentation' : 'Offline presentation',
    url,
  };
}

function resolveApprovedEventGroupInvite(registration) {
  if (registration?.status !== 'verified') {
    return null;
  }

  return approvedEventGroupInvitesBySlug[registration?.event_slug] || null;
}

async function buildAdminAccessPayload(access) {
  if (!access || access.mode === 'global') {
    return {
      mode: 'global',
      event_slug: null,
      event_name: null,
      can_export: true,
      can_delete_registrations: true,
      can_manage_event_controls: true,
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
    can_delete_registrations: false,
    can_manage_event_controls: false,
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

app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-admin-key'],
}));
app.use(express.json({ limit: '8mb' }));
app.use('/uploads', express.static(path.join(storageRoot, 'uploads')));
app.use(express.static(path.resolve(process.cwd(), 'dist')));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: buildRateLimitMessage('Too many requests. Please try again in a few minutes.'),
});

const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: buildRateLimitMessage('Too many registration attempts. Please wait before submitting again.'),
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: buildRateLimitMessage('Too many admin requests. Please wait before trying again.'),
});

app.use('/api', apiLimiter);
app.use('/api/registrations', registrationLimiter);
app.use('/api/admin', adminLimiter);

app.use((req, res, next) => {
  if (
    req.path.startsWith('/api') ||
    req.path.startsWith('/uploads') ||
    req.path === '/pass' ||
    req.path.startsWith('/pass/') ||
    req.path === '/certificate' ||
    req.path.startsWith('/certificate/')
  ) {
    return next();
  }
  res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
});

function buildRegistrationCode() {
  return `CGN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function safelyDecodeUriComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function extractRegistrationCodeCandidate(value) {
  const initialValue = String(value || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  if (!initialValue) {
    return '';
  }

  const variants = [initialValue];
  let currentValue = initialValue;
  for (let index = 0; index < 3; index += 1) {
    const decodedValue = safelyDecodeUriComponent(currentValue);
    if (!decodedValue || decodedValue === currentValue) {
      break;
    }
    variants.push(decodedValue);
    currentValue = decodedValue;
  }

  for (const variant of variants) {
    const directMatch = String(variant).match(/cgn[\s-]*[a-z0-9]{6,10}/i);
    if (directMatch) {
      const compactCode = directMatch[0].replace(/[^a-z0-9]/gi, '').toUpperCase();
      return compactCode.length > 3
        ? `${compactCode.slice(0, 3)}-${compactCode.slice(3)}`
        : compactCode;
    }
  }

  return initialValue;
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

  return resolveScopedAdminEventSlugs(req.adminAccess.eventSlug).includes(eventSlug);
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

function buildGoogleSheetsRange(tabName, range) {
  const escapedTabName = String(tabName || '').replaceAll("'", "''");
  return `'${escapedTabName}'!${range}`;
}

function formatGoogleSheetsPresentationMode(eventSlug, presentationMode) {
  if (eventSlug !== 'techxcelerate') {
    return '';
  }

  if (presentationMode === 'online') return 'Online';
  if (presentationMode === 'offline') return 'Offline';
  return '';
}

// Keep legacy Techxcelerate rows aligned with the split poster-presentation tab.
function resolveGoogleSheetsEventSlug(row) {
  const rowSlug = String(row?.event_slug || '').trim();
  if (rowSlug !== 'techxcelerate') {
    return rowSlug;
  }

  const noteBlob = `${row?.event_name || ''} ${row?.notes || ''} ${row?.review_note || ''}`.toLowerCase();
  if (noteBlob.includes('poster')) {
    return 'techxcelerate-poster-presentation';
  }

  const participantCount = Number(row?.participant_count || 0);
  if (Number(row?.total_amount) > 0 && Number(row?.total_amount) < 200 && participantCount > 0 && participantCount <= 2) {
    return 'techxcelerate-poster-presentation';
  }

  return rowSlug;
}

function buildGoogleSheetsRowValues(row) {
  return [
    row.registration_id,
    row.registration_code,
    row.event_name,
    row.team_name,
    row.contact_name,
    row.contact_email,
    row.contact_phone,
    row.college_name,
    row.participants,
    row.presentation_mode,
    row.project_title,
    row.total_amount,
  ];
}

function getGoogleSheetsService() {
  if (!googleSheetsConfigured) {
    return null;
  }

  if (!googleSheetsService) {
    const auth = new google.auth.JWT({
      email: googleServiceAccountEmail,
      key: googleServiceAccountPrivateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    googleSheetsService = google.sheets({ version: 'v4', auth });
  }

  return googleSheetsService;
}

async function fetchGoogleSheetsEvents() {
  const result = await pool.query(
    `
      SELECT slug, name
      FROM events
      ORDER BY name ASC
    `,
  );

  return result.rows;
}

async function fetchVerifiedRegistrationsForGoogleSheets() {
  const result = await pool.query(
    `
      SELECT
        r.id AS registration_id,
        r.registration_code,
        r.event_slug,
        e.name AS event_name,
        r.team_name,
        r.contact_name,
        r.contact_email,
        r.contact_phone,
        r.college_name,
        r.presentation_mode,
        COALESCE(r.project_title, '') AS project_title,
        r.total_amount,
        COALESCE(r.notes, '') AS notes,
        COALESCE(r.review_note, '') AS review_note,
        COUNT(p.id)::int AS participant_count,
        COALESCE(string_agg(
          p.full_name,
          E'\n'
          ORDER BY p.id
        ), '') AS participants
      FROM registrations r
      JOIN events e ON e.slug = r.event_slug
      LEFT JOIN registration_participants p ON p.registration_id = r.id
      WHERE r.status = 'verified'
      GROUP BY r.id, e.name
      ORDER BY e.name ASC, COALESCE(r.verified_at, r.updated_at, r.created_at) ASC, r.created_at ASC
    `,
  );

  return result.rows.map((row) => {
    const effectiveEventSlug = resolveGoogleSheetsEventSlug(row);
    return {
      ...row,
      event_slug: effectiveEventSlug,
      presentation_mode: formatGoogleSheetsPresentationMode(
        effectiveEventSlug,
        row.presentation_mode?.toLowerCase?.() || row.presentation_mode,
      ),
      project_title: effectiveEventSlug === 'techxcelerate' ? row.project_title : '',
    };
  });
}

async function ensureGoogleSheetsTabs(sheets, tabNames) {
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: googleSheetsSpreadsheetId,
    fields: 'sheets(properties(title))',
  });

  const existingTabs = new Set(
    (spreadsheet.data.sheets || [])
      .map((sheet) => sheet.properties?.title)
      .filter(Boolean),
  );
  const missingTabs = tabNames.filter((tabName) => !existingTabs.has(tabName));

  if (missingTabs.length === 0) {
    return;
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: googleSheetsSpreadsheetId,
    requestBody: {
      requests: missingTabs.map((tabName) => ({
        addSheet: {
          properties: {
            title: tabName,
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      })),
    },
  });
}

async function syncVerifiedRegistrationsToGoogleSheets() {
  const sheets = getGoogleSheetsService();
  if (!sheets) {
    return;
  }

  const [rows, events] = await Promise.all([
    fetchVerifiedRegistrationsForGoogleSheets(),
    fetchGoogleSheetsEvents(),
  ]);
  const eventNameBySlug = new Map(events.map((event) => [event.slug, event.name]));
  const tabNames = [...new Set([
    ...events.map((event) => event.slug),
    ...rows.map((row) => row.event_slug).filter(Boolean),
  ])];

  await ensureGoogleSheetsTabs(sheets, tabNames);

  const rowsByEventSlug = rows.reduce((collection, row) => {
    const eventRows = collection.get(row.event_slug) || [];
    eventRows.push({
      ...row,
      event_name: eventNameBySlug.get(row.event_slug) || row.event_name,
    });
    collection.set(row.event_slug, eventRows);
    return collection;
  }, new Map());

  for (const tabName of tabNames) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: googleSheetsSpreadsheetId,
      range: buildGoogleSheetsRange(tabName, 'A1:L1'),
      valueInputOption: 'RAW',
      requestBody: {
        values: [googleSheetsHeaders],
      },
    });

    await sheets.spreadsheets.values.clear({
      spreadsheetId: googleSheetsSpreadsheetId,
      range: buildGoogleSheetsRange(tabName, 'A2:L'),
    });

    const eventRows = (rowsByEventSlug.get(tabName) || []).map(buildGoogleSheetsRowValues);
    if (eventRows.length === 0) {
      continue;
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: googleSheetsSpreadsheetId,
      range: buildGoogleSheetsRange(tabName, 'A2:L'),
      valueInputOption: 'RAW',
      requestBody: {
        values: eventRows,
      },
    });
  }
}

async function safelySyncVerifiedRegistrationsToGoogleSheets(reason) {
  if (!googleSheetsEnabled) {
    return;
  }

  if (!googleSheetsConfigured) {
    if (!googleSheetsConfigurationWarningShown) {
      console.warn('Google Sheets sync is enabled, but one or more Google Sheets env vars are missing. Verified registrations will stay in PostgreSQL only.');
      googleSheetsConfigurationWarningShown = true;
    }
    return;
  }

  try {
    await syncVerifiedRegistrationsToGoogleSheets();
  } catch (error) {
    console.error(`Google Sheets sync failed after ${reason}`, error);
  }
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

function hasEventConcluded(event, now = new Date()) {
  const eventStart = parseEventDateTime(event?.date_label, event?.time_label);
  if (!eventStart) {
    return false;
  }

  return now.getTime() - eventStart.getTime() >= 4 * 60 * 60 * 1000;
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
    return Math.min(Math.max(1, Number(participantCount) || 1) * 50, 200);
  }

  if (event?.slug === 'googler-hunt') {
    return Math.max(1, Number(participantCount) || 1) * 50;
  }

  if (event?.slug === 'techxcelerate-poster-presentation') {
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
        e.is_active AS registration_enabled,
        COUNT(r.id) FILTER (WHERE r.status NOT IN ('rejected', 'waitlisted'))::int AS registrations_count,
        COUNT(r.id) FILTER (WHERE r.status = 'waitlisted')::int AS waitlist_count
      FROM events e
      LEFT JOIN registrations r ON r.event_slug = e.slug
      GROUP BY e.id
      ORDER BY e.id ASC
    `,
  );

  return result.rows;
}

function buildSmartAlerts(events, now = new Date()) {
  const alerts = [];

  for (const event of events) {
    if (!event.registration_enabled) continue;

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
  const rows = items
    .map(
      (item, index) => `
        <div class="portal-email-detail-row" style="padding:${index === 0 ? '0 0 11px' : '11px 0'};${index > 0 ? 'border-top:1px solid rgba(255,255,255,0.08);' : ''}">
          <div class="portal-email-detail-label" style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#94a3b8;font-weight:700;">${item.label}</div>
          <div class="portal-email-detail-value" style="margin-top:5px;color:${item.valueColor || '#ffffff'};font-size:${item.compact ? '13px' : '15px'};line-height:${item.compact ? '1.55' : '1.42'};font-weight:700;word-break:break-word;">${item.value}</div>
        </div>
      `,
    )
    .join('');

  return `
    <div class="portal-email-panel" style="border-radius:18px;padding:14px 16px;background:linear-gradient(180deg,rgba(255,255,255,0.075),rgba(255,255,255,0.035));border:1px solid rgba(255,255,255,0.08);box-shadow:inset 0 1px 0 rgba(255,255,255,0.04);">
      ${rows}
    </div>
  `;
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
  topAction = '',
  bodyAfterGrid = '',
  footerCopy = 'Thank you for participating in CEAS COGNOTSAV 2026.',
}) {
  const logoUrl = 'https://res.cloudinary.com/dkxddhawc/image/upload/v1774197829/Screenshot_2026-03-22_220018_oln02p.png';
  const safeBadge = badgeLabel ? `<div class="portal-email-badge" style="display:inline-flex;align-items:center;border-radius:999px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.06);padding:7px 11px;font-size:10px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:${accentTone};">${badgeLabel}</div>` : '';
  const safeNotice = notice
    ? `<div class="portal-email-notice" style="margin-top:14px;border-radius:16px;padding:14px 15px;background:linear-gradient(135deg,rgba(251,191,36,0.12),rgba(251,191,36,0.06));border:1px solid rgba(251,191,36,0.18);color:#fef3c7;line-height:1.65;">${notice}</div>`
    : '';
  const safeTopAction = topAction
    ? `<div class="portal-email-top-action" style="margin-top:14px;">${topAction}</div>`
    : '';
  const safeAfterGrid = bodyAfterGrid
    ? `<div class="portal-email-after" style="margin-top:14px;color:#cbd5e1;line-height:1.68;">${bodyAfterGrid}</div>`
    : '';
  const safeSections = sections
    .filter(Boolean)
    .map((section) => `<div class="portal-email-section" style="margin-top:12px;">${section}</div>`)
    .join('');

  return `
    <div class="portal-email-shell" style="margin:0;padding:22px 12px;background:radial-gradient(circle at top left,rgba(251,191,36,0.16),transparent 22%),radial-gradient(circle at bottom right,rgba(34,211,238,0.14),transparent 22%),linear-gradient(180deg,#08111f 0%,#0f172a 100%);font-family:Inter,Arial,sans-serif;color:#e2e8f0;">
      <style>
        @media only screen and (max-width: 620px) {
          .portal-email-shell { padding: 14px 8px !important; }
          .portal-email-card { border-radius: 22px !important; }
          .portal-email-header { padding: 16px 16px 18px !important; }
          .portal-email-logo { width: 60px !important; height: 60px !important; border-radius: 18px !important; }
          .portal-email-logo img { border-radius: 13px !important; }
          .portal-email-association { font-size: 8px !important; letter-spacing: 0.26em !important; }
          .portal-email-brand { font-size: 18px !important; letter-spacing: 0.08em !important; }
          .portal-email-title { font-size: 22px !important; line-height: 1.16 !important; }
          .portal-email-body { padding: 16px !important; }
          .portal-email-badge { font-size: 9px !important; letter-spacing: 0.15em !important; }
          .portal-email-intro,
          .portal-email-after,
          .portal-email-notice,
          .portal-email-footer,
          .portal-email-inline-note,
          .portal-email-panel,
          .portal-email-pass-note { font-size: 13px !important; line-height: 1.58 !important; }
          .portal-email-panel { padding: 12px 13px !important; }
          .portal-email-detail-row { padding-top: 9px !important; padding-bottom: 9px !important; }
          .portal-email-detail-label { font-size: 9px !important; letter-spacing: 0.18em !important; }
          .portal-email-detail-value { font-size: 13px !important; line-height: 1.48 !important; }
          .portal-email-button { display: block !important; width: 100% !important; box-sizing: border-box !important; padding: 13px 14px !important; font-size: 11px !important; }
          .portal-email-top-action,
          .portal-email-section,
          .portal-email-notice,
          .portal-email-after,
          .portal-email-footer { margin-top: 12px !important; }
        }
      </style>
      <div class="portal-email-card" style="max-width:560px;margin:0 auto;border-radius:26px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);background:linear-gradient(145deg,#111827,#171b2e);box-shadow:0 24px 56px rgba(2,8,23,0.34);">
        <div class="portal-email-header" style="position:relative;padding:18px 20px 20px;background:${accentGradient};border-bottom:1px solid rgba(255,255,255,0.08);">
          <div style="position:relative;z-index:1;text-align:center;">
            <div class="portal-email-logo" style="display:inline-block;width:70px;height:70px;border-radius:22px;padding:5px;background:linear-gradient(180deg,rgba(255,255,255,0.24),rgba(203,213,225,0.1));border:1px solid rgba(255,255,255,0.16);box-shadow:inset 0 1px 0 rgba(255,255,255,0.48),0 10px 22px rgba(2,8,23,0.18);">
              <img src="${logoUrl}" alt="CEAS logo" style="display:block;width:100%;height:100%;object-fit:cover;border-radius:16px;" />
            </div>
          </div>
          <div style="display:flex;align-items:center;justify-content:center;gap:12px;position:relative;z-index:1;margin-top:12px;text-align:center;">
            <div>
              <div class="portal-email-association" style="font-size:9px;letter-spacing:0.32em;text-transform:uppercase;color:#bfdbfe;font-weight:700;">Computer Engineering Association</div>
              <div class="portal-email-brand" style="margin-top:5px;font-family:Orbitron,Inter,Arial,sans-serif;font-size:20px;line-height:1.08;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#ffffff;">CEAS COGNOTSAV 2026</div>
            </div>
          </div>
          <div style="position:relative;z-index:1;margin-top:15px;">
            <div style="font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:#dbeafe;font-weight:700;">${overline}</div>
            <h1 class="portal-email-title" style="margin:9px 0 0;font-size:26px;line-height:1.12;color:#ffffff;">${title}</h1>
          </div>
        </div>
        <div class="portal-email-body" style="padding:18px;">
          <div>
            ${safeBadge}
            <div class="portal-email-intro" style="margin-top:${badgeLabel ? '14px' : '0'};color:#cbd5e1;line-height:1.68;">${intro}</div>
            ${safeTopAction}
            ${safeSections}
            ${safeNotice}
            ${safeAfterGrid}
            <div class="portal-email-footer" style="margin-top:16px;border-radius:16px;padding:14px 15px;background:linear-gradient(135deg,rgba(59,130,246,0.12),rgba(168,85,247,0.1));border:1px solid rgba(96,165,250,0.18);color:#dbeafe;line-height:1.62;">
              ${footerCopy}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function formatCompactCurrency(amount) {
  const numericAmount = Number(amount || 0);
  if (!Number.isFinite(numericAmount)) {
    return '₹0';
  }

  return `₹${numericAmount}`;
}

function buildCompactEmailButton({ href, label, gradient, textColor = '#ffffff', border = 'transparent' }) {
  if (!href || !label) {
    return '';
  }

  return `
    <a
      class="portal-compact-button"
      href="${escapeHtml(href)}"
      style="display:block;width:100%;box-sizing:border-box;border-radius:16px;border:1px solid ${border};background:${gradient};padding:13px 16px;color:${textColor};text-decoration:none;text-align:center;font-size:12px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;"
    >
      ${escapeHtml(label)}
    </a>
  `;
}

function buildCompactVerifiedStatusEmail({
  statusLabel,
  passLink,
  secondaryAction,
  eventName,
  dateLabel,
  timeLabel,
  venue,
  amountLabel,
  registrationCode,
  note,
}) {
  const logoUrl = 'https://res.cloudinary.com/dkxddhawc/image/upload/v1774197829/Screenshot_2026-03-22_220018_oln02p.png';
  const primaryActionHtml = buildCompactEmailButton({
    href: passLink,
    label: 'Download Pass',
    gradient: 'linear-gradient(90deg,#36c3ff 0%,#a855f7 55%,#ec4899 100%)',
  });
  const secondaryActionHtml = buildCompactEmailButton({
    href: secondaryAction?.href,
    label: secondaryAction?.label,
    gradient: 'linear-gradient(90deg,rgba(34,197,94,0.22) 0%,rgba(16,185,129,0.16) 100%)',
    textColor: '#dcfce7',
    border: 'rgba(74,222,128,0.45)',
  });
  const fallbackLinks = [
    `Pass link: <a href="${escapeHtml(passLink)}" style="color:#e9f3ff;text-decoration:none;word-break:break-all;">${escapeHtml(passLink)}</a>`,
    secondaryAction?.href
      ? `${escapeHtml(secondaryAction.fallbackLabel || secondaryAction.label)}: <a href="${escapeHtml(secondaryAction.href)}" style="color:#e9f3ff;text-decoration:none;word-break:break-all;">${escapeHtml(secondaryAction.href)}</a>`
      : '',
  ].filter(Boolean).join('<br />');

  return `
    <div class="portal-compact-shell" style="margin:0;padding:18px 8px;background:radial-gradient(circle at top left,rgba(36,99,235,0.22),transparent 24%),radial-gradient(circle at bottom right,rgba(236,72,153,0.2),transparent 26%),linear-gradient(180deg,#060b18 0%,#0b1222 100%);font-family:Inter,Arial,sans-serif;color:#e5eefb;">
      <style>
        @media only screen and (max-width: 620px) {
          .portal-compact-shell { padding: 10px 6px !important; }
          .portal-compact-card { border-radius: 22px !important; }
          .portal-compact-header { padding: 14px 16px 16px !important; }
          .portal-compact-body { padding: 16px !important; }
          .portal-compact-logo { width: 52px !important; height: 52px !important; border-radius: 15px !important; }
          .portal-compact-brand { font-size: 9px !important; letter-spacing: 0.18em !important; }
          .portal-compact-status { margin-top: 12px !important; font-size: 10px !important; }
          .portal-compact-ticket { font-size: 34px !important; }
          .portal-compact-title { font-size: 15px !important; }
          .portal-compact-copy,
          .portal-compact-detail,
          .portal-compact-note,
          .portal-compact-fallback { font-size: 12px !important; line-height: 1.5 !important; }
          .portal-compact-button { padding: 12px 14px !important; font-size: 11px !important; }
        }
      </style>
      <div class="portal-compact-card" style="max-width:386px;margin:0 auto;overflow:hidden;border-radius:24px;border:1px solid rgba(255,255,255,0.08);background:linear-gradient(180deg,#11162a 0%,#151128 100%);box-shadow:0 22px 56px rgba(2,8,23,0.42);">
        <div class="portal-compact-header" style="padding:16px 18px 18px;text-align:center;background:radial-gradient(circle at left top,rgba(59,130,246,0.22),transparent 35%),radial-gradient(circle at right top,rgba(236,72,153,0.24),transparent 38%),linear-gradient(180deg,rgba(15,23,42,0.8),rgba(24,24,46,0.86));border-bottom:1px solid rgba(148,163,184,0.18);">
          <div class="portal-compact-logo" style="display:inline-flex;width:58px;height:58px;padding:4px;border-radius:18px;background:linear-gradient(180deg,rgba(255,255,255,0.24),rgba(203,213,225,0.08));border:1px solid rgba(255,255,255,0.14);">
            <img src="${logoUrl}" alt="CEAS logo" style="display:block;width:100%;height:100%;object-fit:cover;border-radius:14px;" />
          </div>
          <div class="portal-compact-brand" style="margin-top:12px;font-size:10px;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;color:#f8fafc;">CEAS COGNOTSAV 2026</div>
          <div class="portal-compact-status" style="display:inline-flex;align-items:center;gap:7px;margin-top:14px;padding:8px 12px;border-radius:999px;background:rgba(15,23,42,0.55);border:1px solid rgba(74,222,128,0.24);font-size:11px;font-weight:700;color:#dcfce7;">
            <span style="font-size:15px;line-height:1;">✅</span>
            <span>${statusLabel}</span>
          </div>
        </div>
        <div class="portal-compact-body" style="padding:18px 18px 16px;">
          <div class="portal-compact-ticket" style="font-size:40px;line-height:1;text-align:center;">🎫</div>
          <div class="portal-compact-title" style="margin-top:10px;text-align:center;font-size:17px;font-weight:800;color:#ffffff;">Your Pass is Ready</div>
          <div class="portal-compact-copy" style="margin-top:6px;text-align:center;font-size:12px;line-height:1.55;color:#cbd5e1;">Download your official pass and keep it ready for event entry.</div>
          <div style="margin-top:14px;display:grid;gap:10px;">
            ${primaryActionHtml}
            ${secondaryActionHtml}
          </div>
          <div style="margin-top:16px;border-top:1px solid rgba(148,163,184,0.16);padding-top:12px;">
            <div class="portal-compact-detail" style="display:flex;align-items:flex-start;gap:10px;padding:6px 0;font-size:13px;line-height:1.45;color:#f8fafc;"><span style="width:18px;text-align:center;">📍</span><span>${eventName}</span></div>
            <div class="portal-compact-detail" style="display:flex;align-items:flex-start;gap:10px;padding:6px 0;font-size:13px;line-height:1.45;color:#dbeafe;"><span style="width:18px;text-align:center;">🗓</span><span>${dateLabel} · ${timeLabel}</span></div>
            <div class="portal-compact-detail" style="display:flex;align-items:flex-start;gap:10px;padding:6px 0;font-size:13px;line-height:1.45;color:#f8fafc;"><span style="width:18px;text-align:center;">📌</span><span>${venue}</span></div>
            <div class="portal-compact-detail" style="display:flex;align-items:flex-start;gap:10px;padding:6px 0;font-size:13px;line-height:1.45;color:#fde68a;"><span style="width:18px;text-align:center;">₹</span><span>${amountLabel}</span></div>
            <div class="portal-compact-detail" style="display:flex;align-items:flex-start;gap:10px;padding:6px 0;font-size:13px;line-height:1.45;color:#dbeafe;"><span style="width:18px;text-align:center;">🔑</span><span>${registrationCode}</span></div>
          </div>
          ${note
            ? `<div class="portal-compact-note" style="margin-top:12px;border-top:1px solid rgba(148,163,184,0.16);padding-top:12px;font-size:12px;line-height:1.55;color:#cbd5e1;">${note}</div>`
            : ''}
          <div class="portal-compact-fallback" style="margin-top:12px;font-size:11px;line-height:1.6;color:#94a3b8;">${fallbackLinks}</div>
        </div>
      </div>
    </div>
  `;
}

function buildCompactPendingStatusEmail({
  statusLabel,
  eventName,
  dateLabel,
  timeLabel,
  venue,
  amountLabel,
  registrationCode,
  trackerLink,
  note = '',
}) {
  const logoUrl = 'https://res.cloudinary.com/dkxddhawc/image/upload/v1774197829/Screenshot_2026-03-22_220018_oln02p.png';
  const fallbackLinks = trackerLink
    ? `Tracker link: <a href="${escapeHtml(trackerLink)}" style="color:#e9f3ff;text-decoration:none;word-break:break-all;">${escapeHtml(trackerLink)}</a>`
    : '';

  return `
    <div class="portal-pending-shell" style="margin:0;padding:18px 8px;background:radial-gradient(circle at top left,rgba(36,99,235,0.22),transparent 24%),radial-gradient(circle at bottom right,rgba(236,72,153,0.2),transparent 26%),linear-gradient(180deg,#060b18 0%,#0b1222 100%);font-family:Inter,Arial,sans-serif;color:#e5eefb;">
      <style>
        @media only screen and (max-width: 620px) {
          .portal-pending-shell { padding: 10px 6px !important; }
          .portal-pending-card { border-radius: 22px !important; }
          .portal-pending-header { padding: 14px 16px 16px !important; }
          .portal-pending-body { padding: 16px !important; }
          .portal-pending-logo { width: 52px !important; height: 52px !important; border-radius: 15px !important; }
          .portal-pending-brand { font-size: 9px !important; letter-spacing: 0.18em !important; }
          .portal-pending-title { font-size: 15px !important; }
          .portal-pending-copy,
          .portal-pending-chip,
          .portal-pending-detail,
          .portal-pending-note,
          .portal-pending-fallback,
          .portal-pending-footer { font-size: 12px !important; line-height: 1.5 !important; }
          .portal-pending-section-title { font-size: 13px !important; }
        }
      </style>
      <div class="portal-pending-card" style="max-width:386px;margin:0 auto;overflow:hidden;border-radius:24px;border:1px solid rgba(255,255,255,0.08);background:linear-gradient(180deg,#11162a 0%,#151128 100%);box-shadow:0 22px 56px rgba(2,8,23,0.42);">
        <div class="portal-pending-header" style="padding:16px 18px 18px;text-align:center;background:radial-gradient(circle at left top,rgba(59,130,246,0.22),transparent 35%),radial-gradient(circle at right top,rgba(236,72,153,0.24),transparent 38%),linear-gradient(180deg,rgba(15,23,42,0.8),rgba(24,24,46,0.86));border-bottom:1px solid rgba(148,163,184,0.18);">
          <div class="portal-pending-logo" style="display:inline-flex;width:58px;height:58px;padding:4px;border-radius:18px;background:linear-gradient(180deg,rgba(255,255,255,0.24),rgba(203,213,225,0.08));border:1px solid rgba(255,255,255,0.14);">
            <img src="${logoUrl}" alt="CEAS logo" style="display:block;width:100%;height:100%;object-fit:cover;border-radius:14px;" />
          </div>
          <div class="portal-pending-brand" style="margin-top:12px;font-size:10px;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;color:#f8fafc;">CEAS COGNOTSAV 2026</div>
          <div class="portal-pending-title" style="margin-top:18px;font-size:17px;font-weight:800;color:#f6d77c;">Registration Under Review</div>
        </div>
        <div class="portal-pending-body" style="padding:18px 18px 16px;">
          <div class="portal-pending-chip" style="display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;border:1px solid rgba(245,158,11,0.18);background:rgba(15,23,42,0.55);font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#f6d77c;">
            <span aria-hidden="true">&#9203;</span>
            <span>${statusLabel}</span>
          </div>
          <div class="portal-pending-copy" style="margin-top:14px;font-size:13px;line-height:1.58;color:#dbe4f1;">No action is required until we complete the review.</div>
          <div style="margin-top:16px;border-radius:18px;border:1px solid rgba(217,70,239,0.28);background:linear-gradient(180deg,rgba(96,165,250,0.08),rgba(236,72,153,0.08));padding:14px 14px 12px;">
            <div class="portal-pending-section-title" style="display:flex;align-items:center;gap:8px;font-size:14px;font-weight:800;color:#f6d77c;">
              <span aria-hidden="true">&#9203;</span>
              <span>${statusLabel}</span>
            </div>
            <div style="margin-top:10px;border-top:1px solid rgba(148,163,184,0.16);padding-top:8px;">
              <div class="portal-pending-detail" style="display:flex;align-items:flex-start;gap:10px;padding:7px 0;font-size:13px;line-height:1.45;color:#f8fafc;"><span style="width:18px;text-align:center;">&#128205;</span><span>${eventName}</span></div>
              <div class="portal-pending-detail" style="display:flex;align-items:flex-start;gap:10px;padding:7px 0;font-size:13px;line-height:1.45;color:#b9f5ec;"><span style="width:18px;text-align:center;">&#128197;</span><span>${dateLabel} &middot; ${timeLabel}</span></div>
              <div class="portal-pending-detail" style="display:flex;align-items:flex-start;gap:10px;padding:7px 0;font-size:13px;line-height:1.45;color:#f8fafc;"><span style="width:18px;text-align:center;">&#128204;</span><span>${venue}</span></div>
              <div class="portal-pending-detail" style="display:flex;align-items:flex-start;gap:10px;padding:7px 0;font-size:13px;line-height:1.45;color:#fde68a;"><span style="width:18px;text-align:center;">&#8377;</span><span>${amountLabel}</span></div>
              <div class="portal-pending-detail" style="display:flex;align-items:flex-start;gap:10px;padding:7px 0;font-size:13px;line-height:1.45;color:#dbeafe;"><span style="width:18px;text-align:center;">&#128273;</span><span>${registrationCode}</span></div>
            </div>
          </div>
          <div class="portal-pending-note" style="margin-top:14px;font-size:12px;line-height:1.58;color:#dbe4f1;">We will notify you once the verification is done.${note ? `<br />${note}` : ''}</div>
          <div class="portal-pending-footer" style="margin-top:14px;border-radius:16px;border:1px solid rgba(148,163,184,0.14);background:linear-gradient(180deg,rgba(30,41,59,0.6),rgba(49,46,129,0.28));padding:11px 13px;font-size:12px;line-height:1.55;color:#cbd5e1;">Thank you for participating in CEAS COGNOTSAV 2026.</div>
          ${fallbackLinks ? `<div class="portal-pending-fallback" style="margin-top:12px;font-size:11px;line-height:1.6;color:#94a3b8;">${fallbackLinks}</div>` : ''}
        </div>
      </div>
    </div>
  `;
}

function buildStatusEmail(registration, appUrl = resolvePublicAppUrl()) {
  const eventLine = `${registration.event_name} / ${registration.date_label} / ${registration.time_label}`;
  const salutation = registration.contact_name || registration.team_name || 'Participant';
  const statusTitle = formatStatusTitle(registration.status);
  const passLink = `${appUrl}/pass?id=${encodeURIComponent(registration.id || '')}&code=${encodeURIComponent(registration.registration_code)}&email=${encodeURIComponent(registration.contact_email || '')}`;
  const passDownloadLink = `${passLink}&download=true`;
  const trackerLink = `${appUrl}/#tracker`;
  const techxceleratePresentationInvite = resolveTechxceleratePresentationLink(registration);
  const approvedEventGroupInvite = resolveApprovedEventGroupInvite(registration);
  const verifiedTextSecondaryLink = registration.status === 'verified'
    ? techxceleratePresentationInvite
      ? `WhatsApp group: ${techxceleratePresentationInvite.url}`
      : approvedEventGroupInvite
        ? `WhatsApp group: ${approvedEventGroupInvite.url}`
        : `Tracker: ${trackerLink}`
    : null;

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
    ...(registration.status === 'pending'
      ? [
          `Amount: INR ${registration.total_amount}`,
          `Tracker: ${trackerLink}`,
        ]
      : []),
    ...(registration.status === 'verified'
      ? [
          `Amount paid: INR ${registration.total_amount}`,
          `Payment reference: ${registration.payment_reference || 'Pending manual entry'}`,
          `Official pass: ${passDownloadLink}`,
          ...(verifiedTextSecondaryLink ? [verifiedTextSecondaryLink] : []),
        ]
      : []),
    ...(techxceleratePresentationInvite
      ? [`Presentation mode: ${techxceleratePresentationInvite.label}`, `Presentation group: ${techxceleratePresentationInvite.url}`]
      : []),
    ...(approvedEventGroupInvite
      ? [`Event group: ${approvedEventGroupInvite.url}`]
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
  const safeCompactAmount = escapeHtml(formatCompactCurrency(registration.total_amount));
  const safeDateLabel = escapeHtml(registration.date_label);
  const safeTimeLabel = escapeHtml(registration.time_label);
  const verifiedSecondaryAction = registration.status === 'verified'
    ? techxceleratePresentationInvite
      ? {
          label: 'Join WhatsApp',
          href: techxceleratePresentationInvite.url,
          fallbackLabel: 'WhatsApp link',
          note: 'Use the approved presentation coordination WhatsApp group for event updates.',
        }
      : approvedEventGroupInvite
        ? {
            label: 'Join WhatsApp',
            href: approvedEventGroupInvite.url,
            fallbackLabel: 'WhatsApp link',
            note: approvedEventGroupInvite.description,
          }
        : {
            label: 'Open Tracker',
            href: trackerLink,
            fallbackLabel: 'Tracker link',
            note: 'Open the tracker anytime for the latest official event updates.',
          }
    : null;
  const techxceleratePresentationInviteHtml = techxceleratePresentationInvite
    ? `
        <div style="margin-top:14px;border-radius:16px;padding:14px;background:linear-gradient(135deg,rgba(59,130,246,0.12),rgba(34,211,238,0.08));border:1px solid rgba(96,165,250,0.18);">
          <div style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#bfdbfe;font-weight:800;">Techxcelerate ${escapeHtml(techxceleratePresentationInvite.label)}</div>
          <div style="margin-top:7px;color:#dbeafe;line-height:1.58;">Join your presentation coordination group using the link below.</div>
          <div style="margin-top:12px;text-align:center;">
            <a class="portal-email-button" href="${techxceleratePresentationInvite.url}" style="display:inline-flex;align-items:center;justify-content:center;border-radius:999px;background:linear-gradient(90deg,#67e8f9,#60a5fa);color:#041018;text-decoration:none;padding:12px 20px;font-size:12px;font-weight:800;letter-spacing:0.11em;text-transform:uppercase;">Join ${escapeHtml(techxceleratePresentationInvite.label)} Group</a>
          </div>
          <div class="portal-email-inline-note" style="margin-top:9px;font-size:11px;color:#cbd5e1;line-height:1.55;">Link: <span style="color:#ffffff;word-break:break-all;">${techxceleratePresentationInvite.url}</span></div>
        </div>
      `
    : '';
  const approvedEventGroupInviteHtml = approvedEventGroupInvite
    ? `
        <div style="margin-top:14px;border-radius:16px;padding:14px;background:linear-gradient(135deg,rgba(251,191,36,0.12),rgba(59,130,246,0.08));border:1px solid rgba(250,204,21,0.18);">
          <div style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#fde68a;font-weight:800;">${escapeHtml(approvedEventGroupInvite.label)}</div>
          <div style="margin-top:7px;color:#f8fafc;line-height:1.58;">${escapeHtml(approvedEventGroupInvite.description)}</div>
          <div style="margin-top:12px;text-align:center;">
            <a class="portal-email-button" href="${approvedEventGroupInvite.url}" style="display:inline-flex;align-items:center;justify-content:center;border-radius:999px;background:linear-gradient(90deg,#fcd34d,#60a5fa);color:#041018;text-decoration:none;padding:12px 20px;font-size:12px;font-weight:800;letter-spacing:0.11em;text-transform:uppercase;">Join Event Group</a>
          </div>
          <div class="portal-email-inline-note" style="margin-top:9px;font-size:11px;color:#cbd5e1;line-height:1.55;">Link: <span style="color:#ffffff;word-break:break-all;">${approvedEventGroupInvite.url}</span></div>
        </div>
      `
    : '';
  const verifiedPassTopAction = registration.status === 'verified'
    ? `
        <div style="border-radius:16px;padding:14px;background:linear-gradient(135deg,rgba(16,185,129,0.12),rgba(34,211,238,0.1));border:1px solid rgba(52,211,153,0.18);">
          <div style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#b7ffde;font-weight:800;">Official Pass Ready</div>
          <div class="portal-email-pass-note" style="margin-top:7px;color:#ecfdf5;line-height:1.58;">Your official event pass is now available in this email. Please download or save this email as a PDF, and show the pass with your registration code at event time.</div>
          <div style="margin-top:12px;text-align:center;">
            <a class="portal-email-button" href="${passDownloadLink}" style="display:inline-flex;align-items:center;justify-content:center;border-radius:999px;background:linear-gradient(90deg,#67e8f9,#fbbf24);color:#041018;text-decoration:none;padding:12px 20px;font-size:12px;font-weight:800;letter-spacing:0.11em;text-transform:uppercase;">Open / Download Official Pass</a>
          </div>
          ${approvedEventGroupInvite
            ? `
              <div style="margin-top:10px;text-align:center;">
                <a class="portal-email-button" href="${approvedEventGroupInvite.url}" style="display:inline-flex;align-items:center;justify-content:center;border-radius:999px;background:linear-gradient(90deg,#fcd34d,#60a5fa);color:#041018;text-decoration:none;padding:12px 20px;font-size:12px;font-weight:800;letter-spacing:0.11em;text-transform:uppercase;">Join WP Group</a>
              </div>
            `
            : ''}
          <div class="portal-email-inline-note" style="margin-top:9px;font-size:11px;color:#cbd5e1;line-height:1.55;">If needed, open this link in your browser: <span style="color:#ffffff;word-break:break-all;">${passDownloadLink}</span></div>
        </div>
      `
    : '';
  const verifiedPassInstructions = registration.status === 'verified'
    ? `
        <div style="margin-top:14px;border-radius:16px;padding:14px;background:linear-gradient(180deg,rgba(15,23,42,0.78),rgba(255,255,255,0.04));border:1px solid rgba(255,255,255,0.08);text-align:center;">
          <div style="font-size:12px;color:#cbd5e1;line-height:1.65;">Carry this pass and share registration code <strong style="color:#ffffff;">${safeRegistrationCode}</strong> during venue verification.</div>
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

  const html = registration.status === 'verified'
    ? buildCompactVerifiedStatusEmail({
        statusLabel: safeStatusLabel,
        passLink: passDownloadLink,
        secondaryAction: verifiedSecondaryAction,
        eventName: safeEventName,
        dateLabel: safeDateLabel,
        timeLabel: safeTimeLabel,
        venue: safeVenue,
        amountLabel: safeCompactAmount,
        registrationCode: safeRegistrationCode,
        note: [
          escapeHtml('Keep this pass ready for the verification desk.'),
          verifiedSecondaryAction?.note ? escapeHtml(verifiedSecondaryAction.note) : '',
          registration.review_note ? `Organizer note: ${escapeHtml(registration.review_note)}` : '',
        ].filter(Boolean).join('<br />'),
      })
    : registration.status === 'pending'
      ? buildCompactPendingStatusEmail({
          statusLabel: safeStatusLabel,
          eventName: safeEventName,
          dateLabel: safeDateLabel,
          timeLabel: safeTimeLabel,
          venue: safeVenue,
          amountLabel: safeCompactAmount,
          registrationCode: safeRegistrationCode,
          trackerLink,
          note: registration.review_note ? `Organizer note: ${escapeHtml(registration.review_note)}` : '',
        })
    : buildPortalEmailHtml({
        overline: 'Registration Update',
        title: safeStatusTitle,
        intro: `Hi ${safeSalutation},<br /><br />${safeIntro}`,
        accentGradient: 'linear-gradient(90deg,rgba(59,130,246,0.2),rgba(168,85,247,0.16),rgba(236,72,153,0.18))',
        accentTone: accentColor,
        badgeLabel: safeStatusLabel,
        topAction: verifiedPassTopAction,
        sections: [gridSections],
        notice: registration.review_note ? `Organizer note: ${escapeHtml(registration.review_note)}` : '',
        bodyAfterGrid: `${safeNextStep}${techxceleratePresentationInviteHtml}${registration.status === 'verified' ? '' : approvedEventGroupInviteHtml}${verifiedPassInstructions}`,
      });

  return {
    subject,
    text,
    html,
    preview: text.slice(0, 280),
  };
}

function buildAdminRegistrationAlertEmail(registration, appUrl = resolvePublicAppUrl()) {
  const eventLine = `${registration.event_name} / ${registration.date_label} / ${registration.time_label}`;
  const statusLabel = getPaymentStatusLabel(registration.status);
  const participantsSummary = Array.isArray(registration.participants) && registration.participants.length > 0
    ? registration.participants
      .map((participant, index) => `${index + 1}. ${participant.fullName} / ${participant.email} / ${participant.phone}`)
      .join('\n')
    : 'Participant details unavailable.';
  const participantsHtml = Array.isArray(registration.participants) && registration.participants.length > 0
    ? registration.participants
      .map(
        (participant, index) => `
          <div style="padding:12px 0;border-top:${index === 0 ? 'none' : '1px solid rgba(255,255,255,0.08)'};">
            <div style="font-weight:700;color:#ffffff;">${index + 1}. ${escapeHtml(participant.fullName)}</div>
            <div style="margin-top:4px;color:#cbd5e1;font-size:13px;line-height:1.7;">
              ${escapeHtml(participant.email)}<br />
              ${escapeHtml(participant.phone)}
            </div>
          </div>
        `,
      )
      .join('')
    : '<div style="color:#cbd5e1;">Participant details unavailable.</div>';
  const subject = `New registration received - ${registration.event_name} - ${registration.registration_code}`;
  const text = [
    'New participant registration received.',
    '',
    `Registration code: ${registration.registration_code}`,
    `Status: ${statusLabel}`,
    `Event: ${registration.event_name}`,
    `Schedule: ${eventLine}`,
    `Venue: ${registration.venue}`,
    `Team name: ${registration.team_name}`,
    `College: ${registration.college_name}`,
    `Department / Year: ${registration.department_name} / ${registration.year_of_study}`,
    `Contact: ${registration.contact_name}`,
    `Email: ${registration.contact_email}`,
    `Phone: ${registration.contact_phone}`,
    `Amount: INR ${registration.total_amount}`,
    `Payment reference: ${registration.payment_reference || 'Not provided'}`,
    registration.notes ? `Notes: ${registration.notes}` : null,
    '',
    'Participants:',
    participantsSummary,
    '',
    `Admin panel: ${appUrl}/#admin-registrations`,
  ].filter(Boolean).join('\n');
  const gridSections = buildEmailInfoGrid([
    { label: 'Registration code', value: escapeHtml(registration.registration_code) },
    { label: 'Status', value: escapeHtml(statusLabel), valueColor: '#67e8f9' },
    { label: 'Event', value: escapeHtml(registration.event_name) },
    { label: 'Schedule', value: escapeHtml(eventLine), compact: true },
    { label: 'Team name', value: escapeHtml(registration.team_name) },
    { label: 'Amount', value: escapeHtml(`INR ${registration.total_amount}`) },
    { label: 'Contact', value: escapeHtml(registration.contact_name) },
    { label: 'Email', value: escapeHtml(registration.contact_email), compact: true },
    { label: 'Phone', value: escapeHtml(registration.contact_phone) },
    { label: 'Payment ref', value: escapeHtml(registration.payment_reference || 'Not provided'), compact: true },
    { label: 'College', value: escapeHtml(registration.college_name), compact: true },
    { label: 'Department / Year', value: escapeHtml(`${registration.department_name} / ${registration.year_of_study}`), compact: true },
  ]);
  const html = buildPortalEmailHtml({
    overline: 'Organizer Alert',
    title: 'New Registration Received',
    intro: `A new participant registration was submitted for <strong>${escapeHtml(registration.event_name)}</strong>. Review the details below and open the admin panel if follow-up is needed.`,
    accentGradient: 'linear-gradient(90deg,rgba(34,211,238,0.18),rgba(59,130,246,0.18),rgba(251,191,36,0.18))',
    accentTone: '#67e8f9',
    badgeLabel: escapeHtml(statusLabel),
    sections: [gridSections],
    notice: registration.notes ? `Participant note: ${escapeHtml(registration.notes)}` : '',
    bodyAfterGrid: `
      <div style="margin-top:8px;">
        <div style="font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:#93c5fd;font-weight:700;">Participants</div>
        <div style="margin-top:12px;border-radius:18px;padding:16px;background:linear-gradient(180deg,rgba(15,23,42,0.78),rgba(255,255,255,0.04));border:1px solid rgba(255,255,255,0.08);">
          ${participantsHtml}
        </div>
        <div style="margin-top:16px;text-align:center;">
          <a href="${appUrl}/#admin-registrations" style="display:inline-flex;align-items:center;justify-content:center;border-radius:999px;background:linear-gradient(90deg,#67e8f9,#fbbf24);color:#041018;text-decoration:none;padding:13px 22px;font-size:13px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;">Open Admin Panel</a>
        </div>
      </div>
    `,
    footerCopy: 'This alert was generated automatically by the CEAS COGNOTSAV registration portal.',
  });

  return {
    subject,
    text,
    html,
  };
}

async function sendAdminRegistrationAlert(registration, options = {}) {
  if (!registration || registrationAlertRecipients.length === 0 || !emailConfigured) {
    return null;
  }

  const email = buildAdminRegistrationAlertEmail(registration, resolvePublicAppUrl(options.req));

  try {
    await sendPortalMail({
      from: smtpFromName ? `"${smtpFromName}" <${smtpFromEmail}>` : smtpFromEmail,
      to: registrationAlertRecipients,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });
  } catch (error) {
    console.error('Admin registration alert failed', error);
  }

  return null;
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
        r.presentation_mode,
        r.project_title,
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

async function sendStatusNotification(registration, options = {}) {
  if (!registration) return null;

  const email = buildStatusEmail(registration, resolvePublicAppUrl(options.req));

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

function isLikelyMobileUserAgent(userAgent) {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(String(userAgent || ''));
}

function serializeInlineJson(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c');
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
      ? 'Your entry has been approved and your official pass is ready for event-day check-in.'
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
      description:
        registration.registration_source === 'special-desk'
          ? `Special desk registration created for ${registration.event_name}.`
          : `Registration created for ${registration.event_name}.`,
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
  const normalized = String(query || '').trim().toLowerCase();
  const compactNormalized = normalized.replace(/[^a-z0-9]/g, '');
  const result = await pool.query(
    `
      SELECT
        r.id,
        r.registration_code,
        r.team_name,
        r.contact_name,
        r.contact_email,
        r.registration_source,
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
         OR ($2::text <> '' AND REGEXP_REPLACE(LOWER(r.registration_code), '[^a-z0-9]', '', 'g') = $2)
         OR LOWER(r.contact_email) = $1
      ORDER BY r.created_at DESC
    `,
    [normalized, compactNormalized],
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

  const participantsResult = await pool.query(
    `
      SELECT
        registration_id,
        full_name,
        is_lead
      FROM registration_participants
      WHERE registration_id = ANY($1::text[])
      ORDER BY registration_id ASC, id ASC
    `,
    [registrationIds],
  );

  const notificationsByRegistrationId = new Map();
  for (const notification of notificationsResult.rows) {
    const collection = notificationsByRegistrationId.get(notification.registration_id) || [];
    collection.push(notification);
    notificationsByRegistrationId.set(notification.registration_id, collection);
  }

  const participantsByRegistrationId = new Map();
  for (const participant of participantsResult.rows) {
    const collection = participantsByRegistrationId.get(participant.registration_id) || [];
    collection.push({
      fullName: participant.full_name,
      isLead: Boolean(participant.is_lead),
    });
    participantsByRegistrationId.set(participant.registration_id, collection);
  }

  return result.rows.map((row) => {
    const notifications = notificationsByRegistrationId.get(row.id) || [];
    const participants = participantsByRegistrationId.get(row.id) || [
      {
        fullName: row.contact_name || row.team_name || 'Participant',
        isLead: true,
      },
    ];

    return {
      ...row,
      qr_value: buildQrValue(row.registration_code),
      invite_link: row.invite_token ? `#join-team/${row.invite_token}` : null,
      participants,
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

function buildVerifiedPassPage(registration, appUrl = resolvePublicAppUrl(), options = {}) {
  const logoUrl = 'https://res.cloudinary.com/dkxddhawc/image/upload/v1774197829/Screenshot_2026-03-22_220018_oln02p.png';
  const statusLabel = formatStatusTitle(registration.status);
  const isVerified = registration.status === 'verified';
  const autoPrint = String(options?.download || '').trim().toLowerCase() === 'true';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(buildQrValue(registration.registration_code))}`;
  const leadCopy = isVerified
    ? 'This is your official verified Cognotsav pass. Download or print it, then show this pass with your registration code during event-time verification.'
    : registration.status === 'waitlisted'
      ? 'Your registration is currently on the waitlist. Keep this pass page and registration code saved while you track future status updates.'
      : registration.status === 'rejected'
        ? 'Your registration needs an update before approval. Keep this pass page and registration code handy while you coordinate with organizers.'
        : 'Your registration is under review. Keep this pass page and registration code saved until organizer verification is completed.';
  const hintCopy = isVerified
    ? 'Carry this pass and share your registration code at the venue entry desk for verification.'
    : registration.status === 'waitlisted'
      ? 'Use the tracker regularly. If a slot opens, your status will be updated and this pass page will reflect it.'
      : registration.status === 'rejected'
        ? 'Please review the latest organizer note in the tracker and resubmit the required details if needed.'
        : 'Use the tracker to follow approval progress. Once verified, this same pass link will act as your official event pass.';
  const badgeStyle = isVerified
    ? 'border: 1px solid rgba(52,211,153,0.22); background: linear-gradient(90deg, rgba(16,185,129,0.14), rgba(34,211,238,0.1)); color: #d1fae5;'
    : registration.status === 'waitlisted'
      ? 'border: 1px solid rgba(251,191,36,0.22); background: linear-gradient(90deg, rgba(245,158,11,0.14), rgba(251,191,36,0.12)); color: #fde68a;'
      : registration.status === 'rejected'
        ? 'border: 1px solid rgba(251,113,133,0.22); background: linear-gradient(90deg, rgba(244,63,94,0.16), rgba(251,113,133,0.12)); color: #fecdd3;'
        : 'border: 1px solid rgba(96,165,250,0.22); background: linear-gradient(90deg, rgba(59,130,246,0.16), rgba(34,211,238,0.1)); color: #bfdbfe;';

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>${escapeHtml(registration.registration_code)} Pass</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; font-family: Inter, Arial, sans-serif; background: radial-gradient(circle at top left, rgba(251,191,36,0.16), transparent 22%), radial-gradient(circle at bottom right, rgba(34,211,238,0.14), transparent 22%), linear-gradient(180deg, #08111f 0%, #0f172a 100%); color: #e2e8f0; }
          .wrap { min-height: 100vh; padding: 20px 16px; display: flex; align-items: center; justify-content: center; }
          .card { position: relative; overflow: hidden; width: min(100%, 760px); border-radius: 28px; border: 1px solid rgba(255,255,255,0.08); background: linear-gradient(145deg, #111827, #171b2e); box-shadow: 0 30px 72px rgba(2,8,23,0.38); }
          .top { position: relative; padding: 18px 22px 20px; background: linear-gradient(90deg, rgba(59,130,246,0.2), rgba(168,85,247,0.16), rgba(236,72,153,0.18)); border-bottom: 1px solid rgba(255,255,255,0.08); text-align: center; }
          .logo { width: 72px; height: 72px; margin: 0 auto; border-radius: 22px; padding: 6px; background: linear-gradient(180deg, rgba(255,255,255,0.24), rgba(203,213,225,0.1)); border: 1px solid rgba(255,255,255,0.16); box-shadow: inset 0 1px 0 rgba(255,255,255,0.48), 0 12px 24px rgba(2,8,23,0.2); }
          .logo img { width: 100%; height: 100%; display: block; object-fit: cover; border-radius: 18px; }
          .overline { margin-top: 12px; font-size: 10px; letter-spacing: 0.34em; text-transform: uppercase; color: #bfdbfe; font-weight: 700; }
          .title { margin: 10px 0 0; font-family: Orbitron, Inter, Arial, sans-serif; font-size: 26px; line-height: 1.12; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #ffffff; }
          .body { position: relative; z-index: 1; padding: 20px; }
          .badge { display: inline-flex; border-radius: 999px; border: 1px solid rgba(52,211,153,0.22); background: linear-gradient(90deg, rgba(16,185,129,0.14), rgba(34,211,238,0.1)); padding: 8px 12px; font-size: 11px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; color: #d1fae5; }
          .lead { margin-top: 14px; color: #cbd5e1; line-height: 1.6; }
          .hero { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(220px, 0.85fr); gap: 14px; margin-top: 16px; align-items: start; }
          .qr-card { border-radius: 22px; border: 1px solid rgba(255,255,255,0.08); background: linear-gradient(180deg, rgba(15,23,42,0.78), rgba(255,255,255,0.04)); padding: 14px; text-align: center; }
          .qr-frame { display: inline-flex; border-radius: 18px; background: #ffffff; padding: 10px; }
          .qr-frame img { width: 176px; height: 176px; display: block; }
          .qr-copy { margin-top: 10px; color: #cbd5e1; font-size: 12px; line-height: 1.55; }
          .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 16px; }
          .cell { border-radius: 18px; padding: 12px 14px; background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04)); border: 1px solid rgba(255,255,255,0.08); }
          .label { font-size: 10px; letter-spacing: 0.24em; text-transform: uppercase; color: #94a3b8; font-weight: 700; }
          .value { margin-top: 6px; color: #ffffff; font-size: 15px; line-height: 1.4; font-weight: 700; word-break: break-word; }
          .notice { margin-top: 16px; border-radius: 20px; padding: 14px 16px; background: linear-gradient(180deg, rgba(15,23,42,0.78), rgba(255,255,255,0.04)); border: 1px solid rgba(255,255,255,0.08); }
          .hint { margin: 0; color: #cbd5e1; font-size: 12px; line-height: 1.6; }
          .actions { margin-top: 16px; display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; }
          .button { display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; padding: 12px 20px; font-size: 13px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; text-decoration: none; border: 0; cursor: pointer; }
          .button-primary { background: linear-gradient(90deg, #67e8f9, #fbbf24); color: #041018; }
          .button-secondary { border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.06); color: #ffffff; }
          @media (max-width: 720px) { .hero, .grid { grid-template-columns: 1fr; } .title { font-size: 22px; } .qr-frame img { width: 160px; height: 160px; } }
          @page { size: A4; margin: 10mm; }
          @media print {
            .actions { display: none; }
            body { background: #ffffff; }
            .wrap { min-height: auto; padding: 0; display: block; }
            .card { width: 100%; box-shadow: none; border-color: #cbd5e1; background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); break-inside: avoid; }
            .cell, .notice, .qr-card { background: rgba(248,250,252,0.92); }
            .lead, .hint { color: #334155; }
            .value { color: #0f172a; }
          }
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="card">
            <div class="top">
              <div class="logo"><img src="${logoUrl}" alt="CEAS logo" /></div>
              <div class="overline">Computer Engineering Association</div>
              <h1 class="title">Official Event Pass</h1>
            </div>
            <div class="body">
              <div class="badge" style="${badgeStyle}">${escapeHtml(statusLabel)}</div>
              <div class="hero">
                <div>
                  <div class="lead">${escapeHtml(leadCopy)}</div>
                  <div class="grid">
                    <div class="cell"><div class="label">Registration code</div><div class="value">${escapeHtml(registration.registration_code)}</div></div>
                    <div class="cell"><div class="label">Event</div><div class="value">${escapeHtml(registration.event_name)}</div></div>
                    <div class="cell"><div class="label">Team / Participant</div><div class="value">${escapeHtml(registration.team_name)}</div></div>
                    <div class="cell"><div class="label">Contact</div><div class="value">${escapeHtml(registration.contact_name)}<br />${escapeHtml(registration.contact_email)}</div></div>
                    <div class="cell"><div class="label">Schedule</div><div class="value">${escapeHtml(registration.date_label)}<br />${escapeHtml(registration.time_label)}</div></div>
                    <div class="cell"><div class="label">Venue</div><div class="value">${escapeHtml(registration.venue)}</div></div>
                  </div>
                </div>
                <div class="qr-card">
                  <div class="qr-frame">
                    <img src="${escapeHtml(qrUrl)}" alt="Registration QR" />
                  </div>
                  <div class="qr-copy">Show this QR and registration code at the verification desk.</div>
                </div>
              </div>
              <div class="notice">
                <p class="hint">${escapeHtml(hintCopy)}</p>
              </div>
              <div class="actions">
                <button type="button" class="button button-primary" onclick="window.print()">Print / Save PDF</button>
                <a class="button button-secondary" href="${appUrl}/#tracker">Open Tracker</a>
              </div>
            </div>
          </div>
        </div>
        ${autoPrint ? `<script>window.addEventListener('load', () => { window.setTimeout(() => { if (typeof window.print === 'function') { window.print(); } }, 450); });</script>` : ''}
      </body>
    </html>
  `;
}

function getCertificateParticipants(registration) {
  const participants = Array.isArray(registration?.participants)
    ? registration.participants
      .map((participant) => ({
        fullName: String(participant?.fullName || '').trim(),
        isLead: Boolean(participant?.isLead),
      }))
      .filter((participant) => participant.fullName)
    : [];

  if (participants.length > 0) {
    return participants;
  }

  const fallbackName = String(registration?.contact_name || registration?.team_name || 'Participant').trim() || 'Participant';
  return [{ fullName: fallbackName, isLead: true }];
}

function resolveCertificateFontSize(value, variant = 'participant') {
  const length = String(value || '').trim().length;

  if (variant === 'project-participant') {
    if (length > 50) return '24px';
    if (length > 42) return '27px';
    if (length > 34) return '30px';
    if (length > 26) return '33px';
    return '36px';
  }

  if (variant === 'project-title') {
    if (length > 80) return '26px';
    if (length > 64) return '28px';
    if (length > 50) return '30px';
    if (length > 36) return '33px';
    return '36px';
  }

  if (variant === 'event') {
    if (length > 34) return '21px';
    if (length > 26) return '23px';
    if (length > 20) return '25px';
    return '27px';
  }

  if (length > 40) return '21px';
  if (length > 32) return '23px';
  if (length > 24) return '26px';
  return '29px';
}

function resolveCertificateLayout({
  registration,
  participantName,
  eventName,
  appUrl = resolvePublicAppUrl(),
} = {}) {
  if (registration?.event_slug === 'techxcelerate') {
    const projectTitle = String(registration?.project_title || 'Project Title').trim() || 'Project Title';

    return {
      certificateLabel: 'Project Participation Certificate',
      templateUrl: `${appUrl}/images/techxcelerate-project-certificate-template.png`,
      showMeta: false,
      fields: [
        {
          key: 'participant',
          value: participantName,
          fontSize: resolveCertificateFontSize(participantName, 'project-participant'),
          css: {
            left: '51.9%',
            width: '55.15%',
            top: '46.95%',
            color: '#202020',
          },
          canvas: {
            x: 0.519,
            y: 0.4695,
            maxWidth: 0.5515,
            color: '#202020',
          },
        },
        {
          key: 'project',
          value: projectTitle,
          fontSize: resolveCertificateFontSize(projectTitle, 'project-title'),
          css: {
            left: '55%',
            width: '62.75%',
            top: '51.4%',
            color: '#202020',
          },
          canvas: {
            x: 0.55,
            y: 0.514,
            maxWidth: 0.6275,
            color: '#202020',
          },
        },
      ],
    };
  }

  return {
    certificateLabel: 'Participation Certificate',
    templateUrl: `${appUrl}/images/participation-certificate-template.png`,
    showMeta: true,
    fields: [
      {
        key: 'participant',
        value: participantName,
        fontSize: resolveCertificateFontSize(participantName, 'participant'),
        css: {
          left: '57.075%',
          width: '40.7%',
          top: '46.9%',
          color: '#13385c',
        },
        canvas: {
          x: 0.57075,
          y: 0.469,
          maxWidth: 0.407,
          color: '#13385c',
        },
      },
      {
        key: 'event',
        value: eventName,
        fontSize: resolveCertificateFontSize(eventName, 'event'),
        css: {
          left: '49.125%',
          width: '30.1%',
          top: '50.7%',
          color: '#1e2f44',
        },
        canvas: {
          x: 0.49125,
          y: 0.507,
          maxWidth: 0.301,
          color: '#1e2f44',
        },
      },
    ],
  };
}

function resolveMobileCertificateFieldOverrides(field) {
  if (field?.key === 'participant') {
    return {
      fontBoost: 3,
      yShift: 0.005,
    };
  }

  if (field?.key === 'event' || field?.key === 'project') {
    return {
      fontBoost: 2,
      yShift: 0.004,
    };
  }

  return {
    fontBoost: 0,
    yShift: 0,
  };
}

function buildCertificateNoticePage({
  title,
  message,
  appUrl = resolvePublicAppUrl(),
} = {}) {
  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(title || 'Certificate update')}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            padding: 20px;
            font-family: Inter, Arial, sans-serif;
            color: #e5eefb;
            background:
              radial-gradient(circle at top left, rgba(59,130,246,0.18), transparent 26%),
              radial-gradient(circle at bottom right, rgba(236,72,153,0.14), transparent 24%),
              linear-gradient(180deg, #07111d 0%, #0f172a 100%);
          }
          .card {
            width: min(100%, 620px);
            border-radius: 28px;
            border: 1px solid rgba(148,163,184,0.18);
            background: linear-gradient(180deg, rgba(15,23,42,0.9), rgba(17,24,39,0.92));
            box-shadow: 0 30px 80px rgba(2,8,23,0.4);
            padding: 26px;
          }
          .eyebrow {
            font-size: 11px;
            letter-spacing: 0.28em;
            text-transform: uppercase;
            color: #93c5fd;
            font-weight: 800;
          }
          h1 {
            margin: 12px 0 0;
            font-family: Orbitron, Inter, Arial, sans-serif;
            font-size: 28px;
            line-height: 1.15;
            text-transform: uppercase;
            color: #fff;
          }
          p {
            margin: 14px 0 0;
            color: #cbd5e1;
            line-height: 1.7;
          }
          .actions {
            margin-top: 22px;
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
          }
          .button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 999px;
            padding: 12px 18px;
            font-size: 13px;
            font-weight: 800;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            text-decoration: none;
          }
          .button-primary {
            background: linear-gradient(90deg, #67e8f9, #fbbf24);
            color: #041018;
          }
          .button-secondary {
            border: 1px solid rgba(255,255,255,0.12);
            background: rgba(255,255,255,0.06);
            color: #fff;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="eyebrow">Cognotsav 2026</div>
          <h1>${escapeHtml(title || 'Certificate update')}</h1>
          <p>${escapeHtml(message || 'Certificate availability will appear here once the organizer requirements are met.')}</p>
          <div class="actions">
            <a class="button button-primary" href="${appUrl}/#tracker">Open Tracker</a>
            <a class="button button-secondary" href="${appUrl}/">Back to Portal</a>
          </div>
        </div>
      </body>
    </html>
  `;
}

function buildParticipationCertificatePage({
  registration,
  participant,
  participantIndex = 0,
  appUrl = resolvePublicAppUrl(),
  download = false,
  mobileDownloadView = false,
} = {}) {
  const participantName = String(participant?.fullName || registration?.contact_name || registration?.team_name || 'Participant').trim() || 'Participant';
  const eventName = String(registration?.event_name || 'Cognotsav 2026').trim() || 'Cognotsav 2026';
  const certificateLayout = resolveCertificateLayout({
    registration,
    participantName,
    eventName,
    appUrl,
  });
  const templateUrl = certificateLayout.templateUrl;
  const issueDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
  const certificateId = `${String(registration?.registration_code || 'CGN').toUpperCase()}-${participantIndex + 1}`;
  const shouldAutoPrint = download && !mobileDownloadView;
  const downloadFileName = (
    `${String(registration?.registration_code || 'cognotsav').trim()}-${participantName}-certificate.png`
      .normalize('NFKD')
      .replace(/[^\x00-\x7F]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-')
  ) || 'cognotsav-certificate.png';
  const fieldMarkup = certificateLayout.fields
    .map((field) => `
            <div class="field field--${field.key}" style="left:${field.css.left};width:${field.css.width};top:${field.css.top};font-size:${field.fontSize};color:${field.css.color};"><span class="field-chip"${field.css.chipBackground ? ` style="background:${field.css.chipBackground};padding:${field.css.chipPadding};border-radius:${field.css.chipRadius};"` : ''}>${escapeHtml(field.value)}</span></div>`)
    .join('');
  const mobileRenderConfig = mobileDownloadView
    ? serializeInlineJson({
      templateUrl,
      fields: certificateLayout.fields.map((field) => {
        const mobileOverrides = resolveMobileCertificateFieldOverrides(field);
        return {
          value: field.value,
          fontSize: (Number.parseFloat(field.fontSize) || 26) + mobileOverrides.fontBoost,
          color: field.canvas.color,
          x: field.canvas.x,
          y: field.canvas.y + mobileOverrides.yShift,
          maxWidth: field.canvas.maxWidth,
          chipBackground: field.canvas.chipBackground || null,
          chipPaddingX: field.canvas.chipPaddingX || 0,
          chipPaddingY: field.canvas.chipPaddingY || 0,
          chipRadius: field.canvas.chipRadius || 0,
        };
      }),
      certificateId,
      issueDate,
      showMeta: certificateLayout.showMeta,
      fileName: downloadFileName,
      trackerUrl: `${appUrl}/#tracker`,
    })
    : 'null';

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="${mobileDownloadView ? '#0b1020' : '#07111d'}" />
        <title>${escapeHtml(participantName)} ${escapeHtml(certificateLayout.certificateLabel)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            min-height: 100vh;
            padding: ${mobileDownloadView ? '16px 16px 96px' : '18px'};
            font-family: Inter, Arial, sans-serif;
            background: ${mobileDownloadView ? '#0b1020' : `
              radial-gradient(circle at top left, rgba(59,130,246,0.18), transparent 28%),
              radial-gradient(circle at bottom right, rgba(251,191,36,0.16), transparent 24%),
              linear-gradient(180deg, #07111d 0%, #0f172a 100%)`};
            color: #e5eefb;
            ${mobileDownloadView ? 'display: flex; align-items: flex-start; justify-content: center;' : ''}
          }
          .wrap {
            width: ${mobileDownloadView ? '100%' : 'min(100%, 1340px)'};
            max-width: ${mobileDownloadView ? 'calc(100vw - 32px)' : '1340px'};
            margin: 0 auto;
          }
          .sheet {
            position: relative;
            width: 100%;
            aspect-ratio: 2000 / 1414;
            overflow: hidden;
            border-radius: ${mobileDownloadView ? '0' : '24px'};
            box-shadow: ${mobileDownloadView ? 'none' : '0 32px 84px rgba(2,8,23,0.38)'};
            background: #ffffff;
          }
          .template {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            user-select: none;
            -webkit-user-drag: none;
          }
          .field {
            position: absolute;
            z-index: 2;
            text-align: center;
            transform: translate(-50%, -50%);
            color: #13385c;
            font-family: "Times New Roman", Georgia, serif;
            font-weight: 700;
            line-height: 1;
            text-shadow: 0 1px 0 rgba(255,255,255,0.45);
          }
          .field-chip {
            display: inline-block;
            -webkit-box-decoration-break: clone;
            box-decoration-break: clone;
          }
          .meta {
            position: absolute;
            z-index: 2;
            bottom: 12.7%;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: rgba(17, 52, 88, 0.72);
          }
          .meta--left { left: 11%; }
          .meta--right { right: 11%; text-align: right; }
          .actions {
            margin-top: 18px;
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            justify-content: center;
          }
          .button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 999px;
            padding: 12px 18px;
            font-size: 13px;
            font-weight: 800;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            text-decoration: none;
            border: 0;
            cursor: pointer;
          }
          .button-primary {
            background: linear-gradient(90deg, #67e8f9, #fbbf24);
            color: #041018;
          }
          .button-secondary {
            border: 1px solid rgba(255,255,255,0.12);
            background: rgba(255,255,255,0.06);
            color: #ffffff;
          }
          .note {
            margin-top: 12px;
            text-align: center;
            color: #cbd5e1;
            font-size: 13px;
            line-height: 1.6;
          }
          ${mobileDownloadView ? `
            .sheet {
              display: none;
            }
            .actions,
            .note {
              display: none;
            }
            .mobile-preview-shell {
              position: relative;
              width: 100%;
              aspect-ratio: 2000 / 1414;
              overflow: hidden;
              border-radius: 8px;
              background: #ffffff;
            }
            .mobile-preview-image,
            .mobile-preview-status {
              position: absolute;
              inset: 0;
              width: 100%;
              height: 100%;
            }
            .mobile-preview-image {
              display: block;
              object-fit: contain;
              background: #ffffff;
            }
            .mobile-preview-status {
              display: grid;
              place-items: center;
              padding: 18px;
              text-align: center;
              font-size: 13px;
              font-weight: 700;
              letter-spacing: 0.08em;
              text-transform: uppercase;
              color: #64748b;
              background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
            }
            .mobile-download-fab {
              position: fixed;
              right: 16px;
              bottom: 18px;
              z-index: 50;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              min-height: 50px;
              padding: 0 18px;
              border-radius: 999px;
              background: linear-gradient(90deg, #67e8f9, #fbbf24);
              color: #041018;
              font-size: 13px;
              font-weight: 800;
              letter-spacing: 0.1em;
              text-transform: uppercase;
              text-decoration: none;
              box-shadow: 0 18px 40px rgba(2,8,23,0.36);
            }
            .mobile-download-fab[aria-disabled="true"] {
              background: rgba(255,255,255,0.12);
              color: #e2e8f0;
            }
          ` : ''}
          @media (max-width: 720px) {
            body {
              padding: ${mobileDownloadView ? '16px 16px 96px' : '0'};
            }
            .wrap {
              width: 100%;
            }
            .sheet {
              border-radius: 0;
              box-shadow: none;
            }
            .actions,
            .note {
              padding-inline: 16px;
            }
            ${mobileDownloadView ? `
              .mobile-preview-shell {
                border-radius: 6px;
              }
            ` : ''}
          }
          @page {
            size: 297mm 210mm;
            margin: 0;
          }
          @media print {
            html,
            body {
              width: 297mm;
              height: 210mm;
              min-height: 210mm;
              margin: 0;
              padding: 0;
              overflow: hidden;
              background: #ffffff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            body {
              display: block;
            }
            .wrap {
              width: 297mm;
              height: 210mm;
              max-width: none;
              margin: 0;
              padding: 0;
            }
            .sheet {
              width: 297mm;
              height: 210mm;
              max-width: none;
              aspect-ratio: auto;
              border-radius: 0;
              box-shadow: none;
              page-break-inside: avoid;
              break-inside: avoid-page;
              page-break-after: avoid;
              break-after: avoid-page;
            }
            .actions, .note {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="wrap">
          ${mobileDownloadView ? `
            <div class="mobile-preview-shell">
              <div class="mobile-preview-status">Preparing certificate...</div>
              <img class="mobile-preview-image" alt="Participation certificate preview" hidden />
            </div>
          ` : ''}
          <div class="sheet">
            <img class="template" src="${escapeHtml(templateUrl)}" alt="${escapeHtml(certificateLayout.certificateLabel)} template" />
            ${fieldMarkup}
            ${certificateLayout.showMeta ? `
            <div class="meta meta--left">Certificate ID: ${escapeHtml(certificateId)}</div>
            <div class="meta meta--right">Issued: ${escapeHtml(issueDate)}</div>` : ''}
          </div>

          <div class="actions">
            <button type="button" class="button button-primary" onclick="window.print()">Print / Save PDF</button>
            <a class="button button-secondary" href="${appUrl}/#tracker">Back to Tracker</a>
          </div>
          <p class="note">One certificate is generated per participant. Use Print / Save PDF to download the final certificate.</p>
        </div>
        ${mobileDownloadView ? `
          <a class="mobile-download-fab" href="#" aria-disabled="true" role="button">Preparing...</a>
          <script>
            (function () {
              var config = ${mobileRenderConfig};
              var previewImage = document.querySelector('.mobile-preview-image');
              var previewStatus = document.querySelector('.mobile-preview-status');
              var downloadFab = document.querySelector('.mobile-download-fab');
              var currentUrl = '';

              if (!config || !previewImage || !previewStatus || !downloadFab) {
                return;
              }

              function releaseUrl() {
                if (currentUrl && currentUrl.indexOf('blob:') === 0) {
                  URL.revokeObjectURL(currentUrl);
                }
                currentUrl = '';
              }

              function setFabState(label, enabled) {
                downloadFab.textContent = label;
                downloadFab.setAttribute('aria-disabled', enabled ? 'false' : 'true');
              }

              function loadImage(source) {
                return new Promise(function (resolve, reject) {
                  var image = new Image();
                  image.decoding = 'async';
                  image.onload = function () { resolve(image); };
                  image.onerror = function () { reject(new Error('Template image could not be loaded.')); };
                  image.src = source;
                });
              }

              function setCertificateFont(ctx, size) {
                ctx.font = '700 ' + size + 'px "Times New Roman", Georgia, serif';
              }

              function drawCenteredText(ctx, text, options) {
                var fontSize = options.fontSize;
                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                do {
                  setCertificateFont(ctx, fontSize);
                  if (ctx.measureText(text).width <= options.maxWidth || fontSize <= 10) {
                    break;
                  }
                  fontSize -= 1;
                } while (fontSize > 10);

                if (options.chipBackground) {
                  var textWidth = ctx.measureText(text).width;
                  var chipWidth = textWidth + (options.chipPaddingX || 0) * 2;
                  var chipHeight = fontSize * 1.1 + (options.chipPaddingY || 0) * 2;
                  var chipLeft = options.x - chipWidth / 2;
                  var chipTop = options.y - chipHeight / 2;
                  var chipRadius = Math.max(0, Math.min(options.chipRadius || 0, chipHeight / 2, chipWidth / 2));

                  ctx.save();
                  ctx.fillStyle = options.chipBackground;
                  if (chipRadius > 0) {
                    ctx.beginPath();
                    ctx.moveTo(chipLeft + chipRadius, chipTop);
                    ctx.lineTo(chipLeft + chipWidth - chipRadius, chipTop);
                    ctx.quadraticCurveTo(chipLeft + chipWidth, chipTop, chipLeft + chipWidth, chipTop + chipRadius);
                    ctx.lineTo(chipLeft + chipWidth, chipTop + chipHeight - chipRadius);
                    ctx.quadraticCurveTo(chipLeft + chipWidth, chipTop + chipHeight, chipLeft + chipWidth - chipRadius, chipTop + chipHeight);
                    ctx.lineTo(chipLeft + chipRadius, chipTop + chipHeight);
                    ctx.quadraticCurveTo(chipLeft, chipTop + chipHeight, chipLeft, chipTop + chipHeight - chipRadius);
                    ctx.lineTo(chipLeft, chipTop + chipRadius);
                    ctx.quadraticCurveTo(chipLeft, chipTop, chipLeft + chipRadius, chipTop);
                    ctx.closePath();
                    ctx.fill();
                  } else {
                    ctx.fillRect(chipLeft, chipTop, chipWidth, chipHeight);
                  }
                  ctx.restore();
                }

                ctx.fillStyle = options.color;
                ctx.shadowColor = 'rgba(255,255,255,0.45)';
                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 1;
                ctx.fillText(text, options.x, options.y);
                ctx.restore();
              }

              function drawMetaText(ctx, text, options) {
                ctx.save();
                ctx.font = '700 12px Inter, Arial, sans-serif';
                ctx.fillStyle = 'rgba(17, 52, 88, 0.72)';
                ctx.textBaseline = 'middle';
                ctx.textAlign = options.align;
                ctx.fillText(text, options.x, options.y);
                ctx.restore();
              }

              function canvasToObjectUrl(canvas) {
                return new Promise(function (resolve, reject) {
                  if (typeof canvas.toBlob === 'function') {
                    canvas.toBlob(function (blob) {
                      if (!blob) {
                        reject(new Error('Certificate file could not be created.'));
                        return;
                      }

                      resolve(URL.createObjectURL(blob));
                    }, 'image/png');
                    return;
                  }

                  try {
                    resolve(canvas.toDataURL('image/png'));
                  } catch (error) {
                    reject(error);
                  }
                });
              }

              async function renderCertificate() {
                try {
                  var template = await loadImage(config.templateUrl);
                  var canvas = document.createElement('canvas');
                  canvas.width = template.naturalWidth || 2000;
                  canvas.height = template.naturalHeight || 1414;

                  var ctx = canvas.getContext('2d');
                  if (!ctx) {
                    throw new Error('Canvas is not supported in this browser.');
                  }

                  ctx.drawImage(template, 0, 0, canvas.width, canvas.height);

                  (Array.isArray(config.fields) ? config.fields : []).forEach(function (field) {
                    drawCenteredText(ctx, field.value, {
                      x: canvas.width * field.x,
                      y: canvas.height * field.y,
                      maxWidth: canvas.width * field.maxWidth,
                      fontSize: field.fontSize,
                      color: field.color || '#13385c',
                      chipBackground: field.chipBackground || null,
                      chipPaddingX: field.chipPaddingX || 0,
                      chipPaddingY: field.chipPaddingY || 0,
                      chipRadius: field.chipRadius || 0,
                    });
                  });

                  if (config.showMeta) {
                    drawMetaText(ctx, 'Certificate ID: ' + config.certificateId, {
                      x: canvas.width * 0.11,
                      y: canvas.height * 0.873,
                      align: 'left',
                    });

                    drawMetaText(ctx, 'Issued: ' + config.issueDate, {
                      x: canvas.width * 0.89,
                      y: canvas.height * 0.873,
                      align: 'right',
                    });
                  }

                  releaseUrl();
                  currentUrl = await canvasToObjectUrl(canvas);

                  previewImage.src = currentUrl;
                  previewImage.hidden = false;
                  previewStatus.hidden = true;
                  downloadFab.href = currentUrl;
                  downloadFab.download = config.fileName;
                  setFabState('Download', true);
                } catch (error) {
                  previewStatus.textContent = 'Unable to prepare certificate.';
                  downloadFab.href = config.trackerUrl;
                  downloadFab.removeAttribute('download');
                  setFabState('Back', true);
                }
              }

              downloadFab.addEventListener('click', function (event) {
                if (downloadFab.getAttribute('aria-disabled') === 'true') {
                  event.preventDefault();
                }
              });

              window.addEventListener('pagehide', releaseUrl);
              renderCertificate();
            })();
          </script>
        ` : ''}
        ${shouldAutoPrint ? `
          <script>
            window.addEventListener('load', function () {
              var template = document.querySelector('.template');
              var triggerPrint = function () {
                window.setTimeout(function () {
                  if (typeof window.print === 'function') {
                    window.print();
                  }
                }, 450);
              };

              if (template && !template.complete) {
                template.addEventListener('load', triggerPrint, { once: true });
                template.addEventListener('error', triggerPrint, { once: true });
              } else {
                triggerPrint();
              }
            });
          </script>
        ` : ''}
      </body>
    </html>
  `;
}

function buildPassLookupRecoveryPage(appUrl = resolvePublicAppUrl(), options = {}) {
  const prefilledQuery = String(options?.prefilledQuery || '').trim();
  const fallbackEmail = String(options?.fallbackEmail || '').trim().toLowerCase();
  const downloadRequested = Boolean(options?.download);
  const initialQuery = prefilledQuery || fallbackEmail;
  const encodedInitialQuery = escapeHtml(initialQuery);
  const trackerHref = `${appUrl}/#tracker`;
  const lookupEndpoint = `${appUrl}/api/registrations/lookup`;

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Recover Event Pass</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            padding: 20px;
            font-family: Inter, Arial, sans-serif;
            color: #e5eefb;
            background:
              radial-gradient(circle at top left, rgba(59,130,246,0.18), transparent 26%),
              radial-gradient(circle at bottom right, rgba(236,72,153,0.16), transparent 24%),
              linear-gradient(180deg, #07111d 0%, #0f172a 100%);
          }
          .card {
            width: min(100%, 620px);
            border-radius: 28px;
            border: 1px solid rgba(148,163,184,0.18);
            background: linear-gradient(180deg, rgba(15,23,42,0.9), rgba(17,24,39,0.92));
            box-shadow: 0 30px 80px rgba(2,8,23,0.4);
            padding: 24px;
          }
          .eyebrow {
            font-size: 11px;
            letter-spacing: 0.28em;
            text-transform: uppercase;
            color: #93c5fd;
            font-weight: 800;
          }
          h1 {
            margin: 12px 0 0;
            font-family: Orbitron, Inter, Arial, sans-serif;
            font-size: 28px;
            line-height: 1.15;
            text-transform: uppercase;
            color: #fff;
          }
          p {
            margin: 12px 0 0;
            color: #cbd5e1;
            line-height: 1.65;
          }
          form {
            margin-top: 18px;
            display: grid;
            gap: 12px;
          }
          input {
            width: 100%;
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 18px;
            padding: 14px 16px;
            font-size: 15px;
            color: #fff;
            background: rgba(255,255,255,0.06);
            outline: none;
          }
          input::placeholder {
            color: #94a3b8;
          }
          .actions {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
          }
          .button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 999px;
            padding: 12px 18px;
            font-size: 13px;
            font-weight: 800;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            text-decoration: none;
            border: 0;
            cursor: pointer;
          }
          .button-primary {
            background: linear-gradient(90deg, #67e8f9, #fbbf24);
            color: #041018;
          }
          .button-secondary {
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.12);
            color: #fff;
          }
          .status {
            margin-top: 14px;
            border-radius: 18px;
            border: 1px solid rgba(148,163,184,0.18);
            background: rgba(15,23,42,0.55);
            padding: 14px;
            color: #cbd5e1;
            min-height: 56px;
          }
          .status strong {
            color: #fff;
          }
          .results {
            margin-top: 14px;
            display: grid;
            gap: 10px;
          }
          .result {
            border-radius: 18px;
            border: 1px solid rgba(255,255,255,0.1);
            background: rgba(255,255,255,0.04);
            padding: 14px;
          }
          .result-title {
            margin: 0;
            font-size: 15px;
            font-weight: 800;
            color: #fff;
          }
          .result-copy {
            margin: 8px 0 0;
            font-size: 13px;
            color: #cbd5e1;
          }
          .result-link {
            margin-top: 12px;
          }
          @media (max-width: 640px) {
            .card { padding: 18px; border-radius: 22px; }
            h1 { font-size: 24px; }
            .actions { flex-direction: column; }
            .button { width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="eyebrow">Pass Recovery</div>
          <h1>We Couldn't Match That Pass Link Yet</h1>
          <p>This can happen when a mobile app rewrites the pass URL. Search using your registration code or contact email and we'll reopen the correct pass.</p>
          <form id="pass-recovery-form">
            <input id="pass-recovery-input" type="text" placeholder="Enter registration code or contact email" value="${encodedInitialQuery}" />
            <div class="actions">
              <button type="submit" class="button button-primary">Recover Pass</button>
              <a class="button button-secondary" href="${escapeHtml(trackerHref)}">Open Tracker</a>
            </div>
          </form>
          <div id="pass-recovery-status" class="status">Trying to recover your pass...</div>
          <div id="pass-recovery-results" class="results"></div>
        </div>
        <script>
          const lookupEndpoint = ${serializeInlineJson(lookupEndpoint)};
          const passBaseUrl = ${serializeInlineJson(appUrl)};
          const preserveDownload = ${downloadRequested ? 'true' : 'false'};
          const initialQuery = ${serializeInlineJson(initialQuery)};
          const form = document.getElementById('pass-recovery-form');
          const input = document.getElementById('pass-recovery-input');
          const statusNode = document.getElementById('pass-recovery-status');
          const resultsNode = document.getElementById('pass-recovery-results');

          function setStatus(message) {
            statusNode.textContent = message;
          }

          function buildPassHref(result) {
            const params = new URLSearchParams();
            if (result.id) params.set('id', result.id);
            if (result.registration_code) params.set('code', result.registration_code);
            if (result.contact_email) params.set('email', result.contact_email);
            if (preserveDownload) params.set('download', 'true');
            return passBaseUrl.replace(/\\/+$/, '') + '/pass?' + params.toString();
          }

          function renderResults(results) {
            resultsNode.innerHTML = '';
            for (const result of results) {
              const wrapper = document.createElement('div');
              wrapper.className = 'result';
              const linkHref = buildPassHref(result);
              wrapper.innerHTML = [
                '<p class="result-title">' + result.team_name + '</p>',
                '<p class="result-copy">' + result.event_name + ' / ' + result.registration_code + '</p>',
                '<p class="result-copy">' + result.date_label + ' / ' + result.time_label + ' / ' + result.venue + '</p>',
                '<div class="result-link"><a class="button button-primary" href="' + linkHref + '">Open Pass</a></div>',
              ].join('');
              resultsNode.appendChild(wrapper);
            }
          }

          async function recoverPass(query) {
            const normalizedQuery = String(query || '').trim();
            if (!normalizedQuery) {
              setStatus('Enter your registration code or contact email to recover the pass.');
              resultsNode.innerHTML = '';
              return;
            }

            setStatus('Checking the latest registration records...');
            resultsNode.innerHTML = '';

            try {
              const response = await fetch(lookupEndpoint + '?query=' + encodeURIComponent(normalizedQuery), { credentials: 'same-origin' });
              if (!response.ok) {
                throw new Error('Lookup failed.');
              }

              const results = await response.json();
              if (!Array.isArray(results) || results.length === 0) {
                setStatus('No registration matched that search. Please verify the code or use the tracker.');
                return;
              }

              if (results.length === 1) {
                setStatus('Pass found. Opening it now...');
                window.location.replace(buildPassHref(results[0]));
                return;
              }

              setStatus('Multiple registrations matched this email. Choose the correct event pass below.');
              renderResults(results);
            } catch (error) {
              setStatus('Pass recovery failed. Please open the tracker and search manually.');
            }
          }

          form.addEventListener('submit', (event) => {
            event.preventDefault();
            recoverPass(input.value);
          });

          if (initialQuery) {
            recoverPass(initialQuery);
          } else {
            setStatus('Enter your registration code or contact email to recover the pass.');
          }
        </script>
      </body>
    </html>
  `;
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
        r.project_title,
        r.registration_source,
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

async function promoteNextWaitlistedRegistration(eventSlug, options = {}) {
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
  const notification = await sendStatusNotification(registration, options);
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
        r.project_title,
        r.registration_source,
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
    ? await fetchAdminRegistrations('WHERE r.id = $1 AND r.event_slug = ANY($2::text[])', [registrationId, resolveScopedAdminEventSlugs(eventSlug)])
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

app.get(['/pass', '/pass/:registrationCode'], async (req, res) => {
  const rawRegistrationCode = String(
    req.params.registrationCode ||
      req.query?.code ||
      req.query?.registrationCode ||
      req.query?.registration_code ||
      '',
  ).trim();
  const rawRegistrationId = String(req.query?.id || '').trim();
  const rawInviteToken = String(req.query?.token || req.query?.inviteToken || '').trim();
  const rawContactEmail = normalizeEmail(req.query?.email || req.query?.contactEmail || '');
  const extractedRegistrationCode = extractRegistrationCodeCandidate(rawRegistrationCode || req.originalUrl || '');
  const normalizedRegistrationCode = extractedRegistrationCode.toLowerCase();
  const compactRegistrationCode = normalizedRegistrationCode.replace(/[^a-z0-9]/g, '');
  const downloadRequested = ['1', 'true', 'yes'].includes(String(req.query?.download || '').trim().toLowerCase());

  if (!rawRegistrationId && !rawInviteToken && !compactRegistrationCode && !rawContactEmail) {
    return res.status(400).send('Invalid registration code.');
  }

  const result = await pool.query(
    `
      SELECT
        r.registration_code,
        r.team_name,
        r.contact_name,
        r.contact_email,
        r.status,
        r.review_note,
        e.name AS event_name,
        e.date_label,
        e.time_label,
        e.venue
      FROM registrations r
      JOIN events e ON e.slug = r.event_slug
      WHERE ($1::text <> '' AND r.id = $1)
         OR ($2::text <> '' AND r.invite_token = $2)
         OR ($3::text <> '' AND LOWER(r.registration_code) = $3)
         OR ($4::text <> '' AND REGEXP_REPLACE(LOWER(r.registration_code), '[^a-z0-9]', '', 'g') = $4)
      LIMIT 1
    `,
    [rawRegistrationId, rawInviteToken, normalizedRegistrationCode, compactRegistrationCode],
  );

  const registration = result.rows[0] ?? null;
  if (!registration) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(
      buildPassLookupRecoveryPage(resolvePublicAppUrl(req), {
        prefilledQuery: extractedRegistrationCode || rawRegistrationCode,
        fallbackEmail: rawContactEmail,
        download: downloadRequested,
      }),
    );
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(buildVerifiedPassPage(registration, resolvePublicAppUrl(req), { download: downloadRequested }));
});

app.get(['/certificate', '/certificate/:registrationCode'], async (req, res) => {
  const rawRegistrationCode = String(
    req.params.registrationCode ||
      req.query?.code ||
      req.query?.registrationCode ||
      req.query?.registration_code ||
      '',
  ).trim();
  const rawRegistrationId = String(req.query?.id || '').trim();
  const rawInviteToken = String(req.query?.token || req.query?.inviteToken || '').trim();
  const extractedRegistrationCode = extractRegistrationCodeCandidate(rawRegistrationCode || req.originalUrl || '');
  const normalizedRegistrationCode = extractedRegistrationCode.toLowerCase();
  const compactRegistrationCode = normalizedRegistrationCode.replace(/[^a-z0-9]/g, '');
  const participantIndex = Math.max(0, Number.parseInt(String(req.query?.participant || req.query?.participantIndex || '0'), 10) || 0);
  const downloadRequested = ['1', 'true', 'yes'].includes(String(req.query?.download || '').trim().toLowerCase());
  const appUrl = resolvePublicAppUrl(req);
  const mobileDownloadView = downloadRequested && isLikelyMobileUserAgent(req.get('user-agent'));

  if (!rawRegistrationId && !rawInviteToken && !compactRegistrationCode) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(400).send(buildCertificateNoticePage({
      title: 'Certificate link is incomplete',
      message: 'Open the tracker again and use the participant certificate buttons to generate the correct certificate.',
      appUrl,
    }));
  }

  const result = await pool.query(
    `
      SELECT
        r.id,
        r.registration_code,
        r.event_slug,
        COALESCE(r.project_title, '') AS project_title,
        r.team_name,
        r.contact_name,
        r.contact_email,
        r.status,
        r.attendance_status,
        e.name AS event_name,
        e.date_label,
        e.time_label,
        e.venue
      FROM registrations r
      JOIN events e ON e.slug = r.event_slug
      WHERE ($1::text <> '' AND r.id = $1)
         OR ($2::text <> '' AND r.invite_token = $2)
         OR ($3::text <> '' AND LOWER(r.registration_code) = $3)
         OR ($4::text <> '' AND REGEXP_REPLACE(LOWER(r.registration_code), '[^a-z0-9]', '', 'g') = $4)
      LIMIT 1
    `,
    [rawRegistrationId, rawInviteToken, normalizedRegistrationCode, compactRegistrationCode],
  );

  const registration = result.rows[0] ?? null;
  if (!registration) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(404).send(buildCertificateNoticePage({
      title: 'Certificate not found',
      message: 'We could not find this registration certificate link. Search again from the tracker and open the certificate from there.',
      appUrl,
    }));
  }

  if (registration.status !== 'verified') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(403).send(buildCertificateNoticePage({
      title: 'Certificate not ready yet',
      message: 'This registration is not verified yet, so participation certificates are still locked.',
      appUrl,
    }));
  }

  if (!hasEventConcluded(registration)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(403).send(buildCertificateNoticePage({
      title: 'Certificate unlocks after the event',
      message: 'The event has not concluded yet. Certificates will be available here after the event wraps up.',
      appUrl,
    }));
  }

  const participantsResult = await pool.query(
    `
      SELECT
        full_name,
        is_lead
      FROM registration_participants
      WHERE registration_id = $1
      ORDER BY id ASC
    `,
    [registration.id],
  );

  registration.participants = participantsResult.rows.map((participantRow) => ({
    fullName: participantRow.full_name,
    isLead: Boolean(participantRow.is_lead),
  }));

  const participants = getCertificateParticipants(registration);
  const participant = participants[participantIndex];
  if (!participant) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(404).send(buildCertificateNoticePage({
      title: 'Participant not found',
      message: 'That participant certificate link is invalid. Please go back to the tracker and choose the certificate again.',
      appUrl,
    }));
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(buildParticipationCertificatePage({
    registration,
    participant,
    participantIndex,
    appUrl,
    download: downloadRequested,
    mobileDownloadView,
  }));
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
    presentationMode,
    projectTitle,
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
    `SELECT *, is_active AS registration_enabled FROM events WHERE slug = $1`,
    [eventSlug],
  );

  const event = eventResult.rows[0];
  if (!event) {
    return res.status(404).json({ error: 'Selected event is not available.' });
  }

  if (!event.registration_enabled) {
    return res.status(400).json({ error: 'Registration for this event is currently stopped by the organizer.' });
  }

  if (hasEventConcluded(event)) {
    return res.status(400).json({ error: 'This event has already concluded. Registrations are closed now.' });
  }

  if (participants.length < event.min_members || participants.length > event.max_members) {
    return res.status(400).json({
      error: `This event accepts ${event.min_members} to ${event.max_members} participants.`,
    });
  }

  const normalizedPresentationMode = String(presentationMode || '').trim().toLowerCase();
  const normalizedProjectTitle = String(projectTitle || '').trim();
  if (event.slug === 'techxcelerate' && !['online', 'offline'].includes(normalizedPresentationMode)) {
    return res.status(400).json({ error: 'Choose online or offline presentation for Techxcelerate Project Expo.' });
  }

  if (event.slug === 'techxcelerate' && !normalizedProjectTitle) {
    return res.status(400).json({ error: 'Project title is required for Techxcelerate Project Expo.' });
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
          year_of_study, contact_name, contact_email, contact_phone, registration_source, payment_method,
          presentation_mode, project_title, payment_reference, payment_screenshot_path, payment_provider_order_id,
          payment_provider_payment_id, payment_provider_signature, total_amount, status, notes, invite_token
        )
        VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16, $17, $18, $19,
          $20, $21, $22, $23
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
        'online',
        'upi',
        event.slug === 'techxcelerate' ? normalizedPresentationMode : null,
        event.slug === 'techxcelerate' ? normalizedProjectTitle : null,
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
    const notificationRegistration = {
      id: registrationId,
      event_slug: eventSlug,
      registration_code: registrationCode,
      team_name: String(teamName).trim(),
      college_name: String(collegeName).trim(),
      department_name: String(departmentName).trim(),
      year_of_study: String(yearOfStudy).trim(),
      contact_name: String(contactName).trim(),
      contact_email: normalizeEmail(contactEmail),
      contact_phone: String(contactPhone).trim(),
      presentation_mode: event.slug === 'techxcelerate' ? normalizedPresentationMode : null,
      project_title: event.slug === 'techxcelerate' ? normalizedProjectTitle : null,
      payment_reference: paymentReference ? String(paymentReference).trim() : null,
      total_amount: totalAmount,
      status: initialStatus,
      notes: notes ? String(notes).trim() : null,
      participants: participants.map((participant) => ({
        fullName: String(participant.fullName).trim(),
        email: normalizeEmail(participant.email),
        phone: String(participant.phone).trim(),
      })),
      review_note: null,
      event_name: event.name,
      date_label: event.date_label,
      time_label: event.time_label,
      venue: event.venue,
    };
    const notification = await sendStatusNotification(notificationRegistration, { req });
    await sendAdminRegistrationAlert(notificationRegistration, { req });

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

app.post('/api/admin/registrations/special', requireAdmin, async (req, res) => {
  const {
    eventSlug,
    teamName,
    collegeName,
    departmentName,
    yearOfStudy,
    contactName,
    contactEmail,
    contactPhone,
    projectTitle,
    paymentMethod,
    paymentReference,
    notes,
    participants,
    markVerified,
  } = req.body || {};

  const normalizedEventSlug = String(eventSlug || '').trim();
  const normalizedTeamName = String(teamName || '').trim() || String(contactName || '').trim();
  const normalizedCollegeName = String(collegeName || '').trim();
  const normalizedDepartmentName = String(departmentName || '').trim() || 'Not Provided';
  const normalizedYearOfStudy = String(yearOfStudy || '').trim() || 'Not Provided';
  const normalizedContactName = String(contactName || '').trim();
  const normalizedContactEmail = normalizeEmail(contactEmail);
  const normalizedContactPhone = String(contactPhone || '').trim();
  const normalizedProjectTitle = String(projectTitle || '').trim();
  const normalizedPaymentMethod = String(paymentMethod || '').trim().toLowerCase();
  const normalizedPaymentReference = String(paymentReference || '').trim();
  const normalizedNotes = String(notes || '').trim();

  if (
    !normalizedEventSlug ||
    !normalizedTeamName ||
    !normalizedCollegeName ||
    !normalizedContactName ||
    !normalizedContactEmail ||
    !normalizedContactPhone ||
    !Array.isArray(participants) ||
    participants.length === 0
  ) {
    return res.status(400).json({ error: 'Missing required special registration fields.' });
  }

  if (!['cash', 'upi', 'free'].includes(normalizedPaymentMethod)) {
    return res.status(400).json({ error: 'Invalid payment method for special registration.' });
  }

  const eventResult = await pool.query(
    `
      SELECT *, is_active AS registration_enabled
      FROM events
      WHERE slug = $1
      LIMIT 1
    `,
    [normalizedEventSlug],
  );

  const event = eventResult.rows[0] ?? null;
  if (!event) {
    return res.status(404).json({ error: 'Selected event is not available.' });
  }

  if (!hasScopedEventAccess(req, normalizedEventSlug)) {
    return res.status(403).json({ error: 'This access key can create registrations only for its assigned event.' });
  }

  if (participants.length < event.min_members || participants.length > event.max_members) {
    return res.status(400).json({
      error: `This event accepts ${event.min_members} to ${event.max_members} participants.`,
    });
  }

  const preparedParticipants = participants.map((participant, index) => ({
    fullName: String(participant?.fullName || '').trim(),
    email: normalizeEmail(participant?.email),
    phone: String(participant?.phone || '').trim(),
    isLead: index === 0,
  }));

  if (preparedParticipants.some((participant) => !participant.fullName || !participant.email || !participant.phone)) {
    return res.status(400).json({ error: 'Participant details are incomplete.' });
  }

  const registrationId = randomUUID();
  const registrationCode = buildRegistrationCode();
  const inviteToken = buildInviteToken();
  const totalAmount =
    normalizedPaymentMethod === 'free'
      ? 0
      : resolveRegistrationAmount(event, preparedParticipants.length);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (normalizedPaymentReference) {
      const duplicatePaymentResult = await client.query(
        `
          SELECT registration_code
          FROM registrations
          WHERE payment_reference = $1
            AND status <> 'rejected'
          LIMIT 1
        `,
        [normalizedPaymentReference],
      );

      if (duplicatePaymentResult.rowCount > 0) {
        throw new Error('This payment reference is already linked to another registration.');
      }
    }

    let initialStatus = Boolean(markVerified) ? 'verified' : 'pending';
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
        [normalizedEventSlug],
      );
      const registrationCount = slotResult.rows[0]?.registration_count ?? 0;
      const waitlistCount = slotResult.rows[0]?.waitlist_count ?? 0;

      if (registrationCount >= event.max_slots) {
        initialStatus = 'waitlisted';
        waitlistPosition = waitlistCount + 1;
      }
    }

    await client.query(
      `
        INSERT INTO registrations (
          id, registration_code, event_slug, team_name, college_name, department_name,
          year_of_study, contact_name, contact_email, contact_phone, registration_source, payment_method,
          project_title, payment_reference, payment_screenshot_path, payment_provider_order_id,
          payment_provider_payment_id, payment_provider_signature, total_amount, status, verified_at, notes, invite_token
        )
        VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12,
          $13, $14, $15, $16, $17, $18, $19,
          $20, $21, $22, $23
        )
      `,
      [
        registrationId,
        registrationCode,
        normalizedEventSlug,
        normalizedTeamName,
        normalizedCollegeName,
        normalizedDepartmentName,
        normalizedYearOfStudy,
        normalizedContactName,
        normalizedContactEmail,
        normalizedContactPhone,
        'special-desk',
        normalizedPaymentMethod,
        normalizedEventSlug === 'techxcelerate' ? normalizedProjectTitle || null : null,
        normalizedPaymentReference || null,
        null,
        null,
        null,
        null,
        totalAmount,
        initialStatus,
        initialStatus === 'verified' ? new Date().toISOString() : null,
        normalizedNotes || null,
        inviteToken,
      ],
    );

    for (let index = 0; index < preparedParticipants.length; index += 1) {
      const participant = preparedParticipants[index];

      await client.query(
        `
          INSERT INTO registration_participants (
            registration_id, full_name, email, phone, is_lead
          )
          VALUES ($1, $2, $3, $4, $5)
        `,
        [
          registrationId,
          participant.fullName,
          participant.email,
          participant.phone,
          participant.isLead,
        ],
      );
    }

    await client.query('COMMIT');

    const notificationRegistration = {
      id: registrationId,
      event_slug: normalizedEventSlug,
      registration_code: registrationCode,
      team_name: normalizedTeamName,
      college_name: normalizedCollegeName,
      department_name: normalizedDepartmentName,
      year_of_study: normalizedYearOfStudy,
      contact_name: normalizedContactName,
      contact_email: normalizedContactEmail,
      contact_phone: normalizedContactPhone,
      project_title: normalizedEventSlug === 'techxcelerate' ? normalizedProjectTitle || null : null,
      registration_source: 'special-desk',
      payment_method: normalizedPaymentMethod,
      payment_reference: normalizedPaymentReference || null,
      total_amount: totalAmount,
      status: initialStatus,
      notes: normalizedNotes || null,
      participants: preparedParticipants.map(({ isLead, ...participant }) => participant),
      review_note: null,
      event_name: event.name,
      date_label: event.date_label,
      time_label: event.time_label,
      venue: event.venue,
    };

    const notification = await sendStatusNotification(notificationRegistration, { req });
    const registration = await fetchAdminRegistrationById(
      registrationId,
      req.adminAccess?.mode === 'event' ? req.adminAccess.eventSlug : null,
    );
    const refreshedEvents = await fetchActiveEventsWithCounts();
    const refreshedEvent = refreshedEvents.find((item) => item.slug === normalizedEventSlug) || null;
    await safelySyncVerifiedRegistrationsToGoogleSheets('special registration');

    return res.status(201).json({
      success: true,
      registration,
      notification,
      event: refreshedEvent,
      waitlistPosition,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Special registration failed.',
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
    notification = await sendStatusNotification(registration, { req });
  }

  let promotedRegistration = null;
  if (
    previousStatus !== 'rejected' &&
    previousStatus !== 'waitlisted' &&
    status === 'rejected'
  ) {
    promotedRegistration = await promoteNextWaitlistedRegistration(eventSlug, { req });
  }

  const refreshedRegistration = await fetchAdminRegistrationById(
    id,
    req.adminAccess?.mode === 'event' ? req.adminAccess.eventSlug : null,
  );
  await safelySyncVerifiedRegistrationsToGoogleSheets('status update');
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

  if (!req.adminAccess || req.adminAccess.mode !== 'global') {
    return res.status(403).json({ error: 'Only the main admin key can delete registrations.' });
  }

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

  await pool.query(
    `
      DELETE FROM registrations
      WHERE id = $1
    `,
    [id],
  );

  let promotedRegistration = null;
  if (registration.status !== 'rejected' && registration.status !== 'waitlisted') {
    promotedRegistration = await promoteNextWaitlistedRegistration(registration.event_slug, { req });
  }

  await safelySyncVerifiedRegistrationsToGoogleSheets('registration delete');

  return res.json({
    success: true,
    id,
    promotedRegistration,
  });
});

app.patch('/api/admin/events/:slug/registration-state', requireAdmin, async (req, res) => {
  if (!req.adminAccess || req.adminAccess.mode !== 'global') {
    return res.status(403).json({ error: 'Only the main admin key can manage event registration state.' });
  }

  const slug = String(req.params.slug || '').trim();
  const enabled = Boolean(req.body?.enabled);

  const eventResult = await pool.query(
    `
      SELECT
        e.*,
        COUNT(r.id) FILTER (WHERE r.status NOT IN ('rejected', 'waitlisted'))::int AS registrations_count,
        COUNT(r.id) FILTER (WHERE r.status = 'waitlisted')::int AS waitlist_count
      FROM events e
      LEFT JOIN registrations r ON r.event_slug = e.slug
      WHERE e.slug = $1
      GROUP BY e.id
      LIMIT 1
    `,
    [slug],
  );

  if (eventResult.rowCount === 0) {
    return res.status(404).json({ error: 'Event not found.' });
  }

  const event = eventResult.rows[0];
  const remainingSlots =
    event.max_slots === null ? null : Math.max(Number(event.max_slots) - Number(event.registrations_count || 0), 0);

  if (enabled && remainingSlots !== null && remainingSlots <= 0) {
    return res.status(400).json({ error: 'Registration cannot be restarted because no seats are left for this event.' });
  }

  await pool.query(
    `
      UPDATE events
      SET is_active = $2,
          updated_at = NOW()
      WHERE slug = $1
    `,
    [slug, enabled],
  );

  const refreshedEvents = await fetchActiveEventsWithCounts();
  const refreshedEvent = refreshedEvents.find((item) => item.slug === slug) || null;

  return res.json({
    success: true,
    event: refreshedEvent,
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
      ? await fetchAdminRegistrations('WHERE r.event_slug = ANY($1::text[])', [resolveScopedAdminEventSlugs(req.adminAccess.eventSlug)])
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

  const notification = await sendStatusNotification(registration, { req });
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
        e.slug AS event_slug,
        r.registration_code,
        e.name AS event_name,
        CASE
          WHEN r.presentation_mode = 'online' THEN 'Online'
          WHEN r.presentation_mode = 'offline' THEN 'Offline'
          ELSE ''
        END AS presentation_mode,
        COALESCE(r.project_title, '') AS project_title,
        r.team_name,
        r.college_name,
        r.contact_name,
        r.contact_phone,
        r.registration_source,
        r.payment_reference,
        r.total_amount,
        r.status,
        r.created_at,
        COALESCE(string_agg(
          p.full_name || ' <' || p.email || '> (' || p.phone || ')',
          ' | '
          ORDER BY p.id
        ), '') AS participants
      FROM registrations r
      JOIN events e ON e.slug = r.event_slug
      LEFT JOIN registration_participants p ON p.registration_id = r.id
      ${scopeClause}
      GROUP BY r.id, e.name
      ORDER BY r.created_at DESC
    `,
    scopeParams,
  );

  const includePresentationMode = result.rows.some((row) => row.event_slug === 'techxcelerate');
  const includeProjectTitle = result.rows.some((row) => row.event_slug === 'techxcelerate');
  const headers = [
    'registration_code',
    'event_name',
    'team_name',
    'college_name',
    'contact_name',
    'contact_phone',
    'registration_source',
    'payment_reference',
    'participants',
    'total_amount',
    'status',
    'created_at',
  ];
  if (includePresentationMode) {
    headers.splice(2, 0, 'presentation_mode');
  }
  if (includeProjectTitle) {
    headers.splice(includePresentationMode ? 3 : 2, 0, 'project_title');
  }

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
        e.slug AS event_slug,
        r.registration_code AS "Registration Code",
        e.name AS "Event",
        CASE
          WHEN r.presentation_mode = 'online' THEN 'Online'
          WHEN r.presentation_mode = 'offline' THEN 'Offline'
          ELSE ''
        END AS "Presentation Mode",
        COALESCE(r.project_title, '') AS "Project Title",
        r.team_name AS "Team Name",
        r.college_name AS "College",
        r.contact_name AS "Contact Name",
        r.contact_phone AS "Contact Phone",
        r.registration_source AS "Source",
        r.payment_reference AS "Payment Reference",
        COALESCE(string_agg(
          p.full_name || ' <' || p.email || '> (' || p.phone || ')',
          ' | '
          ORDER BY p.id
        ), '') AS "Participants",
        r.total_amount AS "Amount",
        r.status AS "Status",
        r.created_at AS "Created At"
      FROM registrations r
      JOIN events e ON e.slug = r.event_slug
      LEFT JOIN registration_participants p ON p.registration_id = r.id
      ${scopeClause}
      GROUP BY r.id, e.slug, e.name
      ORDER BY e.name ASC, r.created_at DESC
    `,
    scopeParams,
  );

  const workbook = XLSX.utils.book_new();
  const rowsByEventSlug = result.rows.reduce((collection, row) => {
    const eventRows = collection.get(row.event_slug) || [];
    const { event_slug: rowEventSlug, ...sheetRow } = row;
    if (rowEventSlug !== 'techxcelerate') {
      delete sheetRow['Presentation Mode'];
      delete sheetRow['Project Title'];
    }
    eventRows.push(sheetRow);
    collection.set(rowEventSlug, eventRows);
    return collection;
  }, new Map());

  for (const [sheetIndex, [, rows]] of [...rowsByEventSlug.entries()].entries()) {
    const sheetNameSeed = String(rows[0]?.Event || `Registrations ${sheetIndex + 1}`)
      .replace(/[\\/?*\[\]:]/g, ' ')
      .trim();
    const sheetName = sheetNameSeed.slice(0, 31) || `Registrations ${sheetIndex + 1}`;
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  }

  if (workbook.SheetNames.length === 0) {
    const worksheet = XLSX.utils.json_to_sheet([]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Registrations');
  }

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
await safelySyncVerifiedRegistrationsToGoogleSheets('server start');
startSmartNotificationWorker();
startBackupWorker();

app.listen(port, () => {
  console.log(`Portal API running on http://localhost:${port}`);
  if (!usesExplicitPersistentStorage) {
    console.warn('Uploads and backups are using the app working directory. On ephemeral hosting, attach persistent storage or uploaded payment screenshots may disappear after restart or redeploy.');
  }
  if (googleSheetsEnabled) {
    if (googleSheetsConfigured) {
      console.log('Google Sheets sync enabled for verified registrations.');
    } else {
      console.warn('Google Sheets sync is enabled, but the Google Sheets env vars are incomplete.');
    }
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
