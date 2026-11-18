import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePrayerTimes, getNextPrayer, DEFAULT_PRAYER_SETTINGS, DEFAULT_IQAMA_CONFIG } from './prayerTimes.js';
import type { DayPrayerTimes } from './prayerTimes.js';
import {
  processDuePrayerNotifications,
  buildUpcoming48HourEvents,
  DEFAULT_NOTIFICATION_PREFS,
} from './notificationService.js';
import { nativeNotificationId } from './nativeNotifications.js';

const mins = (t: { hour: number; minute: number }) => t.hour * 60 + t.minute;
const CAIRO = { madhhab: 'shafi' as const, timezoneMode: 'manual' as const, manualTimezoneOffset: 2, dstMode: 'auto' as const, ianaTimezone: 'Africa/Cairo' };

test('Cairo (Egyptian General Authority) times stay unchanged — Nov 17 2026', () => {
  const t = calculatePrayerTimes(30.158, 31.339, new Date(2026, 10, 17, 12), 'egypt', CAIRO);
  assert.deepEqual(
    [t.fajr, t.sunrise, t.dhuhr, t.asr, t.maghrib, t.isha].map(mins),
    [4 * 60 + 51, 6 * 60 + 21, 11 * 60 + 40, 14 * 60 + 37, 16 * 60 + 57, 18 * 60 + 18]
  );
});

test('Cairo summer time (DST) shifts Dhuhr to ~12:59 on Jul 1 2026', () => {
  const t = calculatePrayerTimes(30.158, 31.339, new Date(2026, 6, 1, 12), 'egypt', CAIRO);
  assert.equal(t.dhuhr.hour, 12);
});

test('High latitude (Stockholm, Jun 21): Fajr/Isha are sane and in the right order', () => {
  const t = calculatePrayerTimes(59.33, 18.07, new Date(2026, 5, 21, 12), 'mwl', {
    timezoneMode: 'manual',
    manualTimezoneOffset: 1,
    dstMode: 'on',
  });
  const fajrBeforeSunrise = (mins(t.sunrise) - mins(t.fajr) + 1440) % 1440;
  const ishaAfterMaghrib = (mins(t.isha) - mins(t.maghrib) + 1440) % 1440;
  assert.ok(fajrBeforeSunrise >= 30 && fajrBeforeSunrise <= 240, `fajr gap ${fajrBeforeSunrise}`);
  assert.ok(ishaAfterMaghrib >= 30 && ishaAfterMaghrib <= 240, `isha gap ${ishaAfterMaghrib}`);
});

test('getNextPrayer after Isha counts down to TOMORROW\'s Fajr when given', () => {
  const today: DayPrayerTimes = {
    fajr: { hour: 4, minute: 51, timeStr: '' },
    sunrise: { hour: 6, minute: 21, timeStr: '' },
    dhuhr: { hour: 11, minute: 40, timeStr: '' },
    asr: { hour: 14, minute: 37, timeStr: '' },
    maghrib: { hour: 16, minute: 57, timeStr: '' },
    isha: { hour: 18, minute: 18, timeStr: '' },
  };
  const tomorrow: DayPrayerTimes = { ...today, fajr: { hour: 4, minute: 53, timeStr: '' } };
  const now = new Date(2026, 10, 17, 23, 0, 0);
  const next = getNextPrayer(today, now, tomorrow);
  assert.equal(next.index, 0);
  assert.equal(next.remainingSeconds, 3600 + 4 * 3600 + 53 * 60);
});

test('overlapping due-checks fire each notification exactly once (no double athan)', async () => {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  const times: DayPrayerTimes = {
    fajr: { hour: 4, minute: 48, timeStr: '' },
    sunrise: { hour: 6, minute: 17, timeStr: '' },
    dhuhr: { hour: 11, minute: 39, timeStr: '' },
    asr: { hour: 14, minute: 38, timeStr: '' },
    maghrib: { hour: 16, minute: 51, timeStr: '' },
    isha: { hour: 18, minute: 19, timeStr: '' },
  };
  const alerts: string[] = [];
  const run = () =>
    processDuePrayerNotifications({
      now: new Date(2031, 2, 4, 11, 39, 10),
      prayerTimes: times,
      enabledPrayers: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
      iqamaConfig: DEFAULT_IQAMA_CONFIG,
      prefs: { ...DEFAULT_NOTIFICATION_PREFS, playAudioOnAlert: false, notifyIqama: false },
      onInAppAlert: (a) => alerts.push(a.id),
    });
  const results = await Promise.all([run(), run(), run(), run()]);
  assert.equal(results.flat().length, 1);
  assert.equal(alerts.length, 1);
});

test('native notification ids are unique and fit in a 32-bit int for the whole 10-day horizon', () => {
  const events = buildUpcoming48HourEvents(
    DEFAULT_PRAYER_SETTINGS,
    { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
    DEFAULT_IQAMA_CONFIG,
    DEFAULT_NOTIFICATION_PREFS,
    new Date(2026, 10, 17, 8, 0, 0),
    10
  );
  assert.equal(events.length, 150); // 10 days x 5 prayers x (athan + pre-iqama + iqama)
  const ids = events.map((e) => nativeNotificationId(e.dateKey, e.prayerKey, e.eventType));
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every((n) => Number.isInteger(n) && n > 0 && n < 2147483647));
});

test('isNativeApp detects the Android WebView even before @capacitor/core is loaded', async () => {
  const { isNativeApp } = await import('./nativeNotifications.js');
  const g = globalThis as any;
  const saved = { cap: g.Capacitor, bridge: g.androidBridge };
  try {
    delete g.Capacitor;
    delete g.androidBridge;
    assert.equal(isNativeApp(), false); // plain browser

    g.androidBridge = { postMessage() {} }; // injected by Capacitor Android
    assert.equal(isNativeApp(), true);

    delete g.androidBridge;
    g.Capacitor = { isNative: true, platform: 'android' }; // partial object, no isNativePlatform()
    assert.equal(isNativeApp(), true);

    g.Capacitor = { getPlatform: () => 'web' };
    assert.equal(isNativeApp(), false);
  } finally {
    g.Capacitor = saved.cap;
    g.androidBridge = saved.bridge;
    if (saved.cap === undefined) delete g.Capacitor;
    if (saved.bridge === undefined) delete g.androidBridge;
  }
});
