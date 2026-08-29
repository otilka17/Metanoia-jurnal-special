import { StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

export function GradientCircleIcon({
  icon, colors, size = 88, iconSize,
}: { icon: keyof typeof Ionicons.glyphMap; colors: [string, string]; size?: number; iconSize?: number }) {
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2, shadowColor: colors[1] }]}
    >
      <Ionicons name={icon} size={iconSize || size * 0.48} color="#fff" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: "center", justifyContent: "center",
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16,
    elevation: 8,
  },
});
