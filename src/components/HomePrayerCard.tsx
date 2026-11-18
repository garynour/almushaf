import React, { useState } from 'react';
import {
  Sun,
  Sunset,
  Sunrise,
  Moon,
  CloudSun,
  BellRing,
  Clock,
  X,
  Plus,
  Minus,
  Check,
} from 'lucide-react';
import {
  DayPrayerTimes,
  calculateIqamaTime,
  DEFAULT_IQAMA_CONFIG,
  IqamaConfig,
  toArabicDigits,
} from '../utils/prayerTimes';
import { stopIqamaSound, triggerHaptic } from '../utils/audio';
import { IqamaSoundSelector } from './IqamaSoundSelector';

interface HomePrayerCardProps {
  prayerTimes: DayPrayerTimes;
  nextIndex: number;
  onPrayerClick?: (index: number) => void;
}

export const HomePrayerCard: React.FC<HomePrayerCardProps> = ({
  prayerTimes,
  nextIndex,
  onPrayerClick,
}) => {
  // Iqama configuration state
  const [iqamaConfig, setIqamaConfig] = useState<IqamaConfig>(() => {
    try {
      const saved = localStorage.getItem('iqama_config');
      if (!saved) return DEFAULT_IQAMA_CONFIG;
      const parsed = JSON.parse(saved);
      if (!parsed || !parsed.offsets) return DEFAULT_IQAMA_CONFIG;
      return {
        ...DEFAULT_IQAMA_CONFIG,
        ...parsed,
        offsets: { ...DEFAULT_IQAMA_CONFIG.offsets, ...parsed.offsets },
      };
    } catch {
      return DEFAULT_IQAMA_CONFIG;
    }
  });

  const [showIqamaModal, setShowIqamaModal] = useState(false);

  const handleSaveIqamaConfig = (newConfig: IqamaConfig) => {
    setIqamaConfig(newConfig);
    try {
      localStorage.setItem('iqama_config', JSON.stringify(newConfig));
      window.dispatchEvent(new Event('iqama_config_updated'));
    } catch {}
  };

  const prayers = [
    {
      key: 'fajr' as const,
      name: 'الفجر',
      time: prayerTimes.fajr.timeStr,
      icon: Moon,
      accent: '#38BDF8',
    },
    {
      key: 'dhuhr' as const,
      name: 'الظهر',
      time: prayerTimes.dhuhr.timeStr,
      icon: Sun,
      accent: '#FBBF24',
    },
    {
      key: 'asr' as const,
      name: 'العصر',
      time: prayerTimes.asr.timeStr,
      icon: CloudSun,
      accent: '#FB923C',
    },
    {
      key: 'maghrib' as const,
      name: 'المغرب',
      time: prayerTimes.maghrib.timeStr,
      icon: Sunset,
      accent: '#F472B6',
    },
    {
      key: 'isha' as const,
      name: 'العشاء',
      time: prayerTimes.isha.timeStr,
      icon: Moon,
      accent: '#A78BFA',
    },
  ];

  const nextPrayerObj = prayers[nextIndex] || prayers[1];
  const nextIqama = calculateIqamaTime(nextPrayerObj.time, nextPrayerObj.key, iqamaConfig);

  return (
    <>
      <section className="relative z-30 mx-3 -mt-5 prayer-card-surface rounded-[24px] p-2.5 transition-all">
        {/* 5 Fluid Prayer Columns */}
        <div className="grid grid-cols-5 gap-1.5 text-center">
          {prayers.map((p, i) => {
            const isNext = i === nextIndex;
            const IconComp = p.icon;
            return (
              <button
                key={p.name}
                onClick={() => onPrayerClick?.(i)}
                className={`min-h-[78px] flex flex-col items-center justify-center py-2 px-1 rounded-[18px] transition-all duration-200 cursor-pointer active:scale-95 ${
                  isNext
                    ? 'bg-gradient-to-b from-[#2DD4BF] to-[#0D9488] text-[#051B1E] shadow-[0_6px_18px_rgba(45,212,191,0.38)]'
                    : 'bg-slate-50/90 dark:bg-[#0D1831]/80 text-[#0F172A] dark:text-[#F1F5F9] hover:bg-slate-100 dark:hover:bg-[#192D56] border border-slate-200/70 dark:border-white/5'
                }`}
                title={`صلاة ${p.name}`}
              >
                <span
                  className={`text-[11px] leading-tight mb-1.5 ${
                    isNext ? 'font-black text-[#042321]' : 'font-bold text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {p.name}
                </span>

                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center mb-1 ${
                    isNext ? 'bg-white/25 text-[#042321]' : 'bg-white dark:bg-[#16274B] shadow-xs'
                  }`}
                  style={!isNext ? { color: p.accent } : undefined}
                >
                  <IconComp className="w-3.5 h-3.5" />
                </div>

                <b
                  className={`text-[11.5px] tabular-nums tracking-tight ${
                    isNext ? 'text-[#042321] font-black' : 'font-extrabold'
                  }`}
                >
                  {p.time}
                </b>
              </button>
            );
          })}
        </div>

        {/* Clean Unboxed Sunrise + Iqama Trigger Strip */}
        <div className="mt-2.5 pt-2 border-t border-slate-200/70 dark:border-white/10 flex items-center justify-between gap-2 px-1 text-xs">
          <div className="flex items-center gap-2 min-w-0 text-[11px]">
            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-[#E5C168] font-bold shrink-0">
              <Sunrise className="w-3.5 h-3.5" />
              <span>الشروق {prayerTimes.sunrise.timeStr}</span>
            </span>
            <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">·</span>
            <span className="truncate font-bold text-slate-700 dark:text-slate-200">
              إقامة {nextPrayerObj.name}{' '}
              <b className="text-[#0D9488] dark:text-[#2DD4BF]">{nextIqama.iqamaTimeStr}</b>
            </span>
          </div>

          <button
            onClick={() => {
              setShowIqamaModal(true);
              triggerHaptic(15);
            }}
            className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-xl bg-teal-50 dark:bg-[#192C54] text-[#0D9488] dark:text-[#2DD4BF] border border-teal-200/70 dark:border-[#2DD4BF]/30 hover:bg-teal-100/70 dark:hover:bg-[#213869] transition cursor-pointer active:scale-95 shrink-0"
            title="إعدادات وتنبيه الإقامة"
          >
            <BellRing className="w-3.5 h-3.5" />
            <span>الإقامة</span>
          </button>
        </div>
      </section>

      {/* Iqama Settings & Reminder Modal */}
      {showIqamaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white dark:bg-[#132242] text-[#0F172A] dark:text-[#F8FAFC] rounded-3xl border border-[#2DD4BF]/50 p-4 shadow-2xl relative max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2 text-[#0D9488] dark:text-[#2DD4BF]">
                <Clock className="w-5 h-5" />
                <b className="text-sm font-bold">تنبيه الإقامة بصوت مؤذن معتمد</b>
              </div>
              <button
                onClick={() => {
                  stopIqamaSound();
                  setShowIqamaModal(false);
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-[#0D1831] border border-slate-200 dark:border-white/10">
                <div>
                  <b className="font-bold block text-sm">تفعيل تنبيهات الإقامة</b>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    صوت إقامة حقيقي لمؤذن معتمد عند اقتراب وقت الصلاة
                  </span>
                </div>
                <button
                  onClick={() => {
                    handleSaveIqamaConfig({
                      ...iqamaConfig,
                      enabled: !iqamaConfig.enabled,
                    });
                    triggerHaptic(20);
                  }}
                  className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition ${
                    iqamaConfig.enabled
                      ? 'bg-[#0D9488] dark:bg-[#2DD4BF] justify-end'
                      : 'bg-gray-300 dark:bg-gray-700 justify-start'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-md block" />
                </button>
              </div>

              <IqamaSoundSelector />

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-[#0D1831] border border-slate-200 dark:border-white/10">
                <div>
                  <b className="font-bold block">تنبيه اختياري قبل الإقامة بـ ٣ دقائق</b>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    يمنحك وقتاً للوضوء والاستعداد للصلاة
                  </span>
                </div>
                <button
                  onClick={() => {
                    handleSaveIqamaConfig({
                      ...iqamaConfig,
                      advanceAlert3Min: !iqamaConfig.advanceAlert3Min,
                    });
                    triggerHaptic(20);
                  }}
                  className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition ${
                    iqamaConfig.advanceAlert3Min
                      ? 'bg-[#0D9488] dark:bg-[#2DD4BF] justify-end'
                      : 'bg-gray-300 dark:bg-gray-700 justify-start'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-md block" />
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#0D1831] border border-slate-200 dark:border-white/10">
                <b className="font-bold block mb-2 text-[#0D9488] dark:text-[#E5C168]">
                  تحديد وقت الإقامة بعد الأذان (بالدقائق):
                </b>
                <div className="space-y-2">
                  {[
                    { key: 'fajr' as const, name: 'صلاة الفجر' },
                    { key: 'dhuhr' as const, name: 'صلاة الظهر' },
                    { key: 'asr' as const, name: 'صلاة العصر' },
                    { key: 'maghrib' as const, name: 'صلاة المغرب' },
                    { key: 'isha' as const, name: 'صلاة العشاء' },
                  ].map((p) => {
                    const minutes = iqamaConfig.offsets[p.key];
                    return (
                      <div
                        key={p.key}
                        className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-white dark:bg-[#132242]"
                      >
                        <span className="font-bold">{p.name}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (minutes > 5) {
                                handleSaveIqamaConfig({
                                  ...iqamaConfig,
                                  offsets: { ...iqamaConfig.offsets, [p.key]: minutes - 1 },
                                });
                                triggerHaptic(10);
                              }
                            }}
                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-[#192C54] flex items-center justify-center font-bold cursor-pointer active:scale-90"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-10 text-center font-extrabold text-sm text-[#0D9488] dark:text-[#2DD4BF]">
                            {toArabicDigits(minutes)} د
                          </span>
                          <button
                            onClick={() => {
                              if (minutes < 60) {
                                handleSaveIqamaConfig({
                                  ...iqamaConfig,
                                  offsets: { ...iqamaConfig.offsets, [p.key]: minutes + 1 },
                                });
                                triggerHaptic(10);
                              }
                            }}
                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-[#192C54] flex items-center justify-center font-bold cursor-pointer active:scale-90"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                stopIqamaSound();
                setShowIqamaModal(false);
              }}
              className="w-full mt-3 bg-gradient-to-r from-[#2DD4BF] to-[#0D9488] text-[#051B1E] font-extrabold text-xs py-3 rounded-2xl transition cursor-pointer active:scale-98 flex items-center justify-center gap-1.5 shadow-md"
            >
              <Check className="w-4 h-4" />
              <span>حفظ وإغلاق</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
