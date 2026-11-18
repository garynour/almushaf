// Astronomical prayer time calculation utility
// Decoupled pure logic for prayer time calculation, countdown, and formatting.

import { COUNTRIES_DATA } from '../data/locationsData';

export interface CalcMethod {
  id: string;
  nameAr: string;
  fajrAngle: number;
  ishaAngle: number;
  ishaFixedMinutes?: number;
}

export const CALC_METHODS: Record<string, CalcMethod> = {
  egypt: {
    id: 'egypt',
    nameAr: 'الهيئة المصرية العامة للمساحة',
    fajrAngle: 19.5,
    ishaAngle: 17.5,
  },
  makkah: {
    id: 'makkah',
    nameAr: 'جامعة أم القرى - مكة المكرمة',
    fajrAngle: 18.5,
    ishaAngle: 0,
    ishaFixedMinutes: 90,
  },
  mwl: {
    id: 'mwl',
    nameAr: 'رابطة العالم الإسلامي',
    fajrAngle: 18,
    ishaAngle: 17,
  },
  karachi: {
    id: 'karachi',
    nameAr: 'جامعة العلوم الإسلامية بكراتشي',
    fajrAngle: 18,
    ishaAngle: 18,
  },
  isna: {
    id: 'isna',
    nameAr: 'الجمعية الإسلامية لأمريكا الشمالية (ISNA)',
    fajrAngle: 15,
    ishaAngle: 15,
  },
};

const d2r = (d: number) => (d * Math.PI) / 180;
const r2d = (r: number) => (r * 180) / Math.PI;
const dSin = (d: number) => Math.sin(d2r(d));
const dCos = (d: number) => Math.cos(d2r(d));
const dTan = (d: number) => Math.tan(d2r(d));
const dArcSin = (x: number) => r2d(Math.asin(Math.max(-1, Math.min(1, x))));
const dArcCos = (x: number) => r2d(Math.acos(Math.max(-1, Math.min(1, x))));
const dArcCot = (x: number) => r2d(Math.atan(1 / x));
const dArcTan2 = (y: number, x: number) => r2d(Math.atan2(y, x));
const fixMod = (a: number, b: number) => {
  const res = a - b * Math.floor(a / b);
  return res < 0 ? res + b : res;
};
const fixAngle = (a: number) => fixMod(a, 360);
const fixHour = (a: number) => fixMod(a, 24);

export function toArabicDigits(num: number | string): string {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).replace(/[0-9]/g, (w) => arabicDigits[+w]);
}

