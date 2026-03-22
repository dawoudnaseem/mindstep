import {
  collection,
  doc,
  addDoc,
  getDoc,
  updateDoc,
  deleteDoc,
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

export async function getAssignmentById(assignmentId: string): Promise<PatientAssignment | null> {
  const snap = await getDoc(doc(db, 'patient_assignments', assignmentId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as PatientAssignment;
}

export async function updateAssignment(
  assignmentId: string,
  data: Partial<Omit<PatientAssignment, 'id' | 'createdAt'>>,
): Promise<void> {
  await updateDoc(doc(db, 'patient_assignments', assignmentId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteAssignment(assignmentId: string): Promise<void> {
  await deleteDoc(doc(db, 'patient_assignments', assignmentId));
}

export async function getAssignmentsByTherapist(therapistId: string): Promise<PatientAssignment[]> {
  const q = query(
    collection(db, 'patient_assignments'),
    where('therapistId', '==', therapistId),
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
