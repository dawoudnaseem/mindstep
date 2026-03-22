import { ExerciseAttempt } from '@/src/types';
import { getAttemptsByPatient } from './attemptRepository';

export interface PatientStats {
  totalAttempts: number;
  completedAttempts: number;
  successRate: number;
  averageDuration: number;
  improvement: number;
  lastAttemptedAt: Date | null;
}

export async function getPatientStats(
  patientId: string,
  exerciseId?: string,
): Promise<PatientStats> {
  const attempts = await getAttemptsByPatient(patientId, exerciseId);
  return computeStats(attempts);
}

export function computeStats(attempts: ExerciseAttempt[]): PatientStats {
  if (attempts.length === 0) {
    return {
      totalAttempts: 0,
      completedAttempts: 0,
      successRate: 0,
      averageDuration: 0,
      improvement: 0,
      lastAttemptedAt: null,
    };
  }

  const completed = attempts.filter((a) => a.successful);
  const avgDuration =
    attempts.reduce((sum, a) => sum + (a.duration ?? 0), 0) / attempts.length;

  // Improvement: most recent score minus oldest score (higher = better)
  const firstScore = attempts[attempts.length - 1]?.metrics?.overallScore ?? 0;
  const lastScore = attempts[0]?.metrics?.overallScore ?? 0;
  const improvement = Math.round(lastScore - firstScore);

  const lastTs = attempts[0]?.completedAt;
  const lastAttemptedAt = lastTs
    ? typeof (lastTs as any).toDate === 'function'
      ? (lastTs as any).toDate()
      : null
    : null;

  return {
    totalAttempts: attempts.length,
    completedAttempts: completed.length,
    successRate: Math.round((completed.length / attempts.length) * 100),
    averageDuration: Math.round(avgDuration),
    improvement,
    lastAttemptedAt,
  };
}
