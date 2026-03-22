// Placeholder — implemented in Milestone 3
import { Tabs } from 'expo-router';

export default function TherapistLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="patients" options={{ title: 'Patients' }} />
      <Tabs.Screen name="assignments" options={{ title: 'Assignments' }} />
    </Tabs>
  );
}
