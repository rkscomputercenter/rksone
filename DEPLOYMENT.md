# rks-qenbel — Production Deployment Guide
## Render (Docker) + Supabase PostgreSQL

---

## Architecture

```
Browser
   │
   ▼
Render Web Service (Docker)
├── Express API        → /api/*
├── React Frontend     → /* (served as static files)
└── Socket.IO          → /api/socket.io
   │
   ▼
Supabase PostgreSQL
```

Everything runs in **one Docker container** on Render. The Express backend serves the React frontend as static files — no nginx, no docker-compose, no separate services.

---

## Step 1 — Set Up Supabase

### 1.1 Create a Project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Choose a name: `rks-qenbel`
3. Choose region: **Southeast Asia (Singapore)** — closest to India
4. Set a **Database Password** — save it securely

### 1.2 Copy Your Database Connection String

After the project is ready (takes ~1 minute):

1. Go to **Settings** → **Database**
2. Find the **Connection string** section
3. Choose **URI** format
4. Copy the **Transaction pooler** string (port `6543`)

It looks like:
```
postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

> **Why the pooler?** Render free containers restart frequently. The pooler manages connections efficiently. If you encounter issues with the pooler, switch to the **Direct connection** (port `5432`).

### 1.3 Keep DATABASE_URL Safe

Save this string — you'll paste it into Render in Step 3.

---

## Step 2 — Set Up Render

### 2.1 Create a Render Account

Go to [render.com](https://render.com) and sign up (free).

### 2.2 Create a Web Service

1. Dashboard → **New** → **Web Service**
2. Connect your GitHub account → select **hemapriyan-rk/rks-qenbel**
3. Configure:

| Setting | Value |
|---|---|
| Name | `rks-qenbel` |
| Region | `Singapore (Southeast Asia)` |
| Branch | `main` |
| Runtime | `Docker` |
| Dockerfile Path | `./Dockerfile` |
| Docker Context | `.` (repo root) |
| Plan | `Free` |

4. Scroll down to **Environment Variables** → click **Add Environment Variable** for each:

| Key | Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | |
| `PORT` | `10000` | Render's default port |
| `DATABASE_URL` | *(paste Supabase URI from Step 1.2)* | Secret |
| `JWT_SECRET` | *(random 48+ char string)* | Secret — see generator below |
| `JWT_EXPIRES_IN` | `8h` | |
| `TZ` | `Asia/Kolkata` | |
| `LOG_RETENTION_DAYS` | `60` | |
| `ALLOWED_ORIGINS` | `https://rks.qenbel.site` | Your Render URL |

**Generate a JWT_SECRET:**
```bash
# On Linux/Mac:
openssl rand -base64 48

# Or use any 48+ character random string
```

5. Click **Create Web Service**

---

## Step 3 — First Deployment

### What Happens Automatically on First Deploy

1. Render pulls your GitHub repo
2. Docker builds the image (frontend Vite build + backend TypeScript compile)
3. Container starts → `entrypoint.sh` runs:
   - `prisma migrate deploy` — creates all tables in Supabase
   - Checks if users exist → runs `prisma/seed.js` if empty (creates default admin)
   - Starts Express server on `0.0.0.0:10000`
4. Render's health check hits `/api/health` — confirms the service is alive
5. Your app is live at `https://rks.qenbel.site`

### Monitor Build Logs

- Render Dashboard → your service → **Logs** tab
- Watch for these success markers:
  ```
  [MIGRATE] Running Prisma migrations...
  [SEED] Database already has data (1 users). Skipping seed.
  [START] Launching Express server...
  RKS Backend running on 0.0.0.0:10000
  ```

### Build Time

Expect ~4–6 minutes for the first Docker build (downloading base images, installing npm deps, compiling TypeScript, building Vite). Subsequent deploys use cache layers and take ~2–3 minutes.

---

## Step 4 — Configure GitHub Auto-Deploy (Optional Extra Step)

