import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/features/auth/AuthContext';
import { getAssignmentsByTherapist } from '@/src/services/repositories/assignmentRepository';
import { getPatientsByTherapist } from '@/src/services/repositories/userRepository';
import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';
import { spacing, radius } from '@/src/theme/spacing';
import { AppUser, AssignmentStatus, PatientAssignment } from '@/src/types';
import { Timestamp } from 'firebase/firestore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  AssignmentStatus,
  { label: string; color: string; icon: React.ComponentProps<typeof Ionicons>['name'] }
> = {
  assigned: { label: 'Assigned', color: colors.primary, icon: 'time-outline' },
  'in-progress': { label: 'In Progress', color: colors.warning, icon: 'play-circle-outline' },
  completed: { label: 'Completed', color: colors.success, icon: 'checkmark-circle-outline' },
  missed: { label: 'Missed', color: colors.error, icon: 'close-circle-outline' },
};

const FILTER_OPTIONS: Array<{ key: AssignmentStatus | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'assigned', label: 'Pending' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
];

function formatDate(ts: Timestamp | undefined | null): string {
  if (!ts) return '—';
  try {
    return ts.toDate().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

// ─── Assignment card ──────────────────────────────────────────────────────────

function AssignmentItem({
  assignment,
  patientName,
  onPress,
}: {
  assignment: PatientAssignment;
  patientName: string;
  onPress: () => void;
}) {
  const cfg = STATUS_CONFIG[assignment.status] ?? {
    label: assignment.status,
    color: colors.textSecondary,
    icon: 'ellipse-outline' as const,
  };

  return (
    <TouchableOpacity style={styles.assignmentItem} onPress={onPress} activeOpacity={0.7}>
      {/* Left accent bar */}
      <View style={[styles.accentBar, { backgroundColor: cfg.color }]} />

      <View style={styles.itemContent}>
        <View style={styles.itemTop}>
          <View style={styles.itemTitles}>
            <Text style={[typography.body, { fontWeight: '600' }]}>{assignment.exerciseName}</Text>
            <Text style={typography.bodySmall}>{patientName}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: cfg.color + '18' }]}>
            <Ionicons name={cfg.icon} size={12} color={cfg.color} />
            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        <View style={styles.itemMeta}>
          <View style={styles.metaChip}>
            <Ionicons name="repeat" size={11} color={colors.textSecondary} />
            <Text style={styles.metaText}>
              {assignment.attemptCount} attempt{assignment.attemptCount !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="calendar-outline" size={11} color={colors.textSecondary} />
            <Text style={styles.metaText}>Assigned {formatDate(assignment.assignedDate)}</Text>
          </View>
          {assignment.dueDate && (
            <View style={styles.metaChip}>
              <Ionicons name="flag-outline" size={11} color={colors.textSecondary} />
              <Text style={styles.metaText}>Due {formatDate(assignment.dueDate)}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function AssignmentsScreen() {
  const { appUser } = useAuth();
  const router = useRouter();
  const [assignments, setAssignments] = useState<PatientAssignment[]>([]);
  const [patients, setPatients] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AssignmentStatus | 'all'>('all');

  const fetchData = useCallback(async () => {
    if (!appUser?.id) return;
    setLoading(true);
    try {
      const [a, p] = await Promise.all([
        getAssignmentsByTherapist(appUser.id),
        getPatientsByTherapist(appUser.id),
      ]);
      setAssignments(a);
      setPatients(p);
    } finally {
      setLoading(false);
    }
  }, [appUser?.id]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const patientMap = Object.fromEntries(patients.map((p) => [p.id, p.fullName]));

  const filtered =
    filter === 'all'
      ? assignments
      : assignments.filter((a) => a.status === filter);

  // Sort by most recent first
  const sorted = [...filtered].sort((a, b) => {
    const aTime = a.updatedAt?.toDate?.()?.getTime() ?? 0;
    const bTime = b.updatedAt?.toDate?.()?.getTime() ?? 0;
    return bTime - aTime;
  });

  const counts: Record<string, number> = { all: assignments.length };
  for (const s of ['assigned', 'in-progress', 'completed', 'missed']) {
    counts[s] = assignments.filter((a) => a.status === s).length;
  }

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={[typography.h2]}>Assignments</Text>
        <Text style={[typography.bodySmall, { marginTop: 2 }]}>
          {assignments.length} total across all patients
        </Text>
      </View>

      {/* ── Filter chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTER_OPTIONS.map((opt) => {
          const active = filter === opt.key;
          const count = counts[opt.key] ?? 0;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilter(opt.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {opt.label}
              </Text>
              {count > 0 && (
                <View style={[styles.filterCount, active && styles.filterCountActive]}>
                  <Text style={[styles.filterCountText, active && { color: colors.surface }]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── List ── */}
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          contentContainerStyle={
            sorted.length === 0 ? styles.emptyContainer : styles.listContent
          }
          renderItem={({ item }) => (
            <AssignmentItem
              assignment={item}
              patientName={patientMap[item.patientId] ?? 'Unknown patient'}
              onPress={() => router.push(`/(therapist)/patient/${item.patientId}`)}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="clipboard-outline" size={52} color={colors.border} />
              <Text style={styles.emptyTitle}>
                {filter === 'all' ? 'No assignments yet' : `No ${filter} assignments`}
              </Text>
              <Text style={styles.emptyBody}>
                {filter === 'all'
                  ? 'Assignments you create will appear here.'
                  : 'Try a different filter above.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  filterRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.surface,
  },
  filterCount: {
    backgroundColor: colors.border,
    borderRadius: radius.full,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  filterCountActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  filterCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  emptyContainer: {
    flex: 1,
  },
  assignmentItem: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  accentBar: {
    width: 4,
  },
  itemContent: {
    flex: 1,
    padding: spacing.md,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  itemTitles: {
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  itemMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  metaText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  separator: {
    height: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  emptyBody: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.lg,
  },
});
