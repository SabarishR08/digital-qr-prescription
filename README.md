# Digital Qr Prescription

![License](https://img.shields.io/badge/license-MIT-green) ![Language](https://img.shields.io/badge/language-TypeScript-informational) ![Docker](https://img.shields.io/badge/docker-ready-2496ed)


## Overview

A platform for secure, encrypted prescriptions with QR codes, role-based access for doctors, patients, and pharmacists, and a full audit trail.

## Architecture

```text
Next.js, React   (frontend)
     │   REST / WebSocket
     ▼
Express   (API server)
     │
     └──▶ Database — PostgreSQL
```

## Tech Stack

- **Language:** TypeScript
- **Backend:** Express
- **Frontend:** Next.js, React
- **Database:** PostgreSQL

## Getting Started

### Prerequisites

- Node.js 18+
- Docker (optional, for container runs)

### 1. Clone

```bash
git clone https://github.com/SabarishR08/digital-qr-prescription.git
cd digital-qr-prescription
```

### 2. Install dependencies

This is a multi-app monorepo (`client/` + `server/`) — each app installs its own dependencies in the run commands below.

### 3. Configure environment

```bash
cp .env.example .env   # then fill in values
```

Environment variables used: `PORT`, `DATABASE_URL`, `JWT_SECRET`, `QR_SIGNING_KEY`, `CORS_ORIGIN`, `NEXT_PUBLIC_API_BASE_URL`.

Most features work without keys; integrations activate when keys are set.

### 4. Run

```bash
cd backend && npm install && npm run dev   # Terminal 1 — API server
```

```bash
cd frontend && npm install && npm run dev   # Terminal 2 — web client
```

### (Alternative) Run with Docker

```bash
docker compose up --build
```


---

![Next.js](https://img.shields.io/badge/Next.js%2014-000?logo=next.js)
![React](https://img.shields.io/badge/React%2018-61DAFB?logo=react&logoColor=000)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=fff)
![Express](https://img.shields.io/badge/Express-000?logo=express)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?logo=postgresql&logoColor=fff)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=fff)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-06B6D4?logo=tailwind-css&logoColor=fff)

**Status:** Active Development

QR-based prescription system with signed payload verification and audit logging.

## Problem

Traditional prescriptions (paper or digital) have fundamental security issues:

- No way to verify authenticity – easy to forge or modify
- Pharmacies cannot validate that a prescription is real in real-time
- No central audit trail for compliance investigations
- No expiration enforcement
- No traceability when disputes arise

Healthcare systems need a tamper-proof, verifiable, and auditable prescription method.

## Approach

This system provides:

- **Cryptographically signed QR codes** – HMAC-SHA256 signatures locked to each prescription
- **Tamper detection** – Invalid or modified QR codes are rejected
- **Expiration enforcement** – Prescriptions expire and cannot be redeemed after expiry
- **Replay prevention** – Prescriptions can only be redeemed once (atomic status check)
- **Complete audit trail** – Every verification attempt (success and failure) is logged
- **Role-based access** – Doctors create, patients view, pharmacists verify, admins audit

## Implemented Features

- Prescription CRUD with JWT authentication
- QR code generation and verification (HMAC-SHA256 signed payloads)
- Prescription normalization (separate Medication model with ordered relationships)
- Cursor-based pagination (configurable limit, 20-100 records per page)
- Role-based request filtering (doctors see their prescriptions, patients see theirs, admins see all)
- Audit logging with success/failure distinction (5 failure paths captured)
- Scan history tracking with CSV/JSON export
- Database indexes on high-traffic queries (prescriptionId, actorId, createdAt, result)
- Rate limiting on verification endpoint (10 requests/minute per IP)
- Refresh token rotation with revocation support
- Admin defaults panel (audit/scan preferences)
- Patient prescription list UI with embedded QR codes
- Real-time dashboards (audit logs, scan history with auto-refresh)

## Architecture

**Frontend:** Next.js 14 + React 18 + TypeScript + Tailwind CSS

**Backend:** Node.js + Express + TypeScript + Prisma

**Database:** PostgreSQL with indexed queries and normalized schema

**Features:**

- JWT access tokens (12h expiry) + HTTP-only refresh tokens (7d)
- HMAC-SHA256 QR signing with expiration timestamps
- Role-based middleware (DOCTOR, PATIENT, PHARMACIST, ADMIN)
- Structured audit logging with result field
- Atomic prescription redemption (check-and-set in single transaction)

See [docs/architecture.mmd](docs/architecture.mmd) for system diagram.

## Directory Layout

```
backend/              Node.js API, Prisma schema, auth & QR logic
frontend/             Next.js UI with tailwind styling
docker/               Container configuration
docs/                 Architecture diagrams
tests/                System-level test suite
```

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2. Configure Environment

```bash
# backend/.env
DATABASE_URL="postgresql://user:pass@localhost:5432/myproject_db"
JWT_SECRET="your-secret-key"
QR_SIGNING_KEY="your-signing-key"

# frontend/.env.local
NEXT_PUBLIC_API_BASE_URL="http://localhost:4000"
```

### 3. Set Up Database

```bash
cd backend
npx prisma migrate dev
```

### 4. Run

```bash
# Terminal 1: Backend (port 4000)
cd backend
npm run dev

# Terminal 2: Frontend (port 3000)
cd frontend
npm run dev
```

## Scripts

**Backend:**
- `npm run dev` – Start dev server with hot reload
- `npm run build` – Compile to dist
- `npm run prisma:migrate` – Create and apply migrations

**Frontend:**
- `npm run dev` – Start dev server on port 3000
- `npm run build` – Build for production

## Security

### How QR Signing Works

1. Doctor creates prescription generates HMAC-SHA256 signature over (prescription_id + expiration_timestamp)
2. Signature embedded in QR code as `qrPayload`
3. Pharmacy scans QR backend verifies HMAC signature
4. If signature invalid or expired verification fails and is logged
5. If valid and active prescription marked REDEEMED, timestamp recorded

### What Gets Logged

Every verification attempt generates:
- **ScanLog entry** – Technical record (actor, result, reason)
- **AuditLog entry** – Business record (action, result, details)

Failure reasons logged:
- `INVALID_OR_EXPIRED` – QR signature failed verification
- `NOT_FOUND` – Prescription ID not found
- `EXPIRED` – Prescription past expiration date
- `ALREADY_REDEEMED` – Prescription already used
- `RACE_CONDITION` – Concurrent redemption attempt

### Rate Limiting

- Auth endpoints: 20 attempts per 15 minutes per IP
- Verification endpoint: 10 attempts per minute per IP

### Database Indexes

Indexes on:
- `Prescription.doctorId` – Doctor's prescriptions
- `Prescription.patientEmail` – Patient's prescriptions
- `Prescription.status` – Active/redeemed filtering
- `Prescription.expiresAt` – Expiration checks
- `AuditLog.prescriptionId` – Audit trail per prescription
- `AuditLog.actorId` – User activity tracking
- `ScanLog.prescriptionId` – Scan history per prescription
- `ScanLog.actorId` – Actor-scoped filtering

## API Overview

### Authentication

```
POST   /auth/register          Create account
POST   /auth/login             Get access + refresh tokens
POST   /auth/refresh            Rotate refresh token
```

### Prescriptions

```
POST   /prescriptions           Create (DOCTOR only)
GET    /prescriptions           List (role-scoped, paginated)
POST   /prescriptions/verify    Verify QR (any role, rate-limited)
```

### Audit & History

```
GET    /audit                   Audit logs (role-scoped)
GET    /audit/export            Export as CSV/JSON
GET    /scans                   Scan history (role-scoped)
GET    /scans/export            Export as CSV/JSON
```

### Admin

```
GET    /preferences/admin       Get default preferences
POST   /preferences/admin       Update default preferences
```

## Data Model

```sql
User
  id, email, passwordHash, role, fullName, refreshTokens, prescriptions

Prescription
  id, doctorId, patientName, patientEmail, notes, qrPayload
  status (ACTIVE|REDEEMED), redeemedAt, redeemedById, expiresAt
  medications[] (normalized relationship)

Medication
  id, prescriptionId, name, dosage, frequency, duration, position

AuditLog
  id, prescriptionId, actorRole, actorId, action, result, details

ScanLog
  id, prescriptionId, actorId, actorRole, payloadHash, result, reason
```

## Testing

System-level tests are in `/tests`.

To verify a prescription locally:

1. Doctor creates prescription via `/prescriptions`
2. Copy `qrPayload` from response
3. Pharmacist calls `/prescriptions/verify` with payload
4. Check audit log via `/audit` – should show `action: QR_VERIFIED, result: SUCCESS`

## Design Decisions

### Why HMAC-SHA256 over JWT in QR?

QR payload is signed with HMAC (not JWT) because:
- Smaller codec (no base64 padding)
- QR codes are small – no room for key ID or algorithm in payload
- Nonce + expiration timestamp prevent replay

### Why Cursor Pagination?

Large prescription lists (100+ records) require efficient pagination:
- Offset pagination is slow on large tables
- Cursor pagination (keyset indexing) is `O(limit)` instead of `O(offset + limit)`
- Handles deletions gracefully

### Why Normalize Medications?

Medications as JSON string:
- Cannot be queried (no indexing)
- Cannot be filtered independently
- Difficult to update individual medications

Normalized Medication model:
- Queryable and filterable
- Supports future features (medication database, contraindication checking)
- Maintains order with `position` field

## Monitoring & Compliance

System supports healthcare compliance by:

- Recording all prescription access (who, when, why)
- Capturing verification failures with reasons
- Exporting audit logs for investigation
- Enforcing role-based access (no cross-contamination)
- Using immutable timestamps (createdAt, redeemedAt)

## Limitations & Trade-offs

- No medicine database integration (uses free-text entry)
- No email verification or delivery
- No multi-hospital tenant support
- No prescription revocation (only expiration)
- Admin defaults are global (not per-user)

## References

- [HMAC Timing Attacks](https://codahale.com/a-lesson-in-timing-attacks/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc7519)
- [Cursor-based Pagination](https://relay.dev/docs/guides/pagination/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

## Author

Sabarish R

---

Origin: Ideathon Hackathon (self-defined problem) — Nov 2024

---

## License

[MIT](LICENSE) — © 2026 Sabarish R.
