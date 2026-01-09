# FLHS IT Help Desk Hub

A modern web application for managing IT tickets and student detentions at Fort Lauderdale High School.

## 🚀 Quick Start

### 1. Environment Setup

Create `.env.local`:
```env
DATABASE_URL=postgresql://your-neon-connection-string?sslmode=require
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=$(openssl rand -base64 32)
```

### 2. Install & Setup

```bash
npm install
npm run db:generate
npx tsx scripts/setup-database.ts  # This does everything!
npm run dev
```

**Or manually:**
```bash
npm install
npm run db:generate
npx tsx scripts/apply-migration.ts
npx tsx scripts/create-admin.ts
npm run dev
```

## 📁 Project Structure

```
app/              # Next.js pages & API routes
components/       # React components
  ├── forms/      # Form components (Input, Select, Textarea, Update forms)
  └── ui/         # UI components (Button, Card)
lib/              # Utilities, auth, database
scripts/          # Utility scripts
docs/             # Documentation files
data/             # Data files (teachers.csv)
public/           # Static assets
```

## 🛠 Tech Stack

- Next.js 14 (App Router)
- Neon PostgreSQL
- Drizzle ORM
- NextAuth.js
- Tailwind CSS
- Framer Motion

## 📝 Scripts

- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run db:generate` - Generate migrations
- `npx tsx scripts/create-admin.ts` - Create admin user
- `npx tsx scripts/apply-migration.ts` - Apply database migrations
- `npx tsx scripts/setup-database.ts` - Complete database setup (recommended)
- `npx tsx scripts/import-teachers.ts` - Import teachers from CSV or inline list
- `npx tsx scripts/diagnose-db.ts` - Diagnose database issues
- `npx tsx scripts/verify-data.ts` - Verify tickets/detentions are saving
- `npx tsx scripts/test-login.ts` - Test login credentials

## 🔐 Default Admin Credentials

- **P Number**: `P00166224`
- **Password**: `1234` (change after first login!)

## 👨‍🏫 Teacher Setup

To import teachers and enable staff login, see [docs/TEACHER_SETUP.md](./docs/TEACHER_SETUP.md)

Quick setup:
1. Create `data/teachers.csv` with P Number, Name, Email, Role
2. Run `npx tsx scripts/import-teachers.ts`
3. Apply migration: `npx tsx scripts/apply-migration.ts`
4. Verify: `npx tsx scripts/verify-data.ts`

## 📧 Contact

RJ Ramautar - rajesh.ramautar@browardschools.com