export function pad2(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

export function formatTimeArabic(hour: number, minute: number): string {
  return `${toArabicDigits(pad2(hour))}:${toArabicDigits(pad2(minute))}`;
}

export interface DayPrayerTimes {
  fajr: { hour: number; minute: number; timeStr: string };
  sunrise: { hour: number; minute: number; timeStr: string };
  dhuhr: { hour: number; minute: number; timeStr: string };
  asr: { hour: number; minute: number; timeStr: string };
  maghrib: { hour: number; minute: number; timeStr: string };
  isha: { hour: number; minute: number; timeStr: string };
}

export type LocationMode = 'auto' | 'manual';
export type MadhhabType = 'shafi' | 'hanafi';
export type DstMode = 'auto' | 'on' | 'off';

export interface PrayerManualOffsets {
  fajr: number;
  sunrise: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
}

export interface PrayerSettings {
  locationMode: LocationMode;
  countryId: string;
  cityId: string;
  locationName: string;
  lat: number;
  lng: number;
  timezoneMode: 'auto' | 'manual';
  manualTimezoneOffset: number;
  ianaTimezone?: string;
  calcMethod: string;
  madhhab: MadhhabType;
  dstMode: DstMode;
  manualOffsets: PrayerManualOffsets;
}

export const DEFAULT_PRAYER_SETTINGS: PrayerSettings = {
  locationMode: 'manual',
  countryId: 'eg',
  cityId: 'eg_marg',
  locationName: 'مصر، القاهرة (المرج)',
  lat: 30.158,
  lng: 31.339,
  timezoneMode: 'manual',
  manualTimezoneOffset: 2,
  ianaTimezone: 'Africa/Cairo',
  calcMethod: 'egypt',
  madhhab: 'shafi',
  dstMode: 'auto',
  manualOffsets: {
    fajr: 0,
    sunrise: 0,
    dhuhr: 0,
    asr: 0,
    maghrib: 0,
    isha: 0,
  },
};

export function resolveIanaTimezoneForIds(countryId?: string, cityId?: string): string | undefined {
  if (!countryId) return undefined;
  const country = COUNTRIES_DATA.find((c) => c.id === countryId);
  if (!country) return undefined;
  const city = cityId ? country.cities.find((ct) => ct.id === cityId) : undefined;
  return city?.ianaTimezone || country.ianaTimezone;
}

export function loadPrayerSettings(): PrayerSettings {
  try {
    const raw = localStorage.getItem('prayer_settings_v2');
    const savedCalc = localStorage.getItem('calc_method');
    if (raw) {
      const parsed = JSON.parse(raw);
      const backfilledTz =
        parsed.ianaTimezone ||
        resolveIanaTimezoneForIds(parsed.countryId, parsed.cityId) ||
        DEFAULT_PRAYER_SETTINGS.ianaTimezone;
      return {
        ...DEFAULT_PRAYER_SETTINGS,
        ...parsed,
        ianaTimezone: backfilledTz,
        calcMethod: parsed.calcMethod || savedCalc || DEFAULT_PRAYER_SETTINGS.calcMethod,
        manualOffsets: {
          ...DEFAULT_PRAYER_SETTINGS.manualOffsets,
          ...(parsed.manualOffsets || {}),
        },
      };
    }
    if (savedCalc) {
      return { ...DEFAULT_PRAYER_SETTINGS, calcMethod: savedCalc };
    }
  } catch {}
  return DEFAULT_PRAYER_SETTINGS;
}

export function savePrayerSettings(settings: PrayerSettings) {
  try {
    localStorage.setItem('prayer_settings_v2', JSON.stringify(settings));
    localStorage.setItem('calc_method', settings.calcMethod);
    window.dispatchEvent(new Event('prayer_settings_updated'));
  } catch {}
}

/**
 * Parses an IANA timezone's UTC offset in hours at a given Date via Intl.DateTimeFormat.
 */
export function getIanaTimezoneOffsetHours(date: Date, ianaTimezone?: string): number | null {
  if (!ianaTimezone) return null;
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: ianaTimezone,
      timeZoneName: 'shortOffset',
    }).formatToParts(date);
    const tzName = parts.find((p) => p.type === 'timeZoneName')?.value;
    if (!tzName) return null;
    if (tzName === 'GMT' || tzName === 'UTC') return 0;
    const match = tzName.match(/^(?:GMT|UTC)([+-])(\d{1,2})(?::(\d{2}))?$/);
    if (!match) return null;
    const sign = match[1] === '-' ? -1 : 1;
    const h = parseInt(match[2], 10);
    const m = parseInt(match[3] || '0', 10);
    return sign * (h + m / 60);
  } catch {
    return null;
  }
}

/**
 * Fallback statutory rule for Egypt DST (restored April 2023):
 * Starts last Friday of April 00:00, ends last Thursday of October 24:00 (last Friday 00:00).
 */
function isEgyptDstStatutory(date: Date): boolean {
  const year = date.getFullYear();
  if (year < 2023) return false;

  const lastFridayOfApril = (() => {
    const d = new Date(Date.UTC(year, 3, 30, 0, 0, 0));
    while (d.getUTCDay() !== 5) d.setUTCDate(d.getUTCDate() - 1);
    return d.getTime() - 2 * 3600 * 1000; // 00:00 Cairo (UTC+2)
  })();

  const lastFridayOfOct = (() => {
    const d = new Date(Date.UTC(year, 9, 31, 0, 0, 0));
    while (d.getUTCDay() !== 5) d.setUTCDate(d.getUTCDate() - 1);
    return d.getTime() - 3 * 3600 * 1000; // 00:00 Cairo DST (UTC+3) = Thursday 24:00
  })();

  const t = date.getTime();
  return t >= lastFridayOfApril && t < lastFridayOfOct;
}

export interface IanaTimezoneInspection {
  stdOffsetHours: number;
  currentOffsetHours: number;
  hasDst: boolean;
  isDstActive: boolean;
}

