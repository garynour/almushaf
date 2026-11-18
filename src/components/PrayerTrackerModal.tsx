import React, { useState } from 'react';
import { CheckSquare, X, Check, Flame, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';
import { toArabicDigits } from '../utils/prayerTimes';
import { triggerHaptic } from '../utils/audio';

interface PrayerTrackerModalProps {
  onClose: () => void;
}

export const PrayerTrackerModal: React.FC<PrayerTrackerModalProps> = ({ onClose }) => {
  const todayKey = new Date().toISOString().slice(0, 10);

  const [records, setRecords] = useState<Record<string, Record<string, boolean>>>(() => {
    try {
      const s = localStorage.getItem('prayer_tracker_records');
      return s ? JSON.parse(s) : {};
    } catch (e) {
      return {};
    }
  });

  const todayPrayers = records[todayKey] || {
    fajr: false,
    dhuhr: false,
    asr: false,
    maghrib: false,
    isha: false,
  };

  const prayers = [
    { key: 'fajr', name: 'الفجر', color: '#378ADD', bg: '#E6F1FB' },
    { key: 'dhuhr', name: 'الظهر', color: '#EF9F27', bg: '#FAEEDA' },
    { key: 'asr', name: 'العصر', color: '#D85A30', bg: '#FAECE7' },
    { key: 'maghrib', name: 'المغرب', color: '#D85A30', bg: '#FAECE7' },
    { key: 'isha', name: 'العشاء', color: '#7F77DD', bg: '#EEEDFE' },
  ];

  const completedCount = prayers.filter((p) => todayPrayers[p.key]).length;

  const handleToggle = (key: string) => {
    const updatedToday = { ...todayPrayers, [key]: !todayPrayers[key] };
    const nextRecords = { ...records, [todayKey]: updatedToday };
    setRecords(nextRecords);
    triggerHaptic(18);

    try {
      localStorage.setItem('prayer_tracker_records', JSON.stringify(nextRecords));
    } catch (e) {}

    // Check if all 5 are completed!
    const newCount = prayers.filter((p) => updatedToday[p.key]).length;
    if (newCount === 5) {
      triggerHaptic(40);
      confetti({
        particleCount: 45,
        spread: 80,
        origin: { y: 0.6 },
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs">
      <div className="w-full max-w-sm bg-white dark:bg-[#0D1831] text-slate-900 dark:text-[#F8FAFC] rounded-3xl border border-slate-200 dark:border-[#E5C168]/35 p-5 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute left-4 top-4 p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 dark:text-slate-300 cursor-pointer"
          aria-label="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1 text-[#0D9488] dark:text-[#2DD4BF]">
          <CheckSquare className="w-6 h-6" />
          <b className="text-base font-bold">متتبع الصلوات اليومي</b>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-300 mb-3">
          سجّل أداء صلواتك الخمس اليوم للمحافظة على الفريضة في وقتها
        </p>

        {/* Progress Bar & Milestone */}
        <div className="bg-slate-50 dark:bg-[#132242] border border-slate-200 dark:border-white/10 p-3 rounded-2xl mb-3 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-800 dark:text-[#2DD4BF]">
              أنجزت اليوم {toArabicDigits(completedCount)} من {toArabicDigits(5)} صلوات
            </div>
            <div className="w-36 h-2 bg-slate-200 dark:bg-black/30 rounded-full mt-1.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-l from-[#2DD4BF] to-[#0D9488] rounded-full transition-all duration-300"
                style={{ width: `${(completedCount / 5) * 100}%` }}
              />
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-white dark:bg-[#0A1328] flex items-center justify-center text-[#E5C168] shadow-xs border border-[#E5C168]/25">
            {completedCount === 5 ? <Trophy className="w-5 h-5" /> : <Flame className="w-5 h-5" />}
          </div>
        </div>

        {/* 5 Prayers Checklist */}
        <div className="space-y-2">
          {prayers.map((p) => {
            const isDone = !!todayPrayers[p.key];
            return (
              <div
                key={p.key}
                onClick={() => handleToggle(p.key)}
                className={`flex items-center justify-between p-3 rounded-2xl border transition cursor-pointer select-none active:scale-98 ${
                  isDone
                    ? 'bg-teal-50/70 dark:bg-[#132C4E] border-[#2DD4BF]/60 text-teal-950 dark:text-[#5EEAD4]'
                    : 'bg-slate-50 dark:bg-[#132242] border-slate-200 dark:border-white/10'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ backgroundColor: p.bg, color: p.color }}
                  >
                    {p.name[0]}
                  </div>
                  <b className="text-sm font-bold">صلاة {p.name}</b>
                </div>

                <div
                  className={`w-6 h-6 rounded-lg border flex items-center justify-center transition ${
                    isDone
                      ? 'bg-[#0D9488] dark:bg-[#2DD4BF] border-[#0D9488] dark:border-[#2DD4BF] text-white dark:text-[#081229]'
                      : 'border-slate-400/50 bg-white dark:bg-black/20'
                  }`}
                >
                  {isDone && <Check className="w-4 h-4 stroke-[3]" />}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 bg-gradient-to-l from-[#0D9488] to-[#2DD4BF] text-[#081229] font-extrabold text-xs py-2.5 rounded-xl transition cursor-pointer active:scale-98"
        >
          حفظ وإغلاق
        </button>
      </div>
    </div>
  );
};
