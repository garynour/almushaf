import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  BellOff,
  Sun,
  Sunset,
  Sunrise,
  Moon,
  CloudSun,
  MapPin,
  Volume2,
  Settings2,
  Clock,
  Plus,
  Minus,
  Globe,
} from 'lucide-react';
import {
  DayPrayerTimes,
  NextPrayerInfo,
  CALC_METHODS,
  toArabicDigits,
  IqamaConfig,
  DEFAULT_IQAMA_CONFIG,
  PrayerSettings,
  DstMode,
  getEffectiveTimezoneDetails,
} from '../utils/prayerTimes';
import {
  triggerHaptic,
  playAthanSound,
  stopAthanSound,
} from '../utils/audio';
import { IqamaSoundSelector } from './IqamaSoundSelector';
import { NotificationPermissionBanner } from './NotificationPermissionBanner';

interface PrayerTimesScreenProps {
  prayerTimes: DayPrayerTimes;
  nextPrayer: NextPrayerInfo;
  locationName: string;
  onRefreshLocation: () => void;
  calcMethod: string;
  onChangeCalcMethod: (method: string) => void;
  notifications: Record<string, boolean>;
  onToggleNotification: (prayerKey: string) => void;
  prayerSettings: PrayerSettings;
  onUpdatePrayerSettings: (settings: PrayerSettings) => void;
  onOpenLocationSettings: () => void;
}

