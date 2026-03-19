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

Use that key in the portal’s admin export section to preview registrations and download files.
