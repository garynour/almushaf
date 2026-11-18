import React, { useState, useEffect, useRef } from 'react';
import { Volume2, FolderOpen, Trash2, Upload, UserCheck, Music } from 'lucide-react';
import {
  IQAMA_MUADHINS,
  playIqamaAlertSound,
  stopIqamaSound,
  triggerHaptic,
} from '../utils/audio';
import {
  CustomIqamaMeta,
  getCustomIqamaMeta,
  saveCustomIqamaFile,
  clearCustomIqamaFile,
  formatAudioSize,
} from '../utils/customAudioDb';

interface IqamaSoundSelectorProps {
  onSelectNotice?: (msg: string) => void;
  compact?: boolean;
}

export const IqamaSoundSelector: React.FC<IqamaSoundSelectorProps> = ({
  onSelectNotice,
  compact = false,
}) => {
  const [selectedMuadhinId, setSelectedMuadhinId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('selected_iqama_muadhin');
      if (saved === 'custom_device' && getCustomIqamaMeta()) return 'custom_device';
      return saved && IQAMA_MUADHINS.some((m) => m.id === saved) ? saved : 'makkah_official';
    } catch {
      return 'makkah_official';
    }
  });

  const [customMeta, setCustomMeta] = useState<CustomIqamaMeta | null>(() => getCustomIqamaMeta());
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const syncState = () => {
      try {
        const meta = getCustomIqamaMeta();
        setCustomMeta(meta);
        const saved = localStorage.getItem('selected_iqama_muadhin');
        if (saved === 'custom_device' && meta) {
          setSelectedMuadhinId('custom_device');
        } else if (saved && IQAMA_MUADHINS.some((m) => m.id === saved)) {
          setSelectedMuadhinId(saved);
        } else {
          setSelectedMuadhinId('makkah_official');
        }
      } catch {}
    };

    window.addEventListener('iqama_muadhin_updated', syncState);
    return () => {
      window.removeEventListener('iqama_muadhin_updated', syncState);
    };
  }, []);

  const handleSelect = (id: string, label: string) => {
    setSelectedMuadhinId(id);
    try {
      localStorage.setItem('selected_iqama_muadhin', id);
      window.dispatchEvent(new Event('iqama_muadhin_updated'));
    } catch {}
    onSelectNotice?.(`تم اختيار "${label}" لصوت الإقامة ✓`);
    triggerHaptic(15);
  };

  const handleTogglePlay = (id: string) => {
    if (playingId === id) {
      stopIqamaSound();
      setPlayingId(null);
    } else {
      stopIqamaSound();
      setPlayingId(id);
      playIqamaAlertSound(id, () => {
        setPlayingId(null);
      });
      triggerHaptic(20);
    }
  };

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setErrorMsg(null);
    setIsUploading(true);
    try {
      // Max reasonable safety check (e.g. 25 MB)
      if (file.size > 25 * 1024 * 1024) {
        setErrorMsg('حجم الملف كبير جداً (الحد الأقصى ٢٥ ميجابايت)');
        setIsUploading(false);
        return;
      }
      const meta = await saveCustomIqamaFile(file);
      setCustomMeta(meta);
      setSelectedMuadhinId('custom_device');
      onSelectNotice?.(`تم حفظ الصوت "${meta.fileName}" من الذاكرة الداخلية ✓`);
      triggerHaptic(25);
    } catch {
      setErrorMsg('تعذر حفظ الملف الصوتي في ذاكرة التطبيق');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteCustom = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playingId === 'custom_device') {
      stopIqamaSound();
      setPlayingId(null);
    }
    await clearCustomIqamaFile();
    setCustomMeta(null);
    setSelectedMuadhinId('makkah_official');
    onSelectNotice?.('تم إزالة الصوت المخصص والعودة إلى إقامة الحرم المكي');
    triggerHaptic(15);
  };

  return (
    <div
      className={`${
        compact ? 'p-2.5' : 'p-3'
      } rounded-2xl bg-slate-50 dark:bg-[#132242] border border-slate-200 dark:border-[#2DD4BF]/25`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 font-bold text-[#0D9488] dark:text-[#2DD4BF] text-xs">
          <UserCheck className="w-4 h-4" />
          <span>صوت الإقامة (معتمد أو من ذاكرة الجهاز):</span>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-2 p-2 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 text-[11px] font-bold">
          {errorMsg}
        </div>
      )}

      <div className="space-y-1.5">
        {/* Built-in Certified Mu'adhins */}
        {IQAMA_MUADHINS.map((m) => {
          const isSelected = selectedMuadhinId === m.id;
          const isPlaying = playingId === m.id;

          return (
            <div
              key={m.id}
              onClick={() => handleSelect(m.id, m.name)}
              className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                isSelected
                  ? 'bg-white dark:bg-[#192D56] border-[#0D9488] dark:border-[#2DD4BF] shadow-xs'
                  : 'hover:bg-white/70 dark:hover:bg-white/5 border-transparent'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                    isSelected
                      ? 'border-[#0D9488] bg-[#0D9488] dark:border-[#2DD4BF] dark:bg-[#2DD4BF]'
                      : 'border-slate-400'
                  }`}
                >
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-[#081229]" />}
                </span>
                <div className="min-w-0 truncate">
                  <b className="text-xs block font-bold text-slate-900 dark:text-[#F8FAFC] truncate">
                    {m.name}
                  </b>
                  <span className="text-[10px] text-slate-500 dark:text-slate-300 block truncate">
                    {m.sub}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTogglePlay(m.id);
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition active:scale-95 shrink-0 ${
                  isPlaying
                    ? 'bg-red-500 text-white shadow-xs'
                    : 'bg-[#0D9488] dark:bg-[#2DD4BF] text-white dark:text-[#081229] hover:opacity-90'
                }`}
                title={isPlaying ? 'إيقاف الصوت' : 'استماع لصوت الإقامة'}
              >
                <Volume2 className={`w-3 h-3 ${isPlaying ? 'animate-bounce' : ''}`} />
                <span>{isPlaying ? 'إيقاف' : 'استماع'}</span>
              </button>
            </div>
          );
        })}

        {/* Custom Audio from Mobile Storage */}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac"
          onChange={handleFilePick}
          className="hidden"
        />

        {customMeta ? (
          <div
            onClick={() => handleSelect('custom_device', customMeta.fileName)}
            className={`p-2 rounded-xl border flex flex-col gap-1.5 cursor-pointer transition ${
              selectedMuadhinId === 'custom_device'
                ? 'bg-white dark:bg-[#192D56] border-[#0D9488] dark:border-[#2DD4BF] shadow-xs'
                : 'bg-white/60 dark:bg-black/20 border-transparent hover:bg-white/90'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                    selectedMuadhinId === 'custom_device'
                      ? 'border-[#0D9488] bg-[#0D9488] dark:border-[#2DD4BF] dark:bg-[#2DD4BF]'
                      : 'border-slate-400'
                  }`}
                >
                  {selectedMuadhinId === 'custom_device' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-[#081229]" />
                  )}
                </span>
                <div className="min-w-0">
                  <b className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC] flex items-center gap-1 truncate">
                    <Music className="w-3 h-3 text-[#0D9488] dark:text-[#2DD4BF] shrink-0" />
                    <span className="truncate">{customMeta.fileName}</span>
                  </b>
                  <span className="text-[10px] text-slate-500 dark:text-slate-300 block">
                    صوت من ذاكرة الهاتف · {formatAudioSize(customMeta.size)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTogglePlay('custom_device');
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition active:scale-95 shrink-0 ${
                  playingId === 'custom_device'
                    ? 'bg-red-500 text-white shadow-xs'
                    : 'bg-[#0D9488] dark:bg-[#2DD4BF] text-white dark:text-[#081229] hover:opacity-90'
                }`}
              >
                <Volume2
                  className={`w-3 h-3 ${playingId === 'custom_device' ? 'animate-bounce' : ''}`}
                />
                <span>{playingId === 'custom_device' ? 'إيقاف' : 'استماع'}</span>
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="text-[10px] font-bold text-[#0D9488] dark:text-[#2DD4BF] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Upload className="w-3 h-3" />
                <span>تغيير الملف الصوتي</span>
              </button>
              <button
                type="button"
                onClick={handleDeleteCustom}
                className="text-[10px] font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>حذف</span>
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="w-full p-2.5 rounded-xl border border-dashed border-[#0D9488]/45 dark:border-[#2DD4BF]/45 bg-white/80 dark:bg-[#0D1831]/75 hover:bg-white dark:hover:bg-[#192D56] text-[#0D9488] dark:text-[#2DD4BF] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition active:scale-98"
          >
            <FolderOpen className="w-4 h-4" />
            <span>
              {isUploading
                ? 'جاري حفظ الملف الصوتي...'
                : 'اختيار صوت إقامة من ذاكرة الموبايل (MP3 / WAV)'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
