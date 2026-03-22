import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/src/services/firebase/config';
import { ExerciseAttempt } from '@/src/types';

export type CreateAttemptInput = Omit<ExerciseAttempt, 'id' | 'createdAt'>;

export async function createAttempt(data: CreateAttemptInput): Promise<string> {
  const ref = await addDoc(collection(db, 'exercise_attempts'), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getAttemptsByPatient(
  patientId: string,
  exerciseId?: string,
): Promise<ExerciseAttempt[]> {
  const constraints = [
    where('patientId', '==', patientId),
    ...(exerciseId ? [where('exerciseId', '==', exerciseId)] : []),
    limit(50),
  ];
  const q = query(collection(db, 'exercise_attempts'), ...constraints);
  const snap = await getDocs(q);
  const attempts = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ExerciseAttempt));

  // Sort by completedAt descending client-side (avoids requiring a composite index)
  return attempts.sort((a, b) => {
    const ta =
      typeof (a.completedAt as any)?.toMillis === 'function'
        ? (a.completedAt as any).toMillis()
        : 0;
    const tb =
      typeof (b.completedAt as any)?.toMillis === 'function'
        ? (b.completedAt as any).toMillis()
        : 0;
    return tb - ta;
  });
}
