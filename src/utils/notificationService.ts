// Web Notification API & Local Prayer Alert Service
import {
  DayPrayerTimes,
  IqamaConfig,
  DEFAULT_IQAMA_CONFIG,
  PrayerSettings,
  calculateIqamaTime,
  calculatePrayerTimes,
  toArabicDigits,
  pad2,
} from './prayerTimes';
import {
  playAthanSound,
  playIqamaAlertSound,
  stopAthanSound,
  stopIqamaSound,
  triggerHaptic,
} from './audio';

import {
  getCachedNativePermission,
  getExactAlarmStatus,
  isNativeApp,
  refreshNativePermission,
  requestNativePermission,
  scheduleNativePrayerEvents,
  showNativeNow,
} from './nativeNotifications';

export type NotificationPermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';
export type PrayerKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export type PrayerNotificationEventType = 'athan' | 'pre_iqama' | 'iqama';

export interface NotificationServicePrefs {
  enabled: boolean;
  playAudioOnAlert: boolean;
  notifyIqama: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationServicePrefs = {
  enabled: true,
  playAudioOnAlert: true,
  notifyIqama: true,
};

export interface ScheduledNotificationEvent {
  id: string;
  prayerKey: PrayerKey;
  prayerNameAr: string;
  eventType: PrayerNotificationEventType;
  triggerTimeSeconds: number; // seconds since local midnight (0..86399)
  formattedTime: string;
  title: string;
  body: string;
  tag: string;
}

export interface InAppAlertBanner {
  id: string;
  prayerKey: PrayerKey;
  prayerNameAr: string;
  eventType: PrayerNotificationEventType;
  title: string;
  body: string;
  timeStr: string;
}

const PREFS_STORAGE_KEY = 'prayer_web_notification_prefs_v1';
const FIRED_STORAGE_KEY = 'prayer_web_notifications_fired_v1';

const PRAYER_META: ReadonlyArray<{ key: PrayerKey; nameAr: string }> = [
  { key: 'fajr', nameAr: 'الفجر' },
  { key: 'dhuhr', nameAr: 'الظهر' },
  { key: 'asr', nameAr: 'العصر' },
  { key: 'maghrib', nameAr: 'المغرب' },
  { key: 'isha', nameAr: 'العشاء' },
];

export function formatDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}-${m}-${d}`;
}

export function isWebNotificationSupported(): boolean {
  if (isNativeApp()) return true; // native app uses OS local notifications
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermissionStatus {
  if (isNativeApp()) return getCachedNativePermission();
  if (!isWebNotificationSupported()) return 'unsupported';
  return Notification.permission as NotificationPermissionStatus;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (isNativeApp()) {
    const res = await requestNativePermission();
    window.dispatchEvent(new Event('notification_prefs_updated'));
    return res;
  }
  if (!isWebNotificationSupported()) return 'unsupported';
  try {
    const result = await Notification.requestPermission();
    window.dispatchEvent(new Event('notification_prefs_updated'));
    return result as NotificationPermissionStatus;
  } catch {
    return getNotificationPermission();
  }
}

export function loadNotificationPrefs(): NotificationServicePrefs {
  if (typeof window === 'undefined') return DEFAULT_NOTIFICATION_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_PREFS;
    return { ...DEFAULT_NOTIFICATION_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_NOTIFICATION_PREFS;
  }
}

export function saveNotificationPrefs(prefs: NotificationServicePrefs): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
    window.dispatchEvent(new Event('notification_prefs_updated'));
  } catch {}
}

export function loadIqamaConfigSafe(): IqamaConfig {
  if (typeof window === 'undefined') return DEFAULT_IQAMA_CONFIG;
  try {
    const raw = localStorage.getItem('iqama_config');
    if (!raw) return DEFAULT_IQAMA_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_IQAMA_CONFIG,
      ...parsed,
      offsets: { ...DEFAULT_IQAMA_CONFIG.offsets, ...(parsed?.offsets || {}) },
    };
  } catch {
    return DEFAULT_IQAMA_CONFIG;
  }
}

export function loadFiredNotifications(dateKey: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(FIRED_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as { dateKey?: string; ids?: string[] };
    if (parsed.dateKey !== dateKey || !Array.isArray(parsed.ids)) {
      return new Set();
    }
    return new Set(parsed.ids);
  } catch {
    return new Set();
  }
}

export function markNotificationFired(eventId: string, dateKey: string): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = loadFiredNotifications(dateKey);
    existing.add(eventId);
    localStorage.setItem(
      FIRED_STORAGE_KEY,
      JSON.stringify({ dateKey, ids: Array.from(existing) })
    );
  } catch {}
}

/**
 * Pure scheduler: builds all local notification events for a given day
 * from the calculated prayer times, per-prayer bell toggles, and Iqama config.
 */
export function buildDailyNotificationSchedule(
  prayerTimes: DayPrayerTimes,
  enabledPrayers: Record<string, boolean>,
  iqamaConfig: IqamaConfig = DEFAULT_IQAMA_CONFIG,
  prefs: NotificationServicePrefs = DEFAULT_NOTIFICATION_PREFS,
  date: Date = new Date()
): ScheduledNotificationEvent[] {
  if (!prefs.enabled) return [];

  const dateKey = formatDateKey(date);
  const events: ScheduledNotificationEvent[] = [];

  for (const prayer of PRAYER_META) {
    if (enabledPrayers[prayer.key] === false) continue;

    const slot = prayerTimes[prayer.key];
    const athanSeconds = slot.hour * 3600 + slot.minute * 60;

    // 1. Athan time notification
    events.push({
      id: `${dateKey}|${prayer.key}|athan`,
      prayerKey: prayer.key,
      prayerNameAr: prayer.nameAr,
      eventType: 'athan',
      triggerTimeSeconds: athanSeconds,
      formattedTime: slot.timeStr,
      title: `حان الآن موعد أذان ${prayer.nameAr}`,
      body: `الوقت الآن ${slot.timeStr} · حيّ على الصلاة، حيّ على الفلاح`,
      tag: `prayer-${prayer.key}-athan-${dateKey}`,
    });

    // 2. Iqama & 3-minute pre-Iqama reminders
    if (prefs.notifyIqama && iqamaConfig.enabled) {
      const iqama = calculateIqamaTime(slot.hour, slot.minute, iqamaConfig.offsets[prayer.key] ?? 15);
      const iqamaSeconds = iqama.hour * 3600 + iqama.minute * 60;

      // Handle 3 minutes before Iqama (skip if wraps past midnight differently than prayer day)
      if (iqamaConfig.advanceAlert3Min) {
        const preIqamaSeconds = iqamaSeconds - 180;
        if (preIqamaSeconds >= 0 && preIqamaSeconds > athanSeconds) {
          const preHour = Math.floor(preIqamaSeconds / 3600);
          const preMin = Math.floor((preIqamaSeconds % 3600) / 60);
          const preFormatted = `${toArabicDigits(pad2(preHour))}:${toArabicDigits(pad2(preMin))}`;
          events.push({
            id: `${dateKey}|${prayer.key}|pre_iqama`,
            prayerKey: prayer.key,
            prayerNameAr: prayer.nameAr,
            eventType: 'pre_iqama',
            triggerTimeSeconds: preIqamaSeconds,
            formattedTime: preFormatted,
            title: `تنبيه قبل إقامة ${prayer.nameAr} بـ ٣ دقائق`,
            body: `تقام صلاة ${prayer.nameAr} الساعة ${iqama.iqamaTimeStr} بإذن الله`,
            tag: `prayer-${prayer.key}-pre-iqama-${dateKey}`,
          });
        }
      }

      if (iqamaSeconds >= athanSeconds) {
        events.push({
          id: `${dateKey}|${prayer.key}|iqama`,
          prayerKey: prayer.key,
          prayerNameAr: prayer.nameAr,
          eventType: 'iqama',
          triggerTimeSeconds: iqamaSeconds,
          formattedTime: iqama.iqamaTimeStr,
          title: `أُقيمت صلاة ${prayer.nameAr}`,
          body: `حان الآن وقت إقامة صلاة ${prayer.nameAr} (${iqama.iqamaTimeStr})`,
          tag: `prayer-${prayer.key}-iqama-${dateKey}`,
        });
      }
    }
  }

  return events.sort((a, b) => a.triggerTimeSeconds - b.triggerTimeSeconds);
}

/**
 * Finds events that are currently due within [0, graceWindowSeconds] after their scheduled time
 * and have not yet fired.
 */
export function findDueNotificationEvents(
  schedule: ScheduledNotificationEvent[],
  now: Date,
  firedIds: Set<string>,
  graceWindowSeconds: number = 90
): ScheduledNotificationEvent[] {
  const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  return schedule.filter((ev) => {
    if (firedIds.has(ev.id)) return false;
    const elapsed = nowSeconds - ev.triggerTimeSeconds;
    return elapsed >= 0 && elapsed <= graceWindowSeconds;
  });
}

export function getNextScheduledEvent(
  schedule: ScheduledNotificationEvent[],
  now: Date
): { event: ScheduledNotificationEvent; secondsUntil: number } | null {
  const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  for (const ev of schedule) {
    if (ev.triggerTimeSeconds > nowSeconds) {
      return { event: ev, secondsUntil: ev.triggerTimeSeconds - nowSeconds };
    }
  }
  return null;
}

export async function dispatchWebNotification(payload: {
  title: string;
  body: string;
  tag?: string;
  data?: Record<string, unknown>;
  requireInteraction?: boolean;
}): Promise<boolean> {
  if (isNativeApp()) {
    return showNativeNow(payload.title, payload.body);
  }
  if (!isWebNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  const options: NotificationOptions & {
    vibrate?: number[];
    renotify?: boolean;
    actions?: Array<{ action: string; title: string }>;
  } = {
    body: payload.body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: payload.tag,
    dir: 'rtl',
    lang: 'ar',
    renotify: true,
    requireInteraction: payload.requireInteraction ?? false,
    data: { url: '/', ...payload.data },
    vibrate: [200, 100, 200],
  };

  // Prefer Service Worker registration (required on Android Chrome / PWA & supports action buttons)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.active) {
        await reg.showNotification(payload.title, {
          ...options,
          actions: [
            { action: 'open_prayer', title: 'عرض المواقيت' },
          ],
        } as NotificationOptions);
        return true;
      }
    } catch {
      // Fallback to direct Notification constructor below
    }
  }

  try {
    const notification = new Notification(payload.title, options);
    notification.onclick = () => {
      try {
        window.focus();
      } catch {}
      notification.close();
    };
    return true;
  } catch {
    return false;
  }
}

export async function sendTestPrayerNotification(
  nextPrayerName: string = 'الظهر',
  nextPrayerTime?: string
): Promise<{ ok: boolean; permission: NotificationPermissionStatus }> {
  let perm = getNotificationPermission();
  if (perm === 'default') {
    perm = await requestNotificationPermission();
  }
  if (perm !== 'granted') {
    return { ok: false, permission: perm };
  }

  const timeNote = nextPrayerTime ? ` (${nextPrayerTime})` : '';
  const ok = await dispatchWebNotification({
    title: `تنبيه تجريبي · صلاة ${nextPrayerName}`,
    body: `إشعارات مواقيت الصلاة مفعّلة وتعمل بنجاح — الصلاة القادمة: ${nextPrayerName}${timeNote}`,
    tag: `prayer-test-${Date.now()}`,
  });
  triggerHaptic(25);
  return { ok, permission: perm };
}

/**
 * Evaluates due prayer & iqama notifications for the current instant,
 * dispatches Web Notifications, optionally plays Athan/Iqama audio, and notifies UI banner listeners.
 */
const inFlightNotificationIds = new Set<string>();

export async function processDuePrayerNotifications(params: {
  now: Date;
  prayerTimes: DayPrayerTimes;
  enabledPrayers: Record<string, boolean>;
  iqamaConfig: IqamaConfig;
  prefs: NotificationServicePrefs;
  onInAppAlert?: (alert: InAppAlertBanner) => void;
}): Promise<ScheduledNotificationEvent[]> {
  const { now, prayerTimes, enabledPrayers, iqamaConfig, prefs, onInAppAlert } = params;
  if (!prefs.enabled) return [];

  const dateKey = formatDateKey(now);
  const schedule = buildDailyNotificationSchedule(prayerTimes, enabledPrayers, iqamaConfig, prefs, now);

  // Read the IndexedDB "fired" ids first (the only async gap) ...
  let dbFired = new Set<string>();
  try {
    dbFired = await loadFiredNotificationsFromDb(dateKey);
  } catch {}

  // ... then do the check-and-claim step synchronously, so two overlapping calls
  // (exact timer + 10s interval + visibility change) can never both claim the same event.
  const firedIds = loadFiredNotifications(dateKey);
  dbFired.forEach((id) => firedIds.add(id));
  inFlightNotificationIds.forEach((id) => firedIds.add(id));

  const dueEvents = findDueNotificationEvents(schedule, now, firedIds, 75);
  if (dueEvents.length === 0) return [];

  for (const ev of dueEvents) {
    inFlightNotificationIds.add(ev.id);
    markNotificationFired(ev.id, dateKey);
    void markNotificationFiredInDb(ev.id, dateKey);
  }

  const native = isNativeApp();

  for (const ev of dueEvents) {
    onInAppAlert?.({
      id: ev.id,
      prayerKey: ev.prayerKey,
      prayerNameAr: ev.prayerNameAr,
      eventType: ev.eventType,
      title: ev.title,
      body: ev.body,
      timeStr: ev.formattedTime,
    });

    triggerHaptic(ev.eventType === 'pre_iqama' ? 30 : ([200, 100, 200] as any));

    // In the native app the OS alarm already posted this notification (with its own sound),
    // so posting/playing it again here would duplicate both.
    if (!native) {
      await dispatchWebNotification({
        title: ev.title,
        body: ev.body,
        tag: ev.tag,
        requireInteraction: ev.eventType !== 'pre_iqama',
        data: {
          prayerKey: ev.prayerKey,
          eventType: ev.eventType,
        },
      });

      if (prefs.playAudioOnAlert) {
        if (ev.eventType === 'athan') {
          let selectedAthan = 'makkah';
          try {
            selectedAthan = localStorage.getItem('selected_athan') || 'makkah';
          } catch {}
          playAthanSound(selectedAthan);
        } else if (ev.eventType === 'iqama') {
          playIqamaAlertSound();
        }
      }
    }
  }

  // Keep the in-flight set small (ids older than today are irrelevant).
  if (inFlightNotificationIds.size > 60) {
    inFlightNotificationIds.clear();
  }

  return dueEvents;
}

export function stopAllPrayerAlertAudio(): void {
  stopAthanSound();
  stopIqamaSound();
}

// ============================================================================
// Shared IndexedDB & Background Service Worker Synchronization (Offline / Closed)
// ============================================================================

const PRAYER_DB_NAME = 'quran-prayer-db';
const PRAYER_DB_VERSION = 1;
const STATE_STORE = 'state';
const FIRED_STORE = 'fired';

export interface UpcomingTimestampedEvent extends ScheduledNotificationEvent {
  triggerTimestampMs: number;
  dateKey: string;
}

export interface SyncedPrayerConfigPayload {
  prayerSettings: PrayerSettings;
  enabledPrayers: Record<string, boolean>;
  iqamaConfig: IqamaConfig;
  notifPrefs: NotificationServicePrefs;
  upcomingEvents: UpcomingTimestampedEvent[];
  updatedAt: number;
}

export interface BackgroundSyncCapabilities {
  notificationSupported: boolean;
  permission: NotificationPermissionStatus;
  serviceWorkerReady: boolean;
  periodicSyncRegistered: boolean;
  timestampTriggerSupported: boolean;
  isStandaloneOrApk: boolean;
  isNative: boolean;
  exactAlarm: 'granted' | 'denied' | 'unknown';
}

function openPrayerDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(PRAYER_DB_NAME, PRAYER_DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STATE_STORE)) {
          db.createObjectStore(STATE_STORE);
        }
        if (!db.objectStoreNames.contains(FIRED_STORE)) {
          db.createObjectStore(FIRED_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function markNotificationFiredInDb(eventId: string, dateKey: string): Promise<void> {
  const db = await openPrayerDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(FIRED_STORE, 'readwrite');
      tx.objectStore(FIRED_STORE).put({ id: eventId, dateKey, firedAt: Date.now() }, eventId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function loadFiredNotificationsFromDb(dateKey: string): Promise<Set<string>> {
  const db = await openPrayerDb();
  if (!db) return new Set();
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(FIRED_STORE, 'readonly');
      const req = tx.objectStore(FIRED_STORE).getAll();
      req.onsuccess = () => {
        const set = new Set<string>();
        const rows = Array.isArray(req.result) ? req.result : [];
        for (const row of rows) {
          if (row?.dateKey === dateKey && typeof row?.id === 'string') {
            set.add(row.id);
          }
        }
        resolve(set);
      };
      req.onerror = () => resolve(new Set());
    } catch {
      resolve(new Set());
    }
  });
}

async function saveConfigToDb(payload: SyncedPrayerConfigPayload): Promise<boolean> {
  const db = await openPrayerDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STATE_STORE, 'readwrite');
      tx.objectStore(STATE_STORE).put(payload, 'config');
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export function buildUpcoming48HourEvents(
  prayerSettings: PrayerSettings,
  enabledPrayers: Record<string, boolean>,
  iqamaConfig: IqamaConfig,
  notifPrefs: NotificationServicePrefs,
  now: Date = new Date(),
  days: number = 2
): UpcomingTimestampedEvent[] {
  if (!notifPrefs.enabled) return [];

  const result: UpcomingTimestampedEvent[] = [];
  for (let dayOffset = 0; dayOffset < days; dayOffset++) {
    const dayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, 12, 0, 0);
    const midnightMs = new Date(
      dayDate.getFullYear(),
      dayDate.getMonth(),
      dayDate.getDate(),
      0,
      0,
      0
    ).getTime();
    const dateKey = formatDateKey(dayDate);

    const dayTimes = calculatePrayerTimes(
      prayerSettings.lat,
      prayerSettings.lng,
      dayDate,
      prayerSettings.calcMethod,
      {
        madhhab: prayerSettings.madhhab,
        dstMode: prayerSettings.dstMode,
        timezoneMode: prayerSettings.timezoneMode,
        manualTimezoneOffset: prayerSettings.manualTimezoneOffset,
        ianaTimezone: prayerSettings.ianaTimezone,
        manualOffsets: prayerSettings.manualOffsets,
      }
    );

    const events = buildDailyNotificationSchedule(
      dayTimes,
      enabledPrayers,
      iqamaConfig,
      notifPrefs,
      dayDate
    );

    for (const ev of events) {
      result.push({
        ...ev,
        dateKey,
        triggerTimestampMs: midnightMs + ev.triggerTimeSeconds * 1000,
      });
    }
  }
  return result;
}

export async function registerBackgroundPrayerSync(): Promise<boolean> {
  if (isNativeApp()) return true; // native alarms need no service worker
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    if (!reg) return false;

    let periodicActive = false;
    const anyReg = reg as ServiceWorkerRegistration & {
      periodicSync?: {
        register: (tag: string, opts?: { minInterval?: number }) => Promise<void>;
        getTags: () => Promise<string[]>;
      };
      sync?: { register: (tag: string) => Promise<void> };
    };

    if (anyReg.periodicSync) {
      try {
        await anyReg.periodicSync.register('prayer-check-sync', {
          minInterval: 15 * 60 * 1000,
        });
        const tags = await anyReg.periodicSync.getTags();
        periodicActive = tags.includes('prayer-check-sync');
      } catch {
        // Fallback: some browsers deny periodicSync when not installed yet
      }
    }

    if (anyReg.sync) {
      try {
        await anyReg.sync.register('prayer-sync');
      } catch {}
    }

    return periodicActive;
  } catch {
    return false;
  }
}

/** How many days ahead alarms/notifications are scheduled. Re-scheduled on every app start. */
export const SCHEDULE_HORIZON_DAYS = 10;

export async function syncPrayerScheduleToServiceWorker(params: {
  prayerSettings: PrayerSettings;
  enabledPrayers: Record<string, boolean>;
  iqamaConfig: IqamaConfig;
  notifPrefs: NotificationServicePrefs;
}): Promise<{ synced: boolean; periodicSyncActive: boolean; timestampTriggerSupported: boolean }> {
  const { prayerSettings, enabledPrayers, iqamaConfig, notifPrefs } = params;
  const upcomingEvents = buildUpcoming48HourEvents(
    prayerSettings,
    enabledPrayers,
    iqamaConfig,
    notifPrefs,
    new Date(),
    SCHEDULE_HORIZON_DAYS
  );

  // Native Android app: schedule real OS alarms and stop here.
  if (isNativeApp()) {
    const res = await scheduleNativePrayerEvents(notifPrefs.enabled ? upcomingEvents : []);
    return { synced: res.permission === 'granted', periodicSyncActive: false, timestampTriggerSupported: false };
  }

  const payload: SyncedPrayerConfigPayload = {
    prayerSettings,
    enabledPrayers,
    iqamaConfig,
    notifPrefs,
    upcomingEvents,
    updatedAt: Date.now(),
  };

  const dbOk = await saveConfigToDb(payload);
  let periodicSyncActive = false;

  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      const targetSw = reg?.active || navigator.serviceWorker.controller;
      if (targetSw) {
        targetSw.postMessage({ type: 'SYNC_PRAYER_SCHEDULE', config: payload });
      }
      if (getNotificationPermission() === 'granted' && notifPrefs.enabled) {
        periodicSyncActive = await registerBackgroundPrayerSync();
      }
    } catch {}
  }

  // TimestampTrigger was an abandoned Chrome experiment; it is no longer used.
  return { synced: dbOk, periodicSyncActive, timestampTriggerSupported: false };
}

export async function getBackgroundNotificationCapabilities(): Promise<BackgroundSyncCapabilities> {
  if (isNativeApp()) {
    const permission = await refreshNativePermission();
    return {
      notificationSupported: true,
      permission,
      serviceWorkerReady: true,
      periodicSyncRegistered: false,
      timestampTriggerSupported: false,
      isStandaloneOrApk: true,
      isNative: true,
      exactAlarm: await getExactAlarmStatus(),
    };
  }
  const notificationSupported = isWebNotificationSupported();
  const permission = getNotificationPermission();
  const timestampTriggerSupported = false;
  const isStandaloneOrApk =
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches ||
      (typeof document !== 'undefined' && document.referrer.startsWith('android-app://')));

  let serviceWorkerReady = false;
  let periodicSyncRegistered = false;

  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.active) {
        serviceWorkerReady = true;
        const anyReg = reg as ServiceWorkerRegistration & {
          periodicSync?: { getTags: () => Promise<string[]> };
        };
        if (anyReg.periodicSync) {
          const tags = await anyReg.periodicSync.getTags();
          periodicSyncRegistered = tags.includes('prayer-check-sync');
        }
      }
    } catch {}
  }

  return {
    notificationSupported,
    permission,
    serviceWorkerReady,
    periodicSyncRegistered,
    timestampTriggerSupported,
    isStandaloneOrApk,
    isNative: false,
    exactAlarm: 'unknown',
  };
}
