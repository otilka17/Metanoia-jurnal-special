import * as Notifications from "expo-notifications";
import { Platform, Linking, Alert } from "react-native";
import { storage } from "@/src/utils/storage";

export const REMINDER_KEY = "journal_reminder";
export const REMINDER_NOTIF_ID = "journal-daily-reminder";

export type ReminderSettings = {
  enabled: boolean;
  hour: number;   // 0-23
  minute: number; // 0-59
};

// Configure how notifications are shown when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function getReminderSettings(): Promise<ReminderSettings> {
  const raw = await storage.getItem(REMINDER_KEY, "");
  if (!raw) return { enabled: false, hour: 20, minute: 0 };
  try {
    const parsed = JSON.parse(raw);
    return {
      enabled: !!parsed.enabled,
      hour: typeof parsed.hour === "number" ? parsed.hour : 20,
      minute: typeof parsed.minute === "number" ? parsed.minute : 0,
    };
  } catch {
    return { enabled: false, hour: 20, minute: 0 };
  }
}

export async function saveReminderSettings(s: ReminderSettings) {
  await storage.setItem(REMINDER_KEY, JSON.stringify(s));
}

export async function requestNotificationPermission(): Promise<{ granted: boolean; canAskAgain: boolean }> {
  // Android: set up the channel before scheduling (no-op on iOS)
  if (Platform.OS === "android") {
    try {
      await Notifications.setNotificationChannelAsync("journal-reminder", {
        name: "Reminder Jurnal",
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: "default",
        vibrationPattern: [0, 250, 250, 250],
      });
    } catch (e) { console.warn("channel setup failed", e); }
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.status === "granted") return { granted: true, canAskAgain: true };

  if (!current.canAskAgain) {
    return { granted: false, canAskAgain: false };
  }

  const req = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: true,
    },
  });
  return { granted: req.status === "granted", canAskAgain: req.canAskAgain };
}

export async function cancelAllJournalReminders() {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.content.data?.kind === "journal-reminder") {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch (e) { console.warn("cancel failed", e); }
}

export async function scheduleDailyReminder(hour: number, minute: number): Promise<boolean> {
  try {
    await cancelAllJournalReminders();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Cum a fost ziua cu cel mic? 📝",
        body: "Adaugă o însemnare scurtă în jurnal — observațiile zilnice te ajută să identifici tipare.",
        data: { kind: "journal-reminder", route: "/(tabs)/journal" },
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        ...(Platform.OS === "android" ? { channelId: "journal-reminder" } : {}),
      } as any,
    });
    return true;
  } catch (e) {
    console.warn("schedule failed", e);
    return false;
  }
}

export function openAppSettings() {
  if (Platform.OS === "ios") {
    Linking.openURL("app-settings:").catch(() => Linking.openSettings());
  } else {
    Linking.openSettings();
  }
}

/** Friendly Alert helper for blocked permissions */
export function showSettingsAlert() {
  Alert.alert(
    "Permisiuni notificări dezactivate",
    "Te rog activează notificările din Setări pentru a primi reminderul zilnic.",
    [
      { text: "Anulează", style: "cancel" },
      { text: "Deschide setări", onPress: () => openAppSettings() },
    ]
  );
}
