// Service Worker background prayer notifications (web / PWA version only).
//
// The Android app does NOT use this file: it schedules real OS alarms through
// @capacitor/local-notifications (see src/utils/nativeNotifications.ts).
//
// On the web, browsers give a service worker no reliable "wake me at 04:51" API. This file
// therefore works on a best-effort basis: whenever the worker is woken up (periodic sync, sync,
// activation, or a message from the page) it shows any notification whose time passed within the
// last few minutes. The list of upcoming events is computed by the app (single source of truth in
// src/utils/prayerTimes.ts) and handed over through IndexedDB, so no prayer maths is duplicated here.
(function () {
  const DB_NAME = 'quran-prayer-db';
  const DB_VERSION = 1;
  const STATE_STORE = 'state';
  const FIRED_STORE = 'fired';

  // A late wake-up still shows the alert, but only if it is at most this old.
  const BACKGROUND_GRACE_MS = 10 * 60 * 1000;

  function openDb() {
    return new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STATE_STORE)) db.createObjectStore(STATE_STORE);
          if (!db.objectStoreNames.contains(FIRED_STORE)) db.createObjectStore(FIRED_STORE);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  async function readConfig() {
    const db = await openDb();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const req = db.transaction(STATE_STORE, 'readonly').objectStore(STATE_STORE).get('config');
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  async function writeConfig(config) {
    const db = await openDb();
    if (!db || !config) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STATE_STORE, 'readwrite');
        tx.objectStore(STATE_STORE).put(config, 'config');
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  async function getFiredIds() {
    const db = await openDb();
    if (!db) return new Set();
    return new Promise((resolve) => {
      try {
        const req = db.transaction(FIRED_STORE, 'readonly').objectStore(FIRED_STORE).getAll();
        req.onsuccess = () => {
          const ids = new Set();
          for (const r of Array.isArray(req.result) ? req.result : []) {
            if (r && r.id) ids.add(r.id);
          }
          resolve(ids);
        };
        req.onerror = () => resolve(new Set());
      } catch {
        resolve(new Set());
      }
    });
  }

  async function markFiredAndPrune(eventId, dateKey) {
    const db = await openDb();
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(FIRED_STORE, 'readwrite');
        const store = tx.objectStore(FIRED_STORE);
        store.put({ id: eventId, dateKey, firedAt: Date.now() }, eventId);
        const cutoff = Date.now() - 3 * 86400 * 1000;
        const cursorReq = store.openCursor();
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (!cursor) return;
          if (cursor.value && cursor.value.firedAt && cursor.value.firedAt < cutoff) cursor.delete();
          cursor.continue();
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  async function runBackgroundCheck(overrideConfig) {
    try {
      if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') return;
      const config = overrideConfig || (await readConfig());
      if (!config || !config.notifPrefs || !config.notifPrefs.enabled) return;
      const events = Array.isArray(config.upcomingEvents) ? config.upcomingEvents : [];
      if (events.length === 0) return;

      const nowMs = Date.now();
      const firedSet = await getFiredIds();

      for (const ev of events) {
        if (!ev || firedSet.has(ev.id)) continue;
        const elapsed = nowMs - ev.triggerTimestampMs;
        if (elapsed < 0 || elapsed > BACKGROUND_GRACE_MS) continue;

        firedSet.add(ev.id);
        await markFiredAndPrune(ev.id, ev.dateKey);
        await self.registration.showNotification(ev.title, {
          body: ev.body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: ev.tag,
          dir: 'rtl',
          lang: 'ar',
          renotify: true,
          requireInteraction: ev.eventType !== 'pre_iqama',
          vibrate: [200, 100, 200],
          data: { url: '/', prayerKey: ev.prayerKey, eventType: ev.eventType },
          actions: [{ action: 'open_prayer', title: 'عرض المواقيت' }],
        });
      }
    } catch {
      // ignore transient service-worker errors
    }
  }

  self.addEventListener('activate', (event) => {
    event.waitUntil(runBackgroundCheck());
  });

  self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'prayer-check-sync') event.waitUntil(runBackgroundCheck());
  });

  self.addEventListener('sync', (event) => {
    if (event.tag === 'prayer-sync') event.waitUntil(runBackgroundCheck());
  });

  self.addEventListener('message', (event) => {
    const data = event.data;
    if (!data) return;
    if (data.type === 'SYNC_PRAYER_SCHEDULE' && data.config) {
      event.waitUntil(writeConfig(data.config));
    } else if (data.type === 'CHECK_PRAYERS_NOW') {
      event.waitUntil(runBackgroundCheck());
    }
  });

  self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.postMessage({ type: 'OPEN_PRAYER_VIEW' });
            return client.focus();
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow('/');
      })
    );
  });
})();
