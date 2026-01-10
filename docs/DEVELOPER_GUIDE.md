# Developer Guide - Running the App

This guide will teach you how to run and develop the FLHS Help Desk Hub application.

## 🚀 Quick Start - Running the App

### Step 1: Open Terminal
- **Mac**: Press `Cmd + Space`, type "Terminal", press Enter
- **Windows**: Press `Win + R`, type "cmd", press Enter
- **VS Code**: Press `` Ctrl + ` `` (backtick) to open integrated terminal

### Step 2: Navigate to Project Directory
```bash
cd /Users/rjr/Desktop/flhs-help
```

**Tip**: You can drag and drop the folder into Terminal to auto-fill the path!

### Step 3: Start the Development Server
```bash
npm run dev
```

**What this does:**
- Starts Next.js development server
- Watches for file changes (auto-reloads)
- Runs on `http://localhost:3000` by default
- Shows errors in browser and terminal

### Step 4: Open in Browser
Once you see:
```
✓ Ready in X.Xs
○ Local: http://localhost:3000
```

Open your browser and go to: **http://localhost:3000**

## 📝 Common Commands

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server (after build)
npm run lint         # Check code for errors
```

### Database Commands
```bash
npm run db:generate  # Generate database migrations
npm run db:migrate   # Apply migrations
npm run db:studio    # Open Drizzle Studio (database GUI)
```

### Utility Scripts
```bash
# Create admin user
npx tsx scripts/create-admin.ts

# Import teachers from CSV
npx tsx scripts/import-teachers.ts

# Setup complete database
npx tsx scripts/setup-database.ts

# Diagnose database issues
npx tsx scripts/diagnose-db.ts

# Verify data is saving
npx tsx scripts/verify-data.ts

# Test login credentials
npx tsx scripts/test-login.ts
```

## 🛠 Development Workflow

### 1. Make Changes
- Edit files in your code editor
- Save the file
- Browser automatically refreshes (Hot Module Replacement)

### 2. See Changes
- Changes appear instantly in browser
- Errors show in browser and terminal
- Check terminal for compilation errors

### 3. Debug
- Open browser DevTools (`F12` or `Cmd+Option+I`)
- Check Console tab for errors
- Check Network tab for API calls
- Check terminal for server errors

## 🔧 Troubleshooting

### Port Already in Use
If you see "Port 3000 is already in use":
```bash
# Option 1: Kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Option 2: Use a different port
npm run dev -- -p 3001
```

### Module Not Found Error
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Database Connection Error
- Check `.env.local` file exists
- Verify `DATABASE_URL` is set correctly
- Make sure database is accessible

### Build Errors
```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

## 📁 Project Structure Explained

```
flhs-help/
├── app/              # Pages and routes (Next.js App Router)
│   ├── page.tsx     # Homepage (/)
│   ├── login/       # Login page (/login)
│   └── api/         # API endpoints
├── components/      # React components
│   ├── forms/       # Form components
│   └── ui/          # UI components
├── lib/             # Utilities and helpers
│   ├── auth.ts      # Authentication config
│   └── db/          # Database setup
├── scripts/         # Utility scripts
├── public/          # Static files (images, etc.)
└── docs/            # Documentation
```

## 🎯 Key Files to Know

### Configuration Files
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `.env.local` - Environment variables (create this!)

### Important Code Files
- `app/page.tsx` - Homepage
- `app/layout.tsx` - Root layout
- `lib/auth.ts` - Authentication setup
- `lib/db/schema.ts` - Database schema

## 💡 Pro Tips

1. **Use VS Code**: Best editor for Next.js development
   - Install extensions: ESLint, Prettier, Tailwind CSS IntelliSense

2. **Terminal Shortcuts**:
   - `Ctrl + C` - Stop running server
   - `Cmd + K` (Mac) or `Ctrl + L` (Windows) - Clear terminal

3. **Browser DevTools**:
   - `F12` - Open DevTools
   - `Cmd+Shift+C` (Mac) - Inspect element
   - `Cmd+R` - Hard refresh (clear cache)

4. **Git Basics** (if using version control):
   ```bash
   git status          # See what changed
   git add .           # Stage changes
   git commit -m "msg" # Save changes
   git push            # Upload to GitHub
   ```

5. **Environment Variables**:
   - Never commit `.env.local` to git
   - Copy `.env.example` if provided
   - Restart dev server after changing env vars

## 🎓 Learning Resources

- **Next.js Docs**: https://nextjs.org/docs
- **React Docs**: https://react.dev
- **TypeScript**: https://www.typescriptlang.org/docs
- **Tailwind CSS**: https://tailwindcss.com/docs

## 🆘 Getting Help

1. Check terminal for error messages
2. Check browser console (F12)
3. Read error messages carefully
4. Search error message on Google/Stack Overflow
5. Check documentation files in `docs/` folder

## ✅ Checklist: First Time Setup

- [ ] Node.js installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] `.env.local` file created with `DATABASE_URL`
- [ ] Dependencies installed (`npm install`)
- [ ] Database setup (`npx tsx scripts/setup-database.ts`)
- [ ] Dev server running (`npm run dev`)
- [ ] App opens in browser at `http://localhost:3000`

---

**Happy Coding! 🚀**
