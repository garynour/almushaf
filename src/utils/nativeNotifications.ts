// Native (Capacitor / Android) prayer notifications.
//
// Why this file exists: inside the Android WebView the Web Notification API and Service-Worker
// background timers are not reliable, so prayer alerts must be scheduled with the OS alarm
// manager through @capacitor/local-notifications. All Capacitor imports are dynamic so this
// module stays importable in plain Node (unit tests) and in the normal web/PWA build.

export type NativePermission = 'granted' | 'denied' | 'default';

export interface NativeScheduledEvent {
  id: string;
  prayerKey: string;
  eventType: 'athan' | 'pre_iqama' | 'iqama';
  dateKey: string;
  triggerTimestampMs: number;
  title: string;
  body: string;
}

const PRAYER_ORDER = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const TYPE_ORDER = ['athan', 'pre_iqama', 'iqama'];

// NOTE: Android notification channels are immutable once created (sound included).
// If you ever change a sound file, bump the version suffix (v1 -> v2).
export const CHANNELS = {
  athan: { id: 'athan_v1', name: 'أذان الصلوات', sound: 'athan.wav' },
  iqama: { id: 'iqama_v1', name: 'إقامة الصلاة', sound: 'iqama.mp3' },
  reminder: { id: 'reminder_v1', name: 'تنبيهات قبل الإقامة', sound: undefined as string | undefined },
} as const;

const SMALL_ICON = 'ic_stat_notification';

let permissionCache: NativePermission = 'default';
let channelsReady = false;
let listenerReady = false;

export function isNativeApp(): boolean {
  try {
    const cap = (globalThis as any).Capacitor;
    return !!cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform();
  } catch {
    return false;
  }
}

async function plugin() {
  const mod = await import('@capacitor/local-notifications');
  return mod.LocalNotifications;
}

function mapPermission(v: string | undefined): NativePermission {
  if (v === 'granted') return 'granted';
  if (v === 'denied') return 'denied';
  return 'default';
}

export function getCachedNativePermission(): NativePermission {
  return permissionCache;
}

export async function refreshNativePermission(): Promise<NativePermission> {
  if (!isNativeApp()) return 'default';
  try {
    const LN = await plugin();
    const res = await LN.checkPermissions();
    permissionCache = mapPermission(res.display);
  } catch {
    // keep previous value
  }
  return permissionCache;
}

export async function requestNativePermission(): Promise<NativePermission> {
  if (!isNativeApp()) return 'default';
  try {
    const LN = await plugin();
    const res = await LN.requestPermissions();
    permissionCache = mapPermission(res.display);
  } catch {
    // ignore
  }
  return permissionCache;
}

/** Android 12+: exact alarms need the user to allow "Alarms & reminders" for the app. */
export async function getExactAlarmStatus(): Promise<'granted' | 'denied' | 'unknown'> {
  if (!isNativeApp()) return 'unknown';
  try {
    const LN = await plugin();
    const res = await LN.checkExactNotificationSetting();
    return res.exact_alarm === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'unknown';
  }
}

export async function openExactAlarmSettings(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    const LN = await plugin();
    await LN.changeExactNotificationSetting();
  } catch {
    // ignore
  }
}

async function ensureChannels(): Promise<void> {
  if (channelsReady) return;
  const LN = await plugin();
  const common = { importance: 5 as const, visibility: 1 as const, vibration: true, lights: true };
  await LN.createChannel({
    id: CHANNELS.athan.id,
    name: CHANNELS.athan.name,
    description: 'تنبيه دخول وقت الصلاة',
    sound: CHANNELS.athan.sound,
    ...common,
  });
  await LN.createChannel({
    id: CHANNELS.iqama.id,
    name: CHANNELS.iqama.name,
    description: 'تنبيه إقامة الصلاة',
    sound: CHANNELS.iqama.sound,
    ...common,
  });
  await LN.createChannel({
    id: CHANNELS.reminder.id,
    name: CHANNELS.reminder.name,
    description: 'تنبيه قبل الإقامة بثلاث دقائق',
    ...common,
    importance: 4 as const,
  });
  channelsReady = true;
}

/** Stable positive 32-bit id: YYYYMMDD * 100 + prayerIndex * 10 + typeIndex */
export function nativeNotificationId(dateKey: string, prayerKey: string, eventType: string): number {
  const day = Number(dateKey.replace(/-/g, ''));
  const p = Math.max(0, PRAYER_ORDER.indexOf(prayerKey));
  const t = Math.max(0, TYPE_ORDER.indexOf(eventType));
  return day * 100 + p * 10 + t;
}

function channelFor(eventType: string): string {
  if (eventType === 'athan') return CHANNELS.athan.id;
  if (eventType === 'iqama') return CHANNELS.iqama.id;
  return CHANNELS.reminder.id;
}

export async function cancelAllNative(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    const LN = await plugin();
    const pending = await LN.getPending();
    if (pending.notifications.length > 0) {
      await LN.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    }
  } catch {
    // ignore
  }
}

/**
 * Replaces every pending alarm with the given upcoming events (future ones only).
 * Safe to call repeatedly (on app start, on settings change).
 */
export async function scheduleNativePrayerEvents(
  events: NativeScheduledEvent[]
): Promise<{ scheduled: number; permission: NativePermission }> {
  if (!isNativeApp()) return { scheduled: 0, permission: 'default' };
  const permission = await refreshNativePermission();
  try {
    await cancelAllNative();
    if (permission !== 'granted' || events.length === 0) {
      return { scheduled: 0, permission };
    }
    await ensureChannels();
    const LN = await plugin();
    const nowMs = Date.now();
    const notifications = events
      .filter((e) => e.triggerTimestampMs > nowMs + 2000)
      .map((e) => ({
        id: nativeNotificationId(e.dateKey, e.prayerKey, e.eventType),
        title: e.title,
        body: e.body,
        channelId: channelFor(e.eventType),
        smallIcon: SMALL_ICON,
        autoCancel: true,
        schedule: { at: new Date(e.triggerTimestampMs), allowWhileIdle: true },
        extra: { prayerKey: e.prayerKey, eventType: e.eventType },
      }));
    if (notifications.length > 0) {
      await LN.schedule({ notifications });
    }
    return { scheduled: notifications.length, permission };
  } catch {
    return { scheduled: 0, permission };
  }
}

/** Immediate notification (used by the "test notification" button). */
export async function showNativeNow(title: string, body: string): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    const permission = await refreshNativePermission();
    if (permission !== 'granted') return false;
    await ensureChannels();
    const LN = await plugin();
    await LN.schedule({
      notifications: [
        {
          id: 1900000000 + Math.floor(Math.random() * 1000),
          title,
          body,
          channelId: CHANNELS.athan.id,
          smallIcon: SMALL_ICON,
          schedule: { at: new Date(Date.now() + 800), allowWhileIdle: true },
        },
      ],
    });
    return true;
  } catch {
    return false;
  }
}

/** Opens the prayer screen when the user taps a prayer notification. */
export async function initNativeNotificationListeners(onOpenPrayer: () => void): Promise<void> {
  if (!isNativeApp() || listenerReady) return;
  listenerReady = true;
  try {
    const LN = await plugin();
    await LN.addListener('localNotificationActionPerformed', () => onOpenPrayer());
  } catch {
    listenerReady = false;
  }
}
