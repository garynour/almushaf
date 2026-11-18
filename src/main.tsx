import '@capacitor/core';
import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import '@fontsource/cairo/400.css';
import '@fontsource/cairo/500.css';
import '@fontsource/cairo/600.css';
import '@fontsource/cairo/700.css';
import '@fontsource/cairo/800.css';
import '@fontsource/cairo/900.css';
import '@fontsource/amiri/400.css';
import '@fontsource/amiri/700.css';
import '@fontsource/amiri/400-italic.css';
import '@fontsource/amiri-quran/400.css';
import App from './App.tsx';
import './index.css';
import {installAudioUnlock} from './utils/audio';
import {isNativeApp} from './utils/nativeNotifications';

createRoot(document.getElementById('root')!).render(<App />);

installAudioUnlock();

// Service worker is for the web/PWA version only. Inside the Android app every file is already
// bundled in the APK, and a service worker there would only risk serving stale files after updates.
if (!isNativeApp()) {
  registerSW({ immediate: true });
}
