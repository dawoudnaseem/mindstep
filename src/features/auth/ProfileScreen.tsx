import { View, Text, StyleSheet, ScrollView, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/src/features/auth/AuthContext';
import Button from '@/src/components/Button';
import { colors } from '@/src/theme/colors';
import { spacing, radius } from '@/src/theme/spacing';

export default function ProfileScreen() {
  const { appUser, role, logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.replace('/(auth)/login');
  }

  async function handleReset() {
    Alert.alert(
      'Reset App',
      'This will sign you out and clear all app data including onboarding. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await logout();
            await AsyncStorage.clear();
            router.replace('/(auth)/onboarding');
          },
        },
      ]
    );
  }

  const initials = appUser?.fullName
    ? appUser.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  const roleLabel = role === 'therapist' ? 'Therapist' : 'Patient';
  const roleBg = role === 'therapist' ? colors.primary + '18' : colors.secondary + '60';
  const roleColor = role === 'therapist' ? colors.primary : colors.success;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Profile</Text>
      </View>

      {/* Avatar card */}
      <View style={styles.avatarCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitials}>{initials}</Text>
        </View>
        <Text style={styles.fullName}>{appUser?.fullName ?? '—'}</Text>
        <Text style={styles.email}>{appUser?.email ?? '—'}</Text>
        <View style={[styles.roleBadge, { backgroundColor: roleBg }]}>
          <Text style={[styles.roleText, { color: roleColor }]}>{roleLabel}</Text>
        </View>
      </View>

      {/* Info rows */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.infoCard}>
          <InfoRow label="Name" value={appUser?.fullName ?? '—'} />
          <InfoRow label="Email" value={appUser?.email ?? '—'} last />
        </View>
      </View>

      {/* App info */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>App</Text>
        <View style={styles.infoCard}>
          <InfoRow label="Version" value="1.0.0 MVP" />
          <InfoRow label="Platform" value={Platform.OS === 'ios' ? 'iOS' : 'Android'} last />
        </View>
      </View>

      {/* Logout */}
      <Button
        label="Sign out"
        onPress={handleLogout}
        variant="secondary"
        style={styles.logoutButton}
      />

      {/* Full reset — clears auth + onboarding */}
      <Button
        label="Reset app & onboarding"
        onPress={handleReset}
        variant="ghost"
        style={styles.resetButton}
        textStyle={styles.resetText}
      />
    </ScrollView>
  );
}

function InfoRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 48,
  },
  pageHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  avatarCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.surface,
  },
  fullName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
    marginLeft: 4,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: colors.textSecondary,
    maxWidth: '55%',
    textAlign: 'right',
  },
  logoutButton: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  resetButton: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  resetText: {
    color: colors.error,
    fontSize: 13,
  },
});
