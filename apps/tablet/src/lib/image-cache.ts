import { Directory, Filesystem } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";

export async function persistImage(submissionId: string, bytes: Blob): Promise<string> {
  const buffer = await bytes.arrayBuffer();
  const base64 = arrayBufferToBase64(buffer);
  const path = `artwork-${submissionId}.bin`;
  await Filesystem.writeFile({
    path,
    data: base64,
    directory: Directory.Data,
  });
  if (Capacitor.isNativePlatform()) {
    const uri = await Filesystem.getUri({ path, directory: Directory.Data });
    return Capacitor.convertFileSrc(uri.uri);
  }
  return `data:${bytes.type || "image/webp"};base64,${base64}`;
}

export async function deleteImageFile(submissionId: string): Promise<void> {
  try {
    await Filesystem.deleteFile({
      path: `artwork-${submissionId}.bin`,
      directory: Directory.Data,
    });
  } catch {
    // File may already be absent.
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
