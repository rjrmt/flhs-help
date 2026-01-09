# 🔧 Fix Production Database Schema

## The Problem

Your Vercel logs show:
```
NeonDbError: column "p_number" does not exist
```

The production database is missing the `p_number` column in the `detentions` table.

## Solution

Run the fix script against your **production database**:

### Option 1: Run Script Locally (Recommended)

1. **Get your production DATABASE_URL from Vercel:**
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Copy the `DATABASE_URL` value

2. **Temporarily update your `.env.local`:**
   ```bash
   # Backup your local .env.local first!
   cp .env.local .env.local.backup
   
   # Update DATABASE_URL to production URL
   # (Edit .env.local and replace DATABASE_URL with production value)
   ```

3. **Run the fix script:**
   ```bash
   npx tsx scripts/fix-database-schema.ts
   ```

4. **Restore your local .env.local:**
   ```bash
   cp .env.local.backup .env.local
   ```

### Option 2: Run Direct SQL (Quick Fix)

If you have access to your Neon database console:

```sql
ALTER TABLE detentions ADD COLUMN IF NOT EXISTS p_number VARCHAR(50);
```

### Option 3: Share DATABASE_URL (I can run it)

If you want me to run the fix script, you can:
1. Share your production `DATABASE_URL` from Vercel
2. I'll run the script to add the missing column
3. Then you can test login again

**⚠️ Important:** Make sure to use your **production** DATABASE_URL, not local!

## Verification

After running the fix, verify it worked:

```bash
# Test locally with production DB (temporarily)
npx tsx scripts/diagnose-production.ts
```

You should see:
```
✅ Detentions table: p_number exists
```

## Next Steps

1. ✅ Run fix script on production database
2. ✅ Verify column exists
3. ✅ Test login on Vercel
4. ✅ Dashboard should now work!

