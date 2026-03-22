import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import { spacing, radius } from '@/src/theme/spacing';

const PATIENT_HEADER = '#2E6B5A';

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export default function CompletionScreen() {
  const { exerciseName, duration, assignmentId, exerciseId, attemptCount, totalRequired } =
    useLocalSearchParams<{
      exerciseName: string;
      duration: string;
      assignmentId: string;
      exerciseId: string;
      attemptCount: string;
      totalRequired: string;
    }>();
  const router = useRouter();
  const durationSecs = parseInt(duration ?? '0', 10);

  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  function handleRepeat() {
    router.replace({
      pathname: '/(patient)/launch',
      params: {
        assignmentId,
        exerciseId,
        exerciseName,
        attemptCount,
        totalRequired,
      },
    });
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: opacityAnim }]}>

        {/* ── Celebration icon ── */}
        <Animated.View style={[styles.iconWrap, { transform: [{ scale: scaleAnim }] }]}>
          <Ionicons name="checkmark-circle" size={80} color={colors.surface} />
        </Animated.View>

        {/* ── Heading ── */}
        <Text style={styles.heading}>Great job!</Text>
        <Text style={styles.subheading}>You completed a repetition.</Text>

        {/* ── Exercise summary card ── */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Ionicons name="fitness-outline" size={22} color={PATIENT_HEADER} />
              <Text style={styles.summaryLabel}>Exercise</Text>
              <Text style={styles.summaryValue}>{exerciseName ?? 'Exercise'}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Ionicons name="timer-outline" size={22} color={PATIENT_HEADER} />
              <Text style={styles.summaryLabel}>Duration</Text>
              <Text style={styles.summaryValue}>{formatDuration(durationSecs)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Ionicons name="star-outline" size={22} color={PATIENT_HEADER} />
              <Text style={styles.summaryLabel}>Score</Text>
              <Text style={styles.summaryValue}>100%</Text>
            </View>
          </View>
        </View>

        <Text style={styles.encouragement}>
          Every repetition builds your confidence.{'\n'}Keep going!
        </Text>

        {/* ── Repeat exercise ── */}
        <TouchableOpacity
          style={styles.repeatBtn}
          onPress={handleRepeat}
          activeOpacity={0.85}
        >
          <Ionicons name="refresh-circle" size={22} color={colors.surface} />
          <Text style={styles.repeatBtnText}>Repeat Exercise</Text>
        </TouchableOpacity>

        {/* ── Back to home ── */}
        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => router.replace('/(patient)' as any)}
          activeOpacity={0.85}
        >
          <Ionicons name="home-outline" size={20} color={PATIENT_HEADER} />
          <Text style={styles.homeBtnText}>Back to Home</Text>
        </TouchableOpacity>

      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: PATIENT_HEADER,
    justifyContent: 'center', alignItems: 'center',
  },
  content: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl,
    width: '100%',
  },
  iconWrap: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.xl,
  },
  heading: {
    fontSize: 36, fontWeight: '800', color: colors.surface,
    marginBottom: spacing.sm, textAlign: 'center',
  },
  subheading: {
    fontSize: 17, color: 'rgba(255,255,255,0.8)',
    textAlign: 'center', marginBottom: spacing.xl,
  },
  summaryCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, width: '100%', marginBottom: spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15, shadowRadius: 16, elevation: 6,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center', gap: 6 },
  summaryDivider: { width: 1, height: 48, backgroundColor: colors.border },
  summaryLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  encouragement: {
    fontSize: 15, color: 'rgba(255,255,255,0.72)',
    textAlign: 'center', lineHeight: 22, marginBottom: spacing.lg,
  },
  repeatBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: radius.md, height: 54,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, width: '100%', marginBottom: spacing.sm,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  repeatBtnText: { fontSize: 16, fontWeight: '700', color: colors.surface },
  homeBtn: {
    backgroundColor: colors.surface, borderRadius: radius.md, height: 54,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 10, elevation: 4,
  },
  homeBtnText: { fontSize: 16, fontWeight: '700', color: PATIENT_HEADER },
});
