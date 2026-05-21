import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/src/lib/theme";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 12) + 8;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textDisabled,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          height: 56 + bottomPad,
          paddingTop: 8,
          paddingBottom: bottomPad,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "500" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Acasă",
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
          tabBarTestID: "tab-home",
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Căutare",
          tabBarIcon: ({ color, size }) => <Ionicons name="search" size={size} color={color} />,
          tabBarTestID: "tab-search",
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: "Jurnal",
          tabBarIcon: ({ color, size }) => <Ionicons name="book" size={size} color={color} />,
          tabBarTestID: "tab-journal",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
          tabBarTestID: "tab-profile",
        }}
      />
    </Tabs>
  );
}
