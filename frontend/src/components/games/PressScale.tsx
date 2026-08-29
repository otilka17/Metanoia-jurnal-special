import { useRef, ReactNode } from "react";
import { Animated, Pressable, StyleProp, ViewStyle, Platform } from "react-native";

let Haptics: typeof import("expo-haptics") | null = null;
if (Platform.OS !== "web") {
  try { Haptics = require("expo-haptics"); } catch { Haptics = null; }
}

export function PressScale({
  children, onPress, style, disabled, testID, haptic = true,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  testID?: string;
  haptic?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const animateTo = (v: number) =>
    Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 30, bounciness: 6 }).start();

  const handlePress = () => {
    if (haptic && Haptics) {
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch { /* noop */ }
    }
    onPress?.();
  };

  return (
    <Pressable
      testID={testID}
      disabled={disabled}
      onPress={handlePress}
      onPressIn={() => !disabled && animateTo(0.93)}
      onPressOut={() => animateTo(1)}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
