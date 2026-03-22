import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from '@/src/services/firebase/config';
import { PatientAssignment } from '@/src/types';

export type CreateAssignmentInput = Omit<
  PatientAssignment,
  'id' | 'createdAt' | 'updatedAt' | 'attemptCount' | 'status'
>;

export async function createAssignment(data: CreateAssignmentInput): Promise<string> {
  const ref = await addDoc(collection(db, 'patient_assignments'), {
    ...data,
    status: 'assigned',
    attemptCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getAssignmentsByPatient(patientId: string): Promise<PatientAssignment[]> {
  const q = query(
    collection(db, 'patient_assignments'),
    where('patientId', '==', patientId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PatientAssignment));
}

export async function getAssignmentsByTherapistAndPatient(
  therapistId: string,
  patientId: string,
): Promise<PatientAssignment[]> {
  const q = query(
    collection(db, 'patient_assignments'),
    where('therapistId', '==', therapistId),
    where('patientId', '==', patientId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PatientAssignment));
}

export async function incrementAttemptCount(assignmentId: string): Promise<void> {
  await updateDoc(doc(db, 'patient_assignments', assignmentId), {
    status: 'in-progress',
    lastAttemptedAt: serverTimestamp(),
    attemptCount: increment(1),
    updatedAt: serverTimestamp(),
  });
}
