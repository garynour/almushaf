import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Share2, Volume2, VolumeX, Check } from 'lucide-react';

interface AyahOfTheDayCardProps {
  onOpenMushafPage: (page: number, ayahNumber?: number) => void;
}

export const AyahOfTheDayCard: React.FC<AyahOfTheDayCardProps> = ({ onOpenMushafPage }) => {
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const ayahData = {
    surahName: 'الفجر',
    ayahNum: 23,
    surahNum: 89,
    page: 593,
    text: 'وَجِىٓءَ يَوْمَئِذٍۭ بِجَهَنَّمَ ۚ يَوْمَئِذٍ يَتَذَكَّرُ ٱلْإِنسَٰنُ وَأَنَّىٰ لَهُ ٱلذِّكْرَىٰ',
  };

  const handleShare = async () => {
    const textToShare = `﴿${ayahData.text}﴾ [سورة ${ayahData.surahName}: ${ayahData.ayahNum}] - تطبيق القرآن الكريم وتفسيره`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'آية اليوم',
          text: textToShare,
        });
        return;
      } catch {}
    }

    try {
      await navigator.clipboard.writeText(textToShare);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handlePlay = () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    const audio = new Audio('https://everyayah.com/data/Alafasy_128kbps/089023.mp3');
    audioRef.current = audio;
    setIsPlaying(true);

    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => setIsPlaying(false);
    audio.play().catch(() => setIsPlaying(false));
  };

  return (
    <section className="mx-3 mt-3.5 mb-2 fluid-card rounded-[24px] p-3.5 relative overflow-hidden transition">
      {/* Subtle Ambient Gold Glow */}
      <div
        className="absolute -left-8 -bottom-8 w-28 h-28 rounded-full pointer-events-none opacity-25 blur-xl"
        style={{ background: 'radial-gradient(circle, #E5C168 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/70 dark:border-white/10">
        <div className="flex items-center gap-1.5 text-xs">
          <b className="font-black text-[#0D9488] dark:text-[#E5C168]">آية اليوم</b>
          <span className="text-slate-400" aria-hidden="true">·</span>
          <span className="text-slate-600 dark:text-slate-300 font-semibold">
            سورة {ayahData.surahName} {ayahData.ayahNum}
          </span>
        </div>

        <button
          type="button"
          onClick={handlePlay}
          className={`text-xs flex items-center gap-1 px-3 py-1 rounded-xl border transition cursor-pointer active:scale-95 ${
            isPlaying
              ? 'bg-[#2DD4BF] text-[#051B1E] border-[#2DD4BF] font-bold'
              : 'border-slate-200 dark:border-white/15 text-[#0D9488] dark:text-[#2DD4BF] hover:bg-teal-50 dark:hover:bg-white/5 font-bold'
          }`}
          aria-label={isPlaying ? 'إيقاف التلاوة' : 'استماع للآية'}
        >
          {isPlaying ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          <span>{isPlaying ? 'إيقاف الصوت' : 'استماع'}</span>
        </button>
      </div>

      {/* Verse Arabic Text */}
      <p className="font-quran text-lg md:text-xl leading-relaxed text-center my-3 text-[#0F172A] dark:text-[#F8FAFC]">
        {ayahData.text}
      </p>

      {/* Actions */}
      <div className="flex items-center justify-around pt-2 border-t border-slate-200/70 dark:border-white/10 text-xs font-bold text-[#0D9488] dark:text-[#E5C168]">
        <button
          onClick={() => onOpenMushafPage(ayahData.page, ayahData.ayahNum)}
          className="flex items-center gap-1.5 hover:opacity-80 transition py-1.5 px-3 rounded-xl active:scale-95 cursor-pointer"
        >
          <BookOpen className="w-4 h-4" />
          <span>قراءة في المصحف</span>
        </button>
        <div className="w-[1px] h-4 bg-slate-200 dark:bg-white/15" />
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 hover:opacity-80 transition py-1.5 px-3 rounded-xl active:scale-95 cursor-pointer"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
          <span>{copied ? 'تم النسخ!' : 'مشاركة'}</span>
        </button>
      </div>
    </section>
  );
};
