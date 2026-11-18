import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDailyNotificationSchedule,
  buildUpcoming48HourEvents,
  findDueNotificationEvents,
  getNextScheduledEvent,
  formatDateKey,
  DEFAULT_NOTIFICATION_PREFS,
} from './notificationService.js';
import { DayPrayerTimes, DEFAULT_IQAMA_CONFIG, DEFAULT_PRAYER_SETTINGS } from './prayerTimes.js';

const SAMPLE_TIMES: DayPrayerTimes = {
  fajr: { hour: 4, minute: 48, timeStr: '٠٤:٤٨' },
  sunrise: { hour: 6, minute: 17, timeStr: '٠٦:١٧' },
  dhuhr: { hour: 11, minute: 39, timeStr: '١١:٣٩' },
  asr: { hour: 14, minute: 38, timeStr: '١٤:٣٨' },
  maghrib: { hour: 16, minute: 51, timeStr: '١٦:٥١' },
  isha: { hour: 18, minute: 19, timeStr: '١٨:١٩' },
};

test('formatDateKey formats local calendar date as YYYY-MM-DD', () => {
  const d = new Date(2026, 10, 8, 12, 0, 0); // Nov 8, 2026
  assert.equal(formatDateKey(d), '2026-11-08');
});

test('buildDailyNotificationSchedule creates athan, pre_iqama, and iqama events for enabled prayers', () => {
  const date = new Date(2026, 10, 8, 9, 0, 0);
  const enabledPrayers = { fajr: true, dhuhr: true, asr: false, maghrib: true, isha: false };
  const schedule = buildDailyNotificationSchedule(
    SAMPLE_TIMES,
    enabledPrayers,
    DEFAULT_IQAMA_CONFIG,
    DEFAULT_NOTIFICATION_PREFS,
    date
  );

  // 3 enabled prayers x 3 events (athan + pre_iqama + iqama) = 9 events
  assert.equal(schedule.length, 9);

  // Check Dhuhr events: 11:39 athan, +15m = 11:54 iqama, -3m = 11:51 pre_iqama
  const dhuhrEvents = schedule.filter((e) => e.prayerKey === 'dhuhr');
  assert.equal(dhuhrEvents.length, 3);
  assert.equal(dhuhrEvents[0].eventType, 'athan');
  assert.equal(dhuhrEvents[0].triggerTimeSeconds, 11 * 3600 + 39 * 60);
  assert.equal(dhuhrEvents[1].eventType, 'pre_iqama');
  assert.equal(dhuhrEvents[1].triggerTimeSeconds, 11 * 3600 + 51 * 60);
  assert.equal(dhuhrEvents[2].eventType, 'iqama');
  assert.equal(dhuhrEvents[2].triggerTimeSeconds, 11 * 3600 + 54 * 60);

  // Disabled prayers (asr, isha) must be excluded
  assert.equal(schedule.filter((e) => e.prayerKey === 'asr').length, 0);
  assert.equal(schedule.filter((e) => e.prayerKey === 'isha').length, 0);
});

test('buildDailyNotificationSchedule returns empty array when master notifications disabled', () => {
  const date = new Date(2026, 10, 8, 9, 0, 0);
  const schedule = buildDailyNotificationSchedule(
    SAMPLE_TIMES,
    { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
    DEFAULT_IQAMA_CONFIG,
    { ...DEFAULT_NOTIFICATION_PREFS, enabled: false },
    date
  );
  assert.equal(schedule.length, 0);
});

test('findDueNotificationEvents matches within grace window and deduplicates fired IDs', () => {
  const date = new Date(2026, 10, 8, 11, 39, 12); // 12 seconds after Dhuhr athan
  const schedule = buildDailyNotificationSchedule(
    SAMPLE_TIMES,
    { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
    DEFAULT_IQAMA_CONFIG,
    DEFAULT_NOTIFICATION_PREFS,
    date
  );

  const fired = new Set<string>();
  const due1 = findDueNotificationEvents(schedule, date, fired, 60);
  assert.equal(due1.length, 1);
  assert.equal(due1[0].prayerKey, 'dhuhr');
  assert.equal(due1[0].eventType, 'athan');

  // Once marked fired, subsequent checks must not re-fire
  fired.add(due1[0].id);
  const due2 = findDueNotificationEvents(schedule, new Date(2026, 10, 8, 11, 39, 25), fired, 60);
  assert.equal(due2.length, 0);
});

test('getNextScheduledEvent returns the next upcoming event chronologically', () => {
  const now = new Date(2026, 10, 8, 11, 40, 0); // 1 min after Dhuhr athan
  const schedule = buildDailyNotificationSchedule(
    SAMPLE_TIMES,
    { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
    DEFAULT_IQAMA_CONFIG,
    DEFAULT_NOTIFICATION_PREFS,
    now
  );

  const next = getNextScheduledEvent(schedule, now);
  assert.ok(next);
  assert.equal(next.event.prayerKey, 'dhuhr');
  assert.equal(next.event.eventType, 'pre_iqama'); // 11:51
  assert.equal(next.secondsUntil, 11 * 60);
});

test('buildUpcoming48HourEvents generates two consecutive days of monotonic timestamped events', () => {
  const now = new Date(2026, 10, 16, 10, 0, 0);
  const events = buildUpcoming48HourEvents(
    DEFAULT_PRAYER_SETTINGS,
    { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
    DEFAULT_IQAMA_CONFIG,
    DEFAULT_NOTIFICATION_PREFS,
    now
  );
  // 5 prayers x 3 alerts x 2 days = 30 events
  assert.equal(events.length, 30);
  for (let i = 1; i < events.length; i++) {
    assert.ok(events[i].triggerTimestampMs > events[i - 1].triggerTimestampMs);
  }
});
