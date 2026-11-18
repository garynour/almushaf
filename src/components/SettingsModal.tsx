import React, { useState, useEffect } from 'react';
import {
  Settings,
  X,
  Moon,
  Sun,
  Monitor,
  ShieldCheck,
  Clock,
  Globe,
  Compass,
  BellRing,
} from 'lucide-react';
import { playAthanSound, stopAthanSound, triggerHaptic, stopIqamaSound } from '../utils/audio';
import { IqamaConfig, DEFAULT_IQAMA_CONFIG, PrayerSettings } from '../utils/prayerTimes';
import { IqamaSoundSelector } from './IqamaSoundSelector';
import { NotificationPermissionBanner } from './NotificationPermissionBanner';
import { sendTestPrayerNotification } from '../utils/notificationService';

interface SettingsModalProps {
  onClose: () => void;
  themeMode: 'auto' | 'light' | 'dark';
  onChangeThemeMode: (mode: 'auto' | 'light' | 'dark') => void;
  fontScale: 'normal' | 'large' | 'xlarge';
  onChangeFontScale: (scale: 'normal' | 'large' | 'xlarge') => void;
  prayerSettings: PrayerSettings;
  onOpenLocationSettings: () => void;
  onOpenQibla: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  themeMode,
  onChangeThemeMode,
  fontScale,
  onChangeFontScale,
  prayerSettings,
  onOpenLocationSettings,
  onOpenQibla,
}) => {
  const handleClose = () => {
    stopIqamaSound();
    stopAthanSound();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="w-full max-w-sm bg-white dark:bg-[#0D1833] text-[#0F172A] dark:text-[#F8FAFC] rounded-[28px] border border-[#E5C168]/40 p-5 shadow-2xl relative max-h-[90dvh] overflow-y-auto">
        <button
          onClick={handleClose}
          className="absolute left-4 top-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 dark:text-slate-300 cursor-pointer"
          aria-label="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-3 text-[#0D9488] dark:text-[#E5C168]">
          <Settings className="w-5 h-5" />
          <b className="text-base font-bold">الإعدادات وتثبيت التطبيق</b>
        </div>

        {/* 4 Colorful Circular Quick Actions (Matches Bottom-Right Mockup) */}
        <div className="grid grid-cols-4 gap-2 mb-4 p-2.5 rounded-2xl bg-slate-50 dark:bg-[#132242] border border-slate-200/80 dark:border-white/10 text-center">
          <button
            type="button"
            onClick={() => onChangeThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
            className="flex flex-col items-center gap-1.5 cursor-pointer active:scale-95 transition"
          >
            <span className="w-11 h-11 rounded-full bg-gradient-to-br from-[#FB7185] to-[#E11D48] text-white flex items-center justify-center shadow-md">
              {themeMode === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </span>
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">المظهر</span>
          </button>

          <button
            type="button"
            onClick={() => {
              handleClose();
              onOpenLocationSettings();
            }}
            className="flex flex-col items-center gap-1.5 cursor-pointer active:scale-95 transition"
          >
            <span className="w-11 h-11 rounded-full bg-gradient-to-br from-[#34D399] to-[#0D9488] text-white flex items-center justify-center shadow-md">
              <Globe className="w-5 h-5" />
            </span>
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">المكان</span>
          </button>

          <button
            type="button"
            onClick={() => {
              handleClose();
              onOpenQibla();
            }}
            className="flex flex-col items-center gap-1.5 cursor-pointer active:scale-95 transition"
          >
            <span className="w-11 h-11 rounded-full bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] text-white flex items-center justify-center shadow-md">
              <Compass className="w-5 h-5" />
            </span>
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">القبلة</span>
          </button>

          <button
            type="button"
            onClick={() => void sendTestPrayerNotification('الظهر')}
            className="flex flex-col items-center gap-1.5 cursor-pointer active:scale-95 transition"
          >
            <span className="w-11 h-11 rounded-full bg-gradient-to-br from-[#FBBF24] to-[#D97706] text-white flex items-center justify-center shadow-md">
              <BellRing className="w-5 h-5" />
            </span>
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">إشعار</span>
          </button>
        </div>

        <div className="space-y-4 my-2 text-xs">
          {/* Theme Mode */}
          <div>
            <label className="font-bold text-slate-500 dark:text-slate-400 block mb-1.5">
              مظهر التطبيق
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-[#132242] rounded-2xl border border-slate-200 dark:border-white/10">
              <button
                onClick={() => onChangeThemeMode('auto')}
                className={`py-2 px-2 rounded-xl font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                  themeMode === 'auto'
                    ? 'bg-[#2DD4BF] text-[#051B1E] shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>تلقائي</span>
              </button>
              <button
                onClick={() => onChangeThemeMode('light')}
                className={`py-2 px-2 rounded-xl font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                  themeMode === 'light'
                    ? 'bg-[#2DD4BF] text-[#051B1E] shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>فاتح</span>
              </button>
              <button
                onClick={() => onChangeThemeMode('dark')}
                className={`py-2 px-2 rounded-xl font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                  themeMode === 'dark'
                    ? 'bg-[#2DD4BF] text-[#051B1E] shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>داكن</span>
              </button>
            </div>
          </div>

          {/* Font Scale */}
          <div>
            <label className="font-bold text-slate-500 dark:text-slate-400 block mb-1.5">
              حجم خط القراءة والآيات
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-[#132242] rounded-2xl border border-slate-200 dark:border-white/10">
              {(['normal', 'large', 'xlarge'] as const).map((sc) => (
                <button
                  key={sc}
                  onClick={() => onChangeFontScale(sc)}
                  className={`py-2 px-2 rounded-xl font-bold transition cursor-pointer ${
                    fontScale === sc
                      ? 'bg-[#E5C168] text-[#071124] shadow-xs'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {sc === 'normal' ? 'قياسي' : sc === 'large' ? 'كبير' : 'كبير جداً'}
                </button>
              ))}
            </div>
          </div>

          {/* Location, Country, DST, & Prayer Settings Shortcut */}
          <div className="p-3 bg-slate-50 dark:bg-[#132242] rounded-[20px] border border-slate-200 dark:border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-[#0D9488] dark:text-[#E5C168] font-bold">
              <Globe className="w-4 h-4" />
              <span>المكان والبلد والمواقيت والتوقيت الصيفي</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-300">
              الموقع: <b className="text-[#0F172A] dark:text-white">{prayerSettings.locationName}</b> · الصيفي:{' '}
              <b className="text-[#0F172A] dark:text-white">
                {prayerSettings.dstMode === 'on'
                  ? 'مفعّل (+١ س)'
                  : prayerSettings.dstMode === 'off'
                  ? 'ملغى (شتوي)'
                  : 'تلقائي'}
              </b>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  onOpenLocationSettings();
                }}
                className="py-2 px-2 rounded-xl bg-gradient-to-r from-[#2DD4BF] to-[#0D9488] text-[#051B1E] font-extrabold text-[11px] flex items-center justify-center gap-1 cursor-pointer active:scale-98"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>تعديل المكان والمواقيت</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  onOpenQibla();
                }}
                className="py-2 px-2 rounded-xl bg-white dark:bg-[#0D1833] text-[#0F172A] dark:text-[#E5C168] border border-slate-200 dark:border-white/10 font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer active:scale-98"
              >
                <Compass className="w-3.5 h-3.5 text-[#E5C168]" />
                <span>تخصيص القبلة</span>
              </button>
            </div>
          </div>

          {/* Athan Sounds Selector in Settings */}
          <div>
            <label className="font-bold text-slate-500 dark:text-slate-400 block mb-1.5">
              صوت أذان الصلاة المفضل
            </label>
            <AthanSettingsSelector />
          </div>

          {/* Web Notification API Settings */}
          <div>
            <label className="font-bold text-slate-500 dark:text-slate-400 block mb-1.5">
              إشعارات مواقيت الصلاة (Web Notifications)
            </label>
            <NotificationPermissionBanner compact />
          </div>

          {/* Iqama Reminder Section */}
          <div>
            <label className="font-bold text-slate-500 dark:text-slate-400 block mb-1.5">
              تنبيهات الإقامة وأصوات ذاكرة الهاتف
            </label>
            <IqamaSettingsRow />
          </div>

          <div className="text-center text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5 pt-1">
            <ShieldCheck className="w-4 h-4 text-[#2DD4BF]" />
            <span>يعمل بدون إنترنت · البيانات مخزنة محلياً</span>
          </div>
        </div>

        <button
          onClick={handleClose}
          className="w-full mt-2 bg-gradient-to-r from-[#2DD4BF] to-[#0D9488] text-[#051B1E] font-extrabold text-xs py-3 rounded-2xl transition cursor-pointer active:scale-98 shadow-md"
        >
          حفظ وإغلاق
        </button>
      </div>
    </div>
  );
};

