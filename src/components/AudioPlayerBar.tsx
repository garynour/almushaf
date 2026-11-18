import React from 'react';
import { Play, Pause, X, Volume2 } from 'lucide-react';
import { Reciter } from '../types';

interface AudioPlayerBarProps {
  reciter: Reciter;
  surahName: string;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onClose: () => void;
}

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({
  reciter,
  surahName,
  isPlaying,
  onTogglePlay,
  onClose,
}) => {
  return (
    <div
      className="fixed bottom-[4.5rem] left-3 right-3 max-w-md mx-auto z-40 bg-[#0D1A36]/95 backdrop-blur-md text-[#F8FAFC] border border-[#E5C168]/45 rounded-[20px] p-2.5 shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom duration-200"
      dir="rtl"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          onClick={onTogglePlay}
          className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2DD4BF] to-[#0D9488] text-[#081229] flex items-center justify-center shrink-0 shadow-md active:scale-95 cursor-pointer"
          aria-label={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
        >
          {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
        </button>

        <div className="min-w-0">
          <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-[#2DD4BF] shrink-0" />
            <span>تلاوة سورة {surahName}</span>
          </div>
          <div className="text-[11px] text-[#E5C168] truncate">
            بصوت القارئ {reciter.name}
          </div>
        </div>
      </div>

      <button
        onClick={onClose}
        className="p-1 rounded-full text-[#F3D98B] hover:text-white hover:bg-white/10 cursor-pointer"
        aria-label="إغلاق مشغل الصوت"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
