import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/src/services/firebase/config';
import { AppUser, UserRole } from '@/src/types';

// ─── Context Shape ────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: FirebaseUser | null;
  appUser: AppUser | null;
  role: UserRole | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserRole | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Keep loading=true until fetchAppUser resolves so index.tsx never
        // sees user=set / role=null / loading=false (which would redirect to login).
        setLoading(true);
        setUser(firebaseUser);
        await fetchAppUser(firebaseUser.uid);
      } else {
        setUser(null);
        setAppUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  async function fetchAppUser(uid: string): Promise<UserRole | null> {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const data = userDoc.data() as AppUser;
      setAppUser(data);
      setRole(data.role);
      return data.role;
    }
    setAppUser(null);
    setRole(null);
    return null;
  }

  async function login(email: string, password: string): Promise<UserRole | null> {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    // Fetch the profile immediately so the caller gets the role back
    // and can navigate directly — avoids racing against onAuthStateChanged.
    return fetchAppUser(credential.user.uid);
  }

  async function logout() {
    await signOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, appUser, role, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