export function inspectIanaTimezone(date: Date, ianaTimezone?: string): IanaTimezoneInspection | null {
  if (!ianaTimezone) return null;
  const year = date.getFullYear();
  const current = getIanaTimezoneOffsetHours(date, ianaTimezone);
  const jan = getIanaTimezoneOffsetHours(new Date(Date.UTC(year, 0, 1, 12, 0, 0)), ianaTimezone);
  const jul = getIanaTimezoneOffsetHours(new Date(Date.UTC(year, 6, 1, 12, 0, 0)), ianaTimezone);
  if (current === null || jan === null || jul === null) return null;

  let stdOffsetHours = Math.min(jan, jul);
  let hasDst = jan !== jul;
  let currentOffsetHours = current;
  let isDstActive = hasDst && current > stdOffsetHours;

  // Guard for older Android WebViews lacking post-2023 Africa/Cairo DST table updates
  if (ianaTimezone === 'Africa/Cairo' && !hasDst && year >= 2023) {
    hasDst = true;
    stdOffsetHours = 2;
    isDstActive = isEgyptDstStatutory(date);
    currentOffsetHours = stdOffsetHours + (isDstActive ? 1 : 0);
  }

  return { stdOffsetHours, currentOffsetHours, hasDst, isDstActive };
}

export interface EffectiveTimezoneDetails {
  stdHours: number;
  effectiveHours: number;
  isDstActive: boolean;
  dstMode: DstMode;
}

export function getEffectiveTimezoneDetails(
  date: Date,
  lng: number,
  timezoneMode: 'auto' | 'manual' = 'auto',
  manualTimezoneOffset?: number,
  dstMode: DstMode = 'auto',
  ianaTimezone?: string
): EffectiveTimezoneDetails {
  const janDeviceOffset = new Date(date.getFullYear(), 0, 1).getTimezoneOffset();
  const julDeviceOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
  const stdDeviceOffsetMin = Math.max(janDeviceOffset, julDeviceOffset);
  const currentDeviceOffsetMin = date.getTimezoneOffset();
  const isDeviceDstActive = currentDeviceOffsetMin < stdDeviceOffsetMin;

  const ianaInfo = ianaTimezone ? inspectIanaTimezone(date, ianaTimezone) : null;

  let stdHours: number;
  let autoDstActive: boolean;

  if (timezoneMode === 'manual' && typeof manualTimezoneOffset === 'number' && !Number.isNaN(manualTimezoneOffset)) {
    stdHours = manualTimezoneOffset;
    if (ianaInfo) {
      autoDstActive = ianaInfo.isDstActive;
    } else {
      autoDstActive = isDeviceDstActive;
    }
  } else {
    const localStdHours = -stdDeviceOffsetMin / 60;
    if (localStdHours !== 0 || currentDeviceOffsetMin !== 0) {
      stdHours = localStdHours;
      autoDstActive = isDeviceDstActive;
    } else if (ianaInfo) {
      stdHours = ianaInfo.stdOffsetHours;
      autoDstActive = ianaInfo.isDstActive;
    } else {
      stdHours = Math.round(lng / 15);
      autoDstActive = false;
    }
  }

  if (dstMode === 'on') {
    return { stdHours, effectiveHours: stdHours + 1, isDstActive: true, dstMode };
  }
  if (dstMode === 'off') {
    return { stdHours, effectiveHours: stdHours, isDstActive: false, dstMode };
  }

  // dstMode === 'auto'
  if (timezoneMode === 'manual' && ianaInfo && Math.abs(stdHours - ianaInfo.stdOffsetHours) < 0.01) {
    return {
      stdHours,
      effectiveHours: ianaInfo.currentOffsetHours,
      isDstActive: ianaInfo.isDstActive,
      dstMode,
    };
  }

  return {
    stdHours,
    effectiveHours: stdHours + (autoDstActive ? 1 : 0),
    isDstActive: autoDstActive,
    dstMode,
  };
}

/**
 * Resolves effective UTC timezone offset in hours taking into account:
 * - timezoneMode ('auto' vs 'manual')
 * - manualTimezoneOffset (standard UTC offset without DST)
 * - ianaTimezone (city/country IANA DST rules)
 * - dstMode ('auto' | 'on' | 'off')
 */
export function resolveEffectiveTimezoneOffset(
  date: Date,
  lng: number,
  timezoneMode: 'auto' | 'manual' = 'auto',
  manualTimezoneOffset?: number,
  dstMode: DstMode = 'auto',
  ianaTimezone?: string
): number {
  return getEffectiveTimezoneDetails(
    date,
    lng,
    timezoneMode,
    manualTimezoneOffset,
    dstMode,
    ianaTimezone
  ).effectiveHours;
}

