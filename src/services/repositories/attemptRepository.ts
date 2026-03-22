import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
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
    orderBy('completedAt', 'desc'),
    limit(50),
  ];
  const q = query(collection(db, 'exercise_attempts'), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ExerciseAttempt));
}
