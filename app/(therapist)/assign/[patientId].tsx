// Placeholder — implemented in Milestone 3
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function AssignExerciseScreen() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  return (
    <View style={styles.container}>
      <Text>Assign Exercise (patient: {patientId}) — coming in Milestone 3</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
