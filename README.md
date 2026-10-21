# RKS Computer Centre and Xerox

A production-grade, LAN-restricted management system for daily operations, billing, expenses, and analytics.

## Architecture

* **Frontend:** React + TypeScript + Vite
* **Backend:** Node.js + Express + Prisma ORM
* **Database:** PostgreSQL 16
* **Infrastructure:** Docker & Docker Compose
* **Timezone:** Strictly bound to Indian Standard Time (IST - `Asia/Kolkata`)

## Prerequisites

* Docker Desktop (or Docker Engine + Docker Compose) installed on the host machine.
* Port `3000` (Frontend), `5000` (Backend API), and optionally `5432` (Postgres) available.

## Quick Start (Production)

1. Clone or extract this repository to your machine.
2. In the root directory, start the system:
   ```bash
   docker-compose up --build -d
   ```
3. The system will automatically:
   * Build the Node.js backend and React frontend.
   * Start the PostgreSQL database.
   * Run Prisma migrations to set up the schema.
   * Seed the default `admin` user and standard RKS services.
   * Start the backup rotation script in the background.

## Accessing the System

Once running, access the web interface via any browser on the local network at:

* **URL:** `http://localhost:3000` (or the host machine's local IP, e.g., `http://192.168.1.100:3000`)
* **Default Admin Username:** `admin`
* **Default Admin Password:** *(Check your terminal/docker logs during the first startup for the securely generated password)*

*(Note: Change the default admin password immediately upon your first login for security).*

## System Features

* **Strict Time-based RBAC:** Role-Based Access Control limits regular `USER` operators to viewing/editing transactions *only created on the current calendar day in IST*.
* **Optimistic Locking:** The system prevents concurrent modification bugs (e.g., two people editing the same expense simultaneously) via robust `updated_at` checks on all DB mutations.
* **Audit Trails:** Every creation, update, and deletion is recorded securely in a tamper-resistant `logs` table, accessible only to the `SUPER_ADMIN`.
* **Automated Log Rotation:** Background jobs automatically clean up audit logs older than 60 days.
* **Automated DB Backups:** A dedicated sidecar container runs `pg_dump` daily at 23:59 IST, saving `.sql.gz` backups into the `./backups` directory on the host machine, rotating them every 7 days.

## Development

If you wish to run the project in development mode:

1. Setup environment variables (`.env` in the `backend` folder).
2. Start Postgres: `docker-compose up postgres -d`
3. Backend: `cd backend && npm install && npx prisma migrate dev && npm run dev`
4. Frontend: `cd frontend && npm install && npm run dev`

## Deployment Network Configuration

For strict LAN access, ensure that the machine running the system only exposes port `3000` to the internal Wi-Fi/Ethernet router. Avoid port forwarding port `3000` to the public WAN interface on your router.

## Developed By

**HEMAPRIYAN R K**  
*Developer*

* **Email:** connectwithhemapriyan@gmail.com
* **GitHub:** [https://github.com/hemapriyan-rk](https://github.com/hemapriyan-rk)
* **LinkedIn:** [https://www.linkedin.com/in/hemapriyan-rk](https://www.linkedin.com/in/hemapriyan-rk)
