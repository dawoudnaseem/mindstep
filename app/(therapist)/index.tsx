import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/features/auth/AuthContext';
import { getPatientsByTherapist } from '@/src/services/repositories/userRepository';
import { getAssignmentsByTherapist } from '@/src/services/repositories/assignmentRepository';
import { colors } from '@/src/theme/colors';
import { spacing, radius } from '@/src/theme/spacing';
import { AppUser, PatientAssignment } from '@/src/types';

// ─── Status badge ─────────────────────────────────────────────────────────────

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
    <View style={[styles.badge, { backgroundColor: cfg.color + '22' }]}>
      <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
  icon,
  sub,
}: {
  label: string;
  value: number;
  color: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  sub: string;
}) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <View style={[styles.statIconWrap, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statSub}>{sub}</Text>
    </View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function TherapistDashboard() {
  const { appUser } = useAuth();
  const router = useRouter();
  const [patients, setPatients] = useState<AppUser[]>([]);
  const [assignments, setAssignments] = useState<PatientAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Format as "Dr. Chen" (honorific + last name) if applicable, else first name
  const nameParts = appUser?.fullName?.split(' ') ?? [];
  const honorific = nameParts.find((w) => w.endsWith('.'));
  const lastName = nameParts[nameParts.length - 1];
  const displayName =
    honorific && nameParts.length > 1
      ? `${honorific} ${lastName}`
      : nameParts[0] ?? 'Doctor';

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  const fetchData = useCallback(async () => {
    if (!appUser?.id) return;
    setLoading(true);
    try {
      const [p, a] = await Promise.all([
        getPatientsByTherapist(appUser.id),
        getAssignmentsByTherapist(appUser.id),
      ]);
      setPatients(p);
      setAssignments(a);
    } finally {
      setLoading(false);
    }
  }, [appUser?.id]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const pending = assignments.filter((a) => a.status === 'assigned').length;
  const inProgress = assignments.filter((a) => a.status === 'in-progress').length;

  const recentAssignments = [...assignments]
    .sort((a, b) => {
      const aTime = a.updatedAt?.toDate?.()?.getTime() ?? 0;
      const bTime = b.updatedAt?.toDate?.()?.getTime() ?? 0;
      return bTime - aTime;
    })
    .slice(0, 4);

  const patientMap = Object.fromEntries(patients.map((p) => [p.id, p.fullName]));

  return (
    <View style={styles.screen}>

      {/* ── Colored header ── */}
      <View style={styles.header}>
        <Text style={styles.portalLabel}>THERAPIST PORTAL</Text>
        <Text style={styles.greeting}>Hello, {displayName}</Text>
        <Text style={styles.dateText}>{today}</Text>
      </View>

      {/* ── Body ── */}
      <View style={styles.body}>

        {/* ── Stat cards ── */}
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <View style={styles.statsRow}>
            <StatCard
              label="Patients"
              value={patients.length}
              color={colors.primary}
              icon="people"
              sub="in your roster"
            />
            <StatCard
              label="Pending"
              value={pending}
              color={colors.warning}
              icon="time"
              sub="awaiting start"
            />
            <StatCard
              label="Active"
              value={inProgress}
              color={colors.success}
              icon="checkmark-circle"
              sub="in progress"
            />
          </View>
        )}

        {/* ── Recent assignments ── */}
        <View style={styles.recentCard}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>RECENT ASSIGNMENTS</Text>
            <TouchableOpacity onPress={() => router.push('/(therapist)/assignments')}>
              <Text style={styles.recentSeeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.recentEmpty}>
              <ActivityIndicator color={colors.primary} size="small" />
            </View>
          ) : recentAssignments.length === 0 ? (
            <View style={styles.recentEmpty}>
              <Ionicons name="clipboard-outline" size={36} color={colors.border} />
              <Text style={styles.recentEmptyTitle}>No assignments yet</Text>
              <Text style={styles.recentEmptyBody}>
                Assign an exercise to a patient to see it here.
              </Text>
            </View>
          ) : (
            recentAssignments.map((a, i) => (
              <TouchableOpacity
                key={a.id}
                style={[
                  styles.assignmentRow,
                  i < recentAssignments.length - 1 && styles.assignmentRowBorder,
                ]}
                onPress={() => router.push(`/(therapist)/patient/${a.patientId}`)}
                activeOpacity={0.7}
              >
                <View style={styles.assignmentLeft}>
                  <View style={styles.exerciseDot} />
                  <View>
                    <Text style={styles.assignmentExercise}>{a.exerciseName}</Text>
                    <Text style={styles.assignmentMeta}>
                      {patientMap[a.patientId] ?? 'Patient'} · {a.attemptCount} attempt{a.attemptCount !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
                <StatusBadge status={a.status} />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* ── CTA button ── */}
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => router.push('/(therapist)/patients')}
          activeOpacity={0.85}
        >
          <View>
            <Text style={styles.ctaTitle}>View My Patients</Text>
            <Text style={styles.ctaSub}>Manage assignments and track progress</Text>
          </View>
          <View style={styles.ctaArrow}>
            <Ionicons name="arrow-forward" size={20} color={colors.primary} />
          </View>
        </TouchableOpacity>

      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  // ── Header (slate blue zone) ──────────────────────────────────────────────
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.md,
    paddingBottom: spacing.xl,
  },
  portalLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  greeting: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.surface,
    marginBottom: 6,
  },
  dateText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '400',
  },
  // ── Body (off-white zone, rounded top) ───────────────────────────────────
  body: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing.lg,
    gap: spacing.md,
  },
  loadingRow: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ── Stat cards ────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flex: 0.85,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderTopWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 36,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statSub: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // ── Recent assignments ────────────────────────────────────────────────────
  recentCard: {
    flex: 1.4,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  recentTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  recentSeeAll: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  recentEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  recentEmptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  recentEmptyBody: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  assignmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
  },
  assignmentRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  assignmentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    marginRight: spacing.sm,
  },
  exerciseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondary,
  },
  assignmentExercise: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  assignmentMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // ── CTA button ────────────────────────────────────────────────────────────
  ctaButton: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  ctaTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  ctaSub: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  ctaArrow: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
