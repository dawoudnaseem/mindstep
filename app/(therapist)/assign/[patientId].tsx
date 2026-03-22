import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/src/features/auth/AuthContext';
import {
  createAssignment,
  updateAssignment,
  getAssignmentById,
} from '@/src/services/repositories/assignmentRepository';
import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';
import { spacing, radius } from '@/src/theme/spacing';

// ─── Exercise catalogue ────────────────────────────────────────────────────────

const EXERCISES = [
  {
    id: 'wash-tomato',
    name: 'Wash Tomato',
    description: 'Guide the patient through washing a tomato step by step using AR.',
    steps: 5,
    icon: 'water-outline' as const,
  },
  {
    id: 'cut-tomato',
    name: 'Cut Tomato',
    description: 'Guide the patient through safely cutting a tomato with AR guidance.',
    steps: 6,
    icon: 'cut-outline' as const,
  },
] as const;

type ExerciseId = (typeof EXERCISES)[number]['id'];

// ─── Stepper ──────────────────────────────────────────────────────────────────

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.stepperRow}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <TouchableOpacity
          style={[styles.stepperBtn, value <= min && styles.stepperBtnDisabled]}
          onPress={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
        >
          <Ionicons name="remove" size={18} color={value <= min ? colors.border : colors.primary} />
        </TouchableOpacity>
        <Text style={styles.stepperValue}>{value}</Text>
        <TouchableOpacity
          style={[styles.stepperBtn, value >= max && styles.stepperBtnDisabled]}
          onPress={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
        >
          <Ionicons name="add" size={18} color={value >= max ? colors.border : colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function AssignExerciseScreen() {
  const { patientId, patientName, assignmentId } = useLocalSearchParams<{
    patientId: string;
    patientName?: string;
    assignmentId?: string;
  }>();
  const { appUser } = useAuth();
  const router = useRouter();
  const isEditMode = !!assignmentId;

  const [selectedExercise, setSelectedExercise] = useState<ExerciseId | null>(null);
  const [repsPerDay, setRepsPerDay] = useState(1);
  const [numberOfDays, setNumberOfDays] = useState(7);
  const [instructions, setInstructions] = useState('');
  const [dueDateStr, setDueDateStr] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(isEditMode);
  const [success, setSuccess] = useState(false);

  // Reset success state every time the screen comes into focus
  useFocusEffect(useCallback(() => {
    setSuccess(false);
  }, []));

  // Pre-fill form if editing an existing assignment
  useEffect(() => {
    if (!assignmentId) return;
    getAssignmentById(assignmentId).then((a) => {
      if (!a) return;
      setSelectedExercise(a.exerciseId as ExerciseId);
      setRepsPerDay(a.targetRepetitionsPerDay);
      setNumberOfDays(a.numberOfDays);
      setInstructions(a.instructions ?? '');
      if (a.dueDate) {
        const d = a.dueDate.toDate();
        setDueDateStr(d.toISOString().split('T')[0]);
      }
      setInitializing(false);
    });
  }, [assignmentId]);

  const canSubmit = selectedExercise !== null && !loading;

  async function handleSubmit() {
    if (!selectedExercise || !appUser?.id || !patientId) return;
    const exercise = EXERCISES.find((e) => e.id === selectedExercise)!;

    let dueDate: Timestamp | undefined;
    if (dueDateStr.trim()) {
      const parsed = new Date(dueDateStr.trim());
      if (!isNaN(parsed.getTime())) dueDate = Timestamp.fromDate(parsed);
    }

    setLoading(true);
    try {
      if (isEditMode && assignmentId) {
        await updateAssignment(assignmentId, {
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          targetRepetitionsPerDay: repsPerDay,
          numberOfDays,
          ...(dueDate ? { dueDate } : {}),
          instructions: instructions.trim() || '',
        });
      } else {
        await createAssignment({
          therapistId: appUser.id,
          patientId,
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          targetRepetitionsPerDay: repsPerDay,
          numberOfDays,
          assignedDate: Timestamp.now(),
          ...(dueDate ? { dueDate } : {}),
          ...(instructions.trim() ? { instructions: instructions.trim() } : {}),
        });
      }
      setSuccess(true);
    } catch (err) {
      console.error('Assignment save failed:', err);
      Alert.alert('Something went wrong', 'The assignment could not be saved. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Success screen ──────────────────────────────────────────────────────────

  if (success) {
    const exercise = EXERCISES.find((e) => e.id === selectedExercise)!;
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={64} color={colors.success} />
        </View>
        <Text style={[typography.h2, { textAlign: 'center', marginTop: spacing.md }]}>
          {isEditMode ? 'Assignment Updated' : 'Assignment Created'}
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm }]}>
          {exercise.name} has been {isEditMode ? 'updated' : 'assigned'} for{' '}
          <Text style={{ fontWeight: '600', color: colors.textPrimary }}>
            {patientName ?? 'the patient'}
          </Text>
          .
        </Text>
        <View style={styles.successDetails}>
          <Text style={styles.successDetailRow}>
            <Text style={{ fontWeight: '600' }}>{repsPerDay}</Text> rep{repsPerDay !== 1 ? 's' : ''}/day for{' '}
            <Text style={{ fontWeight: '600' }}>{numberOfDays}</Text> day{numberOfDays !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity style={styles.successBtn} onPress={() => router.back()} activeOpacity={0.85}>
          <Text style={styles.successBtnText}>Back to Patient</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Loading existing data ───────────────────────────────────────────────────

  if (initializing) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <View style={styles.navHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={colors.primary} />
            <Text style={styles.backLabel}>Patient</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.titleBlock}>
            <Text style={[typography.h2]}>
              {isEditMode ? 'Edit Assignment' : 'Assign Exercise'}
            </Text>
            {patientName ? (
              <Text style={[typography.bodySmall, { marginTop: 4 }]}>
                for <Text style={{ fontWeight: '600', color: colors.textPrimary }}>{patientName}</Text>
              </Text>
            ) : null}
          </View>

          {/* ── Exercise picker ── */}
          <Text style={styles.fieldLabel}>EXERCISE TEMPLATE</Text>
          <View style={styles.exerciseGrid}>
            {EXERCISES.map((ex) => {
              const selected = selectedExercise === ex.id;
              return (
                <TouchableOpacity
                  key={ex.id}
                  style={[styles.exerciseCard, selected && styles.exerciseCardSelected]}
                  onPress={() => setSelectedExercise(ex.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.exerciseIconWrap, selected && { backgroundColor: colors.primary }]}>
                    <Ionicons name={ex.icon} size={24} color={selected ? colors.surface : colors.primary} />
                  </View>
                  <Text style={[styles.exerciseName, selected && { color: colors.primary }]}>{ex.name}</Text>
                  <Text style={styles.exerciseDesc}>{ex.description}</Text>
                  <Text style={styles.exerciseSteps}>{ex.steps} steps</Text>
                  {selected && (
                    <View style={styles.selectedCheck}>
                      <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Frequency ── */}
          <View style={styles.settingsCard}>
            <Text style={styles.cardTitle}>FREQUENCY</Text>
            <Stepper label="Repetitions per day" value={repsPerDay} min={1} max={10} onChange={setRepsPerDay} />
            <View style={styles.cardDivider} />
            <Stepper label="Number of days" value={numberOfDays} min={1} max={30} onChange={setNumberOfDays} />
          </View>

          {/* ── Due date ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>DUE DATE (OPTIONAL)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
              value={dueDateStr}
              onChangeText={setDueDateStr}
              keyboardType="numbers-and-punctuation"
            />
          </View>

          {/* ── Instructions ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>PATIENT INSTRUCTIONS (OPTIONAL)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Add any specific notes or encouragement for this patient…"
              placeholderTextColor={colors.textSecondary}
              value={instructions}
              onChangeText={setInstructions}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* ── Submit ── */}
          <TouchableOpacity
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <>
                <Ionicons name={isEditMode ? 'save-outline' : 'send'} size={18} color={colors.surface} />
                <Text style={styles.submitBtnText}>
                  {isEditMode
                    ? 'Save Changes'
                    : selectedExercise
                    ? 'Assign Exercise'
                    : 'Select an exercise above'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backLabel: { color: colors.primary, fontSize: 16, fontWeight: '500' },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  titleBlock: { marginBottom: spacing.lg },
  fieldLabel: {
    fontSize: 11, fontWeight: '600', color: colors.textSecondary,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.sm,
  },
  exerciseGrid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  exerciseCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 2, borderColor: 'transparent',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, position: 'relative',
  },
  exerciseCardSelected: { borderColor: colors.primary, backgroundColor: colors.primary + '06' },
  exerciseIconWrap: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: colors.primary + '12',
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm,
  },
  exerciseName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  exerciseDesc: { fontSize: 12, color: colors.textSecondary, lineHeight: 16, marginBottom: spacing.sm },
  exerciseSteps: {
    fontSize: 11, fontWeight: '600', color: colors.secondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  selectedCheck: { position: 'absolute', top: spacing.sm, right: spacing.sm },
  settingsCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    marginBottom: spacing.lg, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardTitle: {
    fontSize: 11, fontWeight: '600', color: colors.textSecondary,
    letterSpacing: 1, textTransform: 'uppercase',
    padding: spacing.md, paddingBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  cardDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.md },
  stepperRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  stepperLabel: { fontSize: 15, color: colors.textPrimary, fontWeight: '500' },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepperBtn: {
    width: 36, height: 36, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  stepperBtnDisabled: { borderColor: colors.border },
  stepperValue: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, minWidth: 32, textAlign: 'center' },
  fieldGroup: { marginBottom: spacing.lg },
  textInput: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    fontSize: 15, color: colors.textPrimary,
  },
  textArea: { height: 100, paddingTop: spacing.sm + 2 },
  submitBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md, height: 52,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.5, shadowOpacity: 0, elevation: 0 },
  submitBtnText: { color: colors.surface, fontSize: 15, fontWeight: '700' },
  successContainer: {
    flex: 1, backgroundColor: colors.background,
    justifyContent: 'center', alignItems: 'center', padding: spacing.xl,
  },
  successIcon: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: colors.success + '15',
    justifyContent: 'center', alignItems: 'center',
  },
  successDetails: {
    marginTop: spacing.lg, backgroundColor: colors.surface,
    borderRadius: radius.lg, padding: spacing.md,
    width: '100%', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  successDetailRow: { fontSize: 15, color: colors.textSecondary },
  successBtn: {
    marginTop: spacing.xl, backgroundColor: colors.primary,
    borderRadius: radius.md, height: 52,
    paddingHorizontal: spacing.xl, justifyContent: 'center',
    alignItems: 'center', width: '100%',
  },
  successBtnText: { color: colors.surface, fontSize: 15, fontWeight: '700' },
});
