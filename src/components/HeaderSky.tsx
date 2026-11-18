import React, { useMemo } from 'react';
import { Settings, MapPin, Sun, Moon } from 'lucide-react';
import { DayPrayerTimes, NextPrayerInfo, toArabicDigits } from '../utils/prayerTimes';

interface HeaderSkyProps {
  nextPrayer: NextPrayerInfo;
  prayerTimes?: DayPrayerTimes;
  locationName: string;
  onOpenSettings: () => void;
  onOpenLocationSettings?: () => void;
  onSelectPrayerTab: () => void;
  themeMode?: 'auto' | 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const HeaderSky: React.FC<HeaderSkyProps> = ({
  nextPrayer,
  prayerTimes,
  locationName,
  onOpenSettings,
  onOpenLocationSettings,
  onSelectPrayerTab,
  themeMode,
  onToggleTheme,
}) => {
  // Deterministic subtle star field
  const stars = useMemo(() => {
    const list: { cx: string; cy: string; r: number; opacity: number }[] = [];
    let seed = 77;
    for (let i = 0; i < 36; i++) {
      seed = (seed * 9301 + 49297) % 233280;
      const x = (seed / 233280) * 100;
      seed = (seed * 9301 + 49297) % 233280;
      const y = (seed / 233280) * 85;
      list.push({
        cx: `${x.toFixed(1)}%`,
        cy: `${y.toFixed(1)}%`,
        r: i % 4 === 0 ? 1.4 : 0.8,
        opacity: i % 3 === 0 ? 0.65 : 0.3,
      });
    }
    return list;
  }, []);

  // Compute progress % between previous prayer and next prayer for the circular ring
  const ringProgress = useMemo(() => {
    if (!prayerTimes) return 0.65;
    const now = new Date();
    const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const slots = [
      prayerTimes.fajr.hour * 3600 + prayerTimes.fajr.minute * 60,
      prayerTimes.dhuhr.hour * 3600 + prayerTimes.dhuhr.minute * 60,
      prayerTimes.asr.hour * 3600 + prayerTimes.asr.minute * 60,
      prayerTimes.maghrib.hour * 3600 + prayerTimes.maghrib.minute * 60,
      prayerTimes.isha.hour * 3600 + prayerTimes.isha.minute * 60,
    ];
    const nextIdx = nextPrayer.index;
    const prevIdx = (nextIdx + 4) % 5;
    let totalSpan = slots[nextIdx] - slots[prevIdx];
    if (totalSpan <= 0) totalSpan += 86400;
    const progress = 1 - nextPrayer.remainingSeconds / totalSpan;
    return Math.max(0.08, Math.min(0.96, progress));
  }, [prayerTimes, nextPrayer]);

  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - ringProgress);

