import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/src/features/auth/AuthContext';
import { colors } from '@/src/theme/colors';

export default function Index() {
  const { user, role, loading: authLoading } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('onboarding_completed').then((val) => {
      setOnboardingDone(val === 'true');
    });
  }, []);

  // Wait for both auth state and AsyncStorage to resolve
  if (authLoading || onboardingDone === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Not logged in
  if (!user) {
    if (!onboardingDone) {
      return <Redirect href="/(auth)/onboarding" />;
    }
    return <Redirect href="/(auth)/login" />;
  }

  // Logged in — route by role
  if (role === 'therapist') {
    return <Redirect href="/(therapist)" />;
  }
  if (role === 'patient') {
    return <Redirect href="/(patient)" />;
  }

  // Role unknown or missing — back to login
  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
