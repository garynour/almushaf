import React, { useState } from 'react';
import { Bookmark, Check, Copy, Share2, BookOpen } from 'lucide-react';
import { HADITH_LIST, Hadith } from '../data/hadithData';
import { toArabicDigits } from '../utils/prayerTimes';
import { triggerHaptic } from '../utils/audio';

export const HadithScreen: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [bookmarkedHadiths, setBookmarkedHadiths] = useState<Record<string, boolean>>(() => {
    try {
      const s = localStorage.getItem('hadith_bookmarks');
      return s ? JSON.parse(s) : {};
    } catch (e) {
      return {};
    }
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = [
    { id: 'all', title: 'الكل' },
    { id: 'الأربعون النووية', title: 'الأربعون النووية' },
    { id: 'صحيح البخاري', title: 'البخاري' },
    { id: 'صحيح مسلم', title: 'مسلم' },
    { id: 'رياض الصالحين', title: 'رياض الصالحين' },
  ];

  const filtered = selectedCategory === 'all'
    ? HADITH_LIST
    : HADITH_LIST.filter((h) => h.category === selectedCategory);

  const handleToggleBookmark = (id: string) => {
    const next = { ...bookmarkedHadiths, [id]: !bookmarkedHadiths[id] };
    setBookmarkedHadiths(next);
    triggerHaptic(15);
    try {
      localStorage.setItem('hadith_bookmarks', JSON.stringify(next));
    } catch (e) {}
  };

  const handleCopy = async (h: Hadith) => {
    const text = `«${h.text}» [${h.source}${h.narrator ? ` - عن ${h.narrator}` : ''}]`;
    await navigator.clipboard.writeText(text);
    setCopiedId(h.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto pb-6 bg-[#F4F6FA] dark:bg-[#081023] islamic-bg-pattern">
      <div className="bg-gradient-to-b from-[#081229] to-[#0F1F42] text-white py-3.5 px-4 font-bold text-base sticky top-0 z-20 shadow-md flex items-center justify-between border-b border-white/10">
        <span>الأحاديث النبوية الشريفة</span>
        <span className="text-xs text-[#E5C168]">صحاح الأثر</span>
      </div>

      <div className="p-3 max-w-lg mx-auto space-y-3">
        {/* Categories Bar */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === c.id
                  ? 'bg-gradient-to-l from-[#2DD4BF] to-[#0D9488] text-[#081229] shadow-sm'
                  : 'bg-white dark:bg-[#132242] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10'
              }`}
            >
              {c.title}
            </button>
          ))}
        </div>

        {/* Hadith Cards */}
        <div className="space-y-2.5">
          {filtered.map((hadith) => {
            const isBookmarked = !!bookmarkedHadiths[hadith.id];
            const isCopied = copiedId === hadith.id;

            return (
              <div
                key={hadith.id}
                className="fluid-card rounded-[22px] p-4"
              >
                <p className="font-quran text-base sm:text-lg leading-relaxed text-slate-900 dark:text-[#F8FAFC] text-right mb-3">
                  «{hadith.text}»
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 dark:border-white/10 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="bg-teal-50 dark:bg-[#192E59] text-[#0D9488] dark:text-[#E5C168] px-2.5 py-0.5 rounded-full font-bold">
                      {hadith.source}
                    </span>
                    {hadith.narrator && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
                        {hadith.narrator}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopy(hadith)}
                      className="p-1.5 rounded-lg text-slate-500 dark:text-slate-300 hover:text-[#0D9488] dark:hover:text-[#2DD4BF] transition cursor-pointer"
                      title="نسخ الحديث"
                      aria-label="نسخ"
                    >
                      {isCopied ? <Check className="w-4 h-4 text-[#2DD4BF]" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleToggleBookmark(hadith.id)}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                        isBookmarked ? 'text-[#E5C168]' : 'text-slate-500 dark:text-slate-300 hover:text-[#E5C168]'
                      }`}
                      title="حفظ الحديث"
                      aria-label="حفظ الحديث"
                    >
                      <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
