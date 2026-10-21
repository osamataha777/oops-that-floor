import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.oopsthatfloor.game',
  appName: 'Oops! That Floor!',
  webDir: 'dist',
  backgroundColor: '#efe9dd',
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: 'never',
    scrollEnabled: false,
  },
  plugins: {
    CapacitorHttp: {
      enabled: false,
    },
  },
};

export default config;
