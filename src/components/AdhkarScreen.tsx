import React, { useState, useMemo } from 'react';
import {
  Sunrise,
  Moon,
  Building2,
  Bed,
  Sun,
  Heart,
  RotateCcw,
  Check,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ADHKAR_CATEGORIES } from '../data/adhkarData';
import { DhikrCategory, DhikrItem } from '../types';
import { toArabicDigits } from '../utils/prayerTimes';
import { triggerHaptic } from '../utils/audio';

type TopTab = 'sebha' | 'morning' | 'evening' | 'categories';

interface SebhaPhraseItem {
  text: string;
  reward: string;
  defaultTarget: number;
}

const SEBHA_PHRASES: SebhaPhraseItem[] = [
  {
    text: 'سُبْحَانَ ٱللَّهِ وَبِحَمْدِهِ',
    reward: 'مائة مرة · حُطَّتْ خَطَايَاهُ وَإِنْ كَانَتْ مِثْلَ زَبَدِ الْبَحْرِ',
    defaultTarget: 100,
  },
  {
    text: 'سُبْحَانَ ٱللَّهِ وَالْحَمْدُ لِلَّهِ',
    reward: 'تملآن ما بين السماء والأرض',
    defaultTarget: 33,
  },
  {
    text: 'ٱلْحَمْدُ لِلَّهِ',
    reward: 'تملأ الميزان وتجلب البركة والشكر',
    defaultTarget: 33,
  },
  {
    text: 'ٱللَّهُ أَكْبَرُ',
    reward: 'تعظيم الله في كل حال وأوان',
    defaultTarget: 33,
  },
  {
    text: 'لَا إِلَٰهَ إِلَّا ٱللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ',
    reward: 'كانت له عدل عشر رقاب وكتبت له مائة حسنة',
    defaultTarget: 100,
  },
  {
    text: 'أَسْتَغْفِرُ ٱللَّهَ وَأَتُوبُ إِلَيْهِ',
    reward: 'سيد الاستغفار ومفتاح الفرج والرزق',
    defaultTarget: 100,
  },
  {
    text: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِٱللَّهِ',
    reward: 'كنز من كنوز الجنة',
    defaultTarget: 33,
  },
  {
    text: 'ٱللَّهُمَّ صَلِّ وَسَلِّمْ عَلَىٰ نَبِيِّنَا مُحَمَّدٍ',
    reward: 'من صلى عليَّ صلاةً صلى الله عليه بها عشراً',
    defaultTarget: 100,
  },
];

