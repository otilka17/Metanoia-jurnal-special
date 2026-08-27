// react-native-web's Alert.alert() is a no-op (see node_modules/react-native-web/src/exports/Alert),
// so every error/confirmation dialog in the app silently did nothing on web. This wraps it with a
// window.alert/confirm fallback on web while delegating to the real native Alert everywhere else.
import { Alert as RNAlert, Platform } from "react-native";

type AlertButton = { text?: string; style?: "default" | "cancel" | "destructive"; onPress?: () => void };

function alert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== "web") {
    RNAlert.alert(title, message, buttons as any);
    return;
  }
  const text = message ? `${title}\n\n${message}` : title;
  if (!buttons || buttons.length <= 1) {
    window.alert(text);
    buttons?.[0]?.onPress?.();
    return;
  }
  const cancelButton = buttons.find((b) => b.style === "cancel");
  const confirmButton = buttons.find((b) => b !== cancelButton) || buttons[buttons.length - 1];
  if (window.confirm(text)) {
    confirmButton.onPress?.();
  } else {
    cancelButton?.onPress?.();
  }
}

export const Alert = { alert };
