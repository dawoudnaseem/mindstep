import { Redirect } from 'expo-router';
import { useAuth } from '@/src/features/auth/AuthContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '@/src/theme/colors';

export default function Index() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  if (role === 'therapist') {
    return <Redirect href="/(therapist)/" />;
  }

  if (role === 'patient') {
    return <Redirect href="/(patient)/" />;
  }

  // Fallback: unknown role, go to login
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