export const AdhkarScreen: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<DhikrCategory | null>(null);
  const [activeTab, setActiveTab] = useState<TopTab>('sebha');

  const [counts, setCounts] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    ADHKAR_CATEGORIES.forEach((cat) => {
      cat.items.forEach((item) => {
        initial[item.id] = item.count;
      });
    });
    return initial;
  });

  // Free digital Sebha state
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [sebhaCount, setSebhaCount] = useState(0);
  const [sebhaTarget, setSebhaTarget] = useState<number>(33);
  const [sebhaCycles, setSebhaCycles] = useState(0);

  const activePhrase = SEBHA_PHRASES[phraseIndex];

  // 33 sculpted pearl golden beads arranged around a perfect circle
  const beads = useMemo(() => {
    const totalBeads = 33;
    const radius = 98;
    const cx = 120;
    const cy = 120;
    return Array.from({ length: totalBeads }, (_, i) => {
      const angle = (i / totalBeads) * 2 * Math.PI - Math.PI / 2;
      return {
        idx: i,
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      };
    });
  }, []);

  const progressBase = sebhaTarget === 1000 ? 33 : sebhaTarget;
  const litBeadsCount =
    sebhaCount === 0
      ? 0
      : Math.max(1, Math.round(((sebhaCount % 33 || 33) / 33) * 33));

  const handleDecrement = (item: DhikrItem) => {
    const current = counts[item.id] ?? item.count;
    if (current > 0) {
      const next = current - 1;
      setCounts((prev) => ({ ...prev, [item.id]: next }));
      triggerHaptic(18);
      if (next === 0) {
        triggerHaptic(40);
        confetti({ particleCount: 25, spread: 60, origin: { y: 0.8 } });
      }
    }
  };

  const handleResetCategory = (cat: DhikrCategory) => {
    setCounts((prev) => {
      const copy = { ...prev };
      cat.items.forEach((it) => {
        copy[it.id] = it.count;
      });
      return copy;
    });
    triggerHaptic(15);
  };

  const handleSebhaTap = () => {
    const next = sebhaCount + 1;
    triggerHaptic(20);
    setSebhaCount(next);

    if (sebhaTarget !== 1000 && next % sebhaTarget === 0) {
      setSebhaCycles((c) => c + 1);
      triggerHaptic(45);
      confetti({ particleCount: 30, spread: 70, origin: { y: 0.6 } });
    } else if (sebhaTarget === 1000 && next % 33 === 0) {
      setSebhaCycles((c) => c + 1);
    }
  };

  const handleSebhaReset = () => {
    setSebhaCount(0);
    setSebhaCycles(0);
    triggerHaptic(25);
  };

  const handleNextPhrase = () => {
    setPhraseIndex((idx) => (idx + 1) % SEBHA_PHRASES.length);
    setSebhaCount(0);
    triggerHaptic(12);
  };

  const handlePrevPhrase = () => {
    setPhraseIndex((idx) => (idx - 1 + SEBHA_PHRASES.length) % SEBHA_PHRASES.length);
    setSebhaCount(0);
    triggerHaptic(12);
  };

  const cycleTarget = () => {
    setSebhaTarget((prev) => (prev === 33 ? 100 : prev === 100 ? 1000 : 33));
    triggerHaptic(10);
  };

  const handleSelectTopTab = (tab: TopTab) => {
    setActiveTab(tab);
    triggerHaptic(10);
    if (tab === 'morning') {
      const morning = ADHKAR_CATEGORIES.find((c) => c.id === 'morning');
      setSelectedCategory(morning || ADHKAR_CATEGORIES[0]);
    } else if (tab === 'evening') {
      const evening = ADHKAR_CATEGORIES.find((c) => c.id === 'evening');
      setSelectedCategory(evening || ADHKAR_CATEGORIES[1]);
    } else {
      setSelectedCategory(null);
    }
  };

  const iconComponents: Record<string, React.ComponentType<{ className?: string }>> = {
    sunrise: Sunrise,
    'moon-stars': Moon,
    'building-mosque': Building2,
    bed: Bed,
    sun: Sun,
    heart: Heart,
  };

  const categoryGradients: Record<string, string> = {
    amber: 'from-[#FBBF24] to-[#D97706]',
    purple: 'from-[#A78BFA] to-[#7C3AED]',
    teal: 'from-[#2DD4BF] to-[#0D9488]',
    blue: 'from-[#38BDF8] to-[#0284C7]',
    coral: 'from-[#FB923C] to-[#EA580C]',
    pink: 'from-[#FB7185] to-[#E11D48]',
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#F4F6FA] dark:bg-gradient-to-b dark:from-[#071128] dark:via-[#0B1938] dark:to-[#071024] relative">
      {/* Subtle Starlight Watermark in Dark Mode */}
      <div
        className="absolute inset-0 pointer-events-none opacity-0 dark:opacity-[0.06]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 22px 22px, #E5C168 1px, transparent 0)',
          backgroundSize: '44px 44px',
        }}
      />

      {/* Clean Minimal Top Header (Matches Bottom-Left Mockup) */}
      <header className="relative z-20 shrink-0 px-4 pt-3 pb-2.5 bg-white/90 dark:bg-[#071128]/90 backdrop-blur-md border-b border-slate-200 dark:border-white/8">
        <div className="flex items-center justify-between mb-3">
          {selectedCategory && activeTab === 'categories' ? (
            <button
              onClick={() => setSelectedCategory(null)}
              className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/8 border border-slate-200 dark:border-white/12 flex items-center justify-center text-slate-700 dark:text-[#E5C168] cursor-pointer active:scale-95 transition"
              aria-label="العودة للأقسام"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-10" />
          )}

          <h1 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] text-center">
            {selectedCategory ? selectedCategory.title : 'الأذكار والتسبيح'}
          </h1>

          <div className="w-10 flex justify-end">
            <span className="text-[10px] font-bold text-[#0D9488] dark:text-[#E5C168]">حصن</span>
          </div>
        </div>

        {/* Single-Row 4-Pill Tab Switcher (Matches Mockup Active Gold Pill) */}
        <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
          {(
            [
              { id: 'sebha', label: 'السبحة' },
              { id: 'morning', label: 'الصباح' },
              { id: 'evening', label: 'المساء' },
              { id: 'categories', label: 'الأقسام' },
            ] as { id: TopTab; label: string }[]
          ).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleSelectTopTab(tab.id)}
                className={`py-2 px-1 rounded-xl transition-all cursor-pointer text-center active:scale-95 ${
                  isActive
                    ? 'bg-gradient-to-b from-[#F5DF96] via-[#E5C168] to-[#C89F3D] text-[#071124] font-black shadow-[0_4px_14px_rgba(229,193,104,0.3)]'
                    : 'bg-slate-100 dark:bg-[#102042]/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:border-[#E5C168]/40'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Scrollable Screen Body */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-3 max-w-lg w-full mx-auto flex flex-col">
        {/* 1. GOLDEN BEADED TASBIH / SEBHA SCREEN (Matches Bottom-Left Mockup Exactly) */}
        {activeTab === 'sebha' && !selectedCategory && (
          <div className="flex-1 flex flex-col items-center justify-between py-1 animate-in fade-in duration-200">
            {/* Top Centered Phrase Display (Clean Typography — No Cluttered Multi-Row Chip Card!) */}
            <div className="text-center px-2 pt-1 max-w-sm">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-300/80 mb-1">
                الذكر {toArabicDigits(phraseIndex + 1)} من {toArabicDigits(SEBHA_PHRASES.length)}
              </div>

              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevPhrase}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-[#E5C168] hover:bg-white/5 cursor-pointer shrink-0 transition"
                  aria-label="الذكر السابق"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <p className="font-quran text-2xl sm:text-[26px] font-bold text-[#0D9488] dark:text-[#F3D98B] leading-relaxed">
                  {activePhrase.text}
                </p>

                <button
                  type="button"
                  onClick={handleNextPhrase}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-[#E5C168] hover:bg-white/5 cursor-pointer shrink-0 transition"
                  aria-label="الذكر التالي"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                {activePhrase.reward}
              </p>
            </div>

            {/* Ornate 33-Bead Luminous Golden Pearl Tasbih Ring */}
            <div className="flex flex-col items-center justify-center my-1">
              <div
                onClick={handleSebhaTap}
                className="relative w-60 h-60 flex items-center justify-center cursor-pointer select-none active:scale-97 transition-transform"
                role="button"
                tabIndex={0}
                aria-label="المس للتسبيح"
              >
                <svg
                  viewBox="0 0 240 240"
                  className="w-full h-full drop-shadow-[0_0_28px_rgba(229,193,104,0.24)]"
                >
                  <defs>
                    <radialGradient id="beadPearlLit" cx="32%" cy="30%" r="68%">
                      <stop offset="0%" stopColor="#FFFBE6" />
                      <stop offset="45%" stopColor="#F0CD72" />
                      <stop offset="85%" stopColor="#B88728" />
                      <stop offset="100%" stopColor="#7C5613" />
                    </radialGradient>
                    <radialGradient id="beadPearlIdle" cx="35%" cy="35%" r="65%">
                      <stop offset="0%" stopColor="#A68B4B" stopOpacity="0.65" />
                      <stop offset="100%" stopColor="#3B3121" stopOpacity="0.8" />
                    </radialGradient>
                  </defs>

                  {/* Soft Golden Halo Behind Beads */}
                  <circle
                    cx="120"
                    cy="120"
                    r="98"
                    fill="none"
                    stroke="rgba(229, 193, 104, 0.28)"
                    strokeWidth="2.5"
                  />

                  {/* Deep Sapphire Inner Circle */}
                  <circle
                    cx="120"
                    cy="120"
                    r="80"
                    fill="rgba(8, 17, 38, 0.92)"
                    stroke="rgba(229, 193, 104, 0.25)"
                    strokeWidth="1.2"
                  />

                  {/* 33 Sculpted Pearl Beads */}
                  {beads.map((b) => {
                    const isLit = b.idx < litBeadsCount;
                    return (
                      <g key={b.idx}>
                        {isLit && (
                          <circle
                            cx={b.x}
                            cy={b.y}
                            r="7.4"
                            fill="rgba(243, 217, 139, 0.2)"
                          />
                        )}
                        <circle
                          cx={b.x}
                          cy={b.y}
                          r={isLit ? 5.9 : 5.0}
                          fill={isLit ? 'url(#beadPearlLit)' : 'url(#beadPearlIdle)'}
                        />
                        {isLit && (
                          <circle
                            cx={b.x - 1.6}
                            cy={b.y - 1.6}
                            r="1.3"
                            fill="#FFFFFF"
                            fillOpacity="0.75"
                          />
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* Central Giant Gold Counter */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-5xl font-black text-[#F3D98B] tabular-nums drop-shadow-[0_2px_10px_rgba(229,193,104,0.3)]">
                    {toArabicDigits(sebhaCount)}
                  </span>
                  <span className="text-xs font-semibold text-slate-300 mt-1.5">
                    {sebhaTarget === 1000
                      ? 'تسبيح مفتوح'
                      : `من ${toArabicDigits(progressBase)}`}
                  </span>
                  {sebhaCycles > 0 && (
                    <span className="text-[10px] text-[#2DD4BF] font-bold mt-0.5">
                      الدورات: {toArabicDigits(sebhaCycles)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Primary Brushed Gold Pill CTA Button ("تسبيح") + Bottom Utility Bar */}
            <div className="w-full max-w-xs flex flex-col items-center gap-3 pb-1">
              <button
                onClick={handleSebhaTap}
                className="w-56 py-3 rounded-2xl bg-gradient-to-b from-[#F8E29D] via-[#E5C168] to-[#C29534] text-[#071124] font-black text-base shadow-[0_8px_24px_rgba(229,193,104,0.38)] hover:brightness-105 active:scale-95 transition cursor-pointer"
              >
                تسبيح
              </button>

              {/* Single Clean Bottom Control Row (Matches Mockup Bottom Pills: التالي | الهدف | تصفير) */}
              <div className="w-full grid grid-cols-3 gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={handleNextPhrase}
                  className="py-2.5 px-2 rounded-xl bg-white dark:bg-[#102042]/90 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/12 flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition hover:border-[#E5C168]/50"
                >
                  <span>التالي</span>
                  <ChevronLeft className="w-3.5 h-3.5 text-[#E5C168]" />
                </button>

                <button
                  type="button"
                  onClick={cycleTarget}
                  className="py-2.5 px-2 rounded-xl bg-white dark:bg-[#102042]/90 text-[#0D9488] dark:text-[#2DD4BF] border border-slate-200 dark:border-white/12 flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition tabular-nums"
                  title="تغيير هدف التسبيح"
                >
                  <span>
                    الهدف: {sebhaTarget === 1000 ? 'مفتوح' : toArabicDigits(sebhaTarget)}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleSebhaReset}
                  className="py-2.5 px-2 rounded-xl bg-white dark:bg-[#102042]/90 text-rose-600 dark:text-slate-200 border border-slate-200 dark:border-white/12 flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition hover:border-rose-400/50"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                  <span>تصفير</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. ALL 6 ADHKAR CATEGORIES GRID */}
        {activeTab === 'categories' && !selectedCategory && (
          <div className="space-y-3 animate-in fade-in duration-200 pb-4">
            <div className="grid grid-cols-2 gap-2.5">
              {ADHKAR_CATEGORIES.map((cat) => {
                const IconComp = iconComponents[cat.icon] || Sparkles;
                const grad = categoryGradients[cat.color] || categoryGradients.teal;

                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat);
                      triggerHaptic(15);
                    }}
                    className="fluid-card rounded-[24px] p-4 flex flex-col items-center justify-center text-center hover:-translate-y-0.5 active:scale-96 transition cursor-pointer"
                  >
                    <div
                      className={`w-12 h-12 rounded-[18px] bg-gradient-to-br ${grad} text-white flex items-center justify-center mb-2.5 shadow-md`}
                    >
                      <IconComp className="w-6 h-6" />
                    </div>
                    <b className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                      {cat.title}
                    </b>
                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {cat.countDesc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. SELECTED CATEGORY ADHKAR DETAILS (Morning, Evening, or Any Category) */}
        {selectedCategory && (
          <div className="space-y-3 animate-in fade-in duration-200 pb-4">
            <div className="flex items-center justify-between bg-white dark:bg-[#132242] p-3.5 rounded-[22px] border border-slate-200 dark:border-white/10">
              <div>
                <b className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  {selectedCategory.title}
                </b>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  المس أي بطاقة للعد تنازلياً مع اهتزاز خفيف
                </div>
              </div>
              <button
                onClick={() => handleResetCategory(selectedCategory)}
                className="flex items-center gap-1 text-xs text-[#0D9488] dark:text-[#2DD4BF] bg-teal-50 dark:bg-[#0D1831] px-3 py-1.5 rounded-xl font-bold cursor-pointer transition active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة البدء</span>
              </button>
            </div>

            {selectedCategory.items.map((item) => {
              const remaining = counts[item.id] ?? item.count;
              const isCompleted = remaining === 0;

              return (
                <div
                  key={item.id}
                  onClick={() => handleDecrement(item)}
                  className={`bg-white dark:bg-[#132242] border rounded-[22px] p-4 shadow-sm transition active:scale-99 cursor-pointer select-none ${
                    isCompleted
                      ? 'border-[#2DD4BF] bg-teal-50/40 dark:bg-[#0E2B3A]'
                      : 'border-slate-200 dark:border-white/10 hover:border-[#E5C168]/50'
                  }`}
                >
                  <p className="font-quran text-base sm:text-lg leading-relaxed text-[#0F172A] dark:text-[#F8FAFC] text-center mb-2.5">
                    {item.text}
                  </p>

                  {item.reward && (
                    <div className="text-xs text-amber-800 dark:text-[#E5C168] bg-amber-50 dark:bg-[#0D1831] p-2.5 rounded-xl mb-3 text-center">
                      {item.reward}
                    </div>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDecrement(item);
                    }}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer ${
                      isCompleted
                        ? 'bg-teal-100 dark:bg-[#2DD4BF]/20 text-teal-800 dark:text-[#5EEAD4]'
                        : 'bg-gradient-to-r from-[#2DD4BF] to-[#0D9488] text-[#051B1E] font-extrabold active:scale-95'
                    }`}
                  >
                    {isCompleted ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>تم الذكر بحمد الله</span>
                      </>
                    ) : (
                      <span>المتبقي {toArabicDigits(remaining)} (انقر للعد)</span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