const AthanSettingsSelector: React.FC = () => {
  const [selectedAthanId, setSelectedAthanId] = React.useState<string>(() => {
    try {
      return localStorage.getItem('selected_athan') || 'makkah';
    } catch {
      return 'makkah';
    }
  });
  const [playingAthanId, setPlayingAthanId] = React.useState<string | null>(null);
  const [savedNotice, setSavedNotice] = React.useState<string | null>(null);

  const athanList = [
    { id: 'makkah', title: 'أذان الحرم المكي الشريف' },
    { id: 'madinah', title: 'أذان المسجد النبوي الشريف' },
    { id: 'egypt_ismail', title: 'أذان مصر (الشيخ مصطفى إسماعيل)' },
    { id: 'egypt_minshawi', title: 'أذان مصر (الشيخ المنشاوي)' },
    { id: 'chime', title: 'نغمة أذان وتكبير (بدون إنترنت أوفلاين)' },
  ];

  const handleSelectAthan = (id: string, title: string) => {
    setSelectedAthanId(id);
    try {
      localStorage.setItem('selected_athan', id);
      window.dispatchEvent(new Event('athan_storage_updated'));
    } catch {}
    setSavedNotice(`تم حفظ "${title}" كـ صوت الأذان المعتمد ✓`);
    setTimeout(() => setSavedNotice(null), 3000);
    triggerHaptic(20);
  };

  const handleTogglePlayAthan = (id: string) => {
    if (playingAthanId === id) {
      stopAthanSound();
      setPlayingAthanId(null);
    } else {
      stopAthanSound();
      setPlayingAthanId(id);
      playAthanSound(id, () => {
        setPlayingAthanId(null);
      });
      triggerHaptic(20);
    }
  };

  return (
    <div className="space-y-1.5 p-2 bg-slate-50 dark:bg-[#132242] rounded-[20px] border border-slate-200 dark:border-white/10">
      {savedNotice && (
        <div className="p-2 bg-teal-50 dark:bg-[#2DD4BF]/15 text-teal-800 dark:text-[#5EEAD4] rounded-xl text-[11px] font-bold text-center border border-[#2DD4BF]/40">
          {savedNotice}
        </div>
      )}
      {athanList.map((item) => {
        const isSelected = selectedAthanId === item.id;
        const isPlaying = playingAthanId === item.id;

        return (
          <div
            key={item.id}
            onClick={() => handleSelectAthan(item.id, item.title)}
            className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition ${
              isSelected
                ? 'bg-white dark:bg-[#1A2F5A] border border-[#0D9488] dark:border-[#2DD4BF] shadow-xs'
                : 'hover:bg-white/60 dark:hover:bg-[#0D1833]'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 ${
                  isSelected
                    ? 'border-[#0D9488] bg-[#0D9488] dark:border-[#2DD4BF] dark:bg-[#2DD4BF]'
                    : 'border-slate-400'
                }`}
              >
                {isSelected && <span className="w-1 h-1 rounded-full bg-white dark:bg-[#051B1E]" />}
              </span>
              <span className="text-xs font-bold truncate">{item.title}</span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleTogglePlayAthan(item.id);
              }}
              className={`px-2 py-1 rounded-lg border text-[10px] font-bold cursor-pointer transition ${
                isPlaying
                  ? 'bg-[#2DD4BF] text-[#051B1E] border-[#2DD4BF]'
                  : 'border-[#E5C168]/50 text-[#0D9488] dark:text-[#E5C168] hover:bg-black/5'
              }`}
            >
              {isPlaying ? 'إيقاف' : 'استماع'}
            </button>
          </div>
        );
      })}
    </div>
  );
};

const IqamaSettingsRow: React.FC = () => {
  const [iqamaCfg, setIqamaCfg] = useState<IqamaConfig>(() => {
    try {
      const s = localStorage.getItem('iqama_config');
      return s ? JSON.parse(s) : DEFAULT_IQAMA_CONFIG;
    } catch {
      return DEFAULT_IQAMA_CONFIG;
    }
  });

  useEffect(() => {
    const handleUpdate = () => {
      try {
        const s = localStorage.getItem('iqama_config');
        if (s) setIqamaCfg(JSON.parse(s));
      } catch {}
    };
    window.addEventListener('iqama_config_updated', handleUpdate);
    return () => window.removeEventListener('iqama_config_updated', handleUpdate);
  }, []);

  const handleToggle = () => {
    const next = { ...iqamaCfg, enabled: !iqamaCfg.enabled };
    setIqamaCfg(next);
    try {
      localStorage.setItem('iqama_config', JSON.stringify(next));
      window.dispatchEvent(new Event('iqama_config_updated'));
    } catch {}
    triggerHaptic(15);
  };

  return (
    <div className="space-y-2">
      <div className="p-2.5 bg-slate-50 dark:bg-[#132242] border border-slate-200 dark:border-white/10 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#0D9488] dark:text-[#E5C168]" />
          <div>
            <b className="text-xs font-bold block">تنبيه مواعيد الإقامة</b>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              {iqamaCfg.enabled ? 'مفعّل مع تنبيه صوتي واهتزاز' : 'معطّل'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggle}
          className={`w-10 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition ${
            iqamaCfg.enabled
              ? 'bg-[#0D9488] dark:bg-[#2DD4BF] justify-end'
              : 'bg-gray-300 dark:bg-gray-700 justify-start'
          }`}
        >
          <span className="w-3.5 h-3.5 rounded-full bg-white shadow-xs block" />
        </button>
      </div>

      <IqamaSoundSelector compact />
    </div>
  );
};
