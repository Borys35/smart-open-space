import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function Reservations() {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Reservations</Text>
        <Text style={styles.body} selectable>
          Placeholder screen.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
  },
  card: {
    padding: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  body: {
    fontSize: 16,
    color: "#666",
  },
});
