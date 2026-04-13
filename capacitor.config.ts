import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.babcorp.streamdeck',
  appName: 'StreamDeck',
  // Point to your live Vercel URL — the APK is just a shell
  server: {
    url: 'https://streamdeck-mu.vercel.app',
    cleartext: true,
  },
  android: {
    // Fullscreen, landscape for TV
    backgroundColor: '#06060e',
  },
};

export default config;
