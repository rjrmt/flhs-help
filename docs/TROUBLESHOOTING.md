# Troubleshooting Guide

## Login Issues

If you're getting "Application error: a server-side exception has occurred" when trying to log in:

### Quick Fix Steps

1. **Run the diagnostic script:**
   ```bash
   npx tsx scripts/diagnose-db.ts
   ```
   This will check your database connection, tables, and admin user.

2. **If database is not set up, run:**
   ```bash
   npx tsx scripts/setup-database.ts
   ```
   This will:
   - Apply all migrations
   - Create the admin user
   - Verify everything works

3. **Test login credentials:**
   ```bash
   npx tsx scripts/test-login.ts
   ```
   This verifies your credentials work.

### Default Admin Credentials

- **P Number:** `P00166224`
- **Password:** `1234`

⚠️ **Change the password after first login!**

### Common Issues

#### Issue: "DATABASE_URL not set"
**Solution:** Make sure `.env.local` exists with:
```env
DATABASE_URL=postgresql://your-connection-string
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
```

#### Issue: "Table does not exist"
**Solution:** Run migrations:
```bash
npm run db:generate
npx tsx scripts/apply-migration.ts
```

#### Issue: "User not found"
**Solution:** Create admin user:
```bash
npx tsx scripts/create-admin.ts
```

#### Issue: "Invalid password"
**Solution:** Reset password by running:
```bash
npx tsx scripts/setup-database.ts
```

### Server-Side Errors

If you see server-side errors in the browser:

1. **Check server logs** - Look at your terminal where `npm run dev` is running
2. **Check database connection** - Run `npx tsx scripts/diagnose-db.ts`
3. **Verify environment variables** - Make sure `.env.local` is correct
4. **Restart dev server** - Sometimes a restart fixes issues

### Getting Help

If issues persist:
1. Run the diagnostic script and share the output
2. Check server logs for specific error messages
3. Verify your Neon database is accessible
4. Make sure all migrations are applied

