import { Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { PressScale } from "./PressScale";

export function GradientButton({
  label, onPress, colors, testID,
}: { label: string; onPress: () => void; colors: [string, string]; testID?: string }) {
  return (
    <PressScale onPress={onPress} testID={testID} style={styles.wrap}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.grad}>
        <Text style={styles.text}>{label}</Text>
      </LinearGradient>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 999,
    shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 12,
    elevation: 6,
  },
  grad: { borderRadius: 999, paddingHorizontal: 36, paddingVertical: 16 },
  text: { color: "#fff", fontWeight: "800", fontSize: 16, textAlign: "center", letterSpacing: 0.3 },
});
