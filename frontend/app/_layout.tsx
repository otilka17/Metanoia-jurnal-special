import { Stack, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { AuthProvider, useAuth } from "@/src/lib/auth";
import { storage } from "@/src/utils/storage";
import { theme } from "@/src/lib/theme";

function RootNav() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [obChecked, setObChecked] = useState(false);
  const [obSeen, setObSeen] = useState(true);

  useEffect(() => {
    (async () => {
      const seen = await storage.get("onboarding_seen", "");
      setObSeen(!!seen);
      setObChecked(true);
    })();
  }, []);

  useEffect(() => {
    if (loading || !obChecked) return;
    const inAuth = segments[0] === "(auth)";
    const inOnboarding = segments[0] === "onboarding";
    if (!obSeen && !inOnboarding) {
      router.replace("/onboarding");
    } else if (obSeen && !user && !inAuth) {
      router.replace("/(auth)/login");
    } else if (user && (inAuth || inOnboarding)) {
      router.replace("/(tabs)");
    }
  }, [user, loading, segments, obChecked, obSeen]);

  if (loading || !obChecked) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.bg } }}>
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="category/[id]" />
      <Stack.Screen name="article/[id]" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootNav />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.bg },
});
