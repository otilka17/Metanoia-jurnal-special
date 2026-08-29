import { useEffect, useRef } from "react";
import { Animated, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export function RecordBadge({ visible }: { visible: boolean }) {
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scale.setValue(0);
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 16 }).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <LinearGradient colors={["#E8C37C", "#DE8F6E"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.badge}>
        <Text style={styles.text}>Record nou! 🎉</Text>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999, paddingHorizontal: 20, paddingVertical: 10, marginTop: 10, marginBottom: 8,
    shadowColor: "#DE8F6E", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10,
    elevation: 6,
  },
  text: { color: "#fff", fontWeight: "800", fontSize: 14 },
});
