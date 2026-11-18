import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Bookmark as BookmarkIcon,
  Palette,
  Volume2,
  VolumeX,
  X,
  Share2,
  Check,
  BookOpen,
  Sun,
  Moon,
  Play,
  Pause,
  SlidersHorizontal,
} from 'lucide-react';
import { fetchMushafPage, SURAHS_LIST, JUZ_LIST } from '../data/quranData';
import { MushafPage, Bookmark, Reciter } from '../types';
import { RECITERS_LIST } from '../data/recitersData';
import { toArabicDigits } from '../utils/prayerTimes';
import { playPageFlipSound, triggerHaptic } from '../utils/audio';

interface MushafReaderProps {
  initialPage: number;
  targetSurah?: number;
  targetAyah?: number;
  onBack: () => void;
  onSaveBookmark: (page: number, surahNumber: number, surahName: string, ayahNumber: number) => void;
  bookmarks: Bookmark[];
  onUpdateLastRead: (surahName: string, page: number, ayah: number) => void;
  currentTheme?: 'light' | 'dark' | 'auto';
  onToggleTheme?: () => void;
  activeReciter?: Reciter;
  isPlayingRecitation?: boolean;
  audioSurahNumber?: number;
  onTogglePlayReciter?: (reciter: Reciter, surahNumber: number) => void;
  controlsVisible?: boolean;
  onControlsVisibleChange?: (visible: boolean) => void;
  onOverlayOpenChange?: (isOpen: boolean) => void;
  closeOverlaySignal?: number;
}

/**
 * Ornate Golden Surah Cartouche Header SVG (Matches Top-Center Mockup Screen)
 */
const SurahCartoucheBanner: React.FC<{
  surahTitle: string;
  isDark: boolean;
}> = ({ surahTitle, isDark }) => (
  <div className="relative flex-1 max-w-[260px] mx-auto h-11 flex items-center justify-center select-none">
    <svg
      viewBox="0 0 320 52"
      preserveAspectRatio="none"
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="cartoucheGold" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#9E7322" />
          <stop offset="50%" stopColor="#F5DE96" />
          <stop offset="100%" stopColor="#9E7322" />
        </linearGradient>
      </defs>
      {/* Left & Right Arabesque Wing Caps */}
      <path
        d="M22 26 C10 18, 6 12, 18 8 L302 8 C314 12, 310 18, 298 26 C310 34, 314 40, 302 44 L18 44 C6 40, 10 34, 22 26 Z"
        fill={isDark ? 'rgba(15, 29, 60, 0.85)' : 'rgba(15, 35, 71, 0.94)'}
        stroke="url(#cartoucheGold)"
        strokeWidth="1.5"
      />
      <rect
        x="30"
        y="12"
        width="260"
        height="28"
        rx="8"
        fill="none"
        stroke="url(#cartoucheGold)"
        strokeOpacity="0.45"
        strokeWidth="0.9"
      />
      {/* Corner Florals */}
      <circle cx="20" cy="26" r="3" fill="#E5C168" />
      <circle cx="300" cy="26" r="3" fill="#E5C168" />
    </svg>

    <div className="relative z-10 flex items-center gap-1.5 px-6">
      <span className="font-quran text-lg sm:text-xl font-bold text-[#F5DE96] drop-shadow-[0_1px_6px_rgba(229,193,104,0.3)] tracking-wide">
        سُورَةُ {surahTitle}
      </span>
    </div>
  </div>
);

