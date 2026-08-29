import { Share } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Alert } from "@/src/lib/alert";

/**
 * Tries the native share sheet; most desktop/laptop browsers don't implement
 * navigator.share, so Share.share() rejects silently there. Falls back to
 * copying the message to the clipboard so the action always does something.
 */
export async function shareOrCopy(message: string) {
  try {
    await Share.share({ message });
  } catch (e) {
    try {
      await Clipboard.setStringAsync(message);
      Alert.alert(
        "Copiat ✓",
        "Browserul tău nu are opțiune de trimitere directă, așa că am copiat mesajul — îl poți lipi oriunde (WhatsApp, email etc.)."
      );
    } catch (e2) {
      console.warn(e2);
    }
  }
}
