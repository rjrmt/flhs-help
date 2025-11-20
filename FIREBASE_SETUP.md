# Firebase Setup Instructions

## Current Status: Demo Mode ✅

Your app is currently running in **demo mode** with mock data, so the Firebase API key error has been resolved. The app will work perfectly for testing and development.

## To Set Up Real Firebase (Optional)

When you're ready to use a real Firebase backend, follow these steps:

### 1. Create a Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Follow the setup wizard

### 2. Enable Authentication
1. In Firebase Console, go to "Authentication" → "Sign-in method"
2. Enable "Anonymous" authentication (or "Custom token" if you prefer)

### 3. Enable Firestore Database
1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" for development

### 4. Get Your Configuration
1. In Firebase Console, go to Project Settings (gear icon)
2. Scroll down to "Your apps" section
3. Click "Add app" → Web app (</> icon)
4. Copy the configuration object

### 5. Create Environment File
Create a `.env.local` file in your project root with:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-actual-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_APP_ID=educational-management-hub
NEXT_PUBLIC_INITIAL_AUTH_TOKEN=your-custom-token-or-leave-empty
```

### 6. Set Up Firestore Collections
Create these collections in Firestore:

**Students Collection:**
- Path: `/artifacts/educational-management-hub/public/data/students/`
- Document ID: Student ID (e.g., "1234567890")
- Fields: firstName, lastName, grade, homeroom, lastTardy, ttsCount, ttcCount, ruleTriggered

**Tardy Logs Collection:**
- Path: `/artifacts/educational-management-hub/users/{userId}/tardyLogs/`
- Auto-generated document IDs
- Fields: studentId, studentName, timestamp, status, grade, homeroom, ttsNumber

### 7. Set Up Security Rules (Optional)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read access to public student data
    match /artifacts/{appId}/public/data/students/{studentId} {
      allow read: if true;
    }
    
    // Allow users to manage their own tardy logs
    match /artifacts/{appId}/users/{userId}/tardyLogs/{logId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Demo Mode Features ✅

The app currently works perfectly in demo mode with:
- ✅ Mock student data (John Smith, Sarah Johnson)
- ✅ Local state management for logs
- ✅ All UI features working
- ✅ Barcode scanning functionality
- ✅ No Firebase errors

## Testing the App

You can test the app right now with these student IDs:
- **1234567890** - John Smith (Grade 12, has rule triggered)
- **0987654321** - Sarah Johnson (Grade 11, no rule triggered)

The app will work exactly as designed - you can scan, log tardies, excuse students, and review logs. Everything is stored locally in the browser for testing purposes.
