# CertiFlow

Certificate issuance and public verification platform for the Pragati Skills Mission hackathon.

## Requirements note

Training centres submit candidate batches. District officers review batches, large batches receive quality review, and the state office gives final approval. Approved candidates receive uniquely identifiable certificates. Anyone can verify a certificate without logging in. Important decisions must be auditable, and notification delivery must run asynchronously.

## Current implementation status

This repository is being built incrementally. The initial scaffold contains the frontend/backend projects and local PostgreSQL/Redis infrastructure. Features will be added and tested step by step.

## Stack

- React + Vite + TypeScript
- Node.js + Express + TypeScript
- PostgreSQL + Prisma
- Redis (for background jobs in a later step)
- Docker Compose

## Local setup

1. Copy `.env.example` to `server/.env`.
2. Start infrastructure: `docker compose up -d`.
3. In `server/`, run `npm install`.
4. In `server/`, run `npm run db:generate`.
5. In `server/`, run `npm run dev`.
6. In `client/`, run `npm install`, then `npm run dev`.

Frontend: http://localhost:5173  
Backend health check: http://localhost:4000/health

## Demo users

Demo accounts and authentication will be added in the authentication step.
