# Blackrock Reserve

Premium digital banking platform built with Next.js 14, TypeScript, Tailwind CSS, Prisma, Supabase PostgreSQL, and NextAuth.

> **This GitHub repository contains the public customer-facing frontend** (marketing site, auth, and user dashboard UI) plus the user API routes required for login, deposits, withdrawals, and notifications. Admin console code and server scripts are kept out of this repo for security. Configure secrets only in `.env` / Vercel — never commit `.env`.

## Email (Resend + your domain)

Sign-up verification, password reset, transaction alerts, and contact notifications are sent via **[Resend](https://resend.com)** from `@blackrockreserve.site`.

1. Add domain `blackrockreserve.site` in Resend → copy DNS records to your registrar
2. Create an API key and add to `.env` / Vercel:

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | Resend API key (`re_...`) |
| `EMAIL_FROM` | e.g. `BlackrockReserve <noreply@blackrockreserve.site>` |
| `NOTIFY_EMAIL` | Inbox for contact-form alerts |

Gmail (`GMAIL_USER` / `GMAIL_APP_PASSWORD`) is optional fallback for local dev. See `DEPLOYMENT.md` for full DNS setup.

In development without email configured, OTP codes are printed to the server console.

## Deploy to Vercel

1. Push this repo to GitHub and import it in [Vercel](https://vercel.com/new).
2. Add these **Environment Variables** in the Vercel project settings:

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | Resend API key for transactional email |
| `EMAIL_FROM` | Verified sender, e.g. `BlackrockReserve <noreply@blackrockreserve.site>` |
| `NOTIFY_EMAIL` | Optional — contact form notification inbox |
| `DATABASE_URL` | Supabase pooled connection (`aws-1-[region].pooler.supabase.com:6543?pgbouncer=true&sslmode=require`) |
| `DIRECT_URL` | Supabase **direct** host (`db.[PROJECT_REF].supabase.co:5432?sslmode=require`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |
| `NEXT_PUBLIC_SITE_URL` | Production URL, e.g. `https://www.blackrockreserve.site` |
| `NEXTAUTH_URL` | Same as production URL (auth cookies & email links) |
| `NEXTAUTH_SECRET` | Random secret (`openssl rand -base64 32`) |
| `ADMIN_EMAIL` | Admin bootstrap email (for `npm run admin:create`) |
| `ADMIN_PASSWORD` | Admin bootstrap password |
| `GOOGLE_CLIENT_ID` | Optional — Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Optional — Google OAuth |

3. Deploy. Vercel runs `npm install` (which triggers `prisma generate` via `postinstall`) then `npm run build`.
4. After first deploy, create the admin user:

```bash
npm run admin:create
```

Run locally with production env vars set, or create the admin via Supabase SQL.

## Production checklist

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for custom domain setup on Vercel.

- Set a strong `NEXTAUTH_SECRET` (never use the dev default)
- Set `NEXTAUTH_URL` and `NEXT_PUBLIC_SITE_URL` to your live domain (`https://…`)
- Use Supabase **pooler** URL on port **6543** for `DATABASE_URL`
- Use Supabase **direct** URL on port **5432** for `DIRECT_URL`
- Rotate any keys/passwords that were shared in chat
- Configure Bitcoin wallet in **Admin → Settings** before going live
- Never enable `ADMIN_PASSWORDLESS` in production

## Local development

```bash
npm install
cp .env.example .env
# Fill in Supabase + NextAuth values in .env
npm run db:push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Admin Console (separate portal)

The admin dashboard lives at **`/admin`** — same Blackrock Reserve brand (orange/red glassmorphism) in an internal console layout.

| URL | Description |
|-----|-------------|
| `/admin/login` | Admin sign-in |
| `/admin` | Overview & metrics |
| `/admin/users` | Customer management (search, filter, edit, suspend, delete, balance adjust) |
| `/admin/deposits` | Review Bitcoin deposit proofs |
| `/admin/balance-adjustments` | Balance adjustment history |
| `/admin/audit-log` | Admin action audit trail |
| `/admin/settings` | Bitcoin wallet, purchase link, deposit messages |
| `/admin/accounts` | All bank accounts |
| `/admin/transactions` | Platform transactions |
| `/admin/kyc` | KYC review queue |
| `/admin/messages` | Contact form inbox |

### Create an admin user

After `npm run db:push`, run:

```bash
npm run admin:create
```

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` first, or defaults are used (change in production).

Then sign in at [http://localhost:3000/admin/login](http://localhost:3000/admin/login).

Configure Bitcoin deposits at **Admin → Settings** (wallet address, purchase link, instructions).

Users deposit at **Dashboard → Deposit** (`/dashboard/deposit`).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run db:push` | Sync Prisma schema to database |
| `npm run db:studio` | Open Prisma Studio |
| `npm run admin:create` | Create or promote an admin user |

## Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** PostgreSQL via Supabase + Prisma
- **Auth:** NextAuth.js (credentials + optional Google)
- **UI:** Tailwind CSS, Framer Motion, Recharts, Lucide icons
