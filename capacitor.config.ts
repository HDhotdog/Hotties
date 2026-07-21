import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.hotties',
  appName: 'Hotties',
  webDir: 'www/browser',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    Keyboard: {
      resize: 'ionic' as any,
      resizeOnFullScreen: true
    }
  }
};

export default config;