If you want a manual deploy hook trigger (already done via Render's GitHub integration, but as a backup):

1. Render Dashboard → your service → **Settings** → **Deploy Hook**
2. Copy the URL
3. GitHub → your repo → **Settings** → **Secrets and Variables** → **Actions**
4. Add secret: `RENDER_DEPLOY_HOOK_URL` = *(paste the hook URL)*

The `.github/workflows/deploy.yml` will now trigger on every push to `main`.

---

## Step 5 — Verify Deployment

### Health Check
```bash
curl https://rks.qenbel.site/api/health
# Expected: {"status":"ok","timestamp":"..."}
```

### Login Test
Open `https://rks.qenbel.site` in a browser.
- The React app should load
- Log in with the seeded admin credentials

### API Test
```bash
curl https://rks.qenbel.site/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"<your_generated_password>"}'
```

---

## Ongoing Deployment Flow

```
You edit code locally
        ↓
git push origin main
        ↓
GitHub → Render auto-deploy triggered
        ↓
Render pulls repo → docker build → container start
        ↓
prisma migrate deploy (applies any new migrations)
        ↓
Express starts → app is live
```

**No manual steps required after initial setup.**

---

## Troubleshooting

### Container fails to start — `DATABASE_URL` errors

```
❌ Invalid environment configuration
```

- Check that `DATABASE_URL` is set correctly in Render → Environment
- Test your Supabase connection string locally:
  ```bash
  # In backend/ directory:
  DATABASE_URL="your-supabase-url" npx prisma db pull
  ```

### `prisma migrate deploy` fails

- Your Supabase project may be **paused** (free tier pauses after 7 days of inactivity)
- Go to Supabase Dashboard → your project → click **Restore**
- Then trigger a new Render deploy

### App loads but API calls fail (CORS errors)

- Check `ALLOWED_ORIGINS` in Render environment variables
- Must match your exact Render URL: `https://rks.qenbel.site`
- No trailing slash

### Render free tier cold start (30 second delay)

- **This is expected** — Render free services spin down after 15 minutes of inactivity
- The first request of the day will take ~30 seconds while the container starts
- After that, responses are normal speed
- **Fix**: Upgrade to Render Starter ($7/month) to eliminate cold starts

### Socket.IO connection issues

- Render supports WebSockets natively — no configuration needed
- If connections drop, check that your frontend Socket.IO client uses the correct URL
- In production, Socket.IO connects to the same origin (relative) — no URL needed

---

## Free Tier Limitations

| Service | Limitation | Impact |
|---|---|---|
| **Render Free** | Spins down after 15 min inactivity | 30s cold start on first daily access |
| **Render Free** | 750 hours/month | Enough for business hours use |
| **Supabase Free** | Project pauses after 7 days inactivity | DB unreachable until manually restored |
| **Supabase Free** | 500 MB database storage | More than enough for this app |
| **Supabase Free** | No automatic backups | Export manually from Dashboard |

**Recommendation**: If this is used daily during business hours, the free tier is perfectly adequate. If budget allows, upgrade Supabase to Pro ($25/month) to eliminate project pausing.

---

## Environment Variables Reference

| Variable | Required | Example | Notes |
|---|---|---|---|
| `DATABASE_URL` | ✅ | `postgresql://...` | Supabase connection string |
| `JWT_SECRET` | ✅ | `abc123...` (48+ chars) | Changing this logs out all users |
| `NODE_ENV` | ✅ | `production` | Enables static file serving |
| `PORT` | ✅ | `10000` | Render injects this automatically |
| `JWT_EXPIRES_IN` | ✅ | `8h` | Session duration |
| `TZ` | ✅ | `Asia/Kolkata` | Timezone for timestamps |
| `ALLOWED_ORIGINS` | ✅ | `https://rks.qenbel.site` | CORS allowlist |
| `LOG_RETENTION_DAYS` | Optional | `60` | Auto-cleanup old audit logs |

---

## Local Development (unchanged)

Your existing `docker-compose.yml` workflow is **completely unchanged** for local development:

```bash
# Start all local services
docker compose up --build

# App available at:
# Frontend: http://localhost:5000
# Backend:  http://localhost:5000/api
```

The new root `Dockerfile` is only used for Render cloud deployment. Your local workflow is preserved.
