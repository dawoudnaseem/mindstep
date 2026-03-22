import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/features/auth/AuthContext';
import { getPatientsByTherapist } from '@/src/services/repositories/userRepository';
import { getAssignmentsByTherapist } from '@/src/services/repositories/assignmentRepository';
import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';
import { spacing, radius } from '@/src/theme/spacing';
import { AppUser, PatientAssignment } from '@/src/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function patientSummary(
  patientId: string,
  assignments: PatientAssignment[],
): { count: number; hasPending: boolean; hasOverdue: boolean } {
  const mine = assignments.filter((a) => a.patientId === patientId);
  const hasPending = mine.some((a) => a.status === 'assigned');
  const hasOverdue = mine.some((a) => {
    if (a.status === 'completed') return false;
    if (!a.dueDate) return false;
    return a.dueDate.toDate() < new Date();
  });
  return { count: mine.length, hasPending, hasOverdue };
}

// ─── Patient Row ──────────────────────────────────────────────────────────────

function PatientRow({
  patient,
  assignments,
  onPress,
}: {
  patient: AppUser;
  assignments: PatientAssignment[];
  onPress: () => void;
}) {
  const { count, hasPending, hasOverdue } = patientSummary(patient.id, assignments);
  const avatarColors = [colors.primary, '#4A7FA8', '#3D6B5E'];
  const avatarBg = avatarColors[patient.id.charCodeAt(0) % avatarColors.length];

  return (
    <TouchableOpacity style={styles.patientRow} onPress={onPress} activeOpacity={0.7}>
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
        <Text style={styles.avatarText}>{initials(patient.fullName)}</Text>
      </View>

      {/* Info */}
      <View style={styles.patientInfo}>
        <Text style={[typography.body, { fontWeight: '600' }]}>{patient.fullName}</Text>
        <Text style={typography.bodySmall}>
          {count} assignment{count !== 1 ? 's' : ''}
          {patient.profile?.primaryChallenges?.length
            ? ` · ${patient.profile.primaryChallenges[0]}`
            : ''}
        </Text>
      </View>

      {/* Indicators — always show one badge */}
      <View style={styles.indicators}>
        {hasOverdue ? (
          <View style={[styles.indicator, { backgroundColor: colors.error + '18' }]}>
            <Text style={[styles.indicatorText, { color: colors.error }]}>Overdue</Text>
          </View>
        ) : hasPending ? (
          <View style={[styles.indicator, { backgroundColor: colors.warning + '18' }]}>
            <Text style={[styles.indicatorText, { color: colors.warning }]}>Pending</Text>
          </View>
        ) : count > 0 ? (
          <View style={[styles.indicator, { backgroundColor: colors.success + '18' }]}>
            <Text style={[styles.indicatorText, { color: colors.success }]}>On track</Text>
          </View>
        ) : (
          <View style={[styles.indicator, { backgroundColor: colors.border }]}>
            <Text style={[styles.indicatorText, { color: colors.textSecondary }]}>No tasks</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function PatientListScreen() {
  const { appUser } = useAuth();
  const router = useRouter();
  const [patients, setPatients] = useState<AppUser[]>([]);
  const [assignments, setAssignments] = useState<PatientAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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

  const filtered = patients.filter((p) =>
    p.fullName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={[typography.h2]}>My Patients</Text>
        <Text style={[typography.bodySmall, { marginTop: 2 }]}>
          {patients.length} patient{patients.length !== 1 ? 's' : ''} in your roster
        </Text>
      </View>

      {/* ── Search ── */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search patients…"
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* ── List ── */}
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.listContent}
          renderItem={({ item }) => (
            <PatientRow
              patient={item}
              assignments={assignments}
              onPress={() => router.push(`/(therapist)/patient/${item.id}`)}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={52} color={colors.border} />
              <Text style={styles.emptyTitle}>
                {search ? 'No results found' : 'No patients yet'}
              </Text>
              <Text style={styles.emptyBody}>
                {search
                  ? `No patients match "${search}"`
                  : 'Patients will appear here once linked to your account.'}
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
    paddingBottom: spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginHorizontal: spacing.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyContainer: {
    flex: 1,
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '700',
  },
  patientInfo: {
    flex: 1,
  },
  indicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  indicator: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  indicatorText: {
    fontSize: 11,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 44 + spacing.md,
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
