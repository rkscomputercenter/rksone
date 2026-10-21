# RKS Shop Management System — Startup Instructions

This document provides instructions on how to start and manage the RKS Shop Management System.

## Prerequisites

- **Docker Desktop** (or Docker Engine + Docker Compose) installed and running.
- Ports `5000` (Frontend), `5001` (Backend API), and `5432` (PostgreSQL) should be available.

---

## Option 1: Quick Start (Production/Recommended)

The easiest way to run the entire system is using Docker Compose. This starts the Database, Backend, Frontend, and Backup services automatically.

1.  **Open a terminal** in the project root directory (`d:\shop-rks`).
2.  **Run the following command**:
    ```bash
    docker-compose up --build -d
    ```
3.  **Wait for the containers to start**. You can check the status with:
    ```bash
    docker-compose ps
    ```
4.  **Access the application**:
    - **Frontend**: [http://localhost:5000](http://localhost:5000)
    - **API Health Check**: [http://localhost:5001/api/health](http://localhost:5001/api/health)

---

## Option 2: Development Mode (Manual)

If you need to run the services individually for development:

### 1. Start the Database
Start only the PostgreSQL container:
```bash
docker-compose up postgres -d
```

### 2. Setup Backend
1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Apply database migrations:
    ```bash
    npx prisma migrate dev
    ```
4.  Start the development server:
    ```bash
    npm run dev
    ```

### 3. Setup Frontend
1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
    The frontend will typically be available at [http://localhost:5173](http://localhost:5173).

---

## Default Credentials

- **Username**: `admin`
- **Password**: *(Check your terminal/docker logs during the first startup for the securely generated password)*

> [!IMPORTANT]
> Please change the default administrator password immediately after your first login.

---

## Stopping the System

To stop all services running via Docker:
```bash
docker-compose down
```
