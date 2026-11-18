import { Reciter } from '../types';

export const RECITERS_LIST: Reciter[] = [
  {
    id: 'minshawi',
    name: 'محمد صديق المنشاوي',
    style: 'مرتل ومجود - رواية حفص عن عاصم',
    serverUrl: 'https://server10.mp3quran.net/minsh/',
    avatarColor: 'amber',
  },
  {
    id: 'rifai',
    name: 'هاني الرفاعي',
    style: 'تلاوة خاشعة مميزة',
    serverUrl: 'https://server8.mp3quran.net/rifai/',
    avatarColor: 'blue',
  },
  {
    id: 'yamani',
    name: 'وديع اليمني',
    style: 'تلاوة ندية عذبة',
    serverUrl: 'https://server6.mp3quran.net/wdee3/',
    avatarColor: 'pink',
  },
  {
    id: 'afasy',
    name: 'مشاري راشد العفاسي',
    style: 'حفص عن عاصم - مرتّل',
    serverUrl: 'https://server8.mp3quran.net/afs/',
    avatarColor: 'teal',
  },
  {
    id: 'abdulbasit',
    name: 'عبد الباسط عبد الصمد',
    style: 'المصحف المرتل',
    serverUrl: 'https://server7.mp3quran.net/basit/',
    avatarColor: 'coral',
  },
  {
    id: 'hussary',
    name: 'محمود خليل الحصري',
    style: 'رواية حفص - الشيخ المعلم',
    serverUrl: 'https://server13.mp3quran.net/husr/',
    avatarColor: 'purple',
  },
];

export function getSurahAudioUrl(reciter: Reciter, surahNumber: number): string {
  const padded = String(surahNumber).padStart(3, '0');
  return `${reciter.serverUrl}${padded}.mp3`;
}
