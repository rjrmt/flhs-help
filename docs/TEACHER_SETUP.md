# Teacher Database Setup Guide

This guide explains how to build a database of teachers with P numbers so they can login to the admin console and view their tickets and detentions.

## Quick Start

### 1. Import Teachers

**Option A: Using CSV file (Recommended)**

1. Create a `data/teachers.csv` file:
```csv
P Number,Name,Email,Role
P00166224,RJ Ramautar,rajesh.ramautar@browardschools.com,admin
P00166225,John Doe,john.doe@browardschools.com,staff
P00166226,Jane Smith,jane.smith@browardschools.com,staff
```

2. Run the import script:
```bash
npx tsx scripts/import-teachers.ts
```

**Option B: Using inline list**

1. Edit `scripts/import-teachers.ts`
2. Add teachers to the `inlineTeachers` array:
```typescript
const inlineTeachers: Teacher[] = [
  { pNumber: 'P00166224', name: 'RJ Ramautar', email: 'rajesh.ramautar@browardschools.com', role: 'admin' },
  { pNumber: 'P00166225', name: 'John Doe', email: 'john.doe@browardschools.com', role: 'staff' },
];
```

3. Run the import script:
```bash
npx tsx scripts/import-teachers.ts
```

### 2. Apply Database Migration

The detention schema now includes a `p_number` field for filtering:

```bash
npm run db:generate
npx tsx scripts/apply-migration.ts
```

### 3. Verify Everything Works

```bash
# Check database
npx tsx scripts/diagnose-db.ts

# Verify data is saving
npx tsx scripts/verify-data.ts

# Test login
npx tsx scripts/test-login.ts
```

## How It Works

### Authentication
- Teachers login with their **P Number** and password
- P Number is stored in the session for filtering

### Filtering
- **Staff users** see only their own tickets and detentions (filtered by P Number)
- **Admin users** see all tickets and detentions

### Ticket Submission
- When submitting a ticket, the P Number is stored
- The ticket is automatically linked to the teacher

### Detention Submission
- When submitting a detention, the P Number is stored
- The staff name is automatically looked up from the P Number
- The detention is automatically linked to the teacher

## Default Password

All imported teachers get a default password:
- Default: `ChangeMe123!`
- Set via `DEFAULT_TEACHER_PASSWORD` in `.env.local`

⚠️ **Important:** Teachers should change their password on first login!

## Verification Scripts

### Check Database Setup
```bash
npx tsx scripts/diagnose-db.ts
```
- Checks database connection
- Verifies all tables exist
- Lists all users

### Verify Data is Saving
```bash
npx tsx scripts/verify-data.ts
```
- Shows ticket count
- Shows detention count
- Verifies tickets/detentions are linked to users
- Checks authentication setup

### Test Login
```bash
npx tsx scripts/test-login.ts
```
- Tests if admin credentials work
- Verifies password hashing

## Admin Console Access

### Staff Login
1. Go to `/login`
2. Enter P Number (e.g., `P00166224`)
3. Enter password
4. View only your tickets/detentions

### Admin Login
1. Go to `/login`
2. Enter P Number (must have `role: 'admin'`)
3. Enter password
4. View ALL tickets/detentions + Admin Console

## Troubleshooting

### Teachers can't login
1. Check user exists: `npx tsx scripts/diagnose-db.ts`
2. Verify password: `npx tsx scripts/test-login.ts`
3. Check P Number matches exactly (case-sensitive, but script auto-uppercases)

### Teachers see all tickets instead of just theirs
- Make sure the user's role is `staff` not `admin`
- Check session has P Number: Look for `pNumber` in session object

### Tickets/Detentions not saving
- Run `npx tsx scripts/verify-data.ts`
- Check browser console for errors
- Check server logs for API errors
- Verify database connection

### Detentions not linked to user
- Make sure migration applied: `npx tsx scripts/apply-migration.ts`
- Check `p_number` column exists in `detentions` table
- Verify form sends P Number in submission

## Adding More Teachers

Simply:
1. Add to `data/teachers.csv` or edit `scripts/import-teachers.ts`
2. Run `npx tsx scripts/import-teachers.ts`
3. Done! Teachers can immediately login

## CSV Format

Required columns:
- **P Number** (required, unique)
- **Name** (required)
- **Email** (optional)
- **Role** (optional, default: `staff`, can be `staff` or `admin`)

Example:
```csv
P Number,Name,Email,Role
P00166224,RJ Ramautar,rajesh.ramautar@browardschools.com,admin
P00166225,John Doe,john.doe@browardschools.com,staff
P00166226,Jane Smith,,staff
```

