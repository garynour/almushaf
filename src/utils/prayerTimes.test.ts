import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toArabicDigits,
  calculatePrayerTimes,
  getNextPrayer,
  formatTimeArabic,
  calculateIqamaTime,
} from './prayerTimes.js';

test('toArabicDigits correctly converts western numerals to eastern Arabic numerals', () => {
  assert.equal(toArabicDigits(12345), '١٢٣٤٥');
  assert.equal(toArabicDigits('04:45'), '٠٤:٤٥');
  assert.equal(toArabicDigits(0), '٠');
  assert.equal(toArabicDigits(604), '٦٠٤');
});

test('formatTimeArabic formats hours and minutes with leading zeros', () => {
  assert.equal(formatTimeArabic(4, 45), '٠٤:٤٥');
  assert.equal(formatTimeArabic(11, 38), '١١:٣٨');
  assert.equal(formatTimeArabic(9, 5), '٠٩:٠٥');
});

test('calculatePrayerTimes returns all 6 prayer slots with valid hours', () => {
  const times = calculatePrayerTimes(30.158, 31.339, new Date('2026-11-08T12:00:00Z'), 'egypt');

  assert.ok(times.fajr.hour >= 3 && times.fajr.hour <= 6, `Fajr hour: ${times.fajr.hour}`);
  assert.ok(times.sunrise.hour >= 5 && times.sunrise.hour <= 7, `Sunrise hour: ${times.sunrise.hour}`);
  assert.ok(times.dhuhr.hour >= 11 && times.dhuhr.hour <= 13, `Dhuhr hour: ${times.dhuhr.hour}`);
  assert.ok(times.asr.hour >= 14 && times.asr.hour <= 16, `Asr hour: ${times.asr.hour}`);
  assert.ok(times.maghrib.hour >= 16 && times.maghrib.hour <= 19, `Maghrib hour: ${times.maghrib.hour}`);
  assert.ok(times.isha.hour >= 17 && times.isha.hour <= 21, `Isha hour: ${times.isha.hour}`);
});

test('getNextPrayer identifies next prayer and computes countdown accurately', () => {
  const times = {
    fajr: { hour: 4, minute: 45, timeStr: '٠٤:٤٥' },
    sunrise: { hour: 6, minute: 14, timeStr: '٠٦:١٤' },
    dhuhr: { hour: 11, minute: 38, timeStr: '١١:٣٨' },
    asr: { hour: 14, minute: 41, timeStr: '١٤:٤١' },
    maghrib: { hour: 17, minute: 2, timeStr: '١٧:٠٢' },
    isha: { hour: 18, minute: 22, timeStr: '١٨:٢٢' },
  };

  // Simulated morning 10:00 AM
  const mockNow = new Date('2026-11-08T10:00:00');
  const next = getNextPrayer(times, mockNow);

  assert.equal(next.nameAr, 'الظهر');
  assert.equal(next.index, 1);
  assert.ok(next.remainingSeconds > 0);
  assert.match(next.remainingFormatted, /^-\d{2}:\d{2}:\d{2}$/);
});

test('calculateIqamaTime computes correct offset and formatted time', () => {
  // Dhuhr at 11:38 + 15 min = 11:53
  const iqama = calculateIqamaTime(11, 38, 15);
  assert.equal(iqama.hour, 11);
  assert.equal(iqama.minute, 53);
  assert.equal(iqama.timeStr, '١١:٥٣');

  // Fajr at 4:48 + 20 min = 5:08
  const iqamaFajr = calculateIqamaTime(4, 48, 20);
  assert.equal(iqamaFajr.hour, 5);
  assert.equal(iqamaFajr.minute, 8);
  assert.equal(iqamaFajr.timeStr, '٠٥:٠٨');
});

test('calculatePrayerTimes applies DST on/off exactly +1 hour difference', () => {
  const date = new Date('2026-06-15T12:00:00Z');
  const winter = calculatePrayerTimes(30.158, 31.339, date, 'egypt', {
    timezoneMode: 'manual',
    manualTimezoneOffset: 2,
    dstMode: 'off',
  });
  const summer = calculatePrayerTimes(30.158, 31.339, date, 'egypt', {
    timezoneMode: 'manual',
    manualTimezoneOffset: 2,
    dstMode: 'on',
  });

  const winterDhuhrMin = winter.dhuhr.hour * 60 + winter.dhuhr.minute;
  const summerDhuhrMin = summer.dhuhr.hour * 60 + summer.dhuhr.minute;
  assert.equal(summerDhuhrMin - winterDhuhrMin, 60);
});

