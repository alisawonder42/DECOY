import { Preferences } from "@capacitor/preferences";

const TABLET_ID = "tabletId";
const DEVICE_TOKEN = "deviceToken";
const ADMIN_PIN = "adminPin";
const CURRENT_SUBMISSION = "currentSubmissionId";
const CURRENT_IMAGE_URI = "currentLocalImageUri";

export type Provisioning = {
  tabletId: string;
  deviceToken: string;
  adminPin: string;
};

export async function readProvisioning(): Promise<Provisioning | null> {
  const tabletId = (await Preferences.get({ key: TABLET_ID })).value;
  const deviceToken = (await Preferences.get({ key: DEVICE_TOKEN })).value;
  const adminPin = (await Preferences.get({ key: ADMIN_PIN })).value;
  if (!tabletId || !deviceToken || !adminPin) return null;
  return { tabletId, deviceToken, adminPin };
}

export async function writeProvisioning(value: Provisioning): Promise<void> {
  await Preferences.set({ key: TABLET_ID, value: value.tabletId });
  await Preferences.set({ key: DEVICE_TOKEN, value: value.deviceToken });
  await Preferences.set({ key: ADMIN_PIN, value: value.adminPin });
}

export async function readCachedArtwork(): Promise<{
  submissionId: string;
  uri: string;
} | null> {
  const submissionId = (await Preferences.get({ key: CURRENT_SUBMISSION })).value;
  const uri = (await Preferences.get({ key: CURRENT_IMAGE_URI })).value;
  if (!submissionId || !uri) return null;
  return { submissionId, uri };
}

export async function writeCachedArtwork(submissionId: string, uri: string): Promise<void> {
  await Preferences.set({ key: CURRENT_SUBMISSION, value: submissionId });
  await Preferences.set({ key: CURRENT_IMAGE_URI, value: uri });
}

export async function clearCachedArtwork(): Promise<void> {
  await Preferences.remove({ key: CURRENT_SUBMISSION });
  await Preferences.remove({ key: CURRENT_IMAGE_URI });
}