export const MushafReader: React.FC<MushafReaderProps> = ({
  initialPage,
  targetSurah,
  targetAyah,
  onBack,
  onSaveBookmark,
  bookmarks,
  onUpdateLastRead,
  onToggleTheme,
  activeReciter = RECITERS_LIST[0],
  isPlayingRecitation = false,
  audioSurahNumber,
  onTogglePlayReciter,
  controlsVisible: controlledVisible,
  onControlsVisibleChange,
  onOverlayOpenChange,
  closeOverlaySignal,
}) => {
  const [currentPageNum, setCurrentPageNum] = useState<number>(initialPage || 1);
  const [navTarget, setNavTarget] = useState<{ surah?: number; ayah?: number } | null>(() =>
    targetSurah || targetAyah ? { surah: targetSurah, ayah: targetAyah } : null
  );
  const [highlightedAyahKey, setHighlightedAyahKey] = useState<string | null>(null);
  const [currentPageData, setCurrentPageData] = useState<MushafPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [tajweedEnabled, setTajweedEnabled] = useState<boolean>(true);
  const [selectedAyah, setSelectedAyah] = useState<{
    number: number;
    surahNumber: number;
    surahName: string;
    numberInSurah: number;
    text: string;
    tafsir?: string;
  } | null>(null);

  const [ayahAudioPlaying, setAyahAudioPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showPagePicker, setShowPagePicker] = useState(false);
  const [showReaderOptions, setShowReaderOptions] = useState(false);
  const [pickerTab, setPickerTab] = useState<'page' | 'surah' | 'juz'>('page');
  const [pageInputVal, setPageInputVal] = useState<number>(initialPage || 1);
  const [fontSizeDelta, setFontSizeDelta] = useState<number>(0);
  const [localControlsVisible, setLocalControlsVisible] = useState<boolean>(true);
  const [interactionTick, setInteractionTick] = useState<number>(0);

  useEffect(() => {
    setCurrentPageNum(initialPage || 1);
    setPageInputVal(initialPage || 1);
    setNavTarget(targetSurah || targetAyah ? { surah: targetSurah, ayah: targetAyah } : null);
  }, [initialPage, targetSurah, targetAyah]);

  const controlsVisible =
    controlledVisible !== undefined ? controlledVisible : localControlsVisible;

  const setControlsVisible = (next: boolean) => {
    if (onControlsVisibleChange) {
      onControlsVisibleChange(next);
    } else {
      setLocalControlsVisible(next);
    }
    if (next) {
      setInteractionTick((t) => t + 1);
    }
  };

  const bumpControlsTimer = () => {
    setInteractionTick((t) => t + 1);
  };

  const [isDarkPage, setIsDarkPage] = useState<boolean>(() => {
    try {
      return document.documentElement.classList.contains('dark');
    } catch {
      return true;
    }
  });

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const edgeTouchStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastScrollTopRef = useRef<number>(0);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const ayahAudioRef = useRef<HTMLAudioElement | null>(null);

  const stopAyahAudio = () => {
    if (ayahAudioRef.current) {
      ayahAudioRef.current.pause();
      ayahAudioRef.current.currentTime = 0;
      ayahAudioRef.current = null;
    }
    setAyahAudioPlaying(false);
  };

  useEffect(() => {
    return () => {
      stopAyahAudio();
    };
  }, []);

  useEffect(() => {
    if (!selectedAyah) {
      stopAyahAudio();
    }
  }, [selectedAyah]);

  const hasSubOverlayOpen = Boolean(selectedAyah || showPagePicker || showReaderOptions);
  useEffect(() => {
    onOverlayOpenChange?.(hasSubOverlayOpen);
  }, [hasSubOverlayOpen, onOverlayOpenChange]);

  useEffect(() => {
    if (!closeOverlaySignal) return;
    setSelectedAyah(null);
    setShowPagePicker(false);
    setShowReaderOptions(false);
    stopAyahAudio();
  }, [closeOverlaySignal]);

  // Auto-hide bottom toolbar & BottomNav after 3.5s of inactivity unless a menu is open
  useEffect(() => {
    if (!controlsVisible) return;
    if (showReaderOptions || showPagePicker || selectedAyah) return;

    const timer = window.setTimeout(() => {
      if (onControlsVisibleChange) {
        onControlsVisibleChange(false);
      } else {
        setLocalControlsVisible(false);
      }
    }, 3500);

    return () => window.clearTimeout(timer);
  }, [
    controlsVisible,
    interactionTick,
    showReaderOptions,
    showPagePicker,
    selectedAyah,
    onControlsVisibleChange,
  ]);

  const togglePageTheme = () => {
    const next = !isDarkPage;
    setIsDarkPage(next);
    const root = document.documentElement;
    if (next) {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      try {
        localStorage.setItem('theme_mode', 'dark');
      } catch {}
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      try {
        localStorage.setItem('theme_mode', 'light');
      } catch {}
    }
    onToggleTheme?.();
    triggerHaptic(15);
  };

  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setHighlightedAyahKey(null);

    fetchMushafPage(currentPageNum).then((data) => {
      if (!isCancelled) {
        setCurrentPageData(data);
        setLoading(false);
        setPageInputVal(currentPageNum);

        if (data.ayahs.length > 0) {
          const match =
            (navTarget?.surah && navTarget?.ayah
              ? data.ayahs.find(
                  (a) =>
                    a.surahNumber === navTarget.surah &&
                    a.numberInSurah === navTarget.ayah
                )
              : undefined) ||
            (navTarget?.surah
              ? data.ayahs.find((a) => a.surahNumber === navTarget.surah)
              : undefined) ||
            (navTarget?.ayah
              ? data.ayahs.find((a) => a.numberInSurah === navTarget.ayah)
              : undefined);

          const anchor = match || data.ayahs[0];
          const cleanAnchorSurah = anchor.surahName.replace(/^سُورَةُ\s*/u, '');
          onUpdateLastRead(cleanAnchorSurah, currentPageNum, anchor.numberInSurah);

          if (match) {
            const key = `${match.surahNumber}:${match.numberInSurah}`;
            setHighlightedAyahKey(key);
            window.requestAnimationFrame(() => {
              const targetEl =
                navTarget?.surah && (navTarget.ayah === undefined || navTarget.ayah === 1)
                  ? scrollAreaRef.current?.querySelector(
                      `[data-surah-start="${navTarget.surah}"]`
                    ) ||
                    scrollAreaRef.current?.querySelector(`[data-ayah-key="${key}"]`)
                  : scrollAreaRef.current?.querySelector(`[data-ayah-key="${key}"]`);
              if (targetEl && 'scrollIntoView' in targetEl) {
                (targetEl as HTMLElement).scrollIntoView({
                  behavior: 'smooth',
                  block: 'center',
                });
              }
            });
          }
        }
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [currentPageNum, navTarget]);

  const isPageBookmarked = bookmarks.some((b) => b.page === currentPageNum);

  const handleToggleBookmark = () => {
    if (!currentPageData || currentPageData.ayahs.length === 0) return;
    const anchor =
      (navTarget?.surah
        ? currentPageData.ayahs.find((a) => a.surahNumber === navTarget.surah)
        : undefined) || currentPageData.ayahs[0];
    onSaveBookmark(currentPageNum, anchor.surahNumber, anchor.surahName, anchor.numberInSurah);
    triggerHaptic(25);
  };

  const resetPageScroll = () => {
    lastScrollTopRef.current = 0;
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = 0;
    }
  };

  const handlePrevPage = () => {
    if (currentPageNum > 1) {
      if (soundEnabled) playPageFlipSound();
      triggerHaptic(10);
      stopAyahAudio();
      resetPageScroll();
      setNavTarget(null);
      setCurrentPageNum((p) => p - 1);
      setSelectedAyah(null);
    }
  };

  const handleNextPage = () => {
    if (currentPageNum < 604) {
      if (soundEnabled) playPageFlipSound();
      triggerHaptic(10);
      stopAyahAudio();
      resetPageScroll();
      setNavTarget(null);
      setCurrentPageNum((p) => p + 1);
      setSelectedAyah(null);
    }
  };

  const handleGoToPage = (target: number, surahNum?: number, ayahNum?: number) => {
    const valid = Math.max(1, Math.min(604, target));
    if (valid !== currentPageNum) {
      if (soundEnabled) playPageFlipSound();
      resetPageScroll();
    }
    stopAyahAudio();
    setNavTarget(surahNum || ayahNum ? { surah: surahNum, ayah: ayahNum } : null);
    setCurrentPageNum(valid);
    setShowPagePicker(false);
    setShowReaderOptions(false);
    triggerHaptic(15);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy)) {
      // Arabic Mushaf orientation: swiping left-to-right (dx > 0) turns to next page; right-to-left (dx < 0) goes back
      if (dx > 0) {
        handleNextPage();
      } else {
        handlePrevPage();
      }
    }
  };

  const handlePlayAyahAudio = (surahNumber: number, numberInSurah: number) => {
    if (ayahAudioPlaying && ayahAudioRef.current) {
      stopAyahAudio();
      return;
    }

    stopAyahAudio();
    const surahPadded = String(Math.max(1, surahNumber)).padStart(3, '0');
    const ayahPadded = String(Math.max(1, numberInSurah)).padStart(3, '0');
    const audio = new Audio(`https://everyayah.com/data/Alafasy_128kbps/${surahPadded}${ayahPadded}.mp3`);
    ayahAudioRef.current = audio;
    setAyahAudioPlaying(true);

    audio.onended = () => {
      setAyahAudioPlaying(false);
      ayahAudioRef.current = null;
    };
    audio.onerror = () => {
      setAyahAudioPlaying(false);
      ayahAudioRef.current = null;
    };
    audio.play().catch(() => {
      setAyahAudioPlaying(false);
      ayahAudioRef.current = null;
    });
  };

  const handleShareAyah = async (text: string, surahName: string, num: number) => {
    const cleanName = surahName.replace(/^سُورَةُ\s*/u, '').replace(/^سورة\s*/u, '');
    const textToShare = `﴿${text}﴾ [سورة ${cleanName}: ${num}] - القرآن الكريم وتفسيره`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'آية كريمة', text: textToShare });
        return;
      } catch {}
    }
    await navigator.clipboard.writeText(textToShare);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentJuzNum = currentPageData?.juzNumber || Math.ceil(currentPageNum / 20);
  const preferredSurah =
    (navTarget?.surah
      ? currentPageData?.surahs.find((s) => s.number === navTarget.surah)
      : undefined) || currentPageData?.surahs[0];
  const fallbackSurahMeta =
    SURAHS_LIST.find(
      (s) => currentPageNum >= s.pageStart && currentPageNum <= s.pageEnd
    ) || SURAHS_LIST[0];
  const currentSurahNumber = preferredSurah?.number || fallbackSurahMeta.number;
  const surahNameClean = preferredSurah
    ? preferredSurah.name.replace(/^سُورَةُ\s*/u, '')
    : fallbackSurahMeta.name;
  const isPlayingCurrentSurah =
    isPlayingRecitation && audioSurahNumber === currentSurahNumber;

  const progressPct = Math.round((currentPageNum / 604) * 100);

  return (
    <div
      className={`flex-1 flex flex-col min-h-0 relative overflow-hidden select-none font-cairo transition-colors duration-300 ${
        isDarkPage
          ? 'bg-gradient-to-b from-[#060C1C] via-[#091227] to-[#050A17] text-[#FAF3E3]'
          : 'bg-gradient-to-b from-[#FFFDF7] to-[#F5EED8] text-[#111E19]'
      }`}
      dir="rtl"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Delicate Subtle Outer Hairline Frame */}
      <div
        className={`absolute inset-1.5 rounded-2xl pointer-events-none border ${
          isDarkPage ? 'border-[#E5C168]/25' : 'border-[#D8B25A]/45'
        }`}
      />

      {/* Edge-to-Edge Top Surah Banner Row (Matches Top-Center Mockup: Ornate Banner + Subtle Corner Controls) */}
      <header className="relative z-20 flex items-center justify-between gap-2 px-3 pt-2.5 pb-1 shrink-0">
        {/* Back Button */}
        <button
          type="button"
          onClick={onBack}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition cursor-pointer active:scale-95 shrink-0 ${
            isDarkPage
              ? 'bg-white/6 hover:bg-white/12 text-[#E5C168] border border-white/10'
              : 'bg-[#0F2347]/8 hover:bg-[#0F2347]/15 text-[#0F2347] border border-[#0F2347]/15'
          }`}
          aria-label="رجوع"
          title="العودة"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Centered Ornate Golden Surah Cartouche SVG */}
        <SurahCartoucheBanner surahTitle={surahNameClean} isDark={isDarkPage} />

        {/* Page / Juz Quick Jump Trigger */}
        <button
          type="button"
          onClick={() => setShowPagePicker(true)}
          className={`min-h-[40px] px-2.5 rounded-full flex flex-col items-center justify-center leading-none transition cursor-pointer active:scale-95 shrink-0 ${
            isDarkPage
              ? 'bg-white/6 hover:bg-white/12 text-[#E5C168] border border-white/10'
              : 'bg-[#0F2347]/8 hover:bg-[#0F2347]/15 text-[#0F2347] border border-[#0F2347]/15'
          }`}
          aria-label="الانتقال إلى صفحة أو سورة"
          title="فهرس الصفحات والسور"
        >
          <span className="text-[11px] font-extrabold tabular-nums">
            ص {toArabicDigits(currentPageNum)}
          </span>
          <span className="text-[8.5px] opacity-75 mt-0.5">
            ج {toArabicDigits(currentJuzNum)}
          </span>
        </button>
      </header>

      {/* Main Full-Bleed Uthmani Quran Text Area */}
      <div
        ref={scrollAreaRef}
        className={`relative z-10 flex-1 overflow-y-auto scrollbar-none pl-4 pr-5 sm:px-6 pt-1 flex flex-col transition-[padding] duration-300 ${
          controlsVisible ? 'pb-36' : 'pb-5'
        }`}
        onScroll={(e) => {
          const top = e.currentTarget.scrollTop;
          if (Math.abs(top - lastScrollTopRef.current) > 12) {
            lastScrollTopRef.current = top;
            if (controlsVisible && !showReaderOptions && !showPagePicker) {
              setControlsVisible(false);
            }
          }
        }}
        onClick={() => {
          if (showReaderOptions) {
            setShowReaderOptions(false);
          }
        }}
      >
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2.5 py-20 text-slate-400">
            <div className="w-9 h-9 border-2 border-[#E5C168] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold font-cairo">جارٍ فتح الصفحة الشريفة...</span>
          </div>
        ) : (
          <div
            className={`font-quran leading-[2.2] sm:leading-[2.35] tracking-wide text-justify ${
              isDarkPage ? 'text-[#FAF3E3]' : 'text-[#111E19]'
            }`}
            style={{
              fontSize: `calc(${19.5 + fontSizeDelta}px * var(--font-scale, 1))`,
              wordSpacing: '2.5px',
              textAlignLast: 'center',
            }}
          >
            {currentPageData?.ayahs.map((ayah) => {
              const ayahKey = `${ayah.surahNumber}:${ayah.numberInSurah}`;
              const isHighlighted =
                selectedAyah?.number === ayah.number || highlightedAyahKey === ayahKey;
              const isSurahStartOnBody = ayah.numberInSurah === 1 && currentPageNum > 1;
              const renderedContent =
                tajweedEnabled && ayah.tajweedHtml ? (
                  <span
                    dangerouslySetInnerHTML={{ __html: ayah.tajweedHtml }}
                    className="inline font-medium"
                  />
                ) : (
                  <span>{ayah.text}</span>
                );

              return (
                <React.Fragment key={ayah.number}>
                  {isSurahStartOnBody && (
                    <div
                      data-surah-start={ayah.surahNumber}
                      className="w-full my-2.5 pt-1 pb-1.5 select-none text-center"
                    >
                      <div
                        className={`inline-flex items-center justify-center gap-2 px-6 py-1 rounded-2xl border font-quran text-base sm:text-lg font-bold shadow-xs ${
                          isDarkPage
                            ? 'bg-[#0F1D3C]/90 border-[#E5C168]/55 text-[#F5DE96]'
                            : 'bg-[#0F2347]/92 border-[#D8B25A] text-[#F5DE96]'
                        }`}
                      >
                        <span className="text-xs text-[#E5C168]">۞</span>
                        <span>سُورَةُ {ayah.surahName}</span>
                        <span className="text-xs text-[#E5C168]">۞</span>
                      </div>
                      {ayah.surahNumber !== 9 && (
                        <div
                          className={`font-quran text-lg sm:text-xl font-bold mt-1.5 ${
                            isDarkPage ? 'text-[#F5DE96]' : 'text-[#0F2347]'
                          }`}
                        >
                          بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                        </div>
                      )}
                    </div>
                  )}
                  <span
                    data-ayah-key={ayahKey}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAyah(ayah);
                      setHighlightedAyahKey(ayahKey);
                      triggerHaptic(15);
                    }}
                    className={`inline cursor-pointer rounded px-0.5 transition duration-150 ${
                      isHighlighted
                        ? isDarkPage
                          ? 'bg-[#E5C168]/28 text-white font-bold ring-1 ring-[#E5C168]'
                          : 'bg-[#FFF0B8] text-[#0F2347] font-bold shadow-xs'
                        : 'hover:bg-[#E5C168]/15'
                    }`}
                  >
                    {renderedContent}{' '}
                    <span
                      className={`inline-flex items-center justify-center text-[0.86em] font-bold mx-0.5 select-none ${
                        isDarkPage ? 'text-[#E5C168]' : 'text-[#996515]'
                      }`}
                    >
                      ﴿{toArabicDigits(ayah.numberInSurah)}﴾
                    </span>{' '}
                  </span>
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* Android-Style Edge Handle Tab (Tap or Swipe Inward to Toggle Toolbars) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShowReaderOptions(false);
          setControlsVisible(!controlsVisible);
          triggerHaptic(12);
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          edgeTouchStartRef.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
          };
        }}
        onTouchEnd={(e) => {
          e.stopPropagation();
          if (!edgeTouchStartRef.current) return;
          const dx = e.changedTouches[0].clientX - edgeTouchStartRef.current.x;
          edgeTouchStartRef.current = null;
          if (Math.abs(dx) > 18) {
            setShowReaderOptions(false);
            setControlsVisible(dx < 0);
            triggerHaptic(12);
          }
        }}
        dir="ltr"
        className="absolute right-0 top-[56%] -translate-y-1/2 z-40 w-8 h-24 flex items-center justify-end group cursor-pointer focus:outline-none"
        aria-label={controlsVisible ? 'إخفاء شريط الأدوات' : 'إظهار شريط الأدوات'}
        title={controlsVisible ? 'إخفاء شريط الأدوات والتنقل' : 'إظهار شريط الأدوات والتنقل'}
      >
        <div
          className={`flex items-center justify-center rounded-l-full border border-r-0 transition-all duration-300 shadow-lg backdrop-blur-md ${
            controlsVisible
              ? 'w-5 h-16 bg-[#E5C168]/92 border-[#F5DE96] text-[#071124]'
              : isDarkPage
              ? 'w-2 group-hover:w-5 h-16 bg-[#E5C168]/65 border-[#E5C168]/60 text-[#071124]'
              : 'w-2 group-hover:w-5 h-16 bg-[#0F2347]/70 border-[#D8B25A]/70 text-[#F5DE96]'
          }`}
        >
          {controlsVisible ? (
            <ChevronRight className="w-3.5 h-3.5 stroke-[2.6]" />
          ) : (
            <ChevronLeft className="w-3 h-3 stroke-[2.6] opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </button>

      {/* Reader Quick Options Popover (Font Size, Day/Night Parchment, Tajweed Legend, Jump) */}
      {showReaderOptions && controlsVisible && (
        <div
          className="absolute bottom-[144px] left-3 right-3 z-30 bg-[#0D1A36]/96 backdrop-blur-lg text-[#F8FAFC] rounded-2xl border border-[#E5C168]/40 p-3.5 shadow-2xl space-y-3 animate-in slide-in-from-bottom-2 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <b className="text-xs text-[#E5C168]">خيارات القراءة والمصحف</b>
            <button
              type="button"
              onClick={() => setShowReaderOptions(false)}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10 cursor-pointer"
              aria-label="إغلاق خيارات القراءة"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs font-bold">
            {/* Font Sizing */}
            <div className="col-span-2 flex items-center justify-between bg-[#081229] rounded-xl border border-white/10 px-2.5 py-1.5">
              <span className="text-[11px] text-slate-300">حجم الخط:</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setFontSizeDelta((d) => Math.max(-4, d - 1));
                    bumpControlsTimer();
                  }}
                  className="w-8 h-8 rounded-lg bg-white/8 hover:bg-white/15 text-[#E5C168] font-bold cursor-pointer"
                  title="تصغير الخط"
                >
                  A-
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFontSizeDelta((d) => Math.min(8, d + 1));
                    bumpControlsTimer();
                  }}
                  className="w-8 h-8 rounded-lg bg-white/8 hover:bg-white/15 text-[#E5C168] font-bold cursor-pointer"
                  title="تكبير الخط"
                >
                  A+
                </button>
              </div>
            </div>

            {/* Day/Night Parchment Switch */}
            <button
              type="button"
              onClick={() => {
                togglePageTheme();
                bumpControlsTimer();
              }}
              className="flex items-center justify-center gap-1.5 bg-[#081229] hover:bg-white/10 rounded-xl border border-white/10 py-2 px-2 text-[#E5C168] cursor-pointer"
            >
              {isDarkPage ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span className="text-[11px]">{isDarkPage ? 'نهاري' : 'ليلي'}</span>
            </button>
          </div>

          {/* Quick Tajweed Color Key + Index */}
          <div className="flex items-center justify-between text-[10px] pt-1 border-t border-white/10">
            <div className="flex items-center gap-2 text-slate-200">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-xs bg-[#D32F2F]" /> مد
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-xs bg-[#2E7D32]" /> غنة
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-xs bg-[#1565C0]" /> قلقلة
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-xs bg-[#8D99AE]" /> إدغام
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowReaderOptions(false);
                setShowPagePicker(true);
              }}
              className="px-2.5 py-1 rounded-lg bg-[#E5C168] text-[#071124] font-extrabold cursor-pointer"
            >
              انتقال لصفحة
            </button>
          </div>
        </div>
      )}

      {/* FLOATING DARK GLASS PILL TOOLBAR (Auto-hides cleanly with BottomNav during reading) */}
      <div
        className={`absolute bottom-[74px] left-3 right-3 z-25 transition-all duration-300 ease-out ${
          controlsVisible
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : 'translate-y-24 opacity-0 pointer-events-none'
        }`}
      >
        <div
          className={`rounded-[24px] px-2.5 pt-1.5 pb-2 shadow-[0_12px_32px_rgba(0,0,0,0.6)] backdrop-blur-md border transition-colors ${
            isDarkPage
              ? 'bg-[#0C1732]/94 border-[#E5C168]/30 text-slate-200'
              : 'bg-[#0F2347]/94 border-[#D8B25A]/50 text-slate-100'
          }`}
        >
          {/* Toolbar Buttons Row */}
          <div className="flex items-center justify-between gap-1">
            {/* Next Page (Right button) */}
            <button
              type="button"
              onClick={() => {
                handleNextPage();
                bumpControlsTimer();
              }}
              disabled={currentPageNum >= 604}
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 text-slate-200 disabled:opacity-25 cursor-pointer active:scale-90 transition"
              aria-label="الصفحة التالية"
              title="الصفحة التالية"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* 1. Bookmark Toggle */}
            <button
              type="button"
              onClick={() => {
                handleToggleBookmark();
                bumpControlsTimer();
              }}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition cursor-pointer active:scale-90 ${
                isPageBookmarked
                  ? 'text-[#E5C168] bg-[#E5C168]/15'
                  : 'text-slate-200 hover:text-[#E5C168] hover:bg-white/10'
              }`}
              aria-label={isPageBookmarked ? 'إزالة العلامة المرجعية' : 'حفظ العلامة المرجعية'}
              title={isPageBookmarked ? 'تم حفظ الصفحة' : 'حفظ علامة مرجعية'}
            >
              <BookmarkIcon className={`w-4 h-4 ${isPageBookmarked ? 'fill-current' : ''}`} />
            </button>

            {/* 2. Tajweed Color Toggle */}
            <button
              type="button"
              onClick={() => {
                setTajweedEnabled((t) => !t);
                bumpControlsTimer();
                triggerHaptic(10);
              }}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition cursor-pointer active:scale-90 ${
                tajweedEnabled
                  ? 'text-[#E5C168] bg-[#E5C168]/15'
                  : 'text-slate-300 hover:bg-white/10'
              }`}
              aria-label="تبديل ألوان التجويد"
              title="التجويد الملون"
            >
              <Palette className="w-4 h-4" />
            </button>

            {/* 3. Reader Settings / Font / Day-Night / Index Popover */}
            <button
              type="button"
              onClick={() => {
                setShowReaderOptions((v) => !v);
                bumpControlsTimer();
                triggerHaptic(10);
              }}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition cursor-pointer active:scale-90 ${
                showReaderOptions
                  ? 'text-[#071124] bg-[#E5C168]'
                  : 'text-slate-200 hover:text-[#E5C168] hover:bg-white/10'
              }`}
              aria-label="إعدادات القراءة والخط"
              title="حجم الخط والوضع النهاري والفهرس"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            {/* 4. Recitation Play/Pause Button */}
            <button
              type="button"
              onClick={() => {
                if (onTogglePlayReciter) {
                  onTogglePlayReciter(activeReciter, currentSurahNumber);
                } else if (currentPageData?.ayahs[0]) {
                  handlePlayAyahAudio(
                    currentPageData.ayahs[0].surahNumber,
                    currentPageData.ayahs[0].numberInSurah
                  );
                }
                bumpControlsTimer();
                triggerHaptic(12);
              }}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition cursor-pointer active:scale-90 ${
                isPlayingCurrentSurah || ayahAudioPlaying
                  ? 'bg-[#E5C168] text-[#071124] shadow-[0_0_12px_rgba(229,193,104,0.45)]'
                  : 'text-slate-200 hover:text-[#E5C168] hover:bg-white/10'
              }`}
              aria-label={isPlayingCurrentSurah ? 'إيقاف التلاوة' : 'تشغيل تلاوة السورة'}
              title={`تلاوة سورة ${surahNameClean}`}
            >
              {isPlayingCurrentSurah || ayahAudioPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
            </button>

            {/* 5. Sound / Mute Page Flip */}
            <button
              type="button"
              onClick={() => {
                setSoundEnabled((s) => !s);
                bumpControlsTimer();
                triggerHaptic(10);
              }}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition cursor-pointer active:scale-90 ${
                soundEnabled ? 'text-[#2DD4BF]' : 'text-slate-400 hover:bg-white/10'
              }`}
              aria-label={soundEnabled ? 'كتم المؤثرات الصوتية' : 'تفعيل الصوت'}
              title={soundEnabled ? 'الصوت مفعل' : 'الصوت مكتوم'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Prev Page (Left button) */}
            <button
              type="button"
              onClick={() => {
                handlePrevPage();
                bumpControlsTimer();
              }}
              disabled={currentPageNum <= 1}
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 text-slate-200 disabled:opacity-25 cursor-pointer active:scale-90 transition"
              aria-label="الصفحة السابقة"
              title="الصفحة السابقة"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Slim Golden / Teal Reading & Audio Scrubber Bar */}
          <div className="mt-1 px-2.5 flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full bg-white/15 relative overflow-visible">
              <div
                className="h-full rounded-full bg-gradient-to-l from-[#E5C168] to-[#2DD4BF] transition-all duration-300 relative"
                style={{ width: `${Math.max(4, progressPct)}%` }}
              >
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#F5DE96] shadow-[0_0_8px_#E5C168]" />
              </div>
            </div>
            <span className="text-[9.5px] font-bold text-[#E5C168] tabular-nums shrink-0" dir="ltr">
              {toArabicDigits(currentPageNum)} / {toArabicDigits(604)}
            </span>
          </div>
        </div>
      </div>

      {/* Page / Surah / Juz Selector Modal */}
      {showPagePicker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setShowPagePicker(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-[#0D1831] text-slate-900 dark:text-[#F8FAFC] rounded-3xl border border-slate-200 dark:border-[#E5C168]/45 p-4 shadow-2xl max-h-[85dvh] flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
              <b className="text-sm font-bold text-[#0F2347] dark:text-[#E5C168] flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" />
                <span>انتقال في المصحف الشريف (٦٠٤ صفحة)</span>
              </b>
              <button
                onClick={() => setShowPagePicker(false)}
                className="p-1 rounded-full text-slate-500 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1 my-3 bg-slate-100 dark:bg-[#132242] p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setPickerTab('page')}
                className={`py-1.5 rounded-lg transition cursor-pointer ${
                  pickerTab === 'page'
                    ? 'bg-gradient-to-l from-[#0D9488] to-[#2DD4BF] text-[#081229] shadow-xs'
                    : 'text-slate-500 dark:text-slate-300'
                }`}
              >
                رقم الصفحة
              </button>
              <button
                onClick={() => setPickerTab('surah')}
                className={`py-1.5 rounded-lg transition cursor-pointer ${
                  pickerTab === 'surah'
                    ? 'bg-gradient-to-l from-[#0D9488] to-[#2DD4BF] text-[#081229] shadow-xs'
                    : 'text-slate-500 dark:text-slate-300'
                }`}
              >
                فهرس السور
              </button>
              <button
                onClick={() => setPickerTab('juz')}
                className={`py-1.5 rounded-lg transition cursor-pointer ${
                  pickerTab === 'juz'
                    ? 'bg-gradient-to-l from-[#0D9488] to-[#2DD4BF] text-[#081229] shadow-xs'
                    : 'text-slate-500 dark:text-slate-300'
                }`}
              >
                الأجزاء والأحزاب
              </button>
            </div>

            {pickerTab === 'page' && (
              <div className="flex-1 flex flex-col justify-center space-y-4 py-4">
                <div className="text-center">
                  <div className="text-3xl font-extrabold text-[#0D9488] dark:text-[#2DD4BF] font-cairo tabular-nums">
                    صفحة {toArabicDigits(pageInputVal)}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-300 mt-1">
                    من أصل ٦٠٤ صفحات
                  </div>
                </div>

                <input
                  type="range"
                  min="1"
                  max="604"
                  value={pageInputVal}
                  onChange={(e) => setPageInputVal(Number(e.target.value))}
                  className="w-full accent-[#0D9488] dark:accent-[#2DD4BF] h-2 bg-slate-200 dark:bg-[#132242] rounded-lg cursor-pointer"
                />

                <div className="flex items-center gap-2 justify-center">
                  <input
                    type="number"
                    min="1"
                    max="604"
                    value={pageInputVal}
                    onChange={(e) => setPageInputVal(Number(e.target.value))}
                    className="w-24 text-center py-2 px-3 rounded-xl border border-[#E5C168]/50 bg-slate-50 dark:bg-[#132242] text-lg font-bold tabular-nums"
                  />
                  <button
                    onClick={() => handleGoToPage(pageInputVal)}
                    className="bg-gradient-to-l from-[#0D9488] to-[#2DD4BF] text-[#081229] font-extrabold py-2 px-5 rounded-xl cursor-pointer active:scale-95 transition"
                  >
                    اذهب للصفحة
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-white/10">
                  <div className="text-xs font-bold text-amber-700 dark:text-[#E5C168] mb-2 text-center">
                    صفحات مميزة سريعة:
                  </div>
                  <div className="flex flex-wrap gap-1.5 justify-center text-xs">
                    {[
                      { name: 'الفاتحة', p: 1 },
                      { name: 'البقرة (ص ٦)', p: 6 },
                      { name: 'الكهف', p: 293 },
                      { name: 'يس', p: 440 },
                      { name: 'الملك', p: 562 },
                      { name: 'جزء عم', p: 582 },
                      { name: 'المعوذات', p: 604 },
                    ].map((item) => (
                      <button
                        key={item.p}
                        onClick={() => handleGoToPage(item.p)}
                        className="py-1 px-2.5 rounded-lg border border-[#E5C168]/40 bg-slate-50 dark:bg-[#132242] hover:border-[#2DD4BF] active:scale-95 cursor-pointer font-bold"
                      >
                        {item.name} ({toArabicDigits(item.p)})
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {pickerTab === 'surah' && (
              <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                {SURAHS_LIST.map((s) => (
                  <button
                    type="button"
                    key={s.number}
                    onClick={() => handleGoToPage(s.pageStart, s.number, 1)}
                    className="w-full flex items-center justify-between p-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-[#132242] cursor-pointer transition text-right"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#132242] border border-[#E5C168]/40 text-[#E5C168] text-[10px] font-bold flex items-center justify-center shrink-0">
                        {toArabicDigits(s.number)}
                      </span>
                      <span className="font-bold text-xs">{s.name}</span>
                    </div>
                    <span className="text-[11px] text-amber-700 dark:text-[#E5C168] font-medium">
                      صفحة {toArabicDigits(s.pageStart)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {pickerTab === 'juz' && (
              <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                {JUZ_LIST.map((j) => (
                  <button
                    type="button"
                    key={j.juzNumber}
                    onClick={() => handleGoToPage(j.startPage, j.startSurahNumber, j.startAyah)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-[#132242] cursor-pointer transition text-right"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#132242] border border-[#E5C168]/40 text-[#E5C168] text-[10px] font-bold flex items-center justify-center shrink-0">
                        {toArabicDigits(j.juzNumber)}
                      </span>
                      <span className="font-bold text-xs">{j.nameAr}</span>
                    </div>
                    <span className="text-[11px] text-amber-700 dark:text-[#E5C168] font-medium">
                      صفحة {toArabicDigits(j.startPage)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Sheet Tafsir Modal */}
      {selectedAyah && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 backdrop-blur-xs transition-opacity duration-300"
          onClick={() => setSelectedAyah(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white dark:bg-[#0D1831] text-slate-900 dark:text-[#F8FAFC] rounded-t-3xl border-t-2 border-[#E5C168]/60 p-4 sm:p-5 shadow-2xl max-h-[65dvh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
          >
            <div className="w-12 h-1.5 rounded-full bg-[#E5C168]/60 mx-auto mb-3" />

            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2DD4BF]" />
                <b className="text-sm font-bold">
                  سورة {selectedAyah.surahName.replace(/^سُورَةُ\s*/u, '').replace(/^سورة\s*/u, '')} · آية {toArabicDigits(selectedAyah.numberInSurah)}
                </b>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    handlePlayAyahAudio(selectedAyah.surahNumber, selectedAyah.numberInSurah)
                  }
                  className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 cursor-pointer transition ${
                    ayahAudioPlaying
                      ? 'bg-[#2DD4BF] text-[#081229] border-[#2DD4BF] font-bold'
                      : 'border-[#E5C168]/50 text-[#0F2347] dark:text-[#E5C168] hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                  aria-label={ayahAudioPlaying ? 'إيقاف التلاوة' : 'استماع لتلاوة الآية'}
                >
                  {ayahAudioPlaying ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  <span className="hidden sm:inline">{ayahAudioPlaying ? 'إيقاف' : 'استماع'}</span>
                </button>

                <button
                  onClick={() =>
                    handleShareAyah(
                      selectedAyah.text,
                      selectedAyah.surahName,
                      selectedAyah.numberInSurah
                    )
                  }
                  className="p-1.5 rounded-lg border border-[#E5C168]/50 text-[#0F2347] dark:text-[#E5C168] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                  title="مشاركة الآية"
                  aria-label="مشاركة"
                >
                  {copied ? <Check className="w-4 h-4 text-[#2DD4BF]" /> : <Share2 className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => setSelectedAyah(null)}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                  aria-label="إغلاق التفسير"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="my-3 p-3 bg-slate-50 dark:bg-[#132242] rounded-xl border border-slate-200 dark:border-white/10">
              <p className="font-quran text-lg sm:text-xl text-center leading-loose text-[#0F2347] dark:text-[#F3D98B]">
                {selectedAyah.text} ﴿{toArabicDigits(selectedAyah.numberInSurah)}﴾
              </p>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-bold text-amber-700 dark:text-[#E5C168] flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                <span>التفسير الميسر:</span>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                {selectedAyah.tafsir || 'التفسير الميسر: تفسير هذه الآية الكريمة المباركة.'}
              </p>
            </div>

            <button
              onClick={() => setSelectedAyah(null)}
              className="w-full mt-4 bg-gradient-to-l from-[#0D9488] to-[#2DD4BF] text-[#081229] font-extrabold text-xs py-2.5 rounded-xl transition cursor-pointer active:scale-98"
            >
              إغلاق ومتابعة القراءة
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