test('calculatePrayerTimes computes Hanafi Asr later than Shafi Asr', () => {
  const date = new Date('2026-06-15T12:00:00Z');
  const shafi = calculatePrayerTimes(30.158, 31.339, date, 'egypt', {
    timezoneMode: 'manual',
    manualTimezoneOffset: 2,
    madhhab: 'shafi',
  });
  const hanafi = calculatePrayerTimes(30.158, 31.339, date, 'egypt', {
    timezoneMode: 'manual',
    manualTimezoneOffset: 2,
    madhhab: 'hanafi',
  });

  const shafiMin = shafi.asr.hour * 60 + shafi.asr.minute;
  const hanafiMin = hanafi.asr.hour * 60 + hanafi.asr.minute;
  assert.ok(hanafiMin > shafiMin + 30, `Expected Hanafi Asr (${hanafiMin}) > Shafi Asr (${shafiMin}) + 30`);
});

test('calculatePrayerTimes applies manual minute adjustments accurately', () => {
  const date = new Date('2026-11-08T12:00:00Z');
  const base = calculatePrayerTimes(30.158, 31.339, date, 'egypt', {
    timezoneMode: 'manual',
    manualTimezoneOffset: 2,
    dstMode: 'off',
  });
  const adjusted = calculatePrayerTimes(30.158, 31.339, date, 'egypt', {
    timezoneMode: 'manual',
    manualTimezoneOffset: 2,
    dstMode: 'off',
    manualOffsets: { fajr: 5, maghrib: -3 },
  });

  const baseFajr = base.fajr.hour * 60 + base.fajr.minute;
  const adjFajr = adjusted.fajr.hour * 60 + adjusted.fajr.minute;
  assert.equal(adjFajr - baseFajr, 5);

  const baseMaghrib = base.maghrib.hour * 60 + base.maghrib.minute;
  const adjMaghrib = adjusted.maghrib.hour * 60 + adjusted.maghrib.minute;
  assert.equal(adjMaghrib - baseMaghrib, -3);
});

test('calculatePrayerTimes matches official Cairo Egypt & Makkah times on Nov 16, 2026', () => {
  const cairoNov = calculatePrayerTimes(30.158, 31.339, new Date('2026-11-16T12:00:00Z'), 'egypt', {
    timezoneMode: 'manual',
    manualTimezoneOffset: 2,
    ianaTimezone: 'Africa/Cairo',
    dstMode: 'auto',
  });
  assert.equal(cairoNov.fajr.hour, 4);
  assert.equal(cairoNov.fajr.minute, 51);
  assert.equal(cairoNov.sunrise.hour, 6);
  assert.equal(cairoNov.sunrise.minute, 21);
  assert.equal(cairoNov.dhuhr.hour, 11);
  assert.equal(cairoNov.dhuhr.minute, 39);
  assert.equal(cairoNov.asr.hour, 14);
  assert.equal(cairoNov.asr.minute, 37);
  assert.equal(cairoNov.maghrib.hour, 16);
  assert.equal(cairoNov.maghrib.minute, 58);
  assert.equal(cairoNov.isha.hour, 18);
  assert.equal(cairoNov.isha.minute, 18);

  const makkahNov = calculatePrayerTimes(21.4225, 39.8262, new Date('2026-11-16T12:00:00Z'), 'makkah', {
    timezoneMode: 'manual',
    manualTimezoneOffset: 3,
    ianaTimezone: 'Asia/Riyadh',
    dstMode: 'auto',
  });
  assert.equal(makkahNov.maghrib.hour, 17);
  assert.equal(makkahNov.maghrib.minute, 39);
  assert.equal(makkahNov.isha.hour, 19);
  assert.equal(makkahNov.isha.minute, 9);
});

test('auto IANA DST applies summer +1h in July and winter 0h in November for Cairo', () => {
  const summerDate = new Date('2026-07-01T12:00:00Z');
  const winterDate = new Date('2026-11-16T12:00:00Z');

  const summerTimes = calculatePrayerTimes(30.158, 31.339, summerDate, 'egypt', {
    timezoneMode: 'manual',
    manualTimezoneOffset: 2,
    ianaTimezone: 'Africa/Cairo',
    dstMode: 'auto',
  });
  const forcedSummer = calculatePrayerTimes(30.158, 31.339, summerDate, 'egypt', {
    timezoneMode: 'manual',
    manualTimezoneOffset: 2,
    ianaTimezone: 'Africa/Cairo',
    dstMode: 'on',
  });
  assert.equal(summerTimes.dhuhr.hour * 60 + summerTimes.dhuhr.minute, forcedSummer.dhuhr.hour * 60 + forcedSummer.dhuhr.minute);

  const winterTimes = calculatePrayerTimes(30.158, 31.339, winterDate, 'egypt', {
    timezoneMode: 'manual',
    manualTimezoneOffset: 2,
    ianaTimezone: 'Africa/Cairo',
    dstMode: 'auto',
  });
  const forcedWinter = calculatePrayerTimes(30.158, 31.339, winterDate, 'egypt', {
    timezoneMode: 'manual',
    manualTimezoneOffset: 2,
    ianaTimezone: 'Africa/Cairo',
    dstMode: 'off',
  });
  assert.equal(winterTimes.dhuhr.hour * 60 + winterTimes.dhuhr.minute, forcedWinter.dhuhr.hour * 60 + forcedWinter.dhuhr.minute);
});
