import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/features/auth/AuthContext';
import { getAssignmentsByPatient } from '@/src/services/repositories/assignmentRepository';
import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';
import { spacing, radius } from '@/src/theme/spacing';
import { PatientAssignment, AssignmentStatus } from '@/src/types';
import { Timestamp } from 'firebase/firestore';

const STATUS_CONFIG: Record<AssignmentStatus, { label: string; color: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  assigned:     { label: 'Assigned',    color: colors.primary,       icon: 'time-outline' },
  'in-progress':{ label: 'In Progress', color: colors.warning,       icon: 'play-circle-outline' },
  completed:    { label: 'Completed',   color: colors.success,       icon: 'checkmark-circle-outline' },
  missed:       { label: 'Missed',      color: colors.error,         icon: 'close-circle-outline' },
};

function formatDate(ts: Timestamp | undefined | null): string {
  if (!ts) return '—';
  try { return ts.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
  catch { return '—'; }
}

function TaskCard({ assignment, onPress }: { assignment: PatientAssignment; onPress: () => void }) {
  const cfg = STATUS_CONFIG[assignment.status] ?? { label: assignment.status, color: colors.textSecondary, icon: 'ellipse-outline' as const };
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.accentBar, { backgroundColor: cfg.color }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <View style={styles.cardTitles}>
            <Text style={styles.cardTitle}>{assignment.exerciseName}</Text>
            {assignment.instructions ? (
              <Text style={styles.cardInstructions} numberOfLines={1}>
                {assignment.instructions}
              </Text>
            ) : null}
          </View>
          <View style={[styles.badge, { backgroundColor: cfg.color + '18' }]}>
            <Ionicons name={cfg.icon} size={12} color={cfg.color} />
            <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>
        <View style={styles.cardMeta}>
          <View style={styles.metaChip}>
            <Ionicons name="repeat" size={11} color={colors.textSecondary} />
            <Text style={styles.metaText}>{assignment.targetRepetitionsPerDay}×/day · {assignment.numberOfDays} days</Text>
          </View>
          {assignment.dueDate && (
            <View style={styles.metaChip}>
              <Ionicons name="calendar-outline" size={11} color={colors.textSecondary} />
              <Text style={styles.metaText}>Due {formatDate(assignment.dueDate)}</Text>
            </View>
          )}
          <View style={styles.metaChip}>
            <Ionicons name="checkmark-done-outline" size={11} color={colors.textSecondary} />
            <Text style={styles.metaText}>{assignment.attemptCount} attempt{assignment.attemptCount !== 1 ? 's' : ''}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function TasksScreen() {
  const { appUser } = useAuth();
  const router = useRouter();
  const [assignments, setAssignments] = useState<PatientAssignment[]>([]);
  const [loading, setLoading] = useState(true);

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
  const done   = assignments.filter((a) => a.status === 'completed' || a.status === 'missed');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Tasks</Text>
        <Text style={styles.subtitle}>
          {active.length} active · {done.length} completed
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : assignments.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="clipboard-outline" size={52} color={colors.border} />
          <Text style={styles.emptyTitle}>No tasks yet</Text>
          <Text style={styles.emptyBody}>
            Your therapist hasn't assigned any tasks yet. Check back soon!
          </Text>
        </View>
      ) : (
        <FlatList
          data={[...active, ...done]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TaskCard
              assignment={item}
              onPress={() => router.push(`/(patient)/task/${item.id}`)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.md },
  title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  card: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderRadius: radius.lg, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  accentBar: { width: 4 },
  cardBody: { flex: 1, padding: spacing.md },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  cardTitles: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  cardInstructions: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.background, paddingHorizontal: spacing.sm,
    paddingVertical: 3, borderRadius: radius.sm,
  },
  metaText: { fontSize: 11, color: colors.textSecondary },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm, padding: spacing.xl },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  emptyBody: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
