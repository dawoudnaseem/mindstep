import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
// getReactNativePersistence is available at runtime via Metro's react-native
// field resolution but is not typed in firebase/auth's type definitions.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getReactNativePersistence } = require('firebase/auth') as {
  getReactNativePersistence: (storage: typeof AsyncStorage) => import('firebase/auth').Persistence;
};
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
  apiKey: "AIzaSyDoY3yf3Uzn6AWH90eeQLZ7YReIOoUFS8Y",
  authDomain: "mindstep-f5149.firebaseapp.com",
  projectId: "mindstep-f5149",
  storageBucket: "mindstep-f5149.firebasestorage.app",
  messagingSenderId: "73810294428",
  appId: "1:73810294428:web:1917ba089fc2bca69b5f59",
  measurementId: "G-1RVZM5FPBF"
};

// Prevent re-initializing if app already exists (hot reload safety)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Use initializeAuth with AsyncStorage persistence on first load;
// fall back to getAuth on subsequent hot reloads when auth is already set up.
function createAuth() {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
}

export const auth = createAuth();
export const db = getFirestore(app);
export default app;
