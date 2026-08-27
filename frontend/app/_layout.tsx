import { Stack, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { useFonts } from "expo-font";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Notifications from "expo-notifications";
import { AuthProvider, useAuth } from "@/src/lib/auth";
import { storage } from "@/src/utils/storage";
import { theme } from "@/src/lib/theme";

function RootNav() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [ready, setReady] = useState(false);

  // Re-read the onboarding flag on every navigation-relevant change instead of
  // caching it in state, so finishing onboarding (which sets the flag and
  // navigates away) is picked up immediately without a stale-state redirect loop.
  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    (async () => {
      const seen = await storage.getItem("onboarding_seen", "");
      if (cancelled) return;
      const obSeen = !!seen;
      const inAuth = segments[0] === "(auth)";
      const inOnboarding = segments[0] === "onboarding";

      if (!obSeen && !inOnboarding) {
        router.replace("/onboarding");
      } else if (!user && !inAuth && !inOnboarding) {
        router.replace("/(auth)/login");
      } else if (user && inAuth) {
        router.replace("/(tabs)");
      }
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, [user, loading, segments]);

  // Handle notification tap → navigate to the route in notification data
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response?.notification?.request?.content?.data as any;
      if (data?.route && user) {
        try { router.push(data.route); } catch (e) { console.warn(e); }
      }
    });
    return () => sub.remove();
  }, [router, user]);

  if (loading || !ready) {
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
      <Stack.Screen name="forum/index" />
      <Stack.Screen name="forum/new" />
      <Stack.Screen name="forum/[id]" />
      <Stack.Screen name="family" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ ...Ionicons.font });
  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }
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
