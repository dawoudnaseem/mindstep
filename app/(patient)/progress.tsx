import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/features/auth/AuthContext';
import { getAssignmentsByPatient } from '@/src/services/repositories/assignmentRepository';
import { getAttemptsByPatient } from '@/src/services/repositories/attemptRepository';
import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';
import { spacing, radius } from '@/src/theme/spacing';
import { ExerciseAttempt, PatientAssignment } from '@/src/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function assignmentCompletionPct(a: PatientAssignment): number {
  const target = a.targetRepetitionsPerDay * a.numberOfDays;
  if (!target) return 0;
  return Math.min(100, Math.round((a.attemptCount / target) * 100));
}

function formatDate(ts: any): string {
  if (!ts) return '—';
  try {
    const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
}

function formatDuration(seconds: number): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

const EXERCISE_NAMES: Record<string, string> = {
  'wash-tomato': 'Wash Tomato',
  'cut-tomato': 'Cut Tomato',
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function AssignmentProgressCard({ assignment }: { assignment: PatientAssignment }) {
  const target = assignment.targetRepetitionsPerDay * assignment.numberOfDays;
  const pct = assignmentCompletionPct(assignment);
  const barColor =
    pct >= 100 ? colors.success : pct > 0 ? colors.primary : colors.border;

  return (
    <View style={styles.assignmentCard}>
      <View style={styles.assignmentCardHeader}>
        <View style={styles.assignmentIconWrap}>
          <Ionicons name="fitness" size={16} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typography.body, { fontWeight: '600' }]}>
            {EXERCISE_NAMES[assignment.exerciseId] ?? assignment.exerciseName}
          </Text>
          <Text style={typography.bodySmall}>
            {assignment.attemptCount} / {target} session{target !== 1 ? 's' : ''} completed
          </Text>
        </View>
        <Text style={[styles.pctLabel, { color: barColor }]}>{pct}%</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const { appUser } = useAuth();
  const [assignments, setAssignments] = useState<PatientAssignment[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<ExerciseAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!appUser?.id) return;
    setLoading(true);
    try {
      const [a, attempts] = await Promise.all([
        getAssignmentsByPatient(appUser.id),
        getAttemptsByPatient(appUser.id),
      ]);
      setAssignments(a);
      setRecentAttempts(attempts.slice(0, 5));
    } finally {
      setLoading(false);
    }
  }, [appUser?.id]);

  // Re-fetch every time the tab comes into focus
  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  // ── Derived metrics ──────────────────────────────────────────────────────────

  const totalSessions = assignments.reduce((s, a) => s + a.attemptCount, 0);

  // Overall % = average of per-assignment completion percentages
  const overallPct =
    assignments.length === 0
      ? 0
      : Math.round(
          assignments.reduce((s, a) => s + assignmentCompletionPct(a), 0) /
            assignments.length,
        );

  // This week = exercise_attempts with completedAt in last 7 days
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const thisWeekCount = recentAttempts.filter((a) => {
    const ts = a.completedAt;
    if (!ts) return false;
    try {
      const d =
        typeof (ts as any).toDate === 'function'
          ? (ts as any).toDate()
          : new Date(ts as any);
      return d >= oneWeekAgo;
    } catch {
      return false;
    }
  }).length;

  const encouragement =
    totalSessions === 0
      ? 'One small step at a time.'
      : thisWeekCount > 0
        ? `You've completed ${thisWeekCount} session${thisWeekCount !== 1 ? 's' : ''} this week. Keep going!`
        : `You've completed ${totalSessions} session${totalSessions !== 1 ? 's' : ''} total. Keep it up!`;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={typography.h1}>Your Progress</Text>
        <Text style={[typography.body, styles.subtitle]}>{encouragement}</Text>
      </View>

      {/* ── Top 3 stat cards ── */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalSessions}</Text>
          <Text style={styles.statLabel}>Sessions</Text>
        </View>
        <View style={styles.statCard}>
          <Text
            style={[
              styles.statValue,
              {
                color:
                  overallPct >= 80
                    ? colors.success
                    : overallPct > 0
                      ? colors.warning
                      : colors.textSecondary,
              },
            ]}
          >
            {overallPct}%
          </Text>
          <Text style={styles.statLabel}>Overall</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {thisWeekCount}
          </Text>
          <Text style={styles.statLabel}>This Week</Text>
        </View>
      </View>

      {/* ── Per-assignment breakdown ── */}
      <Text style={styles.sectionTitle}>ASSIGNED EXERCISES</Text>

      {assignments.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="leaf-outline" size={36} color={colors.border} />
          <Text style={styles.emptyTitle}>No tasks assigned yet</Text>
          <Text style={styles.emptySubtitle}>
            Your therapist hasn't assigned any exercises yet.
          </Text>
        </View>
      ) : (
        assignments.map((a) => (
          <AssignmentProgressCard key={a.id} assignment={a} />
        ))
      )}

      {/* ── Recent activity ── */}
      {recentAttempts.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>
            RECENT ACTIVITY
          </Text>
          {recentAttempts.map((attempt) => (
            <View key={attempt.id} style={styles.attemptCard}>
              <View style={styles.attemptLeft}>
                <View
                  style={[
                    styles.attemptDot,
                    {
                      backgroundColor: attempt.successful
                        ? colors.success
                        : colors.warning,
                    },
                  ]}
                />
                <View>
                  <Text style={[typography.body, { fontWeight: '600' }]}>
                    {EXERCISE_NAMES[attempt.exerciseId] ?? attempt.exerciseId}
                  </Text>
                  <Text style={typography.bodySmall}>
                    {formatDate(attempt.completedAt)}
                  </Text>
                </View>
              </View>
              <View style={styles.attemptRight}>
                {attempt.metrics?.overallScore != null && (
                  <Text style={styles.scoreText}>
                    {attempt.metrics.overallScore}%
                  </Text>
                )}
                <Text style={styles.durationText}>
                  {formatDuration(attempt.duration)}
                </Text>
              </View>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.lg,
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  assignmentCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  assignmentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  assignmentIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pctLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  attemptCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  attemptLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  attemptDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
  },
  attemptRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  scoreText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  durationText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
