# 🚨 CRITICAL: Vercel Production Setup Guide

## ⚠️ Why Login Fails on Vercel

Your login works locally but fails on Vercel because **environment variables are missing or incorrect** in your Vercel project.

## ✅ Required Environment Variables

You **MUST** set these 3 environment variables in Vercel:

### 1. DATABASE_URL
- **What**: Your Neon PostgreSQL connection string
- **Where to find**: Neon dashboard → Connection String
- **Format**: `postgresql://user:password@host/database?sslmode=require`
- **Example**: `postgresql://neondb_owner:password@ep-lucky-tooth-ah2xyacl-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require`

### 2. NEXTAUTH_SECRET
- **What**: Secret key for encrypting JWT tokens
- **How to generate**: Run `openssl rand -base64 32` locally
- **Example**: `aBc123XyZ456...` (44 characters)
- **⚠️ CRITICAL**: Must be set or sessions won't work!

### 3. NEXTAUTH_URL
- **What**: Your production URL
- **Value**: `https://flhs-help.vercel.app`
- **⚠️ CRITICAL**: Must match your Vercel deployment URL exactly!

## 📋 Step-by-Step Setup

### Step 1: Get Your Database URL
1. Go to [Neon Console](https://console.neon.tech)
2. Select your database project
3. Go to "Connection Details"
4. Copy the connection string (use the "Pooler" option for better performance)
5. Make sure it includes `?sslmode=require`

### Step 2: Generate NEXTAUTH_SECRET
Run this locally:
```bash
openssl rand -base64 32
```
Copy the output (it will be ~44 characters)

### Step 3: Set Environment Variables in Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your `flhs-help` project
3. Go to **Settings** → **Environment Variables**
4. Add each variable:

   **Variable 1:**
   - Name: `DATABASE_URL`
   - Value: (paste your Neon connection string)
   - Environment: ✅ Production ✅ Preview ✅ Development

   **Variable 2:**
   - Name: `NEXTAUTH_SECRET`
   - Value: (paste the generated secret)
   - Environment: ✅ Production ✅ Preview ✅ Development

   **Variable 3:**
   - Name: `NEXTAUTH_URL`
   - Value: `https://flhs-help.vercel.app`
   - Environment: ✅ Production ✅ Preview ✅ Development

### Step 4: Redeploy
**⚠️ IMPORTANT**: After adding environment variables, you MUST redeploy:

1. Go to **Deployments** tab
2. Click the **three dots** (⋯) on the latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete (~2 minutes)

## 🔍 Verification Steps

### 1. Check Environment Variables Are Set
After redeploy, check Vercel logs:
- Go to Deployments → Latest deployment → Functions
- Look for any errors about missing environment variables

### 2. Test Database Connection
Run locally (uses your local .env.local):
```bash
npx tsx scripts/diagnose-production.ts
```

This will show:
- ✅ Database connection status
- ✅ Users in database
- ✅ Tickets/detentions
- ✅ Environment variable status

### 3. Test Login on Vercel
1. Go to https://flhs-help.vercel.app/login
2. Try logging in with:
   - P Number: `P00166224`
   - Password: `1234`

### 4. Check Vercel Function Logs
If login still fails:
1. Go to Vercel Dashboard → Deployments
2. Click on your deployment
3. Go to **Functions** tab
4. Click on `/api/auth/[...nextauth]`
5. Check logs for errors:
   - `DATABASE_URL not set`
   - `NEXTAUTH_SECRET not set`
   - Database connection errors
   - Authentication errors

## 🐛 Common Issues & Solutions

### Issue: "Application error: a server-side exception has occurred"
**Cause**: Missing environment variables
**Solution**: 
1. Verify all 3 variables are set in Vercel
2. Make sure you selected all environments (Production, Preview, Development)
3. Redeploy after adding variables

### Issue: "Invalid P Number or password"
**Cause**: User doesn't exist or wrong password
**Solution**:
1. Run locally: `npx tsx scripts/diagnose-production.ts`
2. Check if user exists in database
3. Create admin: `npx tsx scripts/create-admin.ts`

### Issue: Login works but redirect fails
**Cause**: Dashboard page static rendering error
**Solution**: Already fixed - routes are marked as dynamic

### Issue: Database connection timeout
**Cause**: Wrong DATABASE_URL or network issue
**Solution**:
1. Verify DATABASE_URL is correct
2. Make sure it includes `?sslmode=require`
3. Use "Pooler" connection string from Neon

## 📊 Current Database Status

Based on diagnostic script:
- ✅ **4 users** exist (including admin P00166224)
- ✅ **2 tickets** exist
- ✅ Database connection works locally
- ✅ All required tables exist

## 🎯 Quick Checklist

- [ ] DATABASE_URL set in Vercel
- [ ] NEXTAUTH_SECRET set in Vercel (44 characters)
- [ ] NEXTAUTH_URL set to `https://flhs-help.vercel.app`
- [ ] All variables set for Production, Preview, Development
- [ ] Redeployed after adding variables
- [ ] Tested login on Vercel
- [ ] Checked Vercel function logs for errors

## 🆘 Still Not Working?

1. **Check Vercel Logs**: Most errors will show in function logs
2. **Run Diagnostic**: `npx tsx scripts/diagnose-production.ts` (locally)
3. **Verify Database**: Check Neon console that database is accessible
4. **Test Locally**: Make sure login works locally first
5. **Check Browser Console**: Look for client-side errors

## 📝 Notes

- Environment variables are **NOT** automatically synced from `.env.local`
- You **MUST** manually add them in Vercel dashboard
- After adding variables, **ALWAYS** redeploy
- NEXTAUTH_URL must match your deployment URL exactly (no trailing slash)

