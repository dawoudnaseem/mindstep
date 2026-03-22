import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/features/auth/AuthContext';
import { getAssignmentsByPatient } from '@/src/services/repositories/assignmentRepository';
import { colors } from '@/src/theme/colors';
import { spacing, radius } from '@/src/theme/spacing';
import { PatientAssignment } from '@/src/types';

const PATIENT_HEADER = '#2E6B5A'; // deep sage — differentiates patient from therapist

function StatCard({
  label, value, color, icon,
}: {
  label: string; value: number; color: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function PatientDashboard() {
  const { appUser } = useAuth();
  const router = useRouter();
  const [assignments, setAssignments] = useState<PatientAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const firstName = appUser?.fullName?.split(' ')[0] ?? 'there';

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  const fetchData = useCallback(async () => {
    if (!appUser?.id) return;
    setLoading(true);
    try {
      const a = await getAssignmentsByPatient(appUser.id);
      setAssignments(a);
    } finally {
      setLoading(false);
    }
  }, [appUser?.id]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const active = assignments.filter((a) => a.status === 'assigned' || a.status === 'in-progress');
  const completed = assignments.filter((a) => a.status === 'completed').length;
  const totalAttempts = assignments.reduce((sum, a) => sum + (a.attemptCount ?? 0), 0);

  // The primary task to surface on the dashboard
  const focusTask = active[0] ?? null;

  return (
    <View style={styles.screen}>
      {/* ── Sage header ── */}
      <View style={[styles.header, { backgroundColor: PATIENT_HEADER }]}>
        <Text style={styles.portalLabel}>YOUR EXERCISES</Text>
        <Text style={styles.greeting}>Hello, {firstName}</Text>
        <Text style={styles.dateText}>{today}</Text>
      </View>

      {/* ── Body ── */}
      <View style={styles.body}>
        {loading ? (
          <ActivityIndicator color={PATIENT_HEADER} style={{ marginTop: spacing.xl }} />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.bodyScroll}>

            {/* ── Today's focus task ── */}
            <Text style={styles.sectionLabel}>TODAY'S FOCUS</Text>
            {focusTask ? (
              <TouchableOpacity
                style={styles.focusCard}
                onPress={() => router.push(`/(patient)/task/${focusTask.id}`)}
                activeOpacity={0.85}
              >
                <View style={styles.focusTop}>
                  <View style={styles.focusIconWrap}>
                    <Ionicons name="fitness" size={22} color={PATIENT_HEADER} />
                  </View>
                  <View style={styles.focusTitles}>
                    <Text style={styles.focusTitle}>{focusTask.exerciseName}</Text>
                    <Text style={styles.focusSub}>
                      {focusTask.targetRepetitionsPerDay}×/day · {focusTask.numberOfDays} days
                    </Text>
                  </View>
                  <View style={[
                    styles.focusStatusBadge,
                    { backgroundColor: focusTask.status === 'in-progress' ? colors.warning + '20' : colors.primary + '18' },
                  ]}>
                    <Text style={[
                      styles.focusStatusText,
                      { color: focusTask.status === 'in-progress' ? colors.warning : colors.primary },
                    ]}>
                      {focusTask.status === 'in-progress' ? 'In Progress' : 'Assigned'}
                    </Text>
                  </View>
                </View>

                {focusTask.instructions ? (
                  <Text style={styles.focusInstructions} numberOfLines={2}>
                    "{focusTask.instructions}"
                  </Text>
                ) : null}

                <View style={[styles.launchBtn, { backgroundColor: PATIENT_HEADER }]}>
                  <Ionicons name="play-circle" size={20} color={colors.surface} />
                  <Text style={styles.launchBtnText}>Launch AR Exercise</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.emptyFocus}>
                <Ionicons name="checkmark-circle" size={40} color={colors.success} />
                <Text style={styles.emptyFocusTitle}>All caught up!</Text>
                <Text style={styles.emptyFocusSub}>
                  Your therapist hasn't assigned any new tasks yet.
                </Text>
              </View>
            )}

            {/* ── Stats ── */}
            <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>YOUR PROGRESS</Text>
            <View style={styles.statsRow}>
              <StatCard
                label="Assigned" value={assignments.length}
                color={colors.primary} icon="clipboard" />
              <StatCard
                label="Sessions" value={totalAttempts}
                color={PATIENT_HEADER} icon="checkmark-circle" />
              <StatCard
                label="Completed" value={completed}
                color={colors.success} icon="ribbon" />
            </View>

            {/* ── CTA ── */}
            <TouchableOpacity
              style={styles.ctaBtn}
              onPress={() => router.push('/(patient)/tasks')}
              activeOpacity={0.85}
            >
              <View>
                <Text style={styles.ctaTitle}>View All Tasks</Text>
                <Text style={styles.ctaSub}>See all assigned exercises</Text>
              </View>
              <View style={[styles.ctaArrow, { backgroundColor: PATIENT_HEADER + '18' }]}>
                <Ionicons name="arrow-forward" size={20} color={PATIENT_HEADER} />
              </View>
            </TouchableOpacity>

          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PATIENT_HEADER },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.md,
    paddingBottom: spacing.xl,
  },
  portalLabel: {
    fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: spacing.xs,
  },
  greeting: { fontSize: 30, fontWeight: '800', color: colors.surface, marginBottom: 6 },
  dateText: { fontSize: 14, color: 'rgba(255,255,255,0.65)' },
  body: {
    flex: 1, backgroundColor: colors.background,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
  },
  bodyScroll: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: colors.textSecondary,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.sm,
  },
  // ── Focus card ─────────────────────────────────────────────────────────────
  focusCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, marginBottom: spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  focusTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  focusIconWrap: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: PATIENT_HEADER + '15',
    justifyContent: 'center', alignItems: 'center',
  },
  focusTitles: { flex: 1 },
  focusTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  focusSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  focusStatusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full },
  focusStatusText: { fontSize: 11, fontWeight: '700' },
  focusInstructions: {
    fontSize: 13, color: colors.textSecondary, fontStyle: 'italic',
    lineHeight: 18, marginBottom: spacing.sm,
    paddingLeft: spacing.sm, borderLeftWidth: 2, borderLeftColor: colors.secondary,
  },
  launchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, borderRadius: radius.md, height: 48,
    marginTop: spacing.xs,
  },
  launchBtnText: { color: colors.surface, fontSize: 15, fontWeight: '700' },
  emptyFocus: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.xl, alignItems: 'center', gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  emptyFocusTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  emptyFocusSub: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 },
  // ── Stats ──────────────────────────────────────────────────────────────────
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  statCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, borderTopWidth: 3, alignItems: 'center', gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  statIcon: { width: 36, height: 36, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: 26, fontWeight: '800' },
  statLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  // ── CTA ────────────────────────────────────────────────────────────────────
  ctaBtn: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: colors.border,
  },
  ctaTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  ctaSub: { fontSize: 12, color: colors.textSecondary },
  ctaArrow: { width: 40, height: 40, borderRadius: radius.full, justifyContent: 'center', alignItems: 'center' },
});
