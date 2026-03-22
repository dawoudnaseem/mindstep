import { Timestamp } from 'firebase/firestore';

// ─── User ────────────────────────────────────────────────────────────────────

export type UserRole = 'therapist' | 'patient' | 'admin';

export interface UserProfile {
  ageRange?: string;
  primaryChallenges?: string[];
  notes?: string;
}

export interface AppUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  therapistId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  onboardingCompleted?: boolean;
  profile?: UserProfile;
}

// ─── Exercise ─────────────────────────────────────────────────────────────────

export interface Exercise {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  difficulty: number;
  duration: number;
  isActive: boolean;
  createdBy: string;
  createdAt: Timestamp;
}

export interface ExerciseStep {
  id: string;
  exerciseId: string;
  stepNumber: number;
  description: string;
  action: string;
  targetObject: string;
  validation: Record<string, unknown>;
  estimatedTime: number;
}

// ─── Assignment ───────────────────────────────────────────────────────────────

export type AssignmentStatus = 'assigned' | 'in-progress' | 'completed' | 'missed';

export interface PatientAssignment {
  id: string;
  therapistId: string;
  patientId: string;
  exerciseId: string;
  exerciseName: string;
  status: AssignmentStatus;
  targetRepetitionsPerDay: number;
  numberOfDays: number;
  assignedDate: Timestamp;
  dueDate?: Timestamp;
  instructions?: string;
  attemptCount: number;
  lastAttemptedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Attempt ──────────────────────────────────────────────────────────────────

export interface AttemptMetrics {
  overallScore?: number;
  stepCompletionRate?: number;
  hesitationCount?: number;
  guidancePromptsUsed?: number;
}

export interface ExerciseAttempt {
  id: string;
  patientId: string;
  therapistId?: string;
  assignmentId: string;
  exerciseId: string;
  startedAt: Timestamp;
  completedAt: Timestamp;
  duration: number;
  completed: boolean;
  successful: boolean;
  errorCount: number;
  errors?: string[];
  metrics?: AttemptMetrics;
  createdAt: Timestamp;
}

// ─── AR Handoff Context ───────────────────────────────────────────────────────

export interface ARLaunchContext {
  assignmentId: string;
  exerciseId: string;
  exerciseName: string;
  patientId: string;
  launchTimestamp: number;
}
