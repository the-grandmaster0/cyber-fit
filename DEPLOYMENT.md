# CYBER-FIT AI — Production Deployment Guide

This guide walks through a complete production deployment from a fresh environment.

- **Frontend** → Vercel
- **Backend** → AWS EC2 (Ubuntu LTS, Node.js 20, PM2, Nginx, HTTPS)
- **Database & Auth** → Supabase
- **AI** → Google Gemini (backend only)
- **OAuth** → Google Cloud Console

---

## Recommended Deployment Order

1. Create Supabase project and run migrations
2. Configure Supabase Auth (Site URL, Redirect URLs, RLS)
3. Create Google Cloud OAuth credentials
4. Generate Gemini API key
5. Deploy backend to AWS EC2
6. Verify backend API responds at its public URL
7. Deploy frontend to Vercel
8. Update `CLIENT_ORIGIN` on the EC2 server (restart PM2)
9. Update Supabase Site URL and Redirect URLs to the Vercel domain
10. Update Google OAuth Authorized Origins and Redirect URIs
11. Run full end-to-end test

---

## 1. Supabase

### 1.1 Create a Project

1. Go to [https://supabase.com](https://supabase.com) and sign in.
2. Click **New Project**.
3. Choose an organisation, name the project (e.g. `cyber-fit`), set a database password, and choose a region.
4. Wait for provisioning (~2 minutes).

### 1.2 Run SQL Migrations

Run each file in order using the **SQL Editor** (Dashboard → SQL Editor → New Query):

1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_add_columns.sql`
3. `supabase/migrations/0003_add_progress_and_log_columns.sql`
4. `supabase/migrations/0004_add_archived_at.sql`

Paste the contents of each file into the editor and click **Run**.

### 1.3 Configure Authentication

**Enable Google provider:**

1. Dashboard → Authentication → Providers → Google.
2. Toggle **Enable**.
3. Paste your Google **Client ID** and **Client Secret** (obtained in step 3 of this guide).
4. Save.

**Set Site URL:**

1. Dashboard → Authentication → URL Configuration.
2. Set **Site URL** to your Vercel URL: `https://your-app.vercel.app`

> Update this after Vercel deployment is complete. You can use a placeholder like `http://localhost:5173` while setting up.

**Set Redirect URLs:**

Under **Redirect URLs**, add:

```
https://your-app.vercel.app/auth/callback
http://localhost:5173/auth/callback
```

### 1.4 Row Level Security

RLS is enabled and policies are created by the migration scripts. Verify they are active:

1. Dashboard → Table Editor → select any table (e.g. `profiles`).
2. Click the **RLS** badge — it should show as **enabled**.
3. Click **Policies** — you should see `select`, `insert`, `update`, `delete` policies for each table, all scoped to `auth.uid() = user_id`.

### 1.5 Collect Credentials

From Dashboard → **Project Settings → API**:

| Variable | Where to find it |
|---|---|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key (secret — backend only) |
| `VITE_SUPABASE_URL` | Same as `SUPABASE_URL` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `anon` / `public` key (safe for browser) |

---

## 2. Google Cloud — OAuth

### 2.1 Create a Project

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com).
2. Click **Select a project → New Project**.
3. Name it (e.g. `cyber-fit-prod`) and create.

### 2.2 Configure the OAuth Consent Screen

1. APIs & Services → **OAuth consent screen**.
2. Choose **External** (or Internal if restricting to your org).
3. Fill in:
   - **App name**: `CYBER-FIT AI`
   - **User support email**: your email
   - **Developer contact**: your email
4. Under **Scopes**, add: `email`, `profile`, `openid`.
5. Under **Test users**, add any accounts you want to test with during development.
6. **Publishing status**: leave as **Testing** until ready to go live. To allow any Google account to log in, click **Publish App** → confirm.

### 2.3 Create an OAuth 2.0 Client

1. APIs & Services → **Credentials → Create Credentials → OAuth client ID**.
2. Application type: **Web application**.
3. Name: `CYBER-FIT Web Client`.

**Authorized JavaScript Origins** — add all of these:

```
https://your-app.vercel.app
http://localhost:5173
```

**Authorized Redirect URIs** — add all of these:

```
https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
http://localhost:5173/auth/callback
https://your-app.vercel.app/auth/callback
```

> The Supabase callback URI is required because Supabase handles the OAuth exchange server-side. Find your project ref in Supabase Dashboard → Project Settings → General.

4. Click **Create**. Save the **Client ID** and **Client Secret**.

