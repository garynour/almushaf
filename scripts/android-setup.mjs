// Runs after `cap add android`. Everything Capacitor does not configure for us:
// permissions, notification sounds/icons, version numbers. Safe to run more than once.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = process.cwd();
const androidDir = path.join(root, 'android');
const manifestPath = path.join(androidDir, 'app/src/main/AndroidManifest.xml');
const gradlePath = path.join(androidDir, 'app/build.gradle');
const resDir = path.join(androidDir, 'app/src/main/res');

function fail(msg) {
  console.error('✖ ' + msg);
  process.exit(1);
}
if (!fs.existsSync(manifestPath)) fail('android/ not found. Run "npx cap add android" first.');

// ---- 1) Manifest permissions -------------------------------------------------
let manifest = fs.readFileSync(manifestPath, 'utf8');
const permissions = [
  'android.permission.INTERNET',
  'android.permission.POST_NOTIFICATIONS', // Android 13+: show notifications
  'android.permission.SCHEDULE_EXACT_ALARM', // Android 12+: exact prayer-time alarms (user can revoke)
  'android.permission.RECEIVE_BOOT_COMPLETED', // re-create alarms after the phone restarts
  'android.permission.VIBRATE',
  'android.permission.WAKE_LOCK',
  'android.permission.ACCESS_COARSE_LOCATION', // prayer times from approximate location
  'android.permission.ACCESS_FINE_LOCATION',
];
const features = [
  '<uses-feature android:name="android.hardware.location.gps" android:required="false" />',
  '<uses-feature android:name="android.hardware.location.network" android:required="false" />',
];
let inject = '';
for (const p of permissions) {
  if (!manifest.includes(`"${p}"`)) inject += `    <uses-permission android:name="${p}" />\n`;
}
for (const f of features) {
  const name = f.match(/android:name="([^"]+)"/)[1];
  if (!manifest.includes(`"${name}"`)) inject += `    ${f}\n`;
}
if (inject) {
  if (!manifest.includes('<application')) fail('Unexpected AndroidManifest.xml (no <application>).');
  manifest = manifest.replace('<application', inject.trimStart().replace(/^/, '') + '\n    <application');
  fs.writeFileSync(manifestPath, manifest);
  console.log('✔ Added missing permissions/features to AndroidManifest.xml');
} else {
  console.log('• Manifest already has all permissions');
}

// ---- 2) Raw sounds + notification icons --------------------------------------
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return 0;
  fs.mkdirSync(dest, { recursive: true });
  let n = 0;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) n += copyDir(s, d);
    else {
      fs.copyFileSync(s, d);
      n++;
    }
  }
  return n;
}
const copied = copyDir(path.join(root, 'android-resources'), resDir);
console.log(`✔ Copied ${copied} resource files (sounds + notification icons) into res/`);
for (const f of ['raw/athan.wav', 'raw/iqama.mp3', 'drawable-xxhdpi/ic_stat_notification.png']) {
  if (!fs.existsSync(path.join(resDir, f))) fail(`Missing resource: ${f}`);
}

// ---- 2b) Fixed debug signing key (CI only) ------------------------------------
// Every CI run would otherwise create a NEW random debug key, and Android refuses to install an
// APK over an older one signed with a different key. A fixed (non-secret) debug key fixes that.
const fixedDebugKey = path.join(root, 'scripts/debug.keystore');
if (process.env.CI && fs.existsSync(fixedDebugKey)) {
  const dir = path.join(os.homedir(), '.android');
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(fixedDebugKey, path.join(dir, 'debug.keystore'));
  console.log('✔ Using fixed debug keystore (test APKs can be installed over each other)');
}

// ---- 3) Version ---------------------------------------------------------------
const versionName = process.env.VERSION_NAME || '1.0.0';
const versionCode = process.env.VERSION_CODE || '1';
let gradle = fs.readFileSync(gradlePath, 'utf8');
const vc = /(versionCode\s*=?\s*)\d+/;
const vn = /(versionName\s*=?\s*)"[^"]*"/;
if (!vc.test(gradle) || !vn.test(gradle)) fail('Could not find versionCode/versionName in app/build.gradle');
gradle = gradle.replace(vc, `$1${versionCode}`).replace(vn, `$1"${versionName}"`);
fs.writeFileSync(gradlePath, gradle);
console.log(`✔ versionName=${versionName} versionCode=${versionCode}`);
