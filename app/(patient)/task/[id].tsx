import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getAssignmentsByPatient } from '@/src/services/repositories/assignmentRepository';
import { useAuth } from '@/src/features/auth/AuthContext';
import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';
import { spacing, radius } from '@/src/theme/spacing';
import { PatientAssignment } from '@/src/types';
import { Timestamp } from 'firebase/firestore';

const PATIENT_HEADER = '#2E6B5A';

function formatDate(ts: Timestamp | undefined | null): string {
  if (!ts) return '—';
  try {
    return ts.toDate().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  } catch { return '—'; }
}

function InfoRow({ icon, label, value }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string; value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={16} color={PATIENT_HEADER} />
      </View>
      <View>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { appUser } = useAuth();
  const router = useRouter();
  const [assignment, setAssignment] = useState<PatientAssignment | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!appUser?.id) return;
    setLoading(true);
    try {
      const all = await getAssignmentsByPatient(appUser.id);
      setAssignment(all.find((a) => a.id === id) ?? null);
    } finally {
      setLoading(false);
    }
  }, [id, appUser?.id]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={PATIENT_HEADER} size="large" />
      </View>
    );
  }

  if (!assignment) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.error} />
        <Text style={[typography.body, { marginTop: spacing.sm }]}>Task not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: spacing.md }}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const canLaunch = assignment.status === 'assigned' || assignment.status === 'in-progress';
  const totalRequired = assignment.targetRepetitionsPerDay;

  return (
    <View style={styles.container}>
      {/* ── Back header ── */}
      <View style={styles.navHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={PATIENT_HEADER} />
          <Text style={[styles.backLabel, { color: PATIENT_HEADER }]}>Tasks</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="fitness" size={32} color={PATIENT_HEADER} />
          </View>
          <Text style={styles.heroTitle}>{assignment.exerciseName}</Text>
          <View style={[styles.heroBadge, {
            backgroundColor: assignment.status === 'completed'
              ? colors.success + '20'
              : assignment.status === 'in-progress'
              ? colors.warning + '20'
              : colors.primary + '18',
          }]}>
            <Text style={[styles.heroBadgeText, {
              color: assignment.status === 'completed'
                ? colors.success
                : assignment.status === 'in-progress'
                ? colors.warning
                : colors.primary,
            }]}>
              {assignment.status === 'assigned' ? 'Ready to Start'
                : assignment.status === 'in-progress' ? 'In Progress'
                : assignment.status === 'completed' ? 'Completed'
                : 'Missed'}
            </Text>
          </View>
        </View>

        {/* ── Therapist instructions ── */}
        {assignment.instructions ? (
          <View style={styles.instructionsCard}>
            <View style={styles.instructionsHeader}>
              <Ionicons name="chatbubble-ellipses-outline" size={16} color={PATIENT_HEADER} />
              <Text style={styles.instructionsTitle}>From your therapist</Text>
            </View>
            <Text style={styles.instructionsText}>{assignment.instructions}</Text>
          </View>
        ) : null}

        {/* ── Details ── */}
        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>EXERCISE DETAILS</Text>
          <InfoRow icon="repeat" label="Repetitions per day"
            value={`${assignment.targetRepetitionsPerDay} session${assignment.targetRepetitionsPerDay !== 1 ? 's' : ''}`} />
          <View style={styles.divider} />
          <InfoRow icon="calendar" label="Programme length"
            value={`${assignment.numberOfDays} day${assignment.numberOfDays !== 1 ? 's' : ''}`} />
          {assignment.dueDate && (
            <>
              <View style={styles.divider} />
              <InfoRow icon="flag" label="Due date" value={formatDate(assignment.dueDate)} />
            </>
          )}
          <View style={styles.divider} />
          <InfoRow icon="checkmark-done" label="Attempts completed"
            value={`${assignment.attemptCount} so far`} />
        </View>

        {/* ── What happens in AR ── */}
        <View style={styles.arInfoCard}>
          <View style={styles.arInfoHeader}>
            <Ionicons name="glasses-outline" size={20} color={PATIENT_HEADER} />
            <Text style={styles.arInfoTitle}>What happens in AR</Text>
          </View>
          <Text style={styles.arInfoText}>
            You'll be guided step by step through the exercise using your AR glasses.
            The system will show you exactly what to do at each stage — just follow the prompts at your own pace.
          </Text>
          <View style={styles.arSteps}>
            {['Put on your Spectacles', 'Follow the AR step prompts', 'Complete each step calmly', 'Return to the app when done'].map((step, i) => (
              <View key={i} style={styles.arStep}>
                <View style={styles.arStepNum}>
                  <Text style={styles.arStepNumText}>{i + 1}</Text>
                </View>
                <Text style={styles.arStepText}>{step}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Launch button ── */}
        {canLaunch ? (
          <TouchableOpacity
            style={[styles.launchBtn, { backgroundColor: PATIENT_HEADER }]}
            onPress={() => router.push({
              pathname: '/(patient)/launch',
              params: {
                assignmentId: assignment.id,
                exerciseId: assignment.exerciseId,
                exerciseName: assignment.exerciseName,
                attemptCount: String(assignment.attemptCount),
                totalRequired: String(totalRequired),
              },
            })}
            activeOpacity={0.85}
          >
            <Ionicons name="play-circle" size={22} color={colors.surface} />
            <Text style={styles.launchBtnText}>Launch AR Exercise</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.completedNote}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.completedNoteText}>
              {assignment.status === 'completed'
                ? 'You have completed this exercise.'
                : 'This exercise is no longer active.'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  navHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingTop: spacing.xxl, paddingBottom: spacing.sm,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backLabel: { fontSize: 16, fontWeight: '500' },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  hero: { alignItems: 'center', paddingVertical: spacing.md },
  heroIcon: {
    width: 72, height: 72, borderRadius: radius.full,
    backgroundColor: PATIENT_HEADER + '15',
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md,
  },
  heroTitle: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.sm },
  heroBadge: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full },
  heroBadgeText: { fontSize: 13, fontWeight: '700' },
  instructionsCard: {
    backgroundColor: PATIENT_HEADER + '0E', borderRadius: radius.lg,
    padding: spacing.md, borderLeftWidth: 3, borderLeftColor: PATIENT_HEADER,
  },
  instructionsHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  instructionsTitle: { fontSize: 13, fontWeight: '700', color: PATIENT_HEADER },
  instructionsText: { fontSize: 14, color: colors.textPrimary, lineHeight: 20 },
  detailsCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardTitle: {
    fontSize: 11, fontWeight: '700', color: colors.textSecondary, letterSpacing: 1,
    textTransform: 'uppercase', padding: spacing.md, paddingBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
  infoIconWrap: {
    width: 32, height: 32, borderRadius: radius.sm,
    backgroundColor: PATIENT_HEADER + '12', justifyContent: 'center', alignItems: 'center',
  },
  infoLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
  infoValue: { fontSize: 14, color: colors.textPrimary, fontWeight: '600', marginTop: 1 },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.md },
  arInfoCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  arInfoHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  arInfoTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  arInfoText: { fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginBottom: spacing.md },
  arSteps: { gap: spacing.sm },
  arStep: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  arStepNum: {
    width: 24, height: 24, borderRadius: radius.full,
    backgroundColor: PATIENT_HEADER, justifyContent: 'center', alignItems: 'center',
  },
  arStepNumText: { fontSize: 12, fontWeight: '700', color: colors.surface },
  arStepText: { fontSize: 13, color: colors.textPrimary, fontWeight: '500' },
  launchBtn: {
    borderRadius: radius.md, height: 54, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    shadowColor: PATIENT_HEADER, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
  },
  launchBtnText: { color: colors.surface, fontSize: 16, fontWeight: '700' },
  completedNote: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.success + '12',
    borderRadius: radius.md, padding: spacing.md,
  },
  completedNoteText: { fontSize: 14, color: colors.success, fontWeight: '600' },
});
