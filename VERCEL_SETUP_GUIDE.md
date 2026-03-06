# Vercel Production Setup Guide

## Required Environment Variables

Set these in **Vercel → Settings → Environment Variables**:

### 1. DATABASE_URL
- **What**: Supabase PostgreSQL connection string
- **Where**: [Supabase Dashboard](https://supabase.com/dashboard) → Project → **Connect** → URI → **Transaction** (port 6543)
- **Format**: `postgresql://postgres.[project-ref]:[PASSWORD]@aws-1-[region].pooler.supabase.com:6543/postgres?sslmode=require`
- Use the exact connection string from the Supabase dashboard.

### 2. NEXTAUTH_SECRET
- **What**: Secret for JWT encryption
- **Generate**: `openssl rand -base64 32`
- **Required**: Must be set or sessions won't work.

### 3. NEXTAUTH_URL
- **What**: Production URL
- **Value**: `https://your-app.vercel.app` (match your deployment URL exactly)

## Setup Steps

1. Add all 3 variables in Vercel (Production, Preview, Development)
2. **Redeploy** after adding variables
3. Run `npx tsx scripts/diagnose-db.ts` locally to verify database
4. Test login at `https://your-app.vercel.app/login`

## Troubleshooting

- **Invalid P Number**: Run `npx tsx scripts/create-admin.ts` or `npx tsx scripts/setup-database.ts` to ensure admin exists
- **Connection errors**: Verify DATABASE_URL from Supabase Dashboard → Connect → Transaction mode
- **Session issues**: Ensure NEXTAUTH_SECRET is set and NEXTAUTH_URL matches deployment URL