| Variable | Value |
|---|---|
| `VITE_GOOGLE_CLIENT_ID` | OAuth Client ID (safe for browser) |
| `GOOGLE_CLIENT_ID` | Same value (server env) |
| `GOOGLE_CLIENT_SECRET` | Client Secret (secret — backend only) |

---

## 3. Google AI Studio — Gemini API Key

1. Go to [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).
2. Click **Create API key** → Select your Google Cloud project.
3. Copy the key.

**Storage**: set only as `GEMINI_API_KEY` in the server `.env` (and in the EC2 environment). Never put it in any client-side file or `VITE_*` variable.

The key is read exclusively by `server/services/genai.js`. All Gemini API requests originate from the Express backend — the key never reaches the browser.

---

## 4. AWS Elastic Beanstalk — Backend Deployment

Elastic Beanstalk manages the EC2 instance, load balancer, auto-scaling, and Nginx reverse proxy for you. You deploy a ZIP of the `server/` folder and EB handles the rest.

### 4.1 Prerequisites

- AWS account with appropriate IAM permissions
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) installed and configured (`aws configure`)
- [EB CLI](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3-install.html) installed:
  ```bash
  pip install awsebcli
  ```

### 4.2 Prepare the Deployment Package

EB deploys the contents of the `server/` directory. It will run `npm install` then `npm start` (or read the `Procfile`).

**What EB needs in the ZIP:**
```
server/
├── .ebextensions/
│   └── nginx-sse.config     ← disables nginx buffering for SSE
├── config/
├── middleware/
├── routes/
├── services/
├── app.js
├── server.js
├── package.json
├── Procfile
└── (no node_modules — EB installs them)
└── (no .env — use EB Environment Properties instead)
```

> **Never include `.env` or `node_modules/` in the ZIP.** Secrets go in EB Environment Properties.

Create the ZIP from inside the `server/` directory:

```bash
cd server

# Windows (PowerShell)
Compress-Archive -Path * -DestinationPath ../cyber-fit-backend.zip -Force

# macOS / Linux
zip -r ../cyber-fit-backend.zip . --exclude "node_modules/*" --exclude ".env"
```

### 4.3 Create the Elastic Beanstalk Application

**Option A — AWS Console (recommended for first deployment)**

