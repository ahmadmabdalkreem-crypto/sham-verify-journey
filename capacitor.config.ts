import type { CapacitorConfig } from "@capacitor/cli";

// The app loads the live published site (server-rendered), so updates reach users without a store release.
const config: CapacitorConfig = {
  appId: "app.lovable.shamcash",
  appName: "ShamCash",
  webDir: "public",
  server: {
    url: "https://verify-wizard-hub.lovable.app",
    cleartext: false,
  },
  ios: { contentInset: "always" },
  backgroundColor: "#151a2c",
};

export default config;
