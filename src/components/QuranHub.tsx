import React, { useState } from 'react';
import {
  BookOpen,
  Headphones,
  Sparkles,
  Play,
  Pause,
  Download,
  Check,
  Search,
  ArrowRight,
  BookmarkCheck,
  Layers,
} from 'lucide-react';
import {
  SURAHS_LIST,
  JUZ_LIST,
  getPageForSurahAyah,
  preloadFullQuranOffline,
} from '../data/quranData';
import { RECITERS_LIST, getSurahAudioUrl } from '../data/recitersData';
import { Bookmark, Reciter } from '../types';
import { toArabicDigits } from '../utils/prayerTimes';

interface QuranHubProps {
  onOpenMushaf: (page: number, surahNumber?: number, ayahNumber?: number) => void;
  lastRead: { surahName: string; page: number; ayah: number } | null;
  bookmarks: Bookmark[];
  onRemoveBookmark: (id: string) => void;
  activeReciter: Reciter;
  isPlayingRecitation: boolean;
  onTogglePlayReciter: (reciter: Reciter, surahNumber: number) => void;
}

export const QuranHub: React.FC<QuranHubProps> = ({
  onOpenMushaf,
  lastRead,
  bookmarks,
  onRemoveBookmark,
  activeReciter,
  isPlayingRecitation,
  onTogglePlayReciter,
}) => {
  const [tab, setTab] = useState<'surahs' | 'juz' | 'bookmarks'>('surahs');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSurahNumber, setSelectedSurahNumber] = useState<number>(1);
  const [ayahInput, setAyahInput] = useState<string>('1');
  const [downloadedReciters, setDownloadedReciters] = useState<Record<string, boolean>>({});
  const [downloadingState, setDownloadingState] = useState<{
    id: string;
    pct: number;
  } | null>(null);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  React.useEffect(() => {
    preloadFullQuranOffline();
  }, []);

  React.useEffect(() => {
    let active = true;
    if (!('caches' in window)) return;
    caches
      .open('quran-offline-reciters')
      .then((cache) => cache.keys())
      .then((requests) => {
        if (!active) return;
        const found: Record<string, boolean> = {};
        for (const reciter of RECITERS_LIST) {
          if (requests.some((req) => req.url.startsWith(reciter.serverUrl))) {
            found[reciter.id] = true;
          }
        }
        setDownloadedReciters(found);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const selectedSurah =
    SURAHS_LIST.find((s) => s.number === selectedSurahNumber) || SURAHS_LIST[0];

  const normalizeArabic = (str: string) =>
    str
      .replace(/[\u064B-\u065F\u0670]/g, '')
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .trim()
      .toLowerCase();

  const normalizedQuery = normalizeArabic(searchQuery);

  const filteredSurahs = SURAHS_LIST.filter((s) => {
    if (!normalizedQuery) return true;
    return (
      normalizeArabic(s.name).includes(normalizedQuery) ||
      s.englishName.toLowerCase().includes(normalizedQuery) ||
      String(s.number).includes(normalizedQuery) ||
      toArabicDigits(s.number).includes(searchQuery.trim())
    );
  });

  const parseDigitsInput = (val: string) => {
    const converted = val.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
    return parseInt(converted, 10);
  };

  const handleGo = () => {
    const parsed = parseDigitsInput(ayahInput);
    const aNum = Math.max(
      1,
      Math.min(Number.isNaN(parsed) ? 1 : parsed, selectedSurah.numberOfAyahs)
    );
    const targetPage = getPageForSurahAyah(selectedSurah.number, aNum);
    onOpenMushaf(targetPage, selectedSurah.number, aNum);
  };

  const handleDownloadReciter = async (reciter: Reciter) => {
    if (downloadingState?.id === reciter.id) return;

    const surahToSave = selectedSurah;
    const surahNumbersToCache = Array.from(
      new Set([surahToSave.number, 1, 112, 113, 114])
    );

    setDownloadingState({ id: reciter.id, pct: 5 });
    setDownloadNotice(`جارٍ تحميل سورة ${surahToSave.name} بصوت ${reciter.name}...`);

    try {
      const cache = 'caches' in window ? await caches.open('quran-offline-reciters') : null;
      let primaryBlob: Blob | null = null;

      for (let i = 0; i < surahNumbersToCache.length; i++) {
        const sNum = surahNumbersToCache[i];
        const url = getSurahAudioUrl(reciter, sNum);
        const res = await fetch(url, { mode: 'cors' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const blob = await res.blob();
        if (sNum === surahToSave.number) {
          primaryBlob = blob;
        }

        if (cache) {
          await cache.put(
            url,
            new Response(blob, {
              status: 200,
              headers: { 'Content-Type': 'audio/mpeg' },
            })
          );
        }

        const pct = Math.round(((i + 1) / surahNumbersToCache.length) * 100);
        setDownloadingState({ id: reciter.id, pct });
      }

      if (primaryBlob) {
        const blobUrl = URL.createObjectURL(primaryBlob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${reciter.id}_${String(surahToSave.number).padStart(3, '0')}_${surahToSave.name}.mp3`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      }

      setDownloadedReciters((prev) => ({ ...prev, [reciter.id]: true }));
      setDownloadNotice(
        `تم تنزيل سورة ${surahToSave.name} وقصار السور بصوت ${reciter.name} وحفظها بنجاح ✓`
      );
    } catch {
      setDownloadNotice('تعذر إتمام التحميل — تأكد من اتصال الإنترنت وحاول مجدداً.');
    } finally {
      setDownloadingState(null);
      window.setTimeout(() => setDownloadNotice(null), 5000);
    }
  };

  const quickSurahs = [
    { name: 'الفاتحة', number: 1, page: 1, ayah: 1 },
    { name: 'البقرة (صفحة ٦)', number: 2, page: 6, ayah: 30 },
    { name: 'الكهف', number: 18, page: 293, ayah: 1 },
    { name: 'يس', number: 36, page: 440, ayah: 1 },
    { name: 'الملك', number: 67, page: 562, ayah: 1 },
    { name: 'المعوذات', number: 112, page: 604, ayah: 1 },
  ];


  const avatarStyles: Record<string, { bg: string; fg: string }> = {
    amber: { bg: '#FAEEDA', fg: '#854F0B' },
    blue: { bg: '#E6F1FB', fg: '#185FA5' },
    pink: { bg: '#FBEAF0', fg: '#993556' },
    teal: { bg: '#E1F5EE', fg: '#0F6E56' },
    purple: { bg: '#EEEDFE', fg: '#534AB7' },
    coral: { bg: '#FAECE7', fg: '#993C1D' },
  };

  return (
    <div className="flex-1 overflow-y-auto pb-6 bg-[#F4F6FA] dark:bg-[#081023] islamic-bg-pattern">
      {/* View Header */}
      <div className="bg-gradient-to-b from-[#081229] to-[#0F1F42] text-white py-3.5 px-4 font-bold text-base sticky top-0 z-20 shadow-md flex items-center justify-between border-b border-white/10">
        <span>القرآن الكريم</span>
        <span className="text-xs bg-[#E5C168]/15 text-[#E5C168] px-2.5 py-0.5 rounded-full border border-[#E5C168]/35 font-normal">
          ٦٠٤ صفحة · مصحف المدينة
        </span>
      </div>

      <div className="p-3 space-y-3 max-w-lg mx-auto">
        {/* Card 1: Read Mushaf */}
        <div className="fluid-card rounded-[24px] p-3.5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#2DD4BF] to-[#0D9488] text-white flex items-center justify-center shrink-0 shadow-md">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <b className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] block">
                قراءة المصحف
              </b>
              <div className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">
                تجويد ملون، علامات، وتفسير ميسر بلمسة واحدة
              </div>
            </div>
          </div>

          <button
            onClick={() => onOpenMushaf(lastRead?.page || 1)}
            className="w-full bg-gradient-to-l from-[#0D9488] to-[#2DD4BF] hover:opacity-95 text-[#081229] font-extrabold text-sm py-2.5 rounded-xl mt-3 text-center transition active:scale-98 shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            <span>{lastRead ? `متابعة القراءة (ص ${toArabicDigits(lastRead.page)})` : 'فتح المصحف الشريف'}</span>
          </button>
        </div>

        {/* Card 2: Listen & Download Reciters */}
        <div className="fluid-card rounded-[24px] p-3.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#6366F1] text-white flex items-center justify-center shrink-0 shadow-sm">
                <Headphones className="w-5 h-5" />
              </div>
              <b className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">
                استماع وتنزيل التلاوات
              </b>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-300">
              رواية حفص عن عاصم
            </span>
          </div>

          <div className="space-y-1.5 mt-2">
            {RECITERS_LIST.slice(0, 4).map((reciter) => {
              const style = avatarStyles[reciter.avatarColor] || avatarStyles.amber;
              const isCurrentPlaying = isPlayingRecitation && activeReciter.id === reciter.id;
              const isDownloaded = downloadedReciters[reciter.id];

              return (
                <div
                  key={reciter.id}
                  className={`flex items-center gap-2.5 p-2 rounded-xl transition ${
                    isCurrentPlaying
                      ? 'bg-teal-50 dark:bg-[#192D56] border border-[#2DD4BF]/50 text-[#0D9488] dark:text-[#2DD4BF]'
                      : 'bg-slate-50 dark:bg-[#0D1831]/80 text-slate-900 dark:text-[#F8FAFC] border border-transparent'
                  }`}
                >
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ backgroundColor: style.bg, color: style.fg }}
                  >
                    {reciter.name[0]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold truncate">{reciter.name}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-300 truncate">
                      {reciter.style}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleDownloadReciter(reciter)}
                      disabled={downloadingState?.id === reciter.id}
                      className={`h-8 px-2 rounded-lg text-xs flex items-center justify-center gap-1 transition cursor-pointer ${
                        downloadingState?.id === reciter.id
                          ? 'bg-[#E5C168]/20 text-[#E5C168] font-bold'
                          : isDownloaded
                          ? 'text-[#0D9488] dark:text-[#2DD4BF] bg-teal-50 dark:bg-[#192D56]'
                          : 'text-slate-500 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                      title={
                        isDownloaded
                          ? 'تم التحميل — اضغط لإعادة تنزيل السورة المختارة'
                          : `تنزيل سورة ${selectedSurah.name} بصوت ${reciter.name}`
                      }
                      aria-label="تنزيل"
                    >
                      {downloadingState?.id === reciter.id ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          <span className="text-[10px] tabular-nums">{toArabicDigits(downloadingState.pct)}٪</span>
                        </>
                      ) : isDownloaded ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onTogglePlayReciter(reciter, selectedSurah.number)}
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2DD4BF] to-[#0D9488] text-[#081229] flex items-center justify-center transition active:scale-95 shadow-sm cursor-pointer"
                      aria-label={isCurrentPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
                    >
                      {isCurrentPlaying ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4 ml-0.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {downloadNotice && (
            <div className="mt-2.5 px-3 py-2 rounded-xl bg-teal-50 dark:bg-[#132242] border border-[#2DD4BF]/35 text-[11px] font-bold text-[#0D9488] dark:text-[#2DD4BF] text-center">
              {downloadNotice}
            </div>
          )}
        </div>

        {/* Card 3: Quick Navigation Selection & Directory */}
        <div className="fluid-card rounded-[24px] p-3.5">
          <div className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
            الذهاب السريع إلى آية أو سورة
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleGo();
            }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-2"
          >
            <div>
              <label
                htmlFor="quick-surah-select"
                className="text-[11px] text-slate-500 dark:text-slate-300 block mb-1"
              >
                اختر السورة
              </label>
              <select
                id="quick-surah-select"
                value={selectedSurahNumber}
                onChange={(e) => {
                  setSelectedSurahNumber(Number(e.target.value));
                  setAyahInput('1');
                }}
                className="w-full bg-slate-50 dark:bg-[#0D1831] text-slate-900 dark:text-[#F8FAFC] border border-[#E5C168]/45 rounded-xl px-2.5 py-2 text-xs font-bold outline-none"
              >
                {SURAHS_LIST.map((s) => (
                  <option key={s.number} value={s.number}>
                    {toArabicDigits(s.number)} · سورة {s.name} ({toArabicDigits(s.numberOfAyahs)} آية)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="quick-ayah-input"
                className="text-[11px] text-slate-500 dark:text-slate-300 block mb-1"
              >
                رقم الآية (١ - {toArabicDigits(selectedSurah.numberOfAyahs)})
              </label>
              <div className="flex gap-1.5">
                <input
                  id="quick-ayah-input"
                  type="text"
                  inputMode="numeric"
                  value={ayahInput}
                  onChange={(e) => setAyahInput(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-[#0D1831] text-slate-900 dark:text-[#F8FAFC] border border-[#E5C168]/45 rounded-xl px-3 py-1.5 text-xs font-bold outline-none text-center tabular-nums"
                />
                <button
                  type="submit"
                  className="bg-gradient-to-l from-[#0D9488] to-[#2DD4BF] text-[#081229] px-4 py-1.5 rounded-xl text-xs font-extrabold transition active:scale-95 shadow-sm cursor-pointer"
                >
                  اذهب
                </button>
              </div>
            </div>
          </form>

          {/* Quick Access Badges */}
          <div className="mt-3 pt-3 border-t border-slate-200/70 dark:border-white/10">
            <div className="text-[11px] text-slate-500 dark:text-slate-300 mb-1.5 font-medium">
              وصول سريع لسور مختارة:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {lastRead && (
                <button
                  type="button"
                  onClick={() => onOpenMushaf(lastRead.page, undefined, lastRead.ayah)}
                  className="bg-[#132242] text-[#E5C168] border border-[#E5C168]/50 rounded-full px-3 py-1 text-xs font-bold transition active:scale-95 cursor-pointer shadow-sm"
                >
                  آخر قراءة · {lastRead.surahName} (آية {toArabicDigits(lastRead.ayah)})
                </button>
              )}
              {quickSurahs.map((qs) => (
                <button
                  type="button"
                  key={qs.name}
                  onClick={() => onOpenMushaf(qs.page, qs.number, qs.ayah)}
                  className="bg-white dark:bg-[#0D1831] border border-slate-200 dark:border-[#E5C168]/35 text-slate-800 dark:text-[#F8FAFC] rounded-full px-3 py-1 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-[#192D56] transition active:scale-95 cursor-pointer"
                >
                  {qs.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs: Surahs, Juz, Bookmarks */}
        <div className="fluid-card rounded-[24px] p-3">
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-[#0A1328] rounded-xl mb-3">
            <button
              onClick={() => setTab('surahs')}
              className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                tab === 'surahs'
                  ? 'bg-gradient-to-l from-[#0D9488] to-[#2DD4BF] text-[#081229] shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-300'
              }`}
            >
              السور ({toArabicDigits(114)})
            </button>
            <button
              onClick={() => setTab('juz')}
              className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                tab === 'juz'
                  ? 'bg-gradient-to-l from-[#0D9488] to-[#2DD4BF] text-[#081229] shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-300'
              }`}
            >
              الأجزاء ({toArabicDigits(30)})
            </button>
            <button
              onClick={() => setTab('bookmarks')}
              className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                tab === 'bookmarks'
                  ? 'bg-gradient-to-l from-[#0D9488] to-[#2DD4BF] text-[#081229] shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-300'
              }`}
            >
              العلامات ({toArabicDigits(bookmarks.length)})
            </button>
          </div>

          {/* Surahs tab */}
          {tab === 'surahs' && (
            <div>
              <div className="relative mb-2">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="ابحث عن اسم السورة أو رقمها..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#0D1831] text-slate-900 dark:text-[#F8FAFC] border border-slate-200 dark:border-white/10 rounded-xl pr-9 pl-3 py-1.5 text-xs outline-none focus:border-[#2DD4BF]"
                />
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-200/60 dark:divide-white/10">
                {filteredSurahs.map((surah) => (
                  <button
                    type="button"
                    key={surah.number}
                    onClick={() => onOpenMushaf(surah.pageStart, surah.number, 1)}
                    className="w-full text-right flex items-center justify-between py-2.5 px-2 hover:bg-slate-50 dark:hover:bg-[#192D56]/60 rounded-xl transition cursor-pointer active:scale-99"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-[#192D56] text-[#0D9488] dark:text-[#2DD4BF] text-xs font-bold flex items-center justify-center shrink-0 tabular-nums">
                        {toArabicDigits(surah.number)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC]">
                          سورة {surah.name}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-300">
                          {surah.revelationType === 'Meccan' ? 'مكية' : 'مدنية'} · {toArabicDigits(surah.numberOfAyahs)} آية
                        </div>
                      </div>
                    </div>

                    <div className="text-left">
                      <span className="text-[11px] text-[#0D9488] dark:text-[#E5C168] font-semibold block">
                        ص {toArabicDigits(surah.pageStart)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Juz tab */}
          {tab === 'juz' && (
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-200/60 dark:divide-white/10">
              {JUZ_LIST.map((juz) => (
                <button
                  type="button"
                  key={juz.juzNumber}
                  onClick={() => onOpenMushaf(juz.startPage, juz.startSurahNumber, juz.startAyah)}
                  className="w-full text-right flex items-center justify-between py-2.5 px-2 hover:bg-slate-50 dark:hover:bg-[#192D56]/60 rounded-xl transition cursor-pointer active:scale-99"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-[#192D56] text-amber-700 dark:text-[#E5C168] text-xs font-bold flex items-center justify-center shrink-0 tabular-nums">
                      {toArabicDigits(juz.juzNumber)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC]">
                        {juz.nameAr}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-300">
                        بداية من سورة {juz.startSurah} (آية {toArabicDigits(juz.startAyah)})
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] text-amber-700 dark:text-[#E5C168] font-semibold">
                    صفحة {toArabicDigits(juz.startPage)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Bookmarks tab */}
          {tab === 'bookmarks' && (
            <div className="max-h-72 overflow-y-auto">
              {bookmarks.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-300">
                  <BookmarkCheck className="w-8 h-8 text-[#E5C168] mx-auto mb-2 opacity-60" />
                  <span>لا توجد علامات مرجعية محفوظة بعد.</span>
                  <p className="text-[10px] mt-1">
                    أثناء قراءة أي صفحة، اضغط على زر حفظ العلامة للرجوع إليها لاحقاً.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200/60 dark:divide-white/10">
                  {bookmarks.map((bm) => (
                    <div
                      key={bm.id}
                      className="flex items-center justify-between py-2 px-2 hover:bg-slate-50 dark:hover:bg-[#192D56]/60 rounded-xl transition gap-2"
                    >
                      <button
                        type="button"
                        onClick={() => onOpenMushaf(bm.page, bm.surahNumber, bm.ayahNumber)}
                        className="cursor-pointer flex-1 text-right py-1"
                      >
                        <div className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC]">
                          سورة {bm.surahName.replace(/^سُورَةُ\s*/u, '')} · آية {toArabicDigits(bm.ayahNumber)}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-300">
                          صفحة {toArabicDigits(bm.page)} · {bm.dateStr}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => onRemoveBookmark(bm.id)}
                        className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 px-2 py-1 cursor-pointer shrink-0"
                        aria-label="حذف العلامة"
                      >
                        حذف
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
