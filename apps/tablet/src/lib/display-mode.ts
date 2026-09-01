import { Capacitor } from "@capacitor/core";
import { KeepAwake } from "@capacitor-community/keep-awake";
import { StatusBar } from "@capacitor/status-bar";

export async function enterExhibitionDisplayMode(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await StatusBar.hide();
  } catch {
    // Status bar plugin may be unavailable in some builds.
  }
  try {
    await KeepAwake.keepAwake();
  } catch {
    // Keep-awake is best-effort; FLAG_KEEP_SCREEN_ON is also set natively.
  }
}
