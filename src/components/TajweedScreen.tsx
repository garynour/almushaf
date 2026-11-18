import React, { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  Layers,
  Volume2,
  Search,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Bookmark,
  ArrowRight,
  Info,
} from 'lucide-react';
import { TAJWEED_CATEGORIES, TajweedRuleItem } from '../data/tajweedData';
import { triggerHaptic } from '../utils/audio';

interface TajweedScreenProps {
  onBack: () => void;
  onOpenMushaf: (page: number) => void;
}

export const TajweedScreen: React.FC<TajweedScreenProps> = ({ onBack, onOpenMushaf }) => {
  const [selectedCatId, setSelectedCatId] = useState<string>('noon-sakina');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>('izhar');

  const currentCategory =
    TAJWEED_CATEGORIES.find((c) => c.id === selectedCatId) || TAJWEED_CATEGORIES[0];

  const filteredRules = currentCategory.rules.filter(
    (r) =>
      r.title.includes(searchQuery) ||
      r.definition.includes(searchQuery) ||
      r.letters.includes(searchQuery) ||
      r.examples.some((e) => e.text.includes(searchQuery))
  );

  const toggleExpand = (id: string) => {
    setExpandedRuleId((prev) => (prev === id ? null : id));
    triggerHaptic(12);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F4F6FA] dark:bg-[#081023] text-slate-900 dark:text-[#F8FAFC] font-cairo overflow-hidden islamic-bg-pattern">
      {/* Top Header */}
      <div className="bg-gradient-to-b from-[#081229] to-[#0F1F42] text-white py-3.5 px-4 sticky top-0 z-20 shadow-md flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[#E5C168] cursor-pointer active:scale-95 transition"
            aria-label="رجوع"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div className="font-bold text-base flex items-center gap-2">
            <span>أحكام التجويد الميسرة</span>
            <span className="text-[10px] bg-[#E5C168]/20 text-[#E5C168] px-2 py-0.5 rounded-full border border-[#E5C168]/40 font-bold">
              دليل الألوان
            </span>
          </div>
        </div>

        <button
          onClick={() => onOpenMushaf(6)}
          className="text-xs bg-gradient-to-l from-[#2DD4BF] to-[#0D9488] text-[#081229] font-extrabold px-2.5 py-1.5 rounded-lg transition active:scale-95 shadow-sm flex items-center gap-1 cursor-pointer"
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>تطبيق بالمصحف (ص ٦)</span>
        </button>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 max-w-lg mx-auto w-full">
        {/* Color Legend Palette Banner */}
        <div className="fluid-card rounded-[22px] p-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-[#E5C168] mb-2">
            <Info className="w-4 h-4 text-[#E5C168]" />
            <span>نظام الألوان المعتمد في مصحف التجويد</span>
          </div>

          <div className="grid grid-cols-2 xs:grid-cols-4 gap-2 text-[10px] font-bold">
            <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-[#FFEBEE] dark:bg-red-950/40 text-[#D32F2F] dark:text-red-300 border border-red-300/40">
              <span className="w-3 h-3 rounded-xs bg-[#D32F2F] shrink-0" />
              <span>المدود (٤-٦ حركات)</span>
            </div>
            <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-[#E8F5E9] dark:bg-emerald-950/40 text-[#2E7D32] dark:text-emerald-300 border border-emerald-300/40">
              <span className="w-3 h-3 rounded-xs bg-[#2E7D32] shrink-0" />
              <span>الغنة والإخفاء (حركتان)</span>
            </div>
            <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-[#E3F2FD] dark:bg-blue-950/40 text-[#1565C0] dark:text-blue-300 border border-blue-300/40">
              <span className="w-3 h-3 rounded-xs bg-[#1565C0] shrink-0" />
              <span>القلقلة (قطب جد)</span>
            </div>
            <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-[#ECEFF1] dark:bg-slate-900/40 text-[#546E7A] dark:text-slate-300 border border-slate-300/40">
              <span className="w-3 h-3 rounded-xs bg-[#8D99AE] shrink-0" />
              <span>إدغام ومالا يلفظ</span>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {TAJWEED_CATEGORIES.map((cat) => {
            const isSelected = cat.id === selectedCatId;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCatId(cat.id);
                  setExpandedRuleId(cat.rules[0]?.id || null);
                  triggerHaptic(15);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer border ${
                  isSelected
                    ? 'bg-gradient-to-l from-[#2DD4BF] to-[#0D9488] text-[#081229] border-transparent shadow-sm'
                    : 'bg-white dark:bg-[#132242] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {cat.title}
              </button>
            );
          })}
        </div>

        {/* Search inside category */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث في هذا الباب أو الحروف أو الأمثلة..."
            className="w-full bg-white dark:bg-[#132242] border border-slate-200 dark:border-white/10 rounded-xl py-2 px-8 text-xs font-bold text-slate-900 dark:text-[#F8FAFC] placeholder:text-slate-400 focus:outline-none focus:border-[#2DD4BF]"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-2.5 top-2 text-xs text-slate-400 p-0.5 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Rules Accordion List */}
        <div className="space-y-2.5">
          {filteredRules.map((rule) => {
            const isExpanded = expandedRuleId === rule.id;

            return (
              <div
                key={rule.id}
                className="fluid-card rounded-[20px] overflow-hidden transition"
              >
                {/* Header */}
                <div
                  onClick={() => toggleExpand(rule.id)}
                  className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: rule.colorHex }}
                    />
                    <div>
                      <b className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] block">
                        {rule.title}
                      </b>
                      <span className="text-[11px] text-amber-700 dark:text-[#E5C168] font-semibold">
                        حروفه: {rule.letters}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#192D56] text-[#0D9488] dark:text-[#2DD4BF] font-bold">
                      {rule.colorName}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-3.5 pb-4 pt-1 border-t border-slate-200/70 dark:border-white/10 space-y-3 bg-slate-50/70 dark:bg-[#0B1429]/80">
                    {/* Definition */}
                    <div className="space-y-1">
                      <div className="text-[11px] font-bold text-[#0D9488] dark:text-[#2DD4BF]">
                        التعريف والكيفية:
                      </div>
                      <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-200">
                        {rule.definition}
                      </p>
                    </div>

                    {/* Explanation */}
                    <div className="space-y-1">
                      <div className="text-[11px] font-bold text-amber-700 dark:text-[#E5C168]">
                        الشرح والتطبيق:
                      </div>
                      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                        {rule.explanation}
                      </p>
                    </div>

                    {/* Quranic Examples */}
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] font-bold text-[#0D9488] dark:text-[#2DD4BF]">
                        أمثلة من القرآن الكريم:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {rule.examples.map((ex, idx) => (
                          <div
                            key={idx}
                            className="bg-white dark:bg-[#132242] p-2.5 rounded-xl border border-slate-200 dark:border-white/10 flex items-center justify-between shadow-xs"
                          >
                            <div className="font-quran text-lg font-bold text-slate-900 dark:text-[#F3D98B]">
                              ﴿ {ex.text} ﴾
                            </div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-300 font-bold">
                              {ex.surah}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
