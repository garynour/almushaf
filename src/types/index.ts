export type ViewType =
  | 'home'
  | 'quran'
  | 'mushaf'
  | 'prayer'
  | 'adhkar'
  | 'hadith'
  | 'qibla'
  | 'tracker'
  | 'khatma'
  | 'settings'
  | 'tajweed'
  | 'more';


export interface Ayah {
  number: number;
  text: string;
  numberInSurah: number;
  juz: number;
  page: number;
  hizbQuarter?: number;
  sajda?: boolean;
}

export interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: 'Meccan' | 'Medinan';
  pageStart: number;
  pageEnd: number;
}

export interface MushafPage {
  pageNumber: number;
  juzNumber?: number;
  surahs: {
    number: number;
    name: string;
    startAyah: number;
    endAyah: number;
  }[];
  ayahs: {
    number: number;
    surahNumber: number;
    surahName: string;
    numberInSurah: number;
    text: string;
    tajweedHtml?: string;
    tafsir?: string;
  }[];
  vocabulary?: {
    word: string;
    meaning: string;
  }[];
}

export interface PrayerTimeItem {
  id: string;
  nameAr: string;
  nameEn: string;
  timeStr: string;
  hour: number;
  minute: number;
  colorName: 'blue' | 'amber' | 'coral' | 'purple' | 'teal';
  icon: string;
  isNext?: boolean;
}

export interface Reciter {
  id: string;
  name: string;
  style: string;
  serverUrl: string;
  avatarColor: 'amber' | 'blue' | 'pink' | 'purple' | 'teal' | 'coral';
  isDownloaded?: boolean;
}

export interface DhikrItem {
  id: string;
  text: string;
  count: number;
  currentCount?: number;
  reward?: string;
  source?: string;
  done?: boolean;
}

export interface DhikrCategory {
  id: string;
  title: string;
  icon: string;
  color: 'amber' | 'purple' | 'teal' | 'blue' | 'coral' | 'pink';
  countDesc: string;
  items: DhikrItem[];
}

export interface Bookmark {
  id: string;
  page: number;
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  dateStr: string;
}

export interface KhatmaPlan {
  targetDays: number;
  currentPage: number;
  pagesPerDay: number;
  startDate: string;
}

export interface DailyPrayerRecord {
  date: string;
  prayers: {
    fajr: boolean;
    dhuhr: boolean;
    asr: boolean;
    maghrib: boolean;
    isha: boolean;
  };
}
