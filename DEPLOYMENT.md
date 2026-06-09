# Blackrock Reserve — Production & Domain Guide

Use this checklist when connecting your custom domain and going live.

## 1. Deploy to Vercel

1. Push the repo to GitHub.
2. Import the project at [vercel.com/new](https://vercel.com/new).
3. Add all variables from `.env.example` in **Project → Settings → Environment Variables** (Production + Preview).
4. Deploy once with a temporary Vercel URL (e.g. `https://blackrock-reserve.vercel.app`).

## 2. Connect your custom domain

1. In Vercel: **Project → Settings → Domains → Add**.
2. Enter your domain (e.g. `blackrockreserve.site` and `www.blackrockreserve.site`).
3. At your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.), add the DNS records Vercel shows:
   - **A record** `@` → Vercel IP, or
   - **CNAME** `www` → `cname.vercel-dns.com`
4. Wait for DNS propagation (usually 5–60 minutes). Vercel will issue SSL automatically.

## 3. Update environment variables for production

After the domain works, set these in Vercel **Production** environment:

| Variable | Example |
|----------|---------|
| `NEXTAUTH_URL` | `https://www.blackrockreserve.site` |
| `NEXT_PUBLIC_SITE_URL` | `https://www.blackrockreserve.site` |
| `NEXTAUTH_SECRET` | 32+ char random string (`openssl rand -base64 32`) |

Redeploy after changing env vars (**Deployments → … → Redeploy**).

## 4. Resend email (your domain)

All transactional email uses [Resend](https://resend.com): sign-up verification, password reset, deposit/withdrawal alerts, and contact notifications.

### Add your domain in Resend

1. Sign in at [resend.com](https://resend.com) → **Domains** → **Add Domain**.
2. Enter `blackrockreserve.site`.
3. Resend will show DNS records (typically **DKIM**, **SPF**, and sometimes **MX**). Add them at the same place you manage DNS for the site (registrar or Cloudflare).
4. Wait until Resend shows the domain as **Verified** (often 5–30 minutes).

### Create API key & Vercel env vars

1. **API Keys** → **Create API Key** → copy the key (starts with `re_`).
2. In Vercel **Environment Variables** (Production + Preview), add:

| Variable | Value |
|----------|--------|
| `RESEND_API_KEY` | Your `re_...` key |
| `EMAIL_FROM` | `BlackrockReserve <noreply@blackrockreserve.site>` |
| `NOTIFY_EMAIL` | `admin@blackrockreserve.site` (contact form alerts) |

3. Redeploy.

**Sender addresses you can use** (after domain is verified):

- `noreply@blackrockreserve.site` — verification & password emails
- `notifications@blackrockreserve.site` — transaction alerts (set in `EMAIL_FROM` if you prefer)

Resend takes priority over Gmail when `RESEND_API_KEY` is set. Gmail vars are optional fallback for local dev.

## 5. Database & admin setup

```bash
# From your machine with production DATABASE_URL in .env
npm run db:push
npm run admin:create
```

Then sign in at `https://yourdomain.com/admin/login`.

Configure **Admin → Settings** (Bitcoin wallet, deposit messages) before customers use deposits.

## 6. Pre-launch verification

- [ ] `npm run build` passes locally
- [ ] Register → verify email → login works
- [ ] Dashboard, Deposit, Withdraw pages load
- [ ] Contact form saves messages
- [ ] Admin can credit balance and customer gets notification
- [ ] `NEXTAUTH_URL` uses `https://` (not `http://`)
- [ ] Resend domain verified and `RESEND_API_KEY` set in Vercel
- [ ] Test register → verification email arrives from `@blackrockreserve.site`
- [ ] Supabase project is **not paused**

## 7. Optional: Google OAuth

If using Google sign-in, add authorized redirect URI in Google Cloud Console:

`https://yourdomain.com/api/auth/callback/google`

---

**Support:** Issues with DNS or SSL are handled in the Vercel Domains panel. Database connection errors usually mean wrong `DATABASE_URL` (use pooler port **6543**) or a paused Supabase project.
