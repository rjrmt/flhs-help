import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInWithCustomToken, signInAnonymously } from 'firebase/auth';

// Firebase configuration - these would be provided by your environment
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "demo-project.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-project-id",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "demo-project.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "demo-app-id"
};

// Check if we're in demo mode (no real Firebase config)
const isDemoMode = !process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY === "demo-api-key";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Global variables for app configuration
export const APP_ID = process.env.NEXT_PUBLIC_APP_ID || "default-app-id";
export const INITIAL_AUTH_TOKEN = process.env.NEXT_PUBLIC_INITIAL_AUTH_TOKEN || null;

// Authentication helper
export const initializeAuth = async (): Promise<string> => {
  // If in demo mode, return a mock user ID
  if (isDemoMode) {
    console.log('Running in demo mode - using mock authentication');
    return 'demo-user-123';
  }

  try {
    let user;
    
    if (INITIAL_AUTH_TOKEN) {
      // Try custom token first
      const credential = await signInWithCustomToken(auth, INITIAL_AUTH_TOKEN);
      user = credential.user;
    } else {
      // Fallback to anonymous auth
      const credential = await signInAnonymously(auth);
      user = credential.user;
    }
    
    return user.uid;
  } catch (error) {
    console.error('Authentication error:', error);
    // Fallback to anonymous if custom token fails
    const credential = await signInAnonymously(auth);
    return credential.user.uid;
  }
};

// Firestore collection paths
export const getStudentsCollection = () => `artifacts/${APP_ID}/public/data/students`;
export const getTardyLogsCollection = (userId: string) => `artifacts/${APP_ID}/users/${userId}/tardyLogs`;
export const getAdminLogsCollection = () => `artifacts/${APP_ID}/public/logs/admin`;
export const getImportLogsCollection = () => `artifacts/${APP_ID}/public/logs/imports`;

export default app;
