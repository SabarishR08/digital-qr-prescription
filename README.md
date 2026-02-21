# Digital QR Prescription System

Production-ready scaffold for a QR-based prescription platform with a Next.js + TypeScript frontend and a Node.js + Express + TypeScript backend.

## Workspace Layout

- backend: API server, Prisma schema, and security utilities
- frontend: Next.js App Router UI with Tailwind CSS
- docker: Container templates
- docs: Architecture notes and diagrams
- tests: System-level tests

## Quick Start

1) Install dependencies in both apps:

```
cd backend
npm install

cd ../frontend
npm install
```

2) Configure environment files:

- Copy backend/.env.example to backend/.env
- Copy frontend/.env.example to frontend/.env.local

3) Run the apps:

```
cd backend
npm run dev

cd ../frontend
npm run dev
```

## Next Steps

- Add authentication, role-based access, and audit logging
- Implement prescription flows and QR signing utilities
- Wire up database migrations and seed data