  const todayStr = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  let hijriStr = '';
  try {
    hijriStr = new Date().toLocaleDateString('ar-SA-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {}

  return (
    <header className="relative bg-gradient-to-b from-[#081229] via-[#0F1F42] to-[#152B59] text-[#F8FAFC] px-4 pt-3 pb-7 shrink-0 overflow-hidden shadow-lg">
      {/* Subtle Turquoise Ambient Radial Glow Behind Countdown Ring */}
      <div
        className="absolute left-1/2 top-[54%] -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full pointer-events-none opacity-35 blur-2xl"
        style={{ background: 'radial-gradient(circle, rgba(45,212,191,0.5) 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      {/* Twinkling Midnight Stars */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" aria-hidden="true">
        {stars.map((s, idx) => (
          <circle
            key={idx}
            cx={s.cx}
            cy={s.cy}
            r={s.r}
            fill="#E5C168"
            opacity={s.opacity}
          />
        ))}
      </svg>

      {/* Top Navigation / Controls Row */}
      <div className="relative z-20 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenSettings}
            className="min-w-[44px] min-h-[44px] rounded-full bg-white/5 hover:bg-white/15 active:scale-95 flex items-center justify-center text-[#E5C168] transition border border-white/10 cursor-pointer"
            aria-label="الإعدادات وتثبيت التطبيق"
            title="الإعدادات والأذان"
          >
            <Settings className="w-5 h-5" />
          </button>

          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="min-w-[44px] min-h-[44px] rounded-full bg-white/5 hover:bg-white/15 active:scale-95 flex items-center justify-center text-[#2DD4BF] transition border border-white/10 cursor-pointer"
              aria-label={themeMode === 'dark' ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن'}
              title={themeMode === 'dark' ? 'الوضع النهاري الفاتح' : 'الوضع الليلي الداكن'}
            >
              {themeMode === 'dark' ? <Sun className="w-5 h-5 text-[#E5C168]" /> : <Moon className="w-5 h-5" />}
            </button>
          )}
        </div>

        <h1 className="font-bold text-sm sm:text-base tracking-wide text-[#F8FAFC] whitespace-nowrap">
          القرآن الكريم
        </h1>

        <button
          type="button"
          onClick={onOpenLocationSettings}
          className="min-h-[44px] px-2.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] font-semibold text-[#CBD5E1] flex items-center gap-1 cursor-pointer transition active:scale-95 max-w-[125px]"
          title="تغيير الموقع أو البلد أو التوقيت الصيفي"
        >
          <MapPin className="w-3.5 h-3.5 text-[#E5C168] shrink-0" />
          <span className="truncate">{locationName}</span>
        </button>
      </div>

      {/* Unboxed Clean Date Metadata */}
      <div className="relative z-20 text-center text-[11px] text-[#94A3B8] font-medium mt-0.5">
        <span>{todayStr}</span>
        {hijriStr && (
          <>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span className="text-[#E5C168]">{hijriStr}</span>
          </>
        )}
      </div>

      {/* Central Glowing Circular Countdown Ring (Signature Focal Anchor from Design) */}
      <div
        onClick={onSelectPrayerTab}
        className="relative z-20 flex flex-col items-center justify-center mt-2.5 cursor-pointer group active:scale-[0.99] transition"
        role="button"
        tabIndex={0}
        aria-label={`الصلاة القادمة: ${nextPrayer.nameAr}`}
        title="اضغط لعرض مواقيت الصلوات والأذان"
      >
        <div className="text-xs font-bold text-[#2DD4BF] mb-1.5 tracking-wide">
          الصلاة القادمة: {nextPrayer.nameAr} · {nextPrayer.remainingArabicText}
        </div>

        <div className="relative w-36 h-36 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 drop-shadow-[0_0_16px_rgba(45,212,191,0.45)]" viewBox="0 0 132 132">
            <defs>
              <linearGradient id="turquoiseArc" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#5EEAD4" />
                <stop offset="55%" stopColor="#2DD4BF" />
                <stop offset="100%" stopColor="#0D9488" />
              </linearGradient>
            </defs>
            {/* Track circle */}
            <circle
              cx="66"
              cy="66"
              r={radius}
              fill="rgba(8, 18, 41, 0.55)"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="8"
            />
            {/* Active Glowing Progress Arc */}
            <circle
              cx="66"
              cy="66"
              r={radius}
              fill="none"
              stroke="url(#turquoiseArc)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-700"
            />
            {/* Inner subtle gold trim ring */}
            <circle
              cx="66"
              cy="66"
              r="46"
              fill="none"
              stroke="rgba(229, 193, 104, 0.25)"
              strokeWidth="1"
              strokeDasharray="3 4"
            />
          </svg>

          {/* Center Time & Countdown Readout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-black tracking-tight text-white tabular-nums leading-none">
              {nextPrayer.timeStr}
            </span>
            <span
              className="text-xs font-mono font-bold text-[#5EEAD4] tabular-nums mt-1.5"
              dir="ltr"
            >
              {nextPrayer.remainingFormatted}
            </span>
            <span className="text-[10px] text-[#E5C168] font-bold mt-0.5">
              أذان {nextPrayer.nameAr}
            </span>
          </div>
        </div>
      </div>

      {/* Subtle Mosque Horizon Silhouette */}
      <svg
        className="absolute right-0 left-0 bottom-0 z-10 w-full h-12 pointer-events-none opacity-45"
        viewBox="0 0 400 60"
        preserveAspectRatio="xMidYMax slice"
        aria-hidden="true"
      >
        <path
          fill="#060D1E"
          d="M0 60V48q35-6 70 0t70-2 70 3 70-3 70 2V60z"
        />
        <path
          fill="#060D1E"
          d="M320 60V38a20 20 0 0 1 40 0v22zM290 60V44a14 14 0 0 1 28 0v16z"
        />
        <rect x="364" y="14" width="4" height="46" fill="#060D1E" />
        <circle cx="366" cy="12" r="2.2" fill="#E5C168" />
      </svg>
    </header>
  );
};
