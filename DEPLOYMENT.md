# Blackrock Reserve — Production & Domain Guide

Use this checklist when connecting your custom domain and going live.

## 1. Deploy to Vercel

1. Push the repo to GitHub.
2. Import the project at [vercel.com/new](https://vercel.com/new).
3. Add all variables from `.env.example` in **Project → Settings → Environment Variables** (Production + Preview).
4. Deploy once with a temporary Vercel URL (e.g. `https://blackrock-reserve.vercel.app`).

## 2. Connect your custom domain

1. In Vercel: **Project → Settings → Domains → Add**.
2. Enter your domain (e.g. `theblackrockreserve.com` and `www.theblackrockreserve.com`).
3. At your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.), add the DNS records Vercel shows:
   - **A record** `@` → Vercel IP, or
   - **CNAME** `www` → `cname.vercel-dns.com`
4. Wait for DNS propagation (usually 5–60 minutes). Vercel will issue SSL automatically.

## 3. Update environment variables for production

After the domain works, set these in Vercel **Production** environment:

| Variable | Example |
|----------|---------|
| `NEXTAUTH_URL` | `https://theblackrockreserve-com.vercel.app` |
| `NEXT_PUBLIC_SITE_URL` | `https://theblackrockreserve-com.vercel.app` |
| `NEXTAUTH_SECRET` | 32+ char random string (`openssl rand -base64 32`) |

Redeploy after changing env vars (**Deployments → … → Redeploy**).

## 4. Gmail SMTP email

All transactional email uses **Gmail SMTP**: welcome, verification, password reset, deposit/withdrawal alerts, account freeze notices, and support replies.

### Google App Password

1. Enable **2-Step Verification** on the Gmail account that will send mail.
2. Go to [Google App Passwords](https://myaccount.google.com/apppasswords) → create a password for **Mail**.
3. In Vercel **Environment Variables** (Production + Preview), add:

| Variable | Value |
|----------|--------|
| `GMAIL_USER` | Your Gmail address (e.g. `notifications@gmail.com`) |
| `GMAIL_APP_PASSWORD` | 16-character app password (spaces are fine) |
| `EMAIL_FROM` | `BlackrockReserve <your-gmail@gmail.com>` |
| `NOTIFY_EMAIL` | `admin@theblackrockreserve.com` (contact form alerts) |

4. **Delete `RESEND_API_KEY`** from Vercel if present — it is no longer used.
5. Redeploy.

Emails covered: Welcome, Email Verification, Password Reset, Deposit Confirmation, Withdrawal Request, Withdrawal Approval/Rejection, Account Frozen/Unfrozen, Support Reply.

## 5. Database & admin setup

Set `DATABASE_URL` and `DIRECT_URL` in Vercel **before the first deploy** so build-time schema scripts can run (`npm run build` applies idempotent SQL migrations).

```bash
# From your machine with production DATABASE_URL in .env
npm run db:push
npm run admin:create
```

Then sign in at `https://yourdomain.com/admin/login`.

Configure **Admin → Settings** before customers go live:

- Bitcoin wallet and deposit instructions
- Physical card ordering requirements (KYC, minimum balance, investment account)

## 6. Pre-launch verification

- [ ] `npm run lint` and `npm run build` pass locally
- [ ] `GET /api/health` returns `"ok": true` with `database.connected` and `auth.configured`
- [ ] Register → verify email → login works
- [ ] Dashboard, Deposit, Transfer, Withdrawals, Cards, and Transactions load
- [ ] Physical card request submits and appears in **Admin → Card Requests**
- [ ] Contact form saves messages
- [ ] Admin can credit balance and customer gets notification
- [ ] `NEXTAUTH_URL` and `NEXT_PUBLIC_SITE_URL` use `https://` (not `http://`)
- [ ] `GMAIL_USER` and `GMAIL_APP_PASSWORD` set in Vercel; `RESEND_API_KEY` removed
- [ ] Test register → verification email arrives from your domain
- [ ] Supabase project is **not paused**
- [ ] `ADMIN_PASSWORDLESS` is **not** set to `true` in production

## 7. Optional: Google OAuth

If using Google sign-in, add authorized redirect URI in Google Cloud Console:

`https://yourdomain.com/api/auth/callback/google`

---

**Support:** Issues with DNS or SSL are handled in the Vercel Domains panel. Database connection errors usually mean wrong `DATABASE_URL` (use pooler port **6543**) or a paused Supabase project.
