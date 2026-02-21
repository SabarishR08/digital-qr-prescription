# Digital QR Prescription System

Web app for QR-based prescription creation, verification, and audit tracking.

## Workspace Layout

- backend: Node.js + Express API, Prisma schema, PostgreSQL
- frontend: Next.js App Router UI with Tailwind CSS
- docker: Container templates
- docs: Architecture diagram
- tests: System-level tests

## Features

- Role-based access: DOCTOR, PATIENT, PHARMACIST, ADMIN
- QR signing and verification with expiration checks
- Audit logs and scan history with export support
- Patient prescription list with QR codes

## Architecture Diagram

See [docs/architecture.mmd](docs/architecture.mmd).

## Quick Start

1) Install dependencies:

```bash
cd backend
npm install

cd ../frontend
npm install
```

2) Configure environment files:

- Copy backend/.env.example to backend/.env
- Copy frontend/.env.example to frontend/.env.local

3) Run the apps:

```bash
cd backend
npm run dev

cd ../frontend
npm run dev
```

## Scripts

- Backend: `npm run dev`, `npm run prisma:migrate`
- Frontend: `npm run dev`, `npm run build`
