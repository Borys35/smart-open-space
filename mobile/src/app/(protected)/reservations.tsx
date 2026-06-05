import { Text } from "@ssobkowski/rnui";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";

export default function Reservations() {
  return (
    <SafeAreaView style={styles.container}>
      <Text header size="4xl" style={styles.title}>
        Reservations
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  title: {
    marginTop: 28,
  },
});
