# Blackrock Reserve — Production & Domain Guide

Use this checklist when connecting your custom domain and going live.

## 1. Deploy to Vercel

1. Push the repo to GitHub.
2. Import the project at [vercel.com/new](https://vercel.com/new).
3. Add all variables from `.env.example` in **Project → Settings → Environment Variables** (Production + Preview).
4. Deploy once with a temporary Vercel URL (e.g. `https://blackrock-reserve.vercel.app`).

## 2. Connect your custom domain

1. In Vercel: **Project → Settings → Domains → Add**.
2. Enter your domain (e.g. `blackrockreserve.com` and `www.blackrockreserve.com`).
3. At your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.), add the DNS records Vercel shows:
   - **A record** `@` → Vercel IP, or
   - **CNAME** `www` → `cname.vercel-dns.com`
4. Wait for DNS propagation (usually 5–60 minutes). Vercel will issue SSL automatically.

## 3. Update environment variables for production

After the domain works, set these in Vercel **Production** environment:

| Variable | Example |
|----------|---------|
| `NEXTAUTH_URL` | `https://blackrockreserve.com` |
| `NEXT_PUBLIC_SITE_URL` | `https://blackrockreserve.com` |
| `NEXTAUTH_SECRET` | 32+ char random string (`openssl rand -base64 32`) |

Redeploy after changing env vars (**Deployments → … → Redeploy**).

## 4. Database & admin setup

```bash
# From your machine with production DATABASE_URL in .env
npm run db:push
npm run admin:create
```

Then sign in at `https://yourdomain.com/admin/login`.

Configure **Admin → Settings** (Bitcoin wallet, deposit messages) before customers use deposits.

## 5. Pre-launch verification

- [ ] `npm run build` passes locally
- [ ] Register → verify email → login works
- [ ] Dashboard, Deposit, Withdraw pages load
- [ ] Contact form saves messages
- [ ] Admin can credit balance and customer gets notification
- [ ] `NEXTAUTH_URL` uses `https://` (not `http://`)
- [ ] Gmail app password configured for verification emails
- [ ] Supabase project is **not paused**

## 6. Optional: Google OAuth

If using Google sign-in, add authorized redirect URI in Google Cloud Console:

`https://yourdomain.com/api/auth/callback/google`

---

**Support:** Issues with DNS or SSL are handled in the Vercel Domains panel. Database connection errors usually mean wrong `DATABASE_URL` (use pooler port **6543**) or a paused Supabase project.
