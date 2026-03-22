import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// ─────────────────────────────────────────────────────────────────────────────
// Firebase configuration
//
// HOW TO FILL THIS IN:
// 1. Go to Firebase Console → Project Settings → Your apps → Web app config
// 2. Copy the values from the firebaseConfig object shown there
// 3. Replace the placeholder strings below with your actual values
//
// IMPORTANT: For a production app these would be in environment variables.
// For this hackathon demo, inline config is acceptable.
// ─────────────────────────────────────────────────────────────────────────────

const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_AUTH_DOMAIN',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_STORAGE_BUCKET',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

// Prevent re-initializing if app already exists (hot reload safety)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
