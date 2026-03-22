import { useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  ListRenderItemInfo,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import Button from '@/src/components/Button';

const { width } = Dimensions.get('window');

// ─── Slide content ────────────────────────────────────────────────────────────

interface Slide {
  id: string;
  emoji: string;
  title: string;
  body: string;
  accentColor: string;
}

const SLIDES: Slide[] = [
  {
    id: '1',
    emoji: '🧠',
    title: 'Welcome to CareXR',
    body: 'A therapist-guided platform that brings occupational therapy exercises to life through augmented reality.',
    accentColor: colors.primary,
  },
  {
    id: '2',
    emoji: '🔄',
    title: 'Executive Dysfunction Is Real',
    body: 'Initiating tasks, following sequences, and sustaining attention can be genuinely hard. You are not alone — and support is possible.',
    accentColor: colors.secondary,
  },
  {
    id: '3',
    emoji: '🥽',
    title: 'AR Guides Every Step',
    body: 'Snap Spectacles overlay clear, step-by-step guidance onto everyday tasks — so you can focus on doing, not planning.',
    accentColor: colors.accent,
  },
  {
    id: '4',
    emoji: '🩺',
    title: 'Your Therapist Leads the Way',
    body: 'Therapists assign tailored exercises, monitor your progress, and adjust your plan — all from the same app.',
    accentColor: colors.success,
  },
  {
    id: '5',
    emoji: '✨',
    title: 'One Small Step at a Time',
    body: 'Every session builds on the last. CareXR tracks your progress so you — and your therapist — can see how far you\'ve come.',
    accentColor: colors.warning,
  },
];

// ─── Slide component ─────────────────────────────────────────────────────────

function SlideItem({ item }: { item: Slide }) {
  return (
    <View style={[styles.slide, { width }]}>
      <View style={[styles.emojiContainer, { backgroundColor: item.accentColor + '20' }]}>
        <Text style={styles.emoji}>{item.emoji}</Text>
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.body}>{item.body}</Text>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList<Slide>>(null);
  const isLast = activeIndex === SLIDES.length - 1;

  function handleScroll(event: any) {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
  }

  async function handleFinish() {
    await AsyncStorage.setItem('onboarding_completed', 'true');
    router.replace('/(auth)/login');
  }

  function handleNext() {
    if (isLast) {
      handleFinish();
    } else {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    }
  }

  function handleSkip() {
    handleFinish();
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Skip button */}
      {!isLast && (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip} hitSlop={12}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Carousel */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={({ item }: ListRenderItemInfo<Slide>) => <SlideItem item={item} />}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
        style={styles.flatList}
      />

      {/* Bottom area */}
      <View style={styles.bottom}>
        {/* Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === activeIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* CTA button */}
        <Button
          label={isLast ? 'Get Started' : 'Next'}
          onPress={handleNext}
          style={styles.ctaButton}
        />

        {isLast && (
          <TouchableOpacity onPress={handleSkip} style={styles.alreadyHaveAccount}>
            <Text style={styles.alreadyText}>Already have an account? Sign in</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  skipButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: spacing.lg,
    zIndex: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  skipText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  flatList: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: 60,
  },
  emojiContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  emoji: {
    fontSize: 52,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 34,
  },
  body: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
  },
  bottom: {
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 48 : 32,
    paddingTop: spacing.md,
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primary,
  },
  dotInactive: {
    width: 8,
    backgroundColor: colors.border,
  },
  ctaButton: {
    width: '100%',
  },
  alreadyHaveAccount: {
    marginTop: spacing.md,
    paddingVertical: 8,
  },
  alreadyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
