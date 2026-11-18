import React, { useState } from 'react';
import {
  MapPin,
  Globe,
  Clock,
  Sun,
  Navigation,
  X,
  Check,
  Plus,
  Minus,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import {
  PrayerSettings,
  DEFAULT_PRAYER_SETTINGS,
  CALC_METHODS,
  DstMode,
  MadhhabType,
  toArabicDigits,
  calculatePrayerTimes,
  getEffectiveTimezoneDetails,
} from '../utils/prayerTimes';
import { COUNTRIES_DATA, TIMEZONE_OPTIONS } from '../data/locationsData';
import { triggerHaptic } from '../utils/audio';

interface LocationPrayerSettingsModalProps {
  settings: PrayerSettings;
  onUpdateSettings: (newSettings: PrayerSettings) => void;
  onRequestGpsLocation: () => void;
  gpsStatus?: string | null;
  onClose: () => void;
}

export const LocationPrayerSettingsModal: React.FC<LocationPrayerSettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onRequestGpsLocation,
  gpsStatus,
  onClose,
}) => {
  const [showCustomCoords, setShowCustomCoords] = useState(false);
  const [customName, setCustomName] = useState(settings.locationName);
  const [customLat, setCustomLat] = useState(String(settings.lat));
  const [customLng, setCustomLng] = useState(String(settings.lng));

  const selectedCountry =
    COUNTRIES_DATA.find((c) => c.id === settings.countryId) || COUNTRIES_DATA[0];
  const selectedCity =
    selectedCountry.cities.find((c) => c.id === settings.cityId) ||
    selectedCountry.cities[0];

  React.useEffect(() => {
    setCustomName(settings.locationName);
    setCustomLat(String(settings.lat));
    setCustomLng(String(settings.lng));
  }, [settings.locationName, settings.lat, settings.lng]);

  const buildManualSettingsFromCountryCity = (
    base: PrayerSettings,
    countryIdVal: string,
    cityIdVal?: string,
    overrideMethod?: boolean
  ): PrayerSettings => {
    const country =
      COUNTRIES_DATA.find((c) => c.id === countryIdVal) || COUNTRIES_DATA[0];
    const city =
      country.cities.find((c) => c.id === cityIdVal) || country.cities[0];
    const nextName = `${country.nameAr}، ${city.nameAr}`;
    return {
      ...base,
      locationMode: 'manual',
      countryId: country.id,
      cityId: city.id,
      locationName: nextName,
      lat: city.lat,
      lng: city.lng,
      timezoneMode: 'manual',
      manualTimezoneOffset: city.timezoneOffset,
      ianaTimezone: city.ianaTimezone || country.ianaTimezone,
      calcMethod: overrideMethod ? country.defaultMethod : base.calcMethod,
    };
  };

  const handleSelectCountry = (countryId: string) => {
    const next = buildManualSettingsFromCountryCity(
      settings,
      countryId,
      undefined,
      true
    );
    setCustomName(next.locationName);
    setCustomLat(String(next.lat));
    setCustomLng(String(next.lng));
    onUpdateSettings(next);
    triggerHaptic(15);
  };

  const handleSelectCity = (cityId: string) => {
    const next = buildManualSettingsFromCountryCity(
      settings,
      selectedCountry.id,
      cityId,
      false
    );
    setCustomName(next.locationName);
    setCustomLat(String(next.lat));
    setCustomLng(String(next.lng));
    onUpdateSettings(next);
    triggerHaptic(15);
  };

  const handleApplyCustomCoords = () => {
    const parsedLat = parseFloat(customLat);
    const parsedLng = parseFloat(customLng);
    if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) return;
    if (parsedLat < -90 || parsedLat > 90 || parsedLng < -180 || parsedLng > 180) return;

    onUpdateSettings({
      ...settings,
      locationMode: 'manual',
      locationName: customName.trim() || 'موقع مخصص',
      lat: parsedLat,
      lng: parsedLng,
      ianaTimezone: undefined,
    });
    setShowCustomCoords(false);
    triggerHaptic(20);
  };

  const handleSetLocationMode = (mode: 'auto' | 'manual') => {
    if (mode === 'auto') {
      onUpdateSettings({ ...settings, locationMode: 'auto' });
      onRequestGpsLocation();
    } else {
      const wasGps =
        settings.locationMode === 'auto' ||
        settings.locationName === 'موقعي الحالي (GPS)' ||
        !settings.locationName;
      if (wasGps) {
        const next = buildManualSettingsFromCountryCity(
          settings,
          selectedCountry.id,
          selectedCity.id,
          false
        );
        setCustomName(next.locationName);
        setCustomLat(String(next.lat));
        setCustomLng(String(next.lng));
        onUpdateSettings(next);
      } else {
        onUpdateSettings({ ...settings, locationMode: 'manual' });
      }
    }
    triggerHaptic(15);
  };

  const handleSaveAndClose = () => {
    if (settings.locationMode === 'manual') {
      if (settings.locationName === 'موقعي الحالي (GPS)' || !settings.locationName) {
        const next = buildManualSettingsFromCountryCity(
          settings,
          selectedCountry.id,
          selectedCity.id,
          false
        );
        onUpdateSettings(next);
      } else {
        onUpdateSettings({ ...settings, locationMode: 'manual' });
      }
    } else {
      onUpdateSettings({ ...settings });
    }
    onClose();
  };

  const handleChangeOffset = (
    key: keyof PrayerSettings['manualOffsets'],
    delta: number
  ) => {
    const current = settings.manualOffsets[key] || 0;
    const nextVal = Math.max(-30, Math.min(30, current + delta));
    onUpdateSettings({
      ...settings,
      manualOffsets: {
        ...settings.manualOffsets,
        [key]: nextVal,
      },
    });
    triggerHaptic(10);
  };

  const handleResetOffsets = () => {
    onUpdateSettings({
      ...settings,
      manualOffsets: { ...DEFAULT_PRAYER_SETTINGS.manualOffsets },
    });
    triggerHaptic(15);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white dark:bg-[#0D1831] text-slate-900 dark:text-[#F8FAFC] rounded-3xl border border-slate-200 dark:border-[#2DD4BF]/35 p-4 shadow-2xl relative max-h-[90dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2 text-[#0D9488] dark:text-[#2DD4BF]">
            <Globe className="w-5 h-5" />
            <b className="text-sm font-bold">إعدادات المكان والمواقيت والتوقيت الصيفي</b>
          </div>
          <button
            type="button"
            onClick={handleSaveAndClose}
            className="p-1 rounded-full text-slate-500 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          {/* 1. Location Mode (Auto GPS vs Manual Country/City) */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#132242] border border-slate-200 dark:border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-[#0D9488] dark:text-[#2DD4BF]">
                <MapPin className="w-4 h-4" />
                <span>تحديد الموقع والبلد</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-[#192D56] text-[#0D9488] dark:text-[#E5C168] border border-slate-200 dark:border-[#E5C168]/30">
                {settings.locationName}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 p-1 bg-white dark:bg-[#0A1328] rounded-xl border border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => handleSetLocationMode('auto')}
                className={`py-2 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                  settings.locationMode === 'auto'
                    ? 'bg-gradient-to-l from-[#0D9488] to-[#2DD4BF] text-[#081229] shadow-xs'
                    : 'text-slate-500 dark:text-slate-300'
                }`}
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>تلقائي (GPS)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetLocationMode('manual')}
                className={`py-2 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                  settings.locationMode === 'manual'
                    ? 'bg-gradient-to-l from-[#0D9488] to-[#2DD4BF] text-[#081229] shadow-xs'
                    : 'text-slate-500 dark:text-slate-300'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>يدوي (البلد/المدينة)</span>
              </button>
            </div>

            {settings.locationMode === 'auto' ? (
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#192D56] border border-slate-200 dark:border-white/10 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 dark:text-slate-300">الإحداثيات الحالية:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-[#F8FAFC] tabular-nums" dir="ltr">
                    {settings.lat.toFixed(3)}, {settings.lng.toFixed(3)}
                  </span>
                </div>
                {gpsStatus && (
                  <div className="text-[11px] font-bold text-[#0D9488] dark:text-[#2DD4BF]">
                    {gpsStatus}
                  </div>
                )}
                <button
                  type="button"
                  onClick={onRequestGpsLocation}
                  className="w-full py-2 rounded-xl bg-teal-50 dark:bg-[#0D1831] text-[#0D9488] dark:text-[#2DD4BF] font-bold flex items-center justify-center gap-1.5 border border-[#2DD4BF]/35 cursor-pointer active:scale-98"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>تحديث الموقع بالـ GPS الآن</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Country Select */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    اختر البلد:
                  </label>
                  <select
                    value={selectedCountry.id}
                    onChange={(e) => handleSelectCountry(e.target.value)}
                    className="w-full p-2 rounded-xl bg-white dark:bg-[#192D56] border border-slate-200 dark:border-white/15 text-xs font-bold text-slate-900 dark:text-[#F8FAFC] outline-none"
                  >
                    {COUNTRIES_DATA.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameAr}
                      </option>
                    ))}
                  </select>
                </div>

                {/* City Select */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    اختر المدينة / المحافظة:
                  </label>
                  <select
                    value={selectedCity.id}
                    onChange={(e) => handleSelectCity(e.target.value)}
                    className="w-full p-2 rounded-xl bg-white dark:bg-[#192D56] border border-slate-200 dark:border-white/15 text-xs font-bold text-slate-900 dark:text-[#F8FAFC] outline-none"
                  >
                    {selectedCountry.cities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.nameAr}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="px-2.5 py-1.5 rounded-xl bg-teal-50/70 dark:bg-[#0D1831] border border-[#2DD4BF]/25 flex items-center justify-between text-[10.5px]">
                  <span className="font-bold text-[#0D9488] dark:text-[#2DD4BF] truncate">
                    ✓ المحفوظ: {settings.locationName}
                  </span>
                  <span className="font-mono text-slate-500 dark:text-slate-400 tabular-nums shrink-0" dir="ltr">
                    {settings.lat.toFixed(2)}, {settings.lng.toFixed(2)}
                  </span>
                </div>

                {/* Custom Lat/Lng toggle */}
                <button
                  type="button"
                  onClick={() => setShowCustomCoords(!showCustomCoords)}
                  className="text-[11px] font-bold text-[#0D9488] dark:text-[#2DD4BF] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>
                    {showCustomCoords
                      ? 'إخفاء الإحداثيات المخصصة'
                      : 'إدخال اسم مكان وإحداثيات مخصصة يدوياً'}
                  </span>
                </button>

                {showCustomCoords && (
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#192D56] border border-slate-200 dark:border-white/15 space-y-2">
                    <div>
                      <label className="block text-[10px] font-bold mb-0.5">اسم المكان:</label>
                      <input
                        type="text"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        className="w-full p-1.5 rounded-lg border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#0D1831] text-xs font-bold"
                        placeholder="مثال: مصر، المعادي"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold mb-0.5">
                          خط العرض (Lat):
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          value={customLat}
                          onChange={(e) => setCustomLat(e.target.value)}
                          dir="ltr"
                          className="w-full p-1.5 rounded-lg border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#0D1831] text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold mb-0.5">
                          خط الطول (Lng):
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          value={customLng}
                          onChange={(e) => setCustomLng(e.target.value)}
                          dir="ltr"
                          className="w-full p-1.5 rounded-lg border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#0D1831] text-xs font-mono"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyCustomCoords}
                      className="w-full py-1.5 rounded-lg bg-[#0D9488] dark:bg-[#2DD4BF] text-white dark:text-[#081229] font-extrabold text-[11px] cursor-pointer"
                    >
                      تطبيق الإحداثيات المخصصة
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Daylight Saving Time (التوقيت الصيفي والشتوي) */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#132242] border border-slate-200 dark:border-white/10 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-bold text-[#0D9488] dark:text-[#2DD4BF]">
                <Sun className="w-4 h-4 text-[#E5C168]" />
                <span>التوقيت الصيفي والشتوي</span>
              </div>
              {(() => {
                const tzDet = getEffectiveTimezoneDetails(
                  new Date(),
                  settings.lng,
                  settings.timezoneMode,
                  settings.manualTimezoneOffset,
                  settings.dstMode,
                  settings.ianaTimezone
                );
                const sign = tzDet.effectiveHours >= 0 ? '+' : '';
                return (
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-[#192D56] text-[#0D9488] dark:text-[#2DD4BF] border border-[#2DD4BF]/30 tabular-nums"
                    dir="ltr"
                  >
                    UTC{sign}{tzDet.effectiveHours} ({tzDet.isDstActive ? 'صيفي' : 'شتوي'})
                  </span>
                );
              })()}
            </div>

            <div className="grid grid-cols-3 gap-1.5 p-1 bg-white dark:bg-[#0A1328] rounded-xl border border-slate-200 dark:border-white/10">
              {(
                [
                  { id: 'off', label: 'شتوي (ملغى)' },
                  { id: 'auto', label: 'تلقائي (البلد)' },
                  { id: 'on', label: 'صيفي (+١ س)' },
                ] as { id: DstMode; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onUpdateSettings({ ...settings, dstMode: opt.id });
                    triggerHaptic(15);
                  }}
                  className={`py-2 px-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                    settings.dstMode === opt.id
                      ? 'bg-gradient-to-l from-[#0D9488] to-[#2DD4BF] text-[#081229] shadow-xs'
                      : 'text-slate-500 dark:text-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-300">
              «تلقائي» يطبّق نظام البلد المختار حالياً ({selectedCountry.nameAr})، أو اختر يدوياً «صيفي (+١ س)» أو «شتوي».
            </p>
          </div>

          {/* 3. Timezone (Auto or Manual) */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#132242] border border-slate-200 dark:border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-[#0D9488] dark:text-[#2DD4BF]">
                <Clock className="w-4 h-4" />
                <span>المنطقة الزمنية (فرق التوقيت)</span>
              </div>
              <div className="flex gap-1 bg-white dark:bg-[#0A1328] p-0.5 rounded-lg border border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, timezoneMode: 'auto' })}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer ${
                    settings.timezoneMode === 'auto'
                      ? 'bg-[#2DD4BF] text-[#081229]'
                      : 'text-slate-500 dark:text-slate-300'
                  }`}
                >
                  تلقائي
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, timezoneMode: 'manual' })}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer ${
                    settings.timezoneMode === 'manual'
                      ? 'bg-[#2DD4BF] text-[#081229]'
                      : 'text-slate-500 dark:text-slate-300'
                  }`}
                >
                  يدوي
                </button>
              </div>
            </div>

            {settings.timezoneMode === 'manual' && (
              <select
                value={settings.manualTimezoneOffset}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    manualTimezoneOffset: parseFloat(e.target.value),
                  })
                }
                className="w-full p-2 rounded-xl bg-white dark:bg-[#192D56] border border-slate-200 dark:border-white/15 text-xs font-bold text-slate-900 dark:text-[#F8FAFC] outline-none"
              >
                {TIMEZONE_OPTIONS.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.labelAr}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 4. Calculation Method & Asr Madhhab */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#132242] border border-slate-200 dark:border-white/10 space-y-2.5">
            <div>
              <label className="block text-[11px] font-bold text-[#0D9488] dark:text-[#2DD4BF] mb-1">
                طريقة الحساب الفلكي:
              </label>
              <select
                value={settings.calcMethod}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, calcMethod: e.target.value })
                }
                className="w-full p-2 rounded-xl bg-white dark:bg-[#192D56] border border-slate-200 dark:border-white/15 text-xs font-bold text-slate-900 dark:text-[#F8FAFC] outline-none"
              >
                {Object.values(CALC_METHODS).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nameAr}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#0D9488] dark:text-[#2DD4BF] mb-1">
                المذهب الفقهي لصلاة العصر:
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-white dark:bg-[#0A1328] rounded-xl border border-slate-200 dark:border-white/10">
                {(
                  [
                    { id: 'shafi', label: 'الجمهور (الشافعي/المالكي)' },
                    { id: 'hanafi', label: 'المذهب الحنفي' },
                  ] as { id: MadhhabType; label: string }[]
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onUpdateSettings({ ...settings, madhhab: m.id });
                      triggerHaptic(15);
                    }}
                    className={`py-1.5 px-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition ${
                      settings.madhhab === m.id
                        ? 'bg-gradient-to-l from-[#0D9488] to-[#2DD4BF] text-[#081229] shadow-xs'
                        : 'text-slate-500 dark:text-slate-300'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 5. Manual Prayer Minutes Offset */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#132242] border border-slate-200 dark:border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <b className="text-[11px] font-bold text-[#0D9488] dark:text-[#2DD4BF]">
                تعديل المواقيت يدوياً (بالدقائق):
              </b>
              <button
                type="button"
                onClick={handleResetOffsets}
                className="text-[10px] font-bold text-[#0D9488] dark:text-[#E5C168] flex items-center gap-1 cursor-pointer hover:underline"
              >
                <RotateCcw className="w-3 h-3" />
                <span>تصفير</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  { key: 'fajr', label: 'الفجر' },
                  { key: 'sunrise', label: 'الشروق' },
                  { key: 'dhuhr', label: 'الظهر' },
                  { key: 'asr', label: 'العصر' },
                  { key: 'maghrib', label: 'المغرب' },
                  { key: 'isha', label: 'العشاء' },
                ] as { key: keyof PrayerSettings['manualOffsets']; label: string }[]
              ).map((item) => {
                const val = settings.manualOffsets[item.key] || 0;
                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-white dark:bg-[#192D56] border border-slate-200 dark:border-white/10"
                  >
                    <span className="font-bold text-[11px]">{item.label}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleChangeOffset(item.key, -1)}
                        className="w-5 h-5 rounded bg-slate-100 dark:bg-[#0D1831] flex items-center justify-center cursor-pointer"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <span
                        className="w-7 text-center font-bold text-[11px] text-[#0D9488] dark:text-[#2DD4BF] tabular-nums"
                        dir="ltr"
                      >
                        {val > 0 ? `+${toArabicDigits(val)}` : toArabicDigits(val)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleChangeOffset(item.key, 1)}
                        className="w-5 h-5 rounded bg-slate-100 dark:bg-[#0D1831] flex items-center justify-center cursor-pointer"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 6. Live Computed Prayer Times Preview */}
          {(() => {
            const previewTimes = calculatePrayerTimes(
              settings.lat,
              settings.lng,
              new Date(),
              settings.calcMethod,
              {
                madhhab: settings.madhhab,
                dstMode: settings.dstMode,
                timezoneMode: settings.timezoneMode,
                manualTimezoneOffset: settings.manualTimezoneOffset,
                ianaTimezone: settings.ianaTimezone,
                manualOffsets: settings.manualOffsets,
              }
            );
            return (
              <div className="p-2.5 rounded-2xl bg-teal-50/70 dark:bg-[#0D1831] border border-[#2DD4BF]/30">
                <div className="text-[10.5px] font-bold text-[#0D9488] dark:text-[#2DD4BF] mb-1.5">
                  معاينة مواقيت اليوم وفق الإعدادات الحالية:
                </div>
                <div className="grid grid-cols-6 gap-1 text-center text-[10px]">
                  {[
                    { label: 'الفجر', val: previewTimes.fajr.timeStr },
                    { label: 'الشروق', val: previewTimes.sunrise.timeStr },
                    { label: 'الظهر', val: previewTimes.dhuhr.timeStr },
                    { label: 'العصر', val: previewTimes.asr.timeStr },
                    { label: 'المغرب', val: previewTimes.maghrib.timeStr },
                    { label: 'العشاء', val: previewTimes.isha.timeStr },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="p-1 rounded-lg bg-white dark:bg-[#132242] border border-slate-200/70 dark:border-white/10"
                    >
                      <span className="text-slate-500 dark:text-slate-400 block text-[9px]">{s.label}</span>
                      <b className="font-extrabold text-slate-900 dark:text-[#F8FAFC] tabular-nums block">
                        {s.val}
                      </b>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        <button
          type="button"
          onClick={handleSaveAndClose}
          className="w-full mt-3 bg-gradient-to-l from-[#0D9488] to-[#2DD4BF] text-[#081229] font-extrabold text-xs py-2.5 rounded-xl transition cursor-pointer active:scale-98 flex items-center justify-center gap-1.5 shadow-sm"
        >
          <Check className="w-4 h-4" />
          <span>حفظ وتطبيق المواقيت</span>
        </button>
      </div>
    </div>
  );
};
