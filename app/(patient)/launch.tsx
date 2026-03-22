import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Timestamp } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/src/features/auth/AuthContext';
import { createAttempt } from '@/src/services/repositories/attemptRepository';
import { incrementAttemptCount, updateAssignment } from '@/src/services/repositories/assignmentRepository';
import { colors } from '@/src/theme/colors';
import { spacing, radius } from '@/src/theme/spacing';
import { ARLaunchContext } from '@/src/types';

const PATIENT_HEADER = '#2E6B5A';
const AR_CONTEXT_KEY = 'ar_launch_context';

export default function LaunchScreen() {
  const { assignmentId, exerciseId, exerciseName, attemptCount: attemptCountStr, totalRequired: totalRequiredStr } = useLocalSearchParams<{
    assignmentId: string;
    exerciseId: string;
    exerciseName: string;
    attemptCount: string;
    totalRequired: string;
  }>();
  const attemptCount = parseInt(attemptCountStr ?? '0', 10);
  const totalRequired = parseInt(totalRequiredStr ?? '1', 10);
  const { appUser } = useAuth();
  const router = useRouter();

  const [launchTimestamp, setLaunchTimestamp] = useState(() => Date.now());
  const [completing, setCompleting] = useState(false);

  // Reset state every time the screen comes into focus (handles cached Tab.Screen re-use)
  useFocusEffect(useCallback(() => {
    setCompleting(false);
    setLaunchTimestamp(Date.now());
  }, []));
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for the AR icon
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Store AR context in AsyncStorage so the Spectacles lens can read it
  useEffect(() => {
    if (!appUser?.id) return;
    const ctx: ARLaunchContext = {
      assignmentId,
      exerciseId,
      exerciseName,
      patientId: appUser.id,
      launchTimestamp,
    };
    AsyncStorage.setItem(AR_CONTEXT_KEY, JSON.stringify(ctx));
  }, [assignmentId, exerciseId, exerciseName, appUser?.id, launchTimestamp]);

  async function handleComplete() {
    if (!appUser?.id || completing) return;
    setCompleting(true);
    try {
      const completedAt = Timestamp.now();
      const startedAt = Timestamp.fromMillis(launchTimestamp);
      const duration = Math.round((Date.now() - launchTimestamp) / 1000);

      const newCount = attemptCount + 1;
      const isFullyDone = newCount >= totalRequired;

      await Promise.all([
        createAttempt({
          patientId: appUser.id,
          assignmentId,
          exerciseId,
          startedAt,
          completedAt,
          duration,
          completed: true,
          successful: true,
          errorCount: 0,
          metrics: { overallScore: 100, stepCompletionRate: 1 },
        }),
        incrementAttemptCount(assignmentId),
        updateAssignment(assignmentId, {
          status: isFullyDone ? 'completed' : 'in-progress',
        }),
      ]);

      await AsyncStorage.removeItem(AR_CONTEXT_KEY);

      router.replace({
        pathname: '/(patient)/completion',
        params: {
          exerciseName,
          duration: String(duration),
          assignmentId,
          exerciseId,
          attemptCount: String(newCount),
          totalRequired: String(totalRequired),
        },
      });
    } catch (err) {
      console.error('Completion failed:', err);
      setCompleting(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* ── Back button ── */}
      <View style={styles.navHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} disabled={completing}>
          <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.7)" />
          <Text style={styles.backLabel}>Back</Text>
        </TouchableOpacity>
      </View>

      {/* ── Main content ── */}
      <View style={styles.body}>
        {/* Pulsing AR icon */}
        <Animated.View style={[styles.iconRing, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.iconInner}>
            <Ionicons name="glasses" size={44} color={colors.surface} />
          </View>
        </Animated.View>

        <Text style={styles.title}>AR Session Active</Text>
        <Text style={styles.subtitle}>
          Put on your Spectacles and follow the AR prompts to complete{'\n'}
          <Text style={styles.exerciseName}>{exerciseName}</Text>
        </Text>

        {/* Step reminders */}
        <View style={styles.stepsCard}>
          {[
            { icon: 'glasses-outline' as const,       text: 'Keep your Spectacles on' },
            { icon: 'walk-outline' as const,           text: 'Follow each AR step calmly' },
            { icon: 'checkmark-circle-outline' as const, text: 'Take your time — no rush' },
          ].map((item, i) => (
            <View key={i} style={[styles.stepRow, i < 2 && styles.stepRowBorder]}>
              <Ionicons name={item.icon} size={18} color="rgba(255,255,255,0.7)" />
              <Text style={styles.stepText}>{item.text}</Text>
            </View>
          ))}
        </View>

        {/* Mark as completed */}
        <TouchableOpacity
          style={[styles.completeBtn, completing && styles.completeBtnDisabled]}
          onPress={handleComplete}
          disabled={completing}
          activeOpacity={0.85}
        >
          {completing ? (
            <ActivityIndicator color={PATIENT_HEADER} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={22} color={PATIENT_HEADER} />
              <Text style={styles.completeBtnText}>Mark as Completed</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.completeBtnHint}>
          Tap after finishing the AR exercise on your Spectacles
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PATIENT_HEADER },
  navHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.sm,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 16, fontWeight: '500' },
  body: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl,
  },
  iconRing: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconInner: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  title: {
    fontSize: 26, fontWeight: '800', color: colors.surface,
    textAlign: 'center', marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 15, color: 'rgba(255,255,255,0.75)',
    textAlign: 'center', lineHeight: 22, marginBottom: spacing.xl,
  },
  exerciseName: { fontWeight: '700', color: colors.surface },
  stepsCard: {
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: radius.lg,
    width: '100%', marginBottom: spacing.xl, overflow: 'hidden',
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  stepRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  stepText: { fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  completeBtn: {
    backgroundColor: colors.surface, borderRadius: radius.md, height: 54,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 10, elevation: 4,
  },
  completeBtnDisabled: { opacity: 0.6 },
  completeBtnText: { fontSize: 16, fontWeight: '700', color: PATIENT_HEADER },
  completeBtnHint: {
    fontSize: 12, color: 'rgba(255,255,255,0.55)',
    textAlign: 'center', marginTop: spacing.sm,
  },
});
