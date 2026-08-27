import { useState } from "react";
import { Stack, useRouter, usePathname } from "expo-router";
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/lib/theme";
import { useAuth } from "@/src/lib/auth";

const MENU = [
  { label: "Acasă", route: "/(tabs)", icon: "home" as const },
  { label: "Familie", route: "/family", icon: "people-circle" as const },
  { label: "Comunitate", route: "/forum", icon: "people" as const },
  { label: "Test profil copil", route: "/(tabs)/test", icon: "clipboard" as const },
  { label: "Întreabă specialistul", route: "/(tabs)/ask", icon: "chatbubbles" as const },
  { label: "Ghidul Specialistului", route: "/(tabs)/guide", icon: "library" as const },
  { label: "Mind Map", route: "/(tabs)/mindmap", icon: "git-network" as const },
  { label: "Căutare", route: "/(tabs)/search", icon: "search" as const },
  { label: "Jurnal", route: "/(tabs)/journal", icon: "book" as const },
  { label: "Profil", route: "/(tabs)/profile", icon: "person" as const },
];

const ADMIN_ITEM = { label: "Admin", route: "/admin", icon: "shield-checkmark" as const };

function HeaderBar({ onMenu }: { onMenu: () => void }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity testID="burger-menu-button" onPress={onMenu} style={styles.iconBtn}>
        <Ionicons name="menu" size={26} color={theme.colors.textPrimary} />
      </TouchableOpacity>
      <Text style={styles.brand}>Ghid Părinte</Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

function BottomNav() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 10) + 8 }]}>
      <TouchableOpacity testID="nav-back" style={styles.navBtn} onPress={() => router.canGoBack() && router.back()}>
        <Ionicons name="chevron-back" size={22} color={theme.colors.primary} />
        <Text style={styles.navText}>Înapoi</Text>
      </TouchableOpacity>
      <View style={styles.navDivider} />
      <TouchableOpacity testID="nav-home" style={styles.navBtn} onPress={() => router.replace("/(tabs)")}>
        <Ionicons name="home" size={20} color={theme.colors.primary} />
        <Text style={styles.navText}>Acasă</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function TabsLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const go = (r: string) => { setOpen(false); router.push(r as any); };

  const menuItems = user?.is_admin ? [...MENU, ADMIN_ITEM] : MENU;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: theme.colors.bg }}>
        <HeaderBar onMenu={() => setOpen(true)} />
      </SafeAreaView>

      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.bg } }} />
      </View>

      <BottomNav />

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.drawerBg} onPress={() => setOpen(false)}>
          <Pressable style={styles.drawer} onPress={(e) => e.stopPropagation()}>
            <SafeAreaView edges={["top"]}>
              <View style={styles.drawerHeader}>
                <Text style={styles.drawerBrand}>Meniu</Text>
                <TouchableOpacity onPress={() => setOpen(false)}><Ionicons name="close" size={24} color={theme.colors.textPrimary} /></TouchableOpacity>
              </View>
              {menuItems.map((m) => {
                const active = pathname === m.route || (m.route === "/(tabs)" && pathname === "/");
                const isAdmin = m.route === "/admin";
                return (
                  <TouchableOpacity key={m.route} testID={`menu-${m.icon}`} style={[styles.menuItem, active && styles.menuItemActive, isAdmin && { borderTopWidth: 1, borderTopColor: theme.colors.border, marginTop: 8 }]} onPress={() => go(m.route)}>
                    <Ionicons name={m.icon} size={20} color={active ? theme.colors.primary : (isAdmin ? "#B56B6B" : theme.colors.textPrimary)} />
                    <Text style={[styles.menuText, active && { color: theme.colors.primary, fontWeight: "700" }, isAdmin && !active && { color: "#B56B6B", fontWeight: "600" }]}>{m.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surface },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  brand: { fontSize: 16, fontWeight: "700", color: theme.colors.primary, letterSpacing: 0.3 },
  bottomNav: { flexDirection: "row", borderTopWidth: 1, borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface, paddingTop: 8 },
  navBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 6 },
  navText: { color: theme.colors.primary, fontSize: 13, fontWeight: "600" },
  navDivider: { width: 1, backgroundColor: theme.colors.border, marginVertical: 4 },
  drawerBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", flexDirection: "row" },
  drawer: { width: 280, backgroundColor: theme.colors.surface, height: "100%" },
  drawerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  drawerBrand: { fontSize: 18, fontWeight: "700", color: theme.colors.textPrimary },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingVertical: 14 },
  menuItemActive: { backgroundColor: theme.colors.primary + "11", borderLeftWidth: 4, borderLeftColor: theme.colors.primary },
  menuText: { fontSize: 15, color: theme.colors.textPrimary },
});
