import React, { useState } from 'react';
import { Bookmark, X, BookOpen, Sparkles, Check } from 'lucide-react';
import { toArabicDigits } from '../utils/prayerTimes';
import { triggerHaptic } from '../utils/audio';

interface KhatmaTrackerModalProps {
  onClose: () => void;
  currentPage: number;
  onOpenPage: (page: number) => void;
}

export const KhatmaTrackerModal: React.FC<KhatmaTrackerModalProps> = ({
  onClose,
  currentPage,
  onOpenPage,
}) => {
  const [targetDays, setTargetDays] = useState<number>(30);
  const [readPages, setReadPages] = useState<number>(currentPage || 1);

  const totalPages = 604;
  const pagesPerDay = Math.ceil(totalPages / targetDays);
  const percentage = Math.min(100, Math.round((readPages / totalPages) * 100));
  const remainingPages = Math.max(0, totalPages - readPages);
  const estimatedDaysLeft = Math.ceil(remainingPages / pagesPerDay);

  const handleUpdate = (val: number) => {
    const clamped = Math.max(1, Math.min(val, 604));
    setReadPages(clamped);
    triggerHaptic(15);
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
          <Bookmark className="w-6 h-6" />
          <b className="text-base font-bold">متابعة الختمة القرآنية</b>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-300 mb-3">
          خطتك لختم كتاب الله وتوزيع الصفحات يومياً
        </p>

        {/* Progress Ring / Bar */}
        <div className="bg-slate-50 dark:bg-[#132242] p-3.5 rounded-2xl mb-3 text-center border border-slate-200 dark:border-[#2DD4BF]/25">
          <div className="text-3xl font-extrabold text-[#0D9488] dark:text-[#2DD4BF] tabular-nums">
            {toArabicDigits(percentage)}%
          </div>
          <div className="w-full h-2.5 bg-slate-200 dark:bg-black/30 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-l from-[#2DD4BF] to-[#0D9488] rounded-full transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-xs text-slate-700 dark:text-[#E5C168] font-bold mt-2">
            <span>صفحة {toArabicDigits(readPages)}</span>
            <span>باقي {toArabicDigits(remainingPages)} صفحة</span>
          </div>
        </div>

        {/* Target Plan Selector */}
        <div className="space-y-2.5 text-xs">
          <div>
            <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
              مدة الختمة المستهدفة
            </label>
            <select
              value={targetDays}
              onChange={(e) => setTargetDays(Number(e.target.value))}
              className="w-full bg-slate-50 dark:bg-[#132242] text-slate-900 dark:text-[#F8FAFC] border border-[#E5C168]/45 rounded-xl px-3 py-2 font-bold outline-none"
            >
              <option value={30}>ختمة شهرية (٣٠ يوماً - ٢٠ صفحة يومياً)</option>
              <option value={60}>ختمة شهرين (٦٠ يوماً - ١٠ صفحات يومياً)</option>
              <option value={15}>ختمة نصف شهر (١٥ يوماً - ٤٠ صفحة يومياً)</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
              الصفحة الحالية التي وصلت إليها (١ - ٦٠٤)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                max={604}
                value={readPages}
                onChange={(e) => handleUpdate(Number(e.target.value))}
                className="flex-1 bg-slate-50 dark:bg-[#132242] text-slate-900 dark:text-[#F8FAFC] border border-[#E5C168]/45 rounded-xl px-3 py-1.5 font-bold outline-none text-center tabular-nums"
              />
              <button
                onClick={() => {
                  onClose();
                  onOpenPage(readPages);
                }}
                className="bg-[#132242] border border-[#E5C168]/45 text-[#E5C168] px-3.5 py-1.5 rounded-xl font-bold transition active:scale-95 cursor-pointer flex items-center gap-1"
              >
                <BookOpen className="w-4 h-4" />
                <span>اقرأ الآن</span>
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 bg-gradient-to-l from-[#0D9488] to-[#2DD4BF] text-[#081229] font-extrabold text-xs py-2.5 rounded-xl transition cursor-pointer active:scale-98"
        >
          تم وحفظ
        </button>
      </div>
    </div>
  );
};
