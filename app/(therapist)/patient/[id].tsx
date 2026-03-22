import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getUserById } from '@/src/services/repositories/userRepository';
import {
  getAssignmentsByTherapistAndPatient,
  deleteAssignment,
} from '@/src/services/repositories/assignmentRepository';
import { getAttemptsByPatient } from '@/src/services/repositories/attemptRepository';
import { computeStats, PatientStats } from '@/src/services/repositories/statsRepository';
import { useAuth } from '@/src/features/auth/AuthContext';
import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';
import { spacing, radius } from '@/src/theme/spacing';
import { AppUser, ExerciseAttempt, PatientAssignment } from '@/src/types';
import { Timestamp } from 'firebase/firestore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatDate(ts: Timestamp | undefined | null): string {
  if (!ts) return '—';
  try {
    return ts.toDate().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

const STATUS_CONFIG = {
  assigned: { label: 'Assigned', color: colors.primary },
  'in-progress': { label: 'In Progress', color: colors.warning },
  completed: { label: 'Completed', color: colors.success },
  missed: { label: 'Missed', color: colors.error },
} as const;

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? {
    label: status,
    color: colors.textSecondary,
  };
  return (
    <View style={[styles.badge, { backgroundColor: cfg.color + '18' }]}>
      <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function formatDuration(seconds: number): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function AssignmentCard({
  assignment,
  stats,
  onEdit,
  onUnassign,
}: {
  assignment: PatientAssignment;
  stats?: PatientStats;
  onEdit: () => void;
  onUnassign: () => void;
}) {
  return (
    <View style={styles.assignmentCard}>
      <View style={styles.assignmentHeader}>
        <View style={styles.exerciseIconWrap}>
          <Ionicons name="fitness" size={18} color={colors.primary} />
        </View>
        <View style={styles.assignmentMeta}>
          <Text style={[typography.body, { fontWeight: '600' }]}>{assignment.exerciseName}</Text>
          <Text style={typography.bodySmall}>
            {assignment.targetRepetitionsPerDay}×/day · {assignment.numberOfDays} days
          </Text>
        </View>
        <StatusBadge status={assignment.status} />
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={() =>
            Alert.alert(assignment.exerciseName, 'What would you like to do?', [
              { text: 'Edit Assignment', onPress: onEdit },
              {
                text: 'Remove Assignment',
                style: 'destructive',
                onPress: () =>
                  Alert.alert(
                    'Remove Assignment',
                    'This will permanently delete this assignment. Continue?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Remove', style: 'destructive', onPress: onUnassign },
                    ],
                  ),
              },
              { text: 'Cancel', style: 'cancel' },
            ])
          }
        >
          <Ionicons name="ellipsis-horizontal" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.assignmentDetails}>
        <View style={styles.detailChip}>
          <Ionicons name="repeat" size={12} color={colors.textSecondary} />
          <Text style={styles.detailText}>
            {assignment.attemptCount} attempt{assignment.attemptCount !== 1 ? 's' : ''}
          </Text>
        </View>
        {assignment.lastAttemptedAt && (
          <View style={styles.detailChip}>
            <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
            <Text style={styles.detailText}>Last: {formatDate(assignment.lastAttemptedAt)}</Text>
          </View>
        )}
        {assignment.dueDate && (
          <View style={styles.detailChip}>
            <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
            <Text style={styles.detailText}>Due: {formatDate(assignment.dueDate)}</Text>
          </View>
        )}
      </View>

      {stats && stats.totalAttempts > 0 && (
        <View style={styles.statsBar}>
          <View style={styles.statsBarItem}>
            <Text style={styles.statsBarValue}>{stats.successRate}%</Text>
            <Text style={styles.statsBarLabel}>Success</Text>
          </View>
          <View style={styles.statsBarDivider} />
          <View style={styles.statsBarItem}>
            <Text style={styles.statsBarValue}>{formatDuration(stats.averageDuration)}</Text>
            <Text style={styles.statsBarLabel}>Avg. Duration</Text>
          </View>
          {stats.totalAttempts > 1 && (
            <>
              <View style={styles.statsBarDivider} />
              <View style={styles.statsBarItem}>
                <Text
                  style={[
                    styles.statsBarValue,
                    { color: stats.improvement >= 0 ? colors.success : colors.warning },
                  ]}
                >
                  {stats.improvement >= 0 ? '+' : ''}{stats.improvement}
                </Text>
                <Text style={styles.statsBarLabel}>Trend</Text>
              </View>
            </>
          )}
        </View>
      )}

      {assignment.instructions ? (
        <View style={styles.instructionsBox}>
          <Text style={styles.instructionsLabel}>Instructions</Text>
          <Text style={[typography.bodySmall, { color: colors.textPrimary }]}>
            {assignment.instructions}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function PatientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { appUser } = useAuth();
  const router = useRouter();
  const [patient, setPatient] = useState<AppUser | null>(null);
  const [assignments, setAssignments] = useState<PatientAssignment[]>([]);
  const [statsMap, setStatsMap] = useState<Record<string, PatientStats>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!id || !appUser?.id) return;
    setLoading(true);
    try {
      const [p, a, allAttempts] = await Promise.all([
        getUserById(id),
        getAssignmentsByTherapistAndPatient(appUser.id, id),
        getAttemptsByPatient(id),
      ]);
      setPatient(p);
      setAssignments(a);

      // Compute stats per exerciseId for the stats cards
      const byExercise = new Map<string, ExerciseAttempt[]>();
      allAttempts.forEach((attempt) => {
        if (!byExercise.has(attempt.exerciseId)) {
          byExercise.set(attempt.exerciseId, []);
        }
        byExercise.get(attempt.exerciseId)!.push(attempt);
      });
      const map: Record<string, PatientStats> = {};
      byExercise.forEach((exAttempts, exerciseId) => {
        map[exerciseId] = computeStats(exAttempts);
      });
      setStatsMap(map);
    } finally {
      setLoading(false);
    }
  }, [id, appUser?.id]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!patient) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.error} />
        <Text style={[typography.body, { marginTop: spacing.sm }]}>Patient not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: spacing.md }}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const completed = assignments.filter((a) => a.status === 'completed').length;
  const pending = assignments.filter((a) => a.status === 'assigned').length;

  return (
    <View style={styles.container}>
      {/* ── Back header ── */}
      <View style={styles.navHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
          <Text style={styles.backLabel}>Patients</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Patient hero ── */}
        <View style={styles.heroSection}>
          <View style={styles.heroAvatar}>
            <Text style={styles.heroAvatarText}>{initials(patient.fullName)}</Text>
          </View>
          <Text style={[typography.h2, { marginTop: spacing.md }]}>{patient.fullName}</Text>
          <View style={styles.patientBadge}>
            <Text style={styles.patientBadgeText}>PATIENT</Text>
          </View>
        </View>

        {/* ── Quick stats ── */}
        <View style={styles.quickStats}>
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatValue}>{assignments.length}</Text>
            <Text style={styles.quickStatLabel}>Total</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStatItem}>
            <Text style={[styles.quickStatValue, { color: colors.warning }]}>{pending}</Text>
            <Text style={styles.quickStatLabel}>Pending</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStatItem}>
            <Text style={[styles.quickStatValue, { color: colors.success }]}>{completed}</Text>
            <Text style={styles.quickStatLabel}>Completed</Text>
          </View>
        </View>

        {/* ── Profile info ── */}
        {(patient.profile?.ageRange ||
          patient.profile?.primaryChallenges?.length ||
          patient.profile?.notes) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>PROFILE</Text>
            {patient.profile?.ageRange && (
              <InfoRow label="Age Range" value={patient.profile.ageRange} />
            )}
            {patient.profile?.primaryChallenges?.length ? (
              <InfoRow
                label="Challenges"
                value={patient.profile.primaryChallenges.join(', ')}
              />
            ) : null}
            {patient.profile?.notes && (
              <View style={[styles.infoRow, { flexDirection: 'column', gap: 4 }]}>
                <Text style={styles.infoLabel}>Notes</Text>
                <Text style={[typography.bodySmall, { color: colors.textPrimary }]}>
                  {patient.profile.notes}
                </Text>
              </View>
            )}
            <InfoRow label="Email" value={patient.email} />
          </View>
        )}

        {/* ── Assignments ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ASSIGNMENTS</Text>
          <Text style={[typography.bodySmall]}>
            {assignments.length} total
          </Text>
        </View>

        {assignments.length === 0 ? (
          <View style={styles.emptyAssignments}>
            <Ionicons name="clipboard-outline" size={36} color={colors.border} />
            <Text style={styles.emptyAssignmentsText}>No assignments yet</Text>
          </View>
        ) : (
          assignments.map((a) => (
            <AssignmentCard
              key={a.id}
              assignment={a}
              stats={statsMap[a.exerciseId]}
              onEdit={() =>
                router.push({
                  pathname: '/(therapist)/assign/[patientId]',
                  params: {
                    patientId: id,
                    patientName: patient?.fullName ?? '',
                    assignmentId: a.id,
                  },
                })
              }
              onUnassign={async () => {
                await deleteAssignment(a.id);
                setAssignments((prev) => prev.filter((x) => x.id !== a.id));
              }}
            />
          ))
        )}

        {/* ── Assign button ── */}
        <TouchableOpacity
          style={styles.assignButton}
          onPress={() =>
            router.push({
              pathname: '/(therapist)/assign/[patientId]',
              params: { patientId: id, patientName: patient.fullName },
            })
          }
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.surface} />
          <Text style={styles.assignButtonText}>Assign New Exercise</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
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
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backLabel: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  heroAvatar: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroAvatarText: {
    color: colors.surface,
    fontSize: 26,
    fontWeight: '700',
  },
  patientBadge: {
    marginTop: spacing.sm,
    backgroundColor: colors.secondary + '30',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  patientBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1,
  },
  quickStats: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  quickStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  quickStatDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    padding: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  assignmentCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  assignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  menuBtn: {
    padding: 4,
    marginLeft: 2,
  },
  exerciseIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assignmentMeta: {
    flex: 1,
  },
  assignmentDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  detailText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  instructionsBox: {
    marginTop: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    padding: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.secondary,
  },
  instructionsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyAssignments: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  emptyAssignmentsText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  statsBarItem: {
    flex: 1,
    alignItems: 'center',
  },
  statsBarValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  statsBarLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  statsBarDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  assignButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  assignButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '700',
  },
});
