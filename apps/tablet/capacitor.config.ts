import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "art.installation.tablet",
  appName: "Installation Tablet",
  webDir: "dist",
  backgroundColor: "#000000",
  android: {
    backgroundColor: "#000000",
    allowMixedContent: false,
  },
  plugins: {
    StatusBar: {
      overlaysWebView: true,
      style: "DARK",
      backgroundColor: "#000000",
    },
  },
};

export default config;