1. Go to [Elastic Beanstalk Console](https://console.aws.amazon.com/elasticbeanstalk).
2. Click **Create application**.
3. **Application name**: `cyber-fit-api`
4. Click **Create**.
5. Click **Create environment**.
6. **Environment tier**: Web server environment.
7. **Platform**: Node.js — select **Node.js 20** (Amazon Linux 2023).
8. **Application code**: Upload your code → choose the ZIP file created above.
9. **Preset**: Single instance (free tier eligible) or High availability (load balanced).
10. Click **Next**.

**Option B — EB CLI**

```bash
cd server
eb init cyber-fit-api --platform "Node.js 20 running on 64bit Amazon Linux 2023" --region us-east-1
eb create cyber-fit-prod --single
```

### 4.4 Set Environment Properties (Secrets)

**This replaces the `.env` file on EB.** In the EB Console:

1. Your environment → **Configuration** → **Updates, monitoring, and logging**.
2. Scroll to **Environment properties** → **Edit**.
3. Add each variable:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `CLIENT_ORIGIN` | `https://your-app.vercel.app` |
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` |
| `GEMINI_API_KEY` | `AIza...` |
| `GEMINI_MODEL` | `gemini-2.0-flash` |
| `GOOGLE_CLIENT_ID` | `xxxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-...` |

> EB automatically injects `PORT=8080` — your server already reads `process.env.PORT` so no change is needed.

4. Click **Apply**. EB will restart the environment with the new variables.

**Via EB CLI:**
```bash
eb setenv NODE_ENV=production \
  CLIENT_ORIGIN=https://your-app.vercel.app \
  SUPABASE_URL=https://xxxx.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=eyJ... \
  GEMINI_API_KEY=AIza... \
  GEMINI_MODEL=gemini-2.0-flash \
  GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com \
  GOOGLE_CLIENT_SECRET=GOCSPX-...
```

### 4.5 Security Group Configuration

EB creates a security group automatically. Verify it only exposes:

| Port | Source | Purpose |
|---|---|---|
| 80 | 0.0.0.0/0 | HTTP (EB redirects to HTTPS) |
| 443 | 0.0.0.0/0 | HTTPS |
| 8080 | EB security group only | Node.js (internal, not public) |

To add HTTPS:

1. EB Console → your environment → **Configuration** → **Load balancer** → **Edit**.
2. Add a listener: Port `443`, Protocol `HTTPS`, SSL certificate (from ACM).
3. Add a redirect rule: Port `80` → `443`.

> If using **Single instance** (no load balancer), EB handles HTTPS at the instance level. Use the `.ebextensions` nginx config approach or switch to a load-balanced environment for easier certificate management via ACM.

### 4.6 Custom Domain (Optional)

1. Register a domain or use Route 53.
2. In ACM (AWS Certificate Manager), request a certificate for `api.your-domain.com`.
3. Create a CNAME record pointing `api.your-domain.com` to the EB environment URL (`your-env.elasticbeanstalk.com`).
4. Attach the ACM certificate to the EB load balancer listener (port 443).

### 4.7 Verify the Backend

```bash
curl https://your-env.elasticbeanstalk.com/api/health
# or with custom domain:
curl https://api.your-domain.com/api/health
# Expected: {"status":"ok","message":"Hello World"}
```

### 4.8 Deploy Updates

**Via console:** Re-ZIP, go to EB → **Upload and deploy** → choose the new ZIP.

**Via EB CLI:**
```bash
cd server
eb deploy
```

### 4.9 View Logs

```bash
# EB CLI
eb logs

# Console
EB Console → your environment → Logs → Request last 100 lines
```

---

## 5. Vercel — Frontend Deployment

### 5.1 Import the Repository

1. Go to [https://vercel.com](https://vercel.com) and sign in.
2. Click **Add New → Project**.
3. Import your GitHub repository.

### 5.2 Configure the Project

| Setting | Value |
|---|---|
| **Root Directory** | `client` |
| **Framework Preset** | Vite |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

### 5.3 Set Environment Variables

In the Vercel project settings → **Environment Variables**, add:

| Variable | Value | Environments |
|---|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Production, Preview, Development |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase `anon` / `public` key | Production, Preview, Development |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID | Production, Preview, Development |
| `VITE_API_BASE_URL` | `https://your-domain.com` | Production |

> `VITE_API_BASE_URL` should point to the backend domain without a trailing slash. For Preview deployments leave it blank or point it to a staging backend.

**Do not add** `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, or `GOOGLE_CLIENT_SECRET` — these are backend-only.

### 5.4 Deploy

Click **Deploy**. Vercel builds the Vite app and deploys it.

After deployment you'll have a URL like `https://your-app.vercel.app`.

### 5.5 Redeploy After Changes

Push to your main branch — Vercel rebuilds automatically. To manually trigger:

```bash
# Using Vercel CLI
vercel --prod
```

---

## 6. Post-Deployment: Update All Origins

Once the Vercel URL is known, update:

### 6.1 EC2 Server .env

SSH in and update `CLIENT_ORIGIN`:

```bash
nano /home/ubuntu/cyber-fit/server/.env
# Set: CLIENT_ORIGIN=https://your-app.vercel.app
```

Restart the app:

```bash
pm2 restart cyber-fit-api
pm2 logs cyber-fit-api
```

### 6.2 Supabase

Dashboard → Authentication → URL Configuration:

- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: add `https://your-app.vercel.app/auth/callback`

### 6.3 Google Cloud Console

APIs & Services → Credentials → your OAuth 2.0 Client:

- **Authorized JavaScript Origins**: add `https://your-app.vercel.app`
- **Authorized Redirect URIs**: add `https://your-app.vercel.app/auth/callback`

---

## 7. Production Environment Variables Reference

### Backend (EC2 `.env`)

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | ✅ | Must be `production` |
| `PORT` | ✅ | Server port (default `3001`) |
| `CLIENT_ORIGIN` | ✅ | Vercel frontend URL, e.g. `https://your-app.vercel.app` |
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | **SECRET** — service role key, backend only |
| `GEMINI_API_KEY` | ✅ | **SECRET** — Gemini API key, backend only |
| `GEMINI_MODEL` | ☑️ | Optional, defaults to `gemini-2.0-flash` |
| `GOOGLE_CLIENT_ID` | ☑️ | OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | ☑️ | OAuth Client Secret |

### Frontend (Vercel Environment Variables)

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | Supabase project URL (same as backend) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ✅ | Supabase `anon` key (public — safe for browser) |
| `VITE_GOOGLE_CLIENT_ID` | ✅ | Google OAuth Client ID (public — safe for browser) |
| `VITE_API_BASE_URL` | ✅ | Backend URL, e.g. `https://api.your-domain.com` |

---

## 8. Secret Security Verification

Before going live, verify these constraints hold:

### Secrets must be server-side only

| Secret | Where | Should appear in browser? |
|---|---|---|
| `GEMINI_API_KEY` | `server/.env` only | ❌ Never |
| `SUPABASE_SERVICE_ROLE_KEY` | `server/.env` only | ❌ Never |
| `GOOGLE_CLIENT_SECRET` | `server/.env` only | ❌ Never |

### Client bundle audit (after `npm run build` in `client/`)

```bash
# Search the compiled JS bundles for secret values
# Replace <key> with the actual first 8 characters of each secret
grep -r "AIza" client/dist/assets/       # Gemini API key prefix
grep -r "service_role" client/dist/assets/
grep -r "eyJhbGciOiJI" client/dist/assets/  # JWT prefix (service role key)
```

All searches must return **no results**.

### Browser DevTools check

1. Open the deployed Vercel app.
2. Open DevTools → **Network** tab.
3. Trigger a plan generation.
4. Verify all requests to `your-domain.com/api/plans/generate` originate from the frontend and contain **only a Supabase JWT** in the `Authorization` header — not a Gemini key or service role key.
5. Inspect the **Application → Local Storage** and **Session Storage** tabs — no secrets should be stored there.
6. In the **Sources** tab, search for your Gemini API key prefix (`AIza`) — it must not appear.

---

## 9. Production Checklist

### Security

- [ ] `GEMINI_API_KEY` is absent from the client bundle (`client/dist/`)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is absent from the client bundle
- [ ] No `VITE_*` variables contain secrets
- [ ] `.env` files are in `.gitignore` and not committed to the repository
- [ ] `CLIENT_ORIGIN` is set to the exact Vercel URL (no wildcard `*`)
- [ ] CORS rejects requests from unauthorized origins
- [ ] HTTPS is enabled on both frontend and backend
- [ ] Supabase RLS is enabled on all tables

### Infrastructure

- [ ] EB environment status is **Green** in the console
- [ ] `curl https://your-env.elasticbeanstalk.com/api/health` returns `{"status":"ok",...}`
- [ ] EB Environment Properties are set (no `.env` file on the server)
- [ ] HTTPS listener is configured on port 443 with an ACM certificate
- [ ] HTTP port 80 redirects to HTTPS
- [ ] Node.js port 8080 is not publicly exposed (only accessible within EB security group)
- [ ] `.ebextensions/nginx-sse.config` is included in the deployment ZIP (enables SSE streaming)

### Authentication

- [ ] Supabase Site URL is set to the Vercel domain
- [ ] Supabase Redirect URLs include `https://your-app.vercel.app/auth/callback`
- [ ] Google OAuth Authorized Origins include the Vercel domain
- [ ] Google OAuth Redirect URIs include the Supabase callback URL
- [ ] Google OAuth consent screen is published (or test users are added)
- [ ] Email/password login works in production
- [ ] Google OAuth login works in production
- [ ] Auth callback redirects correctly to `/auth/callback`

### Features

- [ ] Dashboard loads and shows stats
- [ ] Workout plan generation completes (SSE progress bar works)
- [ ] Generated plan is saved and viewable
- [ ] Workout log can be submitted
- [ ] Progress page shows streak and chart data
- [ ] Protocols page shows archived plans
- [ ] Plan restore from archive works

### Logs

- [ ] EB logs show no startup errors: `eb logs` or view in EB Console
- [ ] Supabase logs show no RLS violations: Dashboard → Logs → Postgres

---

## 10. Ongoing Operations

### Update the Application

Re-ZIP the `server/` folder and deploy:

```bash
cd server

# Windows (PowerShell)
Compress-Archive -Path * -DestinationPath ../cyber-fit-backend.zip -Force

# macOS / Linux
zip -r ../cyber-fit-backend.zip . --exclude "node_modules/*" --exclude ".env"
```

Then in the EB Console → **Upload and deploy**, or via CLI:

```bash
cd server
eb deploy
```

### View Application Logs

```bash
# EB CLI — streams recent logs
eb logs

# EB CLI — open logs in browser
eb console
```

Or in the console: EB → your environment → **Logs** → **Request last 100 lines**.

### Update Environment Variables

EB Console → your environment → **Configuration** → **Updates, monitoring, and logging** → **Environment properties** → **Edit**.

Or via CLI:

```bash
eb setenv CLIENT_ORIGIN=https://your-new-domain.vercel.app
```

EB restarts the environment automatically after changes.

### SSL Certificate Renewal

Managed automatically by AWS Certificate Manager (ACM) — no action required.
