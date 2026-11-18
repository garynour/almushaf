// Complete 604-page Offline Quran Dataset, All 114 Surahs, All 30 Juz & Tafsir Al-Muyassar
import { Surah, MushafPage } from '../types';
import {
  ALL_SURAHS_LIST,
  ALL_JUZ_LIST,
  JuzEntry,
  getPageForSurahAyah,
} from './quranMetadata';

export const SURAHS_LIST: Surah[] = ALL_SURAHS_LIST;
export const JUZ_LIST: JuzEntry[] = ALL_JUZ_LIST;
export { getPageForSurahAyah };

const SURAH_NAME_MAP = new Map<number, string>(
  ALL_SURAHS_LIST.map((s) => [s.number, s.name])
);

// Compact tuple stored inside /data/quran-pages.json
// [globalAyahNumber, surahNumber, numberInSurah, tajweedRawText, tafsirMuyassar]
type CompactAyahTuple = [number, number, number, string, string];
interface CompactPageEntry {
  j: number; // juzNumber
  a: CompactAyahTuple[];
}

// Pre-cached vocabulary / instant fallback for key pages
export const PRELOADED_PAGES: Record<number, MushafPage> = {
  1: {
    pageNumber: 1,
    juzNumber: 1,
    surahs: [{ number: 1, name: 'سُورَةُ الفَاتِحَة', startAyah: 1, endAyah: 7 }],
    ayahs: [
      { number: 1, surahNumber: 1, surahName: 'الفاتحة', numberInSurah: 1, text: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', tafsir: 'أبدأ قراءتي باسم الله مستعينا به، (الله) علم على الرب تبارك وتعالى، المعبود بحق دون سواه.' },
      { number: 2, surahNumber: 1, surahName: 'الفاتحة', numberInSurah: 2, text: 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ', tafsir: 'الثناء الكامل لله بصفاته التي كلها أوصاف كمال، وبنعمه الظاهرة والباطنة الدينية والدنيوية.' },
      { number: 3, surahNumber: 1, surahName: 'الفاتحة', numberInSurah: 3, text: 'ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', tafsir: 'الرحمن: ذو الرحمة العامة الشاملة لجميع خلقه، الرحيم: بالمؤمنين خاصة.' },
      { number: 4, surahNumber: 1, surahName: 'الفاتحة', numberInSurah: 4, text: 'مَٰلِكِ يَوْمِ ٱلدِّينِ', tafsir: 'هو سبحانه وحده مالك يوم القيامة والجزاء على الأعمال.' },
      { number: 5, surahNumber: 1, surahName: 'الفاتحة', numberInSurah: 5, text: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ', tafsir: 'نخصك وحدك بالعبادة، ونستعين بك وحدك في كل أمورنا.' },
      { number: 6, surahNumber: 1, surahName: 'الفاتحة', numberInSurah: 6, text: 'ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ', tafsir: 'وفقنا وأرشدنا، وثبتنا على الطريق الواضح المفضي إلى مرضاتك وجنتك.' },
      { number: 7, surahNumber: 1, surahName: 'الفاتحة', numberInSurah: 7, text: 'صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ', tafsir: 'طريق الذين أنعمت عليهم من النبيين والصدّيقين والشهداء والصالحين، غير المغضوب عليهم (كاليهود)، ولا الضالين (كالنصارى).' },
    ],
  },
  6: {
    pageNumber: 6,
    juzNumber: 1,
    surahs: [{ number: 2, name: 'سُورَةُ البَقَرَة', startAyah: 30, endAyah: 37 }],
    vocabulary: [
      { word: 'يَسْفِكُ', meaning: 'يَرِيقُهَا وَظُلْمًا' },
      { word: 'نُسَبِّحُ', meaning: 'نُنَزِّهُكَ عَنْ كُلِّ سُوءٍ' },
      { word: 'نُقَدِّسُ لَكَ', meaning: 'نُمَجِّدُكَ وَنَذْكُرُكَ بِعَظَمَتِكَ' },
      { word: 'اسْجُدُوا', meaning: 'اخْضَعُوا أَوْ سُجُودَ تَحِيَّةٍ وَتَكْرِيمٍ' },
      { word: 'رَغَدًا', meaning: 'أَكْلًا وَاسِعًا هَنِيئًا' },
      { word: 'فَأَزَلَّهُمَا', meaning: 'أَذْهَبَهُمَا وَأَوْقَعَهُمَا فِي الْخَطَأِ' },
    ],
    ayahs: [],
  },
};

// Parse AlQuran Cloud bracketed Tajweed tags into styled HTML spans
export function parseTajweedMarkup(raw: string): string {
  if (!raw) return '';

  const codeToClass: Record<string, string> = {
    o: 'tajweed-madd-obligatory',
    m: 'tajweed-madd-lazim',
    c: 'tajweed-madd-jaiz',
    p: 'tajweed-madd-arid',
    n: 'tajweed-n',
    g: 'tajweed-ghunnah',
    f: 'tajweed-ikhfa',
    q: 'tajweed-qalqalah',
    s: 'tajweed-silent',
    h: 'tajweed-silent',
    l: 'tajweed-silent',
    u: 'tajweed-silent',
    b: 'tajweed-silent',
    w: 'tajweed-idgham-ghunnah',
    a: 'tajweed-idgham-ghunnah',
    d: 'tajweed-idgham-ghunnah',
    i: 'tajweed-iqlab',
  };

  let result = raw;
  for (let pass = 0; pass < 5; pass++) {
    const next = result.replace(
      /\[([a-z])(?::\d+)?\[([^\[\]]*)\]/g,
      (_, code, text) => {
        const cls = codeToClass[code] || `tajweed-${code}`;
        return `<span class="${cls}">${text}</span>`;
      }
    );
    if (next === result) break;
    result = next;
  }

  // Strip any rare bare orthographic brackets like [ٮٰ]
  result = result.replace(/\[([^\[\]<>]+)\]/g, '$1');
  return result;
}

// Plain text helper that strips all tajweed tags for searching, copying, or sharing
export function stripTajweedMarkup(raw: string): string {
  if (!raw) return '';
  let result = raw;
  for (let pass = 0; pass < 5; pass++) {
    const next = result.replace(/\[[a-z](?::\d+)?\[([^\[\]]*)\]/g, '$1');
    if (next === result) break;
    result = next;
  }
  return result
    .replace(/\[([^\[\]]+)\]/g, '$1')
    .replace(/\[[a-z](?::\d+)?\[/g, '')
    .replace(/\]/g, '');
}

let offlineQuranPromise: Promise<CompactPageEntry[] | null> | null = null;
let offlineQuranData: CompactPageEntry[] | null = null;

export function loadOfflineQuranDataset(): Promise<CompactPageEntry[] | null> {
  if (offlineQuranData) {
    return Promise.resolve(offlineQuranData);
  }
  if (!offlineQuranPromise) {
    offlineQuranPromise = fetch('/data/quran-pages.json', { cache: 'force-cache' })
      .then(async (res) => {
        if (!res.ok) return null;
        const json = (await res.json()) as CompactPageEntry[];
        if (Array.isArray(json) && json.length === 604) {
          offlineQuranData = json;
          return json;
        }
        return null;
      })
      .catch(() => null);
  }
  return offlineQuranPromise;
}

export function preloadFullQuranOffline(): void {
  void loadOfflineQuranDataset();
}

function hydrateCompactPage(pageNumber: number, entry: CompactPageEntry): MushafPage {
  const surahMap = new Map<
    number,
    { number: number; name: string; startAyah: number; endAyah: number }
  >();

  const ayahs = entry.a.map(([num, sNum, numInSurah, rawTajweed, tafsir]) => {
    const sName = SURAH_NAME_MAP.get(sNum) || `سورة ${sNum}`;
    const existing = surahMap.get(sNum);
    if (!existing) {
      surahMap.set(sNum, {
        number: sNum,
        name: `سُورَةُ ${sName}`,
        startAyah: numInSurah,
        endAyah: numInSurah,
      });
    } else {
      existing.endAyah = Math.max(existing.endAyah, numInSurah);
    }

    return {
      number: num,
      surahNumber: sNum,
      surahName: sName,
      numberInSurah: numInSurah,
      text: stripTajweedMarkup(rawTajweed),
      tajweedHtml: parseTajweedMarkup(rawTajweed),
      tafsir: tafsir || 'التفسير الميسر غير متوفر لهذه الآية.',
    };
  });

  const vocab = PRELOADED_PAGES[pageNumber]?.vocabulary;

  return {
    pageNumber,
    juzNumber: entry.j || 1,
    surahs: Array.from(surahMap.values()),
    vocabulary: vocab,
    ayahs,
  };
}

// Fetch page 100% offline first from bundled/SW-precached /data/quran-pages.json,
// falling back cleanly to localStorage / network only if ever unavailable.
export async function fetchMushafPage(pageNumber: number): Promise<MushafPage> {
  const validPage = Math.max(1, Math.min(604, Math.floor(pageNumber || 1)));

  // 1. Primary 100% Offline Complete 604-Page Dataset (with Tajweed + Tafsir Al-Muyassar)
  const dataset = await loadOfflineQuranDataset();
  if (dataset && dataset[validPage - 1]) {
    return hydrateCompactPage(validPage, dataset[validPage - 1]);
  }

  // 2. Fallback to static inline preload if available (e.g. unit tests)
  if (PRELOADED_PAGES[validPage] && PRELOADED_PAGES[validPage].ayahs.length > 0) {
    return PRELOADED_PAGES[validPage];
  }

  // 3. Fallback to localStorage cache
  const cacheKey = `mushaf_page_tajweed_${validPage}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.warn('LocalStorage access error:', e);
  }

  // 4. Online fallback from alquran.cloud API if static dataset was unreachable
  try {
    const [tajweedRes, tafsirRes] = await Promise.all([
      fetch(`https://api.alquran.cloud/v1/page/${validPage}/quran-tajweed`).catch(() => null),
      fetch(`https://api.alquran.cloud/v1/page/${validPage}/ar.muyassar`).catch(() => null),
    ]);

    let ayahsData: any[] = [];
    let isTajweed = false;

    if (tajweedRes && tajweedRes.ok) {
      const tajweedJson = await tajweedRes.json();
      ayahsData = tajweedJson.data?.ayahs || [];
      isTajweed = true;
    } else {
      const uthmaniRes = await fetch(
        `https://api.alquran.cloud/v1/page/${validPage}/quran-uthmani`
      ).catch(() => null);
      if (uthmaniRes && uthmaniRes.ok) {
        const uthmaniJson = await uthmaniRes.json();
        ayahsData = uthmaniJson.data?.ayahs || [];
      }
    }

    if (ayahsData.length > 0) {
      const tafsirJson = tafsirRes && tafsirRes.ok ? await tafsirRes.json() : null;
      const tafsirAyahs = tafsirJson?.data?.ayahs || [];

      const surahMap = new Map<
        number,
        { number: number; name: string; startAyah: number; endAyah: number }
      >();

      const ayahs = ayahsData.map((a: any, idx: number) => {
        const sNum = a.surah.number;
        const sName = SURAH_NAME_MAP.get(sNum) || a.surah.name.replace(/^سُورَةُ\s*/u, '');
        if (!surahMap.has(sNum)) {
          surahMap.set(sNum, {
            number: sNum,
            name: `سُورَةُ ${sName}`,
            startAyah: a.numberInSurah,
            endAyah: a.numberInSurah,
          });
        } else {
          const current = surahMap.get(sNum)!;
          current.endAyah = Math.max(current.endAyah, a.numberInSurah);
        }

        const rawText = a.text;
        return {
          number: a.number,
          surahNumber: sNum,
          surahName: sName,
          numberInSurah: a.numberInSurah,
          text: isTajweed ? stripTajweedMarkup(rawText) : rawText,
          tajweedHtml: isTajweed ? parseTajweedMarkup(rawText) : undefined,
          tafsir: tafsirAyahs[idx]?.text || 'التفسير الميسر لهذه الآية الكريمة.',
        };
      });

      const page: MushafPage = {
        pageNumber: validPage,
        juzNumber: ayahsData[0]?.juz || Math.ceil(validPage / 20),
        surahs: Array.from(surahMap.values()),
        ayahs,
      };

      try {
        localStorage.setItem(cacheKey, JSON.stringify(page));
      } catch {}

      return page;
    }
  } catch (err) {
    console.warn('Fetch mushaf page network error:', err);
  }

  // 5. Final graceful fallback if dataset missing in environment
  const surahMatch =
    SURAHS_LIST.find((s) => validPage >= s.pageStart && validPage <= s.pageEnd) || SURAHS_LIST[0];
  return {
    pageNumber: validPage,
    juzNumber: Math.ceil(validPage / 20),
    surahs: [
      {
        number: surahMatch.number,
        name: `سُورَةُ ${surahMatch.name}`,
        startAyah: 1,
        endAyah: surahMatch.numberOfAyahs,
      },
    ],
    ayahs: [],
  };
}
