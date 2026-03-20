# Cogno Registration Portal

This project has been converted from a front-end event landing page into a participant registration portal.

## What it does

- shows the college event list in a registration-first layout
- stores registrations in PostgreSQL
- lets participants search by registration code or email
- lets organizers load records with an admin access key
- exports registrations as CSV or Excel

## Stack

- Vite + React frontend
- Express API server
- PostgreSQL database

## Local setup

1. Install dependencies:
   `npm install`
2. Copy `.env.example` if needed and adjust values.
3. Start PostgreSQL:
   `docker compose up -d postgres`
4. Start the portal:
   `npm run dev`

## Default local ports

- Frontend: `http://localhost:3001`
- API: `http://localhost:8787`
- PostgreSQL: `localhost:5434`

## Admin export access

The local admin access key is read from `.env`.

Current default:

- `portal-admin-2026`

## Railway deployment

This repo is set up for Railway using the root `Dockerfile`. Railway will detect it automatically and build both the Vite frontend and the Express server in one deployment.

Required variables:

- `DATABASE_URL`
- `ADMIN_ACCESS_KEY`
- `EVENT_ADMIN_KEYS_JSON` if you want separate event-wise verification passwords
- `SMTP_FROM_EMAIL`
- `SMTP_FROM_NAME`

Optional variable:

- `STORAGE_ROOT` if you want uploads and backups stored somewhere custom outside Railway
- `BREVO_API_KEY` for transactional emails via Brevo API
- SMTP variables if you want to use SMTP instead of Brevo:
  - `SMTP_PROVIDER`
  - `SMTP_HOST`
  - `SMTP_PORT`
  - `SMTP_SECURE`
  - `SMTP_USER`
  - `SMTP_PASS`

Recommended on Railway:

- Add a PostgreSQL service and reference its `DATABASE_URL` into the app service
- Attach a volume to the app service so uploads and backups persist across redeploys

If a Railway volume is attached, the app will automatically use `RAILWAY_VOLUME_MOUNT_PATH` for uploads and backups.

## Event-wise verification keys

You can optionally define separate event verification passwords using `EVENT_ADMIN_KEYS_JSON`.

Example:

`{"techxcelerate":"techx-verify-2026","runbhumi-bgmi":"bgmi-verify-2026"}`

Behavior:

- `ADMIN_ACCESS_KEY` keeps full global access
- event keys only show registrations for their own event
- event keys can verify status, save review notes, resend status emails, and mark attendance only for that event
- event keys cannot publish broadcasts, delete updates, or manage backups

Use that key in the portal’s admin export section to preview registrations and download files.
