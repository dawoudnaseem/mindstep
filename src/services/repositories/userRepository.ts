import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/src/services/firebase/config';
import { AppUser } from '@/src/types';

export async function getUserById(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as AppUser;
}

export async function getPatientsByTherapist(therapistId: string): Promise<AppUser[]> {
  const q = query(
    collection(db, 'users'),
    where('role', '==', 'patient'),
    where('therapistId', '==', therapistId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AppUser));
}
