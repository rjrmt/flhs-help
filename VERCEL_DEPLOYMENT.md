# Vercel Deployment Checklist

## Required Environment Variables

Make sure these environment variables are set in your Vercel project settings:

1. **DATABASE_URL**
   - Your Neon PostgreSQL connection string
   - Format: `postgresql://user:password@host/database?sslmode=require`

2. **NEXTAUTH_SECRET**
   - Generate a random secret: `openssl rand -base64 32`
   - This is used to encrypt JWT tokens

3. **NEXTAUTH_URL**
   - Your production URL: `https://flhs-help.vercel.app`
   - Must match your Vercel deployment URL

## Setting Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable:
   - Variable Name: `DATABASE_URL`
   - Value: Your Neon database connection string
   - Environment: Production, Preview, Development (select all)
   
   Repeat for `NEXTAUTH_SECRET` and `NEXTAUTH_URL`

## Verification Steps

1. After adding environment variables, redeploy your application
2. Check Vercel logs for any database connection errors
3. Test the admin console login with an admin user (P00166224)

## Common Issues

### "Application error: a server-side exception has occurred"
- **Cause**: Missing or incorrect environment variables
- **Solution**: Verify all environment variables are set correctly in Vercel

### Database Connection Errors
- **Cause**: DATABASE_URL not set or incorrect
- **Solution**: Double-check your Neon database connection string

### Authentication Errors
- **Cause**: NEXTAUTH_SECRET or NEXTAUTH_URL not set
- **Solution**: Generate a new NEXTAUTH_SECRET and set NEXTAUTH_URL to your production URL

## Redeploy After Adding Variables

After adding environment variables, you must redeploy:
1. Go to Vercel dashboard → Deployments
2. Click the three dots on the latest deployment
3. Select "Redeploy"
4. Or make a small commit and push to trigger a new deployment

## Checking Logs

1. Go to Vercel dashboard → Deployments
2. Click on your deployment
3. Go to the "Functions" tab
4. Click on any function to see logs
5. Look for error messages related to:
   - Database connection
   - Environment variables
   - Authentication