export interface CalculatePrayerOptions {
  madhhab?: MadhhabType;
  dstMode?: DstMode;
  timezoneMode?: 'auto' | 'manual';
  manualTimezoneOffset?: number;
  ianaTimezone?: string;
  manualOffsets?: Partial<PrayerManualOffsets>;
}

// Julian date from Gregorian year/month/day (Jean Meeus)
function julianDate(year: number, month: number, day: number): number {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + B - 1524.5;
}

// High-precision solar declination & equation of time (USNO / Meeus)
function sunPosition(jd: number): { declination: number; equation: number } {
  const D = jd - 2451545.0;
  const g = fixAngle(357.529 + 0.98560028 * D);
  const q = fixAngle(280.459 + 0.98564736 * D);
  const L = fixAngle(q + 1.915 * dSin(g) + 0.020 * dSin(2 * g));

  const e = 23.439 - 0.00000036 * D;
  const ra = dArcTan2(dCos(e) * dSin(L), dCos(L)) / 15;
  const eqt = q / 15 - fixHour(ra);
  const decl = dArcSin(dSin(e) * dSin(L));
  return { declination: decl, equation: eqt };
}

// Calculate Sun position and prayer times (PrayTimes v2 / Meeus iterative ephemeris)
export function calculatePrayerTimes(
  lat: number = 30.158, // Default to Cairo / El-Marg
  lng: number = 31.339,
  date: Date = new Date(),
  methodKey: string = 'egypt',
  options?: CalculatePrayerOptions
): DayPrayerTimes {
  const method = CALC_METHODS[methodKey] || CALC_METHODS.egypt;
  const madhhab: MadhhabType = options?.madhhab || 'shafi';
  const dstMode: DstMode = options?.dstMode || 'auto';
  const timezoneMode = options?.timezoneMode || (options?.manualTimezoneOffset !== undefined ? 'manual' : 'auto');

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const jDate = julianDate(year, month, day) - lng / (15 * 24);

  const midDay = (dayFraction: number): number => {
    const eqt = sunPosition(jDate + dayFraction).equation;
    return fixHour(12 - eqt);
  };

  const angleRatio = (angle: number, dayFraction: number): number => {
    const decl = sunPosition(jDate + dayFraction).declination;
    const num = -dSin(angle) - dSin(decl) * dSin(lat);
    const den = dCos(decl) * dCos(lat);
    return den === 0 ? 2 : num / den;
  };

  // NOTE: the ratio is clamped here only to keep the iteration numerically stable.
  // Whether the angle is actually reachable is checked afterwards (see high-latitude handling).
  const sunAngleTime = (angle: number, dayFraction: number, ccw: boolean): number => {
    const noon = midDay(dayFraction);
    const ratio = Math.max(-0.9999, Math.min(0.9999, angleRatio(angle, dayFraction)));
    const t = dArcCos(ratio) / 15;
    return noon + (ccw ? -t : t);
  };

  const asrTime = (shadowFactor: number, dayFraction: number): number => {
    const decl = sunPosition(jDate + dayFraction).declination;
    const angle = -dArcCot(shadowFactor + dTan(Math.abs(lat - decl)));
    return sunAngleTime(angle, dayFraction, false);
  };

  // Iterative two-pass refinement starting from default solar day fractions
  let tFajr = 5 / 24;
  let tSunrise = 6 / 24;
  let tDhuhr = 12 / 24;
  let tAsr = 13 / 24;
  let tSunset = 18 / 24;
  let tIsha = 18 / 24;

  const shadowFactor = madhhab === 'hanafi' ? 2 : 1;

  for (let pass = 0; pass < 2; pass++) {
    const nextFajr = sunAngleTime(method.fajrAngle, tFajr, true) / 24;
    const nextSunrise = sunAngleTime(0.833, tSunrise, true) / 24;
    const nextDhuhr = midDay(tDhuhr) / 24;
    const nextAsr = asrTime(shadowFactor, tAsr) / 24;
    const nextSunset = sunAngleTime(0.833, tSunset, false) / 24;
    const nextIsha = method.ishaFixedMinutes
      ? (sunAngleTime(0.833, tSunset, false) + method.ishaFixedMinutes / 60) / 24
      : sunAngleTime(method.ishaAngle, tIsha, false) / 24;

    tFajr = nextFajr;
    tSunrise = nextSunrise;
    tDhuhr = nextDhuhr;
    tAsr = nextAsr;
    tSunset = nextSunset;
    tIsha = nextIsha;
  }

  // ---- High-latitude handling (angle-based night portion, as in PrayTimes) ----
  // When the sun never reaches the Fajr/Isha angle (e.g. northern Europe in summer) the raw
  // formula is meaningless. Fall back to a fraction of the night proportional to the angle,
  // and also cap unrealistically long twilight periods.
  let hFajr = tFajr * 24;
  let hSunrise = tSunrise * 24;
  let hSunset = tSunset * 24;
  let hIsha = tIsha * 24;

  const sunEventsValid =
    Math.abs(angleRatio(0.833, tSunrise)) <= 1 && Math.abs(angleRatio(0.833, tSunset)) <= 1;

  if (sunEventsValid) {
    const night = fixHour(hSunrise - hSunset); // hours from sunset to next sunrise

    const fajrValid = Math.abs(angleRatio(method.fajrAngle, tFajr)) <= 1;
    const fajrLimit = (method.fajrAngle / 60) * night;
    if (!fajrValid || fixHour(hSunrise - hFajr) > fajrLimit) {
      hFajr = hSunrise - fajrLimit;
    }

    if (!method.ishaFixedMinutes) {
      const ishaValid = Math.abs(angleRatio(method.ishaAngle, tIsha)) <= 1;
      const ishaLimit = (method.ishaAngle / 60) * night;
      if (!ishaValid || fixHour(hIsha - hSunset) > ishaLimit) {
        hIsha = hSunset + ishaLimit;
      }
    }
  }

  // Resolve effective timezone offset (includes IANA DST / manual DST handling)
  const timezoneOffset = resolveEffectiveTimezoneOffset(
    date,
    lng,
    timezoneMode,
    options?.manualTimezoneOffset,
    dstMode,
    options?.ianaTimezone
  );

  const adj = options?.manualOffsets;

  const toHourMinute = (utcHours: number, manualAdj = 0) => {
    const localHours = fixHour(utcHours + timezoneOffset - lng / 15);
    const totalMinutes = Math.round(localHours * 60) + manualAdj;
    const normalized = ((totalMinutes % 1440) + 1440) % 1440;
    const hour = Math.floor(normalized / 60);
    const minute = normalized % 60;
    return {
      hour,
      minute,
      timeStr: formatTimeArabic(hour, minute),
    };
  };

  return {
    fajr: toHourMinute(hFajr, adj?.fajr || 0),
    sunrise: toHourMinute(hSunrise, adj?.sunrise || 0),
    dhuhr: toHourMinute(tDhuhr * 24, adj?.dhuhr || 0),
    asr: toHourMinute(tAsr * 24, adj?.asr || 0),
    maghrib: toHourMinute(hSunset, adj?.maghrib || 0),
    isha: toHourMinute(hIsha, adj?.isha || 0),
  };
}

