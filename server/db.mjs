import 'dotenv/config';
import pg from 'pg';
import fs from 'node:fs/promises';
import path from 'node:path';
import { eventSeed } from './data/events.mjs';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not configured.');
}

export const pool = new Pool({
  connectionString,
});

export async function initDatabase() {
  await fs.mkdir(path.resolve(process.cwd(), 'uploads', 'payment-proofs'), { recursive: true });
  await fs.mkdir(path.resolve(process.cwd(), 'backups'), { recursive: true });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      date_label TEXT NOT NULL,
      time_label TEXT NOT NULL,
      venue TEXT NOT NULL,
      description TEXT NOT NULL,
      prize TEXT NOT NULL,
      registration_fee INTEGER NOT NULL DEFAULT 0,
      registration_fee_label TEXT NOT NULL DEFAULT '',
      min_members INTEGER NOT NULL DEFAULT 1,
      max_members INTEGER NOT NULL DEFAULT 1,
      max_slots INTEGER,
      is_team_event BOOLEAN NOT NULL DEFAULT TRUE,
      poster_path TEXT NOT NULL DEFAULT '',
      payment_upi TEXT,
      payment_payee TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS registrations (
      id TEXT PRIMARY KEY,
      registration_code TEXT NOT NULL UNIQUE,
      event_slug TEXT NOT NULL REFERENCES events(slug) ON DELETE RESTRICT,
      team_name TEXT NOT NULL,
      college_name TEXT NOT NULL,
      department_name TEXT NOT NULL,
      year_of_study TEXT NOT NULL,
      contact_name TEXT NOT NULL,
      contact_email TEXT NOT NULL,
      contact_phone TEXT NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'upi',
      payment_reference TEXT,
      payment_screenshot_path TEXT,
      payment_provider_order_id TEXT,
      payment_provider_payment_id TEXT,
      payment_provider_signature TEXT,
      total_amount INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      verified_at TIMESTAMPTZ,
      notes TEXT,
      review_note TEXT,
      attendance_status TEXT NOT NULL DEFAULT 'registered',
      attendance_marked_at TIMESTAMPTZ,
      invite_token TEXT UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS registration_participants (
      id SERIAL PRIMARY KEY,
      registration_id TEXT NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      is_lead BOOLEAN NOT NULL DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS registration_notifications (
      id TEXT PRIMARY KEY,
      registration_id TEXT NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
      notification_type TEXT NOT NULL DEFAULT 'status-update',
      channel TEXT NOT NULL DEFAULT 'email',
      recipient TEXT NOT NULL,
      subject TEXT NOT NULL,
      message_preview TEXT,
      related_status TEXT,
      delivery_status TEXT NOT NULL DEFAULT 'queued',
      provider_message_id TEXT,
      error_message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS portal_announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      event_slug TEXT REFERENCES events(slug) ON DELETE SET NULL,
      is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
      created_by TEXT,
      starts_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_registrations_event_slug ON registrations(event_slug);
    CREATE INDEX IF NOT EXISTS idx_registrations_contact_email ON registrations(contact_email);
    CREATE INDEX IF NOT EXISTS idx_registrations_code ON registrations(registration_code);
    CREATE INDEX IF NOT EXISTS idx_registration_notifications_registration_id
      ON registration_notifications(registration_id);
    CREATE INDEX IF NOT EXISTS idx_portal_announcements_event_slug
      ON portal_announcements(event_slug);
  `);

  await pool.query(`
    ALTER TABLE events ADD COLUMN IF NOT EXISTS registration_fee_label TEXT NOT NULL DEFAULT '';
    ALTER TABLE events ADD COLUMN IF NOT EXISTS poster_path TEXT NOT NULL DEFAULT '';
    ALTER TABLE events ADD COLUMN IF NOT EXISTS payment_upi TEXT;
    ALTER TABLE events ADD COLUMN IF NOT EXISTS payment_payee TEXT;
    ALTER TABLE registrations ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'upi';
    ALTER TABLE registrations ADD COLUMN IF NOT EXISTS payment_screenshot_path TEXT;
    ALTER TABLE registrations ADD COLUMN IF NOT EXISTS payment_provider_order_id TEXT;
    ALTER TABLE registrations ADD COLUMN IF NOT EXISTS payment_provider_payment_id TEXT;
    ALTER TABLE registrations ADD COLUMN IF NOT EXISTS payment_provider_signature TEXT;
    ALTER TABLE registrations ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
    ALTER TABLE registrations ADD COLUMN IF NOT EXISTS review_note TEXT;
    ALTER TABLE registrations ADD COLUMN IF NOT EXISTS attendance_status TEXT NOT NULL DEFAULT 'registered';
    ALTER TABLE registrations ADD COLUMN IF NOT EXISTS attendance_marked_at TIMESTAMPTZ;
    ALTER TABLE registrations ADD COLUMN IF NOT EXISTS invite_token TEXT UNIQUE;
    ALTER TABLE registration_notifications ADD COLUMN IF NOT EXISTS provider_message_id TEXT;
  `);

  for (const event of eventSeed) {
    await pool.query(
      `
        INSERT INTO events (
          slug, name, category, date_label, time_label, venue, description, prize,
          registration_fee, registration_fee_label, min_members, max_members, max_slots,
          is_team_event, poster_path, payment_upi, payment_payee, is_active
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14, $15, $16, $17, TRUE
        )
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          date_label = EXCLUDED.date_label,
          time_label = EXCLUDED.time_label,
          venue = EXCLUDED.venue,
          description = EXCLUDED.description,
          prize = EXCLUDED.prize,
          registration_fee = EXCLUDED.registration_fee,
          registration_fee_label = EXCLUDED.registration_fee_label,
          min_members = EXCLUDED.min_members,
          max_members = EXCLUDED.max_members,
          max_slots = EXCLUDED.max_slots,
          is_team_event = EXCLUDED.is_team_event,
          poster_path = EXCLUDED.poster_path,
          payment_upi = EXCLUDED.payment_upi,
          payment_payee = EXCLUDED.payment_payee,
          updated_at = NOW()
      `,
      [
        event.slug,
        event.name,
        event.category,
        event.date_label,
        event.time_label,
        event.venue,
        event.description,
        event.prize,
        event.registration_fee,
        event.registration_fee_label,
        event.min_members,
        event.max_members,
        event.max_slots,
        event.is_team_event,
        event.poster_path,
        event.payment_upi,
        event.payment_payee,
      ],
    );
  }
}
