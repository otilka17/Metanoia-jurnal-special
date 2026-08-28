import { Platform } from "react-native";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let listeners: Array<() => void> = [];

if (Platform.OS === "web" && typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e: any) => {
    e.preventDefault();
    deferredPrompt = e;
    listeners.forEach((fn) => fn());
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    listeners.forEach((fn) => fn());
  });
}

export function isPwaInstalled(): boolean {
  if (Platform.OS !== "web" || typeof window === "undefined") return false;
  const standaloneMedia = window.matchMedia?.("(display-mode: standalone)")?.matches;
  const iosStandalone = (window.navigator as any).standalone === true;
  return !!standaloneMedia || iosStandalone;
}

export function isIos(): boolean {
  if (Platform.OS !== "web" || typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function canPromptInstall(): boolean {
  return !!deferredPrompt;
}

export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferredPrompt) return "unavailable";
  const current = deferredPrompt;
  await current.prompt();
  const choice = await current.userChoice;
  deferredPrompt = null;
  return choice.outcome;
}

export function subscribeInstallAvailability(cb: () => void): () => void {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}