export interface NextPrayerInfo {
  id: 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | string;
  index: number;
  nameAr: string;
  nameEn: string;
  timeStr: string;
  hour: number;
  minute: number;
  remainingSeconds: number;
  remainingFormatted: string; // e.g., -06:45:03
  remainingArabicText: string; // e.g., باقي ٦ س ٤٥ د
}

const PRAYER_NAMES = [
  { ar: 'الفجر', en: 'Fajr', key: 'fajr' },
  { ar: 'الظهر', en: 'Dhuhr', key: 'dhuhr' },
  { ar: 'العصر', en: 'Asr', key: 'asr' },
  { ar: 'المغرب', en: 'Maghrib', key: 'maghrib' },
  { ar: 'العشاء', en: 'Isha', key: 'isha' },
] as const;

export function getNextPrayer(
  prayerTimes: DayPrayerTimes,
  now: Date = new Date(),
  tomorrowPrayerTimes?: DayPrayerTimes
): NextPrayerInfo {
  const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

  const prayers = [
    { id: 'fajr', nameAr: 'الفجر', nameEn: 'Fajr', ...prayerTimes.fajr },
    { id: 'dhuhr', nameAr: 'الظهر', nameEn: 'Dhuhr', ...prayerTimes.dhuhr },
    { id: 'asr', nameAr: 'العصر', nameEn: 'Asr', ...prayerTimes.asr },
    { id: 'maghrib', nameAr: 'المغرب', nameEn: 'Maghrib', ...prayerTimes.maghrib },
    { id: 'isha', nameAr: 'العشاء', nameEn: 'Isha', ...prayerTimes.isha },
  ];

  let nextIdx = -1;
  let targetSeconds = 0;

  for (let i = 0; i < prayers.length; i++) {
    const pSeconds = prayers[i].hour * 3600 + prayers[i].minute * 60;
    if (pSeconds > currentSeconds) {
      nextIdx = i;
      targetSeconds = pSeconds;
      break;
    }
  }

  // If all prayers today have passed, next is Fajr tomorrow (use tomorrow's real time when given)
  if (nextIdx === -1) {
    nextIdx = 0;
    const tomorrowFajr = tomorrowPrayerTimes?.fajr ?? prayerTimes.fajr;
    targetSeconds = tomorrowFajr.hour * 3600 + tomorrowFajr.minute * 60 + 86400;
    prayers[0] = { ...prayers[0], ...tomorrowFajr };
  }

  const diff = targetSeconds - currentSeconds;
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;

  const remainingFormatted = `-${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
  const remainingArabicText = `باقي ${toArabicDigits(hours)} س ${toArabicDigits(minutes)} د`;

  return {
    id: prayers[nextIdx].id,
    index: nextIdx,
    nameAr: prayers[nextIdx].nameAr,
    nameEn: prayers[nextIdx].nameEn,
    timeStr: prayers[nextIdx].timeStr,
    hour: prayers[nextIdx].hour,
    minute: prayers[nextIdx].minute,
    remainingSeconds: diff,
    remainingFormatted,
    remainingArabicText,
  };
}

export interface IqamaConfig {
  enabled: boolean;
  advanceAlert3Min: boolean;
  offsets: {
    fajr: number;
    dhuhr: number;
    asr: number;
    maghrib: number;
    isha: number;
  };
}

export const DEFAULT_IQAMA_CONFIG: IqamaConfig = {
  enabled: true,
  advanceAlert3Min: true,
  offsets: {
    fajr: 20,
    dhuhr: 15,
    asr: 15,
    maghrib: 10,
    isha: 15,
  },
};

export interface IqamaResult {
  hour: number;
  minute: number;
  timeStr: string;
  iqamaTimeStr: string;
  offsetMinutes: number;
}

export function calculateIqamaTime(
  prayerTimeOrHour: string | number | { hour: number; minute: number },
  prayerKeyOrMinute?: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | number,
  configOrOffset?: IqamaConfig | number
): IqamaResult {
  let hour = 0;
  let minute = 0;
  let offset = 15;

  if (typeof prayerTimeOrHour === 'number') {
    hour = prayerTimeOrHour;
    minute = typeof prayerKeyOrMinute === 'number' ? prayerKeyOrMinute : 0;
    offset = typeof configOrOffset === 'number' ? configOrOffset : 15;
  } else if (typeof prayerTimeOrHour === 'string') {
    const standardStr = prayerTimeOrHour.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
    const parts = standardStr.split(':');
    hour = parseInt(parts[0], 10) || 0;
    minute = parseInt(parts[1], 10) || 0;
    if (typeof configOrOffset === 'object' && configOrOffset !== null && typeof prayerKeyOrMinute === 'string') {
      offset = configOrOffset.offsets?.[prayerKeyOrMinute] ?? 15;
    } else if (typeof configOrOffset === 'number') {
      offset = configOrOffset;
    }
  } else if (typeof prayerTimeOrHour === 'object' && prayerTimeOrHour !== null) {
    hour = prayerTimeOrHour.hour;
    minute = prayerTimeOrHour.minute;
    if (typeof configOrOffset === 'object' && configOrOffset !== null && typeof prayerKeyOrMinute === 'string') {
      offset = configOrOffset.offsets?.[prayerKeyOrMinute] ?? 15;
    } else if (typeof configOrOffset === 'number') {
      offset = configOrOffset;
    }
  }

  const totalMinutes = hour * 60 + minute + offset;
  const iqamaHour = Math.floor(totalMinutes / 60) % 24;
  const iqamaMinute = totalMinutes % 60;
  const formatted = formatTimeArabic(iqamaHour, iqamaMinute);

  return {
    hour: iqamaHour,
    minute: iqamaMinute,
    timeStr: formatted,
    iqamaTimeStr: formatted,
    offsetMinutes: offset,
  };
}


