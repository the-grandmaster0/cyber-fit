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

## 4. AWS EC2 — Backend Deployment

### 4.1 Launch an Instance

1. AWS Console → EC2 → **Launch Instance**.
2. Name: `cyber-fit-backend`.
3. AMI: **Ubuntu Server 24.04 LTS (64-bit x86)**.
4. Instance type: **t3.small** (minimum; t3.medium recommended for multi-week plan generation).
5. Key pair: create or select an existing `.pem` key pair. Download and store it securely.
6. Network settings:
   - Allow **SSH (port 22)** from your IP.
   - Allow **HTTP (port 80)** from anywhere (Nginx → Node.js proxy).
   - Allow **HTTPS (port 443)** from anywhere.
   - **Do NOT expose port 3001** to the internet — keep it private behind Nginx.
7. Storage: 20 GB gp3 is sufficient.
8. Launch the instance.

### 4.2 Security Group Summary

| Port | Protocol | Source | Purpose |
|---|---|---|---|
| 22 | TCP | Your IP | SSH access |
| 80 | TCP | 0.0.0.0/0 | HTTP (redirects to HTTPS) |
| 443 | TCP | 0.0.0.0/0 | HTTPS (Nginx → Node.js) |
| 3001 | TCP | 127.0.0.1 | Node.js (local only, not public) |

### 4.3 SSH into the Instance

```bash
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>
```

### 4.4 Install Git

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git
```

### 4.5 Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version   # should print v20.x.x
npm --version
```

### 4.6 Install PM2

```bash
sudo npm install -g pm2
pm2 --version
```

### 4.7 Clone the Repository

```bash
cd /home/ubuntu
git clone https://github.com/your-username/your-repo.git cyber-fit
cd cyber-fit/server
```

### 4.8 Install Dependencies

```bash
npm install --omit=dev
```

### 4.9 Create the Server .env

```bash
nano .env
```

Paste and fill in all values (use your real credentials):

```env
NODE_ENV=production
PORT=3001
CLIENT_ORIGIN=https://your-app.vercel.app

SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-2.0-flash

GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
```

Save with `Ctrl+O`, exit with `Ctrl+X`.

```bash
chmod 600 .env
```

### 4.10 Start the App with PM2

```bash
cd /home/ubuntu/cyber-fit/server
pm2 start server.js --name cyber-fit-api --node-args="--env-file=.env"
pm2 logs cyber-fit-api
```

Verify no errors in the logs, then save the process list:

```bash
pm2 save
```

### 4.11 Configure PM2 Startup (Automatic Restart on Reboot)

```bash
pm2 startup
```

PM2 will print a command like:

```
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

Run that exact command. Then:

```bash
pm2 save
```

### 4.12 Install and Configure Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

Create the Nginx site configuration:

```bash
sudo nano /etc/nginx/sites-available/cyber-fit
```

Paste (replace `your-domain.com` with your actual domain or EC2 public IP):

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Redirect all HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL certificates (populated by Certbot in the next step)
    ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header X-Content-Type-Options  "nosniff" always;
    add_header X-Frame-Options         "DENY" always;
    add_header Referrer-Policy         "strict-origin-when-cross-origin" always;

    # Proxy all requests to Node.js
    location / {
        proxy_pass         http://127.0.0.1:3001;
        proxy_http_version 1.1;

        # SSE support (plan generation uses Server-Sent Events)
        proxy_set_header   Upgrade            $http_upgrade;
        proxy_set_header   Connection         "keep-alive";
        proxy_set_header   Host               $host;
        proxy_set_header   X-Real-IP          $remote_addr;
        proxy_set_header   X-Forwarded-For    $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto  $scheme;

        # Long timeout for SSE plan generation (up to 12 weeks can take ~5 minutes)
        proxy_read_timeout    600s;
        proxy_connect_timeout 60s;
        proxy_send_timeout    600s;

        # Disable buffering for SSE
        proxy_buffering    off;
        proxy_cache        off;
    }
}
```

Enable the site and test:

```bash
sudo ln -s /etc/nginx/sites-available/cyber-fit /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4.13 Enable HTTPS with Let's Encrypt

> Requires a domain name pointed at the EC2 public IP via an A record.

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

Follow the prompts. Certbot will:
- Obtain a certificate from Let's Encrypt
- Update your Nginx config with the SSL paths
- Optionally configure auto-redirect HTTP → HTTPS

Verify auto-renewal works:

```bash
sudo certbot renew --dry-run
```

Auto-renewal runs via a systemd timer — no cron job needed.

### 4.14 Verify the Backend

```bash
curl https://your-domain.com/api/health
# Expected: {"status":"ok","message":"Hello World"}
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

- [ ] PM2 is running: `pm2 list` shows `cyber-fit-api` as `online`
- [ ] PM2 startup is configured: `pm2 startup` + `pm2 save` completed
- [ ] Nginx is proxying HTTPS → port 3001
- [ ] SSL certificate is valid: `sudo certbot certificates`
- [ ] Port 3001 is NOT exposed in the EC2 Security Group
- [ ] `curl https://your-domain.com/api/health` returns `{"status":"ok",...}`

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

- [ ] PM2 logs show no startup errors: `pm2 logs cyber-fit-api`
- [ ] Nginx error log is clean: `sudo tail -f /var/log/nginx/error.log`
- [ ] Supabase logs show no RLS violations: Dashboard → Logs → Postgres

---

## 10. Ongoing Operations

### Update the Application

```bash
ssh -i your-key.pem ubuntu@<EC2_IP>
cd /home/ubuntu/cyber-fit
git pull origin main
cd server && npm install --omit=dev
pm2 restart cyber-fit-api
pm2 logs cyber-fit-api
```

### View Application Logs

```bash
pm2 logs cyber-fit-api         # tail logs
pm2 logs cyber-fit-api --lines 200  # last 200 lines
pm2 monit                      # live CPU/RAM monitor
```

### Restart / Stop / Start

```bash
pm2 restart cyber-fit-api
pm2 stop cyber-fit-api
pm2 start cyber-fit-api
```

### SSL Certificate Renewal

Handled automatically by `certbot.timer`. To force renew:

```bash
sudo certbot renew
sudo systemctl reload nginx
```