export const PrayerTimesScreen: React.FC<PrayerTimesScreenProps> = ({
  prayerTimes,
  nextPrayer,
  locationName,
  onRefreshLocation,
  calcMethod,
  onChangeCalcMethod,
  notifications,
  onToggleNotification,
  prayerSettings,
  onUpdatePrayerSettings,
  onOpenLocationSettings,
}) => {
  const [showMethodSelector, setShowMethodSelector] = useState(false);
  const [testingAthan, setTestingAthan] = useState(false);

  const today = new Date();
  const gregorianStr = today.toLocaleDateString('ar-EG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  let hijriStr = '٣٠ جمادى الأولى ١٤٤٨';
  try {
    hijriStr = today.toLocaleDateString('ar-SA-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {}

  // Calculate sun/moon arc position along dotted parabolic curve
  const solarArc = useMemo(() => {
    const nowMin = today.getHours() * 60 + today.getMinutes();
    const sunriseMin = prayerTimes.sunrise.hour * 60 + prayerTimes.sunrise.minute;
    const maghribMin = prayerTimes.maghrib.hour * 60 + prayerTimes.maghrib.minute;
    const isDaytime = nowMin >= sunriseMin && nowMin <= maghribMin;

    let t = 0.5;
    if (isDaytime && maghribMin > sunriseMin) {
      t = (nowMin - sunriseMin) / (maghribMin - sunriseMin);
    } else {
      const nightLen = 1440 - maghribMin + sunriseMin;
      const elapsedNight = nowMin > maghribMin ? nowMin - maghribMin : 1440 - maghribMin + nowMin;
      t = Math.max(0.05, Math.min(0.95, elapsedNight / Math.max(1, nightLen)));
    }
    t = Math.max(0.04, Math.min(0.96, t));

    // Quadratic Bezier point along M(24,78) Q(160,8) (296,78)
    const x0 = 24, y0 = 78;
    const cx = 160, cy = 8;
    const x1 = 296, y1 = 78;
    const u = 1 - t;
    const orbX = u * u * x0 + 2 * u * t * cx + t * t * x1;
    const orbY = u * u * y0 + 2 * u * t * cy + t * t * y1;
    return { isDaytime, orbX, orbY };
  }, [prayerTimes, today.getHours(), today.getMinutes()]);

  const prayers = [
    {
      key: 'fajr',
      name: 'الفجر',
      time: prayerTimes.fajr.timeStr,
      icon: Moon,
      color: '#38BDF8',
    },
    {
      key: 'dhuhr',
      name: 'الظهر',
      time: prayerTimes.dhuhr.timeStr,
      icon: Sun,
      color: '#FBBF24',
    },
    {
      key: 'asr',
      name: 'العصر',
      time: prayerTimes.asr.timeStr,
      icon: CloudSun,
      color: '#FB923C',
    },
    {
      key: 'maghrib',
      name: 'المغرب',
      time: prayerTimes.maghrib.timeStr,
      icon: Sunset,
      color: '#F472B6',
    },
    {
      key: 'isha',
      name: 'العشاء',
      time: prayerTimes.isha.timeStr,
      icon: Moon,
      color: '#A78BFA',
    },
  ];

  const handleTestAthan = () => {
    if (testingAthan) {
      stopAthanSound();
      setTestingAthan(false);
    } else {
      stopAthanSound();
      const currentSelectedAthan = localStorage.getItem('selected_athan') || 'makkah';
      setTestingAthan(true);
      playAthanSound(currentSelectedAthan, () => {
        setTestingAthan(false);
      });
      triggerHaptic(20);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto pb-6">
      {/* Midnight Navy Header */}
      <div className="bg-gradient-to-b from-[#081229] to-[#112247] text-[#F8FAFC] pt-3.5 pb-4 px-4 shadow-md border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-base">مواقيت الصلاة</h1>
            <div className="text-[11px] text-[#94A3B8] mt-0.5 font-medium">
              <span>{gregorianStr}</span>
              <span className="mx-1.5" aria-hidden="true">·</span>
              <span className="text-[#E5C168]">{hijriStr}</span>
            </div>
          </div>

          <button
            onClick={handleTestAthan}
            className={`text-xs px-3 py-1.5 rounded-xl border flex items-center gap-1.5 cursor-pointer transition min-h-[40px] ${
              testingAthan
                ? 'bg-red-500/25 text-red-200 border-red-400 font-bold'
                : 'bg-white/5 hover:bg-white/15 text-[#E5C168] border-[#E5C168]/40 font-bold'
            }`}
            title="تجربة صوت الأذان المحفوظ"
          >
            <Volume2 className={`w-3.5 h-3.5 ${testingAthan ? 'animate-bounce' : ''}`} />
            <span>{testingAthan ? 'إيقاف الأذان' : 'تجربة الأذان'}</span>
          </button>
        </div>

        {/* Location Controls */}
        <div className="flex items-center justify-between gap-2 mt-2.5">
          <button
            onClick={onOpenLocationSettings}
            className="inline-flex items-center gap-1.5 text-[11px] bg-white/5 hover:bg-white/10 text-[#E2E8F0] px-3 py-1 rounded-xl border border-white/10 transition cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-[#2DD4BF]" />
            <span>{locationName}</span>
            <span className="text-[10px] text-[#E5C168] font-bold">
              ({prayerSettings.locationMode === 'auto' ? 'تلقائي' : 'يدوي · تغيير'})
            </span>
          </button>

          <button
            onClick={onRefreshLocation}
            className="text-[11px] text-[#2DD4BF] hover:underline font-bold cursor-pointer"
            title="تحديث الإحداثيات عبر GPS"
          >
            تحديث GPS
          </button>
        </div>

        {/* Dotted Solar / Lunar Horizon Arc (Matching Top-Right Mockup) */}
        <div className="mt-3 rounded-2xl bg-[#0A1633]/80 border border-white/10 p-3">
          <svg viewBox="0 0 320 92" className="w-full h-24 overflow-visible" aria-hidden="true">
            <defs>
              <radialGradient id="orbGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={solarArc.isDaytime ? '#FDE68A' : '#5EEAD4'} stopOpacity="0.95" />
                <stop offset="60%" stopColor={solarArc.isDaytime ? '#F59E0B' : '#2DD4BF'} stopOpacity="0.35" />
                <stop offset="100%" stopColor="transparent" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Horizon Line */}
            <line x1="16" y1="78" x2="304" y2="78" stroke="rgba(148,163,184,0.25)" strokeWidth="1" />

            {/* Dotted Parabolic Sun Path */}
            <path
              d="M 24 78 Q 160 8 296 78"
              fill="none"
              stroke="rgba(229, 193, 104, 0.45)"
              strokeWidth="2"
              strokeDasharray="3 5"
            />

            {/* Endpoint Dots */}
            <circle cx="24" cy="78" r="3.5" fill="#E5C168" />
            <circle cx="296" cy="78" r="3.5" fill="#F472B6" />

            {/* Dynamic Sun / Moon Orb */}
            <circle cx={solarArc.orbX} cy={solarArc.orbY} r="16" fill="url(#orbGlow)" />
            <circle
              cx={solarArc.orbX}
              cy={solarArc.orbY}
              r="7"
              fill={solarArc.isDaytime ? '#FDE68A' : '#2DD4BF'}
              stroke="#FFFFFF"
              strokeWidth="1.5"
            />
          </svg>

          <div className="flex items-center justify-between text-[11px] -mt-2 px-1">
            <div className="text-right">
              <span className="text-[#94A3B8]">الشروق</span>{' '}
              <b className="text-[#E5C168] tabular-nums">{prayerTimes.sunrise.timeStr}</b>
            </div>
            <div className="text-center font-bold text-[#2DD4BF]">
              {nextPrayer.remainingArabicText}
            </div>
            <div className="text-left">
              <span className="text-[#94A3B8]">الغروب</span>{' '}
              <b className="text-pink-300 tabular-nums">{prayerTimes.maghrib.timeStr}</b>
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 space-y-3 max-w-lg mx-auto">
        {/* Next Prayer Live Banner */}
        <div className="bg-gradient-to-r from-[#0F2347] to-[#173366] text-[#F8FAFC] rounded-[22px] p-3.5 border border-[#2DD4BF]/35 shadow-md flex items-center justify-between">
          <div>
            <div className="text-xs text-[#2DD4BF] font-bold">
              الصلاة القادمة: {nextPrayer.nameAr}
            </div>
            <div className="text-2xl font-black mt-0.5 tabular-nums text-white">{nextPrayer.timeStr}</div>
          </div>
          <div className="text-left">
            <span
              className="text-xs bg-black/35 border border-[#2DD4BF]/40 text-[#5EEAD4] px-3 py-1 rounded-xl font-mono font-bold block tabular-nums"
              dir="ltr"
            >
              {nextPrayer.remainingFormatted}
            </span>
            <span className="text-[10px] text-[#E5C168] block mt-1 font-semibold">
              {nextPrayer.remainingArabicText}
            </span>
          </div>
        </div>

        {/* 5 Fluid Prayer Rows */}
        <div className="space-y-2">
          {prayers.map((p, idx) => {
            const isNext = idx === nextPrayer.index;
            const isNotifOn = notifications[p.key] !== false;
            const IconComp = p.icon;

            return (
              <div
                key={p.key}
                className={`flex items-center gap-3 p-3 rounded-[20px] border transition ${
                  isNext
                    ? 'bg-gradient-to-r from-[#2DD4BF] to-[#0D9488] text-[#051B1E] border-[#5EEAD4] shadow-[0_8px_20px_rgba(45,212,191,0.28)]'
                    : 'bg-white dark:bg-[#132242] border-slate-200 dark:border-white/10 shadow-sm'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0 ${
                    isNext ? 'bg-white/25 text-[#042321]' : 'bg-slate-100 dark:bg-[#0D1831]'
                  }`}
                  style={!isNext ? { color: p.color } : undefined}
                >
                  <IconComp className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <b className={`text-sm font-bold block ${isNext ? 'text-[#042321]' : 'text-[#0F172A] dark:text-[#F8FAFC]'}`}>
                    {p.name}
                  </b>
                  {isNext && (
                    <div className="text-[11px] text-[#042321]/85 font-bold">
                      الصلاة القادمة · {nextPrayer.remainingArabicText}
                    </div>
                  )}
                </div>

                <b className={`text-base font-extrabold tracking-wide tabular-nums ${isNext ? 'text-[#042321]' : 'text-[#0F172A] dark:text-[#F8FAFC]'}`}>
                  {p.time}
                </b>

                <button
                  onClick={() => {
                    onToggleNotification(p.key);
                    triggerHaptic(15);
                  }}
                  className={`min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center transition cursor-pointer active:scale-90 ${
                    isNext
                      ? isNotifOn
                        ? 'text-[#042321] bg-white/25'
                        : 'text-[#042321]/50'
                      : isNotifOn
                      ? 'text-[#E5C168] hover:bg-amber-500/10'
                      : 'text-slate-400 opacity-50'
                  }`}
                  aria-label={isNotifOn ? `تعطيل أذان ${p.name}` : `تفعيل أذان ${p.name}`}
                  title={isNotifOn ? 'الأذان مفعّل' : 'الأذان صامت'}
                >
                  {isNotifOn ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                </button>
              </div>
            );
          })}

          {/* Sunrise Row */}
          <div className="flex items-center gap-3 p-3 rounded-[20px] bg-white dark:bg-[#132242] border border-slate-200 dark:border-white/10 shadow-sm">
            <div className="w-10 h-10 rounded-[14px] bg-amber-50 dark:bg-[#0D1831] text-amber-500 flex items-center justify-center shrink-0">
              <Sunrise className="w-5 h-5" />
            </div>
            <b className="flex-1 text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              الشروق
            </b>
            <b className="text-base font-extrabold text-[#0F172A] dark:text-[#F8FAFC] tabular-nums">
              {prayerTimes.sunrise.timeStr}
            </b>
          </div>
        </div>

        {/* Web Notification API Permission & Local Alert Service */}
        <NotificationPermissionBanner
          nextPrayerName={nextPrayer.nameAr}
          nextPrayerTime={nextPrayer.timeStr}
        />

        {/* Iqama Times & Reminders Card */}
        <IqamaTimesCard />

        {/* Location, Country, DST & Full Prayer Settings Card */}
        <div className="bg-white dark:bg-[#132242] border border-slate-200 dark:border-white/10 rounded-[22px] p-3.5 shadow-sm">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#0D9488] dark:text-[#E5C168]" />
              <b className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                المكان والبلد والتوقيت الصيفي والمواقيت
              </b>
            </div>
            <button
              onClick={onOpenLocationSettings}
              className="text-xs px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#2DD4BF] to-[#0D9488] text-[#051B1E] font-extrabold cursor-pointer active:scale-95 transition"
            >
              تخصيص شامل
            </button>
          </div>

          {(() => {
            const tzDetails = getEffectiveTimezoneDetails(
              today,
              prayerSettings.lng,
              prayerSettings.timezoneMode,
              prayerSettings.manualTimezoneOffset,
              prayerSettings.dstMode,
              prayerSettings.ianaTimezone
            );
            const sign = tzDetails.effectiveHours >= 0 ? '+' : '';
            return (
              <>
                <div className="grid grid-cols-3 gap-2 text-[10px] text-center">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#0D1831]">
                    <span className="text-slate-500 dark:text-slate-400 block">الموقع</span>
                    <b className="text-[#0F172A] dark:text-[#F8FAFC] block truncate">
                      {prayerSettings.locationMode === 'auto' ? 'تلقائي GPS' : 'يدوي'}
                    </b>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#0D1831]">
                    <span className="text-slate-500 dark:text-slate-400 block">التوقيت المفعّل</span>
                    <b className="text-[#0D9488] dark:text-[#2DD4BF] block tabular-nums" dir="ltr">
                      UTC{sign}{tzDetails.effectiveHours} ({tzDetails.isDstActive ? 'صيفي' : 'شتوي'})
                    </b>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#0D1831]">
                    <span className="text-slate-500 dark:text-slate-400 block">مذهب العصر</span>
                    <b className="text-[#0F172A] dark:text-[#F8FAFC] block">
                      {prayerSettings.madhhab === 'hanafi' ? 'الحنفي' : 'الجمهور'}
                    </b>
                  </div>
                </div>

                {/* Direct 1-Tap Winter / Auto / Summer DST Switcher */}
                <div className="mt-2.5 p-2 rounded-2xl bg-slate-50 dark:bg-[#0D1831] border border-slate-200/70 dark:border-white/10">
                  <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                    <span>التوقيت الصيفي والشتوي:</span>
                    <span className="text-[#0D9488] dark:text-[#E5C168]">
                      {prayerSettings.dstMode === 'on'
                        ? 'صيفي (+١ ساعة)'
                        : prayerSettings.dstMode === 'off'
                        ? 'شتوي (قياسي)'
                        : tzDetails.isDstActive
                        ? 'تلقائي (صيفي الآن)'
                        : 'تلقائي (شتوي الآن)'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 p-0.5 rounded-xl bg-white dark:bg-[#132242] border border-slate-200 dark:border-white/10">
                    {(
                      [
                        { id: 'off', label: 'شتوي' },
                        { id: 'auto', label: 'تلقائي' },
                        { id: 'on', label: 'صيفي (+١س)' },
                      ] as { id: DstMode; label: string }[]
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          onUpdatePrayerSettings({ ...prayerSettings, dstMode: opt.id });
                          triggerHaptic(15);
                        }}
                        className={`py-1.5 px-1 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                          prayerSettings.dstMode === opt.id
                            ? 'bg-gradient-to-l from-[#0D9488] to-[#2DD4BF] text-[#051B1E] shadow-xs'
                            : 'text-slate-500 dark:text-slate-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            );
          })()}

          <div className="mt-2.5 pt-2.5 border-t border-slate-200/70 dark:border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-[#0D9488] dark:text-[#E5C168]" />
                <b className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  طريقة الحساب الفلكي
                </b>
              </div>
              <button
                onClick={() => setShowMethodSelector(!showMethodSelector)}
                className="text-xs text-[#0D9488] dark:text-[#2DD4BF] font-bold cursor-pointer"
              >
                {showMethodSelector ? 'إغلاق' : 'تغيير'}
              </button>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              الطريقة المعتمدة الحالية: {CALC_METHODS[calcMethod]?.nameAr || CALC_METHODS.egypt.nameAr}
            </div>

            {showMethodSelector && (
              <div className="mt-2.5 pt-2 border-t border-slate-200/70 dark:border-white/10 space-y-1">
                {Object.values(CALC_METHODS).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      onChangeCalcMethod(m.id);
                      setShowMethodSelector(false);
                      triggerHaptic(15);
                    }}
                    className={`w-full text-right p-2.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-between ${
                      calcMethod === m.id
                        ? 'bg-[#2DD4BF] text-[#051B1E] font-bold'
                        : 'hover:bg-slate-100 dark:hover:bg-[#0D1831] text-[#0F172A] dark:text-[#F8FAFC]'
                    }`}
                  >
                    <span>{m.nameAr}</span>
                    {calcMethod === m.id && <span>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Authentic Athan Reciters Selector Card */}
        <AthanSelectorCard />
      </div>
    </div>
  );
};

// Subcomponent: Athan Sound Selector & Preview Player
const AthanSelectorCard: React.FC = () => {
  const [selectedAthanId, setSelectedAthanId] = useState<string>(() => {
    try {
      return localStorage.getItem('selected_athan') || 'makkah';
    } catch {
      return 'makkah';
    }
  });
  const [playingAthanId, setPlayingAthanId] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const athanList = [
    { id: 'makkah', title: 'أذان الحرم المكي الشريف', sub: 'مكة المكرمة - الشيخ محمد خليل رمل' },
    { id: 'madinah', title: 'أذان المسجد النبوي الشريف', sub: 'المدينة المنورة - الشيخ عبدالمجيد السريحي' },
    { id: 'egypt_ismail', title: 'أذان مصر - الشيخ مصطفى إسماعيل', sub: 'إذاعة القرآن الكريم - قاهرة المعز' },
    { id: 'egypt_minshawi', title: 'أذان مصر - الشيخ المنشاوي', sub: 'الشيخ محمد صديق المنشاوي' },
    { id: 'chime', title: 'نغمة تكبير هادئة (بدون إنترنت)', sub: 'صوت إلكتروني مدمج أوفلاين' },
  ];

  useEffect(() => {
    const handleUpdate = () => {
      try {
        const id = localStorage.getItem('selected_athan');
        if (id) setSelectedAthanId(id);
      } catch {}
    };
    window.addEventListener('athan_storage_updated', handleUpdate);
    return () => window.removeEventListener('athan_storage_updated', handleUpdate);
  }, []);

  const handleTogglePlayAthan = (id: string) => {
    if (playingAthanId === id) {
      stopAthanSound();
      setPlayingAthanId(null);
    } else {
      stopAthanSound();
      setPlayingAthanId(id);
      playAthanSound(id, () => {
        setPlayingAthanId(null);
      });
      triggerHaptic(20);
    }
  };

  const handleSelectAthan = (id: string, title: string) => {
    setSelectedAthanId(id);
    try {
      localStorage.setItem('selected_athan', id);
      window.dispatchEvent(new Event('athan_storage_updated'));
    } catch {}
    setSavedNotice(`تم حفظ "${title}" كـ صوت الأذان المعتمد ✓`);
    setTimeout(() => setSavedNotice(null), 3000);
    triggerHaptic(20);
  };

  return (
    <div className="bg-white dark:bg-[#132242] border border-slate-200 dark:border-white/10 rounded-[22px] p-3.5 shadow-sm">
      {savedNotice && (
        <div className="mb-2.5 p-2 bg-teal-50 dark:bg-[#2DD4BF]/15 text-teal-800 dark:text-[#5EEAD4] rounded-xl text-xs font-bold text-center border border-[#2DD4BF]/40">
          {savedNotice}
        </div>
      )}
      <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-200/70 dark:border-white/10">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-[#0D9488] dark:text-[#E5C168]" />
          <b className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
            أصوات الأذان والمؤذنين
          </b>
        </div>
        <span className="text-[10px] text-amber-600 dark:text-[#E5C168] font-bold">
          اختر صوتك المفضل
        </span>
      </div>

      <div className="space-y-1.5">
        {athanList.map((item) => {
          const isSelected = selectedAthanId === item.id;
          const isPlaying = playingAthanId === item.id;

          return (
            <div
              key={item.id}
              onClick={() => handleSelectAthan(item.id, item.title)}
              className={`p-2.5 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                isSelected
                  ? 'bg-teal-50 dark:bg-[#192E58] border-[#0D9488] dark:border-[#2DD4BF]'
                  : 'hover:bg-slate-50 dark:hover:bg-[#0D1831] border-slate-200/70 dark:border-white/10'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                    isSelected
                      ? 'border-[#0D9488] bg-[#0D9488] dark:border-[#2DD4BF] dark:bg-[#2DD4BF]'
                      : 'border-slate-400'
                  }`}
                >
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-[#051B1E]" />}
                </span>

                <div className="min-w-0">
                  <b className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] block truncate">
                    {item.title}
                  </b>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                    {item.sub}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTogglePlayAthan(item.id);
                }}
                className={`px-2.5 py-1.5 rounded-xl border text-xs flex items-center gap-1 font-bold cursor-pointer transition active:scale-95 shrink-0 ${
                  isPlaying
                    ? 'bg-[#2DD4BF] text-[#051B1E] border-[#2DD4BF]'
                    : 'border-[#E5C168]/50 text-[#0D9488] dark:text-[#E5C168] hover:bg-amber-500/10'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>{isPlaying ? 'إيقاف' : 'استماع'}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Subcomponent: Iqama Times & Reminders Card
const IqamaTimesCard: React.FC = () => {
  const [config, setConfig] = useState<IqamaConfig>(() => {
    try {
      const s = localStorage.getItem('iqama_config');
      return s ? JSON.parse(s) : DEFAULT_IQAMA_CONFIG;
    } catch {
      return DEFAULT_IQAMA_CONFIG;
    }
  });
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      try {
        const s = localStorage.getItem('iqama_config');
        if (s) setConfig(JSON.parse(s));
      } catch {}
    };
    window.addEventListener('iqama_config_updated', handleUpdate);
    return () => window.removeEventListener('iqama_config_updated', handleUpdate);
  }, []);

  const saveConfig = (newCfg: IqamaConfig, notice?: string) => {
    setConfig(newCfg);
    try {
      localStorage.setItem('iqama_config', JSON.stringify(newCfg));
      window.dispatchEvent(new Event('iqama_config_updated'));
    } catch {}
    if (notice) {
      setSavedNotice(notice);
      setTimeout(() => setSavedNotice(null), 2500);
    }
    triggerHaptic(15);
  };

  return (
    <div className="bg-white dark:bg-[#132242] border border-slate-200 dark:border-white/10 rounded-[22px] p-3.5 shadow-sm">
      {savedNotice && (
        <div className="mb-2.5 p-2 bg-teal-50 dark:bg-[#2DD4BF]/15 text-teal-800 dark:text-[#5EEAD4] rounded-xl text-xs font-bold text-center border border-[#2DD4BF]/40">
          {savedNotice}
        </div>
      )}

      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-200/70 dark:border-white/10">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#0D9488] dark:text-[#2DD4BF]" />
          <b className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC]">
            تنبيه الإقامة (صوت معتمد أو من ذاكرة الجهاز)
          </b>
        </div>
      </div>

      <div className="space-y-2 text-xs">
        <IqamaSoundSelector
          compact
          onSelectNotice={(msg) => {
            setSavedNotice(msg);
            setTimeout(() => setSavedNotice(null), 2500);
          }}
        />

        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-[#0D1831]">
          <div>
            <b className="font-bold block text-xs">تفعيل تنبيهات الإقامة</b>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              تنبيه بصوت المؤذن واهتزاز خفيف عند موعد إقامة كل صلاة
            </span>
          </div>
          <button
            onClick={() =>
              saveConfig(
                { ...config, enabled: !config.enabled },
                config.enabled ? 'تم إيقاف تنبيهات الإقامة' : 'تم تفعيل تنبيهات الإقامة ✓'
              )
            }
            className={`w-10 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition ${
              config.enabled
                ? 'bg-[#0D9488] dark:bg-[#2DD4BF] justify-end'
                : 'bg-gray-300 dark:bg-gray-700 justify-start'
            }`}
          >
            <span className="w-3.5 h-3.5 rounded-full bg-white shadow-xs block" />
          </button>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-[#0D1831]">
          <div>
            <b className="font-bold block text-xs">تنبيه قبل الإقامة بـ ٣ دقائق</b>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              تنبيه مسبق للاستعداد والوضوء والذهاب للمسجد
            </span>
          </div>
          <button
            onClick={() =>
              saveConfig(
                { ...config, advanceAlert3Min: !config.advanceAlert3Min },
                'تم حفظ إعداد التنبيه المسبق'
              )
            }
            className={`w-10 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition ${
              config.advanceAlert3Min
                ? 'bg-[#0D9488] dark:bg-[#2DD4BF] justify-end'
                : 'bg-gray-300 dark:bg-gray-700 justify-start'
            }`}
          >
            <span className="w-3.5 h-3.5 rounded-full bg-white shadow-xs block" />
          </button>
        </div>

        <div className="p-2.5 rounded-2xl border border-slate-200/70 dark:border-white/10 space-y-1.5">
          <div className="text-[11px] font-bold text-amber-700 dark:text-[#E5C168] mb-1">
            وقت الإقامة بعد الأذان لكل صلاة:
          </div>
          {[
            { key: 'fajr' as const, name: 'الفجر' },
            { key: 'dhuhr' as const, name: 'الظهر' },
            { key: 'asr' as const, name: 'العصر' },
            { key: 'maghrib' as const, name: 'المغرب' },
            { key: 'isha' as const, name: 'العشاء' },
          ].map((item) => {
            const val = config.offsets[item.key];
            return (
              <div
                key={item.key}
                className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-slate-50 dark:bg-[#0D1831]"
              >
                <span className="font-bold text-xs">{item.name}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (val > 5) {
                        saveConfig({
                          ...config,
                          offsets: { ...config.offsets, [item.key]: val - 1 },
                        });
                      }
                    }}
                    className="w-6 h-6 rounded-lg bg-white dark:bg-[#132242] border border-slate-200 dark:border-white/10 flex items-center justify-center font-bold cursor-pointer active:scale-90"
                  >
                    <Minus className="w-2.5 h-2.5" />
                  </button>
                  <span className="w-9 text-center font-extrabold text-xs text-[#0D9488] dark:text-[#2DD4BF]">
                    {toArabicDigits(val)} د
                  </span>
                  <button
                    onClick={() => {
                      if (val < 60) {
                        saveConfig({
                          ...config,
                          offsets: { ...config.offsets, [item.key]: val + 1 },
                        });
                      }
                    }}
                    className="w-6 h-6 rounded-lg bg-white dark:bg-[#132242] border border-slate-200 dark:border-white/10 flex items-center justify-center font-bold cursor-pointer active:scale-90"
                  >
                    <Plus className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
