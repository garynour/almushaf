/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { ViewType, Bookmark, Reciter } from './types';
import {
  calculatePrayerTimes,
  getNextPrayer,
  DayPrayerTimes,
  NextPrayerInfo,
  PrayerSettings,
  loadPrayerSettings,
  savePrayerSettings,
} from './utils/prayerTimes';
import { RECITERS_LIST, getSurahAudioUrl } from './data/recitersData';
import { SURAHS_LIST, preloadFullQuranOffline } from './data/quranData';
import { HeaderSky } from './components/HeaderSky';
import { HomePrayerCard } from './components/HomePrayerCard';
import { QuickGrid } from './components/QuickGrid';
import { AyahOfTheDayCard } from './components/AyahOfTheDayCard';
import { BottomNav } from './components/BottomNav';
import { QuranHub } from './components/QuranHub';
import { MushafReader } from './components/MushafReader';
import { PrayerTimesScreen } from './components/PrayerTimesScreen';
import { AdhkarScreen } from './components/AdhkarScreen';
import { HadithScreen } from './components/HadithScreen';
import { QiblaModal } from './components/QiblaModal';
import { PrayerTrackerModal } from './components/PrayerTrackerModal';
import { KhatmaTrackerModal } from './components/KhatmaTrackerModal';
import { SettingsModal } from './components/SettingsModal';
import { LocationPrayerSettingsModal } from './components/LocationPrayerSettingsModal';
import { AudioPlayerBar } from './components/AudioPlayerBar';
import { TajweedScreen } from './components/TajweedScreen';
import { OfflineIndicator } from './components/OfflineIndicator';
import { triggerHaptic, prefetchAthan } from './utils/audio';
import {
  InAppAlertBanner,
  NotificationServicePrefs,
  buildDailyNotificationSchedule,
  getNextScheduledEvent,
  loadIqamaConfigSafe,
  loadNotificationPrefs,
  processDuePrayerNotifications,
  stopAllPrayerAlertAudio,
  syncPrayerScheduleToServiceWorker,
} from './utils/notificationService';
import { IqamaConfig } from './utils/prayerTimes';
import {
  initNativeNotificationListeners,
  isNativeApp,
  refreshNativePermission,
} from './utils/nativeNotifications';
import { getDeviceCoords, locationErrorMessage, LocationError } from './utils/location';
import { BellRing, VolumeX, X } from 'lucide-react';


const FONT_SCALE_VALUES = { normal: 1, large: 1.15, xlarge: 1.3 } as const;
type FontScale = keyof typeof FONT_SCALE_VALUES;

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [activeModal, setActiveModal] = useState<
    'qibla' | 'tracker' | 'khatma' | 'settings' | 'more' | 'location' | null
  >(null);

  // Mushaf Reader specific navigation state
  const [mushafPage, setMushafPage] = useState<number>(1);
  const [targetSurahNum, setTargetSurahNum] = useState<number | undefined>(undefined);
  const [targetAyahNum, setTargetAyahNum] = useState<number | undefined>(undefined);
  const [mushafControlsVisible, setMushafControlsVisible] = useState<boolean>(true);
  const [mushafOverlayOpen, setMushafOverlayOpen] = useState<boolean>(false);
  const [closeMushafOverlaySignal, setCloseMushafOverlaySignal] = useState<number>(0);

  useEffect(() => {
    preloadFullQuranOffline();
  }, []);

  // Settings & Theme (Midnight Navy Dark matching the luxury design is default, toggleable to Light)
  const [themeMode, setThemeMode] = useState<'auto' | 'light' | 'dark'>(() => {
    try {
      return (localStorage.getItem('theme_mode') as any) || 'dark';
    } catch (e) {
      return 'dark';
    }
  });

  const [fontScale, setFontScaleState] = useState<FontScale>(() => {
    try {
      const v = localStorage.getItem('font_scale');
      return v === 'large' || v === 'xlarge' ? v : 'normal';
    } catch (e) {
      return 'normal';
    }
  });

  const setFontScale = (v: FontScale) => {
    setFontScaleState(v);
    try {
      localStorage.setItem('font_scale', v);
    } catch (e) {}
  };

  // Applies to all rem-based text and to the Mushaf text (see --font-scale in index.css / MushafReader)
  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', String(FONT_SCALE_VALUES[fontScale]));
  }, [fontScale]);

  // Location, Coordinates, DST, Timezone & Prayer Calculation Settings
  const [prayerSettings, setPrayerSettings] = useState<PrayerSettings>(() => loadPrayerSettings());
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);
  const gpsRequestSeqRef = useRef<number>(0);

  const handleUpdatePrayerSettings = (next: PrayerSettings) => {
    if (next.locationMode === 'manual') {
      // Cancel any in-flight async GPS callback from reverting manual choice
      gpsRequestSeqRef.current += 1;
    }
    savePrayerSettings(next);
    setPrayerSettings(next);
  };

  const coords = { lat: prayerSettings.lat, lng: prayerSettings.lng };
  const locationName = prayerSettings.locationName;
  const calcMethod = prayerSettings.calcMethod;

  // Prayer notifications
  const [notifications, setNotifications] = useState<Record<string, boolean>>(() => {
    try {
      const s = localStorage.getItem('prayer_notifications');
      return s ? JSON.parse(s) : { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true };
    } catch (e) {
      return { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true };
    }
  });

  // Last read & bookmarks
  const [lastRead, setLastRead] = useState<{
    surahName: string;
    page: number;
    ayah: number;
  } | null>(() => {
    try {
      const s = localStorage.getItem('last_read_position');
      return s ? JSON.parse(s) : { surahName: 'الفاتحة', page: 1, ayah: 1 };
    } catch (e) {
      return null;
    }
  });

  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => {
    try {
      const s = localStorage.getItem('quran_bookmarks');
      return s ? JSON.parse(s) : [];
    } catch (e) {
      return [];
    }
  });

  // Audio reciter state
  const [activeReciter, setActiveReciter] = useState<Reciter>(RECITERS_LIST[0]);
  const [audioSurahNumber, setAudioSurahNumber] = useState<number>(1);
  const [isPlayingRecitation, setIsPlayingRecitation] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeAudioBlobUrlRef = useRef<string | null>(null);
  const loadedAudioKeyRef = useRef<string | null>(null); // `${reciterId}:${surah}` currently loaded in audioRef
  const [hasActiveAudio, setHasActiveAudio] = useState<boolean>(false);

  // Android Hardware Back Button / Gesture History Stack Sync
  const pushedDepthRef = useRef<number>(0);
  const skipPopCountRef = useRef<number>(0);
  const isPoppingRef = useRef<boolean>(false);
  const navSnapshotRef = useRef({
    currentView,
    activeModal,
    mushafOverlayOpen,
  });
  navSnapshotRef.current = { currentView, activeModal, mushafOverlayOpen };

  const computeNavDepth = (
    view: ViewType,
    modal: typeof activeModal,
    overlayOpen: boolean
  ): number => {
    const viewDepth = view === 'mushaf' ? 2 : view !== 'home' ? 1 : 0;
    const modalDepth = modal !== null ? 1 : 0;
    const overlayDepth = view === 'mushaf' && overlayOpen ? 1 : 0;
    return viewDepth + modalDepth + overlayDepth;
  };

  useEffect(() => {
    const targetDepth = computeNavDepth(currentView, activeModal, mushafOverlayOpen);

    if (isPoppingRef.current) {
      isPoppingRef.current = false;
      pushedDepthRef.current = Math.min(pushedDepthRef.current, targetDepth);
      return;
    }

    while (pushedDepthRef.current < targetDepth) {
      pushedDepthRef.current += 1;
      window.history.pushState({ quranNavDepth: pushedDepthRef.current }, '');
    }

    while (pushedDepthRef.current > targetDepth) {
      pushedDepthRef.current -= 1;
      skipPopCountRef.current += 1;
      window.history.back();
    }
  }, [currentView, activeModal, mushafOverlayOpen]);

  useEffect(() => {
    const onPopState = () => {
      if (skipPopCountRef.current > 0) {
        skipPopCountRef.current -= 1;
        return;
      }

      const snap = navSnapshotRef.current;
      isPoppingRef.current = true;
      pushedDepthRef.current = Math.max(0, pushedDepthRef.current - 1);

      if (snap.activeModal !== null) {
        setActiveModal(null);
      } else if (snap.currentView === 'mushaf' && snap.mushafOverlayOpen) {
        setCloseMushafOverlaySignal((s) => s + 1);
      } else if (snap.currentView === 'mushaf') {
        setCurrentView('quran');
      } else if (snap.currentView !== 'home') {
        setCurrentView('home');
      } else {
        isPoppingRef.current = false;
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Android app: handle the system back button / back gesture ourselves (Capacitor App plugin),
  // so it closes the top-most layer first and only leaves the app from the home screen.
  useEffect(() => {
    if (!isNativeApp()) return;
    let cancelled = false;
    let removeListener: (() => void) | undefined;
    void import('@capacitor/app')
      .then(async ({ App: CapApp }) => {
        const handle = await CapApp.addListener('backButton', () => {
          const snap = navSnapshotRef.current;
          if (snap.activeModal !== null) {
            setActiveModal(null);
          } else if (snap.currentView === 'mushaf' && snap.mushafOverlayOpen) {
            setCloseMushafOverlaySignal((s) => s + 1);
          } else if (snap.currentView === 'mushaf') {
            setCurrentView('quran');
          } else if (snap.currentView !== 'home') {
            setCurrentView('home');
          } else {
            void CapApp.exitApp();
          }
        });
        if (cancelled) handle.remove();
        else removeListener = () => handle.remove();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      removeListener?.();
    };
  }, []);

  // Live clock. It ticks every second only on screens that show a countdown (home / prayer).
  // On every other screen (Mushaf, adhkar...) it only checks once a minute whether the day
  // changed and does NOT re-render otherwise, so reading is no longer re-rendered every second.
  const [now, setNow] = useState(() => new Date());
  const needsLiveClock = currentView === 'home' || currentView === 'prayer';

  useEffect(() => {
    const sameDay = (x: Date, y: Date) =>
      x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();

    if (needsLiveClock) {
      setNow(new Date());
      const timer = setInterval(() => setNow(new Date()), 1000);
      return () => clearInterval(timer);
    }
    const timer = setInterval(() => {
      setNow((prev) => {
        const next = new Date();
        return sameDay(prev, next) ? prev : next;
      });
    }, 60000);
    return () => clearInterval(timer);
  }, [needsLiveClock]);

  // Prayer times only change once a day (or when settings change): compute them once per day,
  // using noon of that day so DST is resolved for the day itself, not for the current second.
  const dayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

  const prayerTimes: DayPrayerTimes = React.useMemo(() => {
    const noon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
    return calculatePrayerTimes(coords.lat, coords.lng, noon, calcMethod, {
      madhhab: prayerSettings.madhhab,
      dstMode: prayerSettings.dstMode,
      timezoneMode: prayerSettings.timezoneMode,
      manualTimezoneOffset: prayerSettings.manualTimezoneOffset,
      ianaTimezone: prayerSettings.ianaTimezone,
      manualOffsets: prayerSettings.manualOffsets,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords.lat, coords.lng, dayKey, calcMethod, prayerSettings]);

  const tomorrowPrayerTimes: DayPrayerTimes = React.useMemo(() => {
    const noon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12, 0, 0);
    return calculatePrayerTimes(coords.lat, coords.lng, noon, calcMethod, {
      madhhab: prayerSettings.madhhab,
      dstMode: prayerSettings.dstMode,
      timezoneMode: prayerSettings.timezoneMode,
      manualTimezoneOffset: prayerSettings.manualTimezoneOffset,
      ianaTimezone: prayerSettings.ianaTimezone,
      manualOffsets: prayerSettings.manualOffsets,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords.lat, coords.lng, dayKey, calcMethod, prayerSettings]);

  const nextPrayer: NextPrayerInfo = React.useMemo(() => {
    return getNextPrayer(prayerTimes, now, tomorrowPrayerTimes);
  }, [prayerTimes, tomorrowPrayerTimes, now]);

  // Local Web Notification Service state & scheduler
  const [notifPrefs, setNotifPrefs] = useState<NotificationServicePrefs>(() => loadNotificationPrefs());
  const [iqamaConfig, setIqamaConfig] = useState<IqamaConfig>(() => loadIqamaConfigSafe());
  const [activePrayerAlert, setActivePrayerAlert] = useState<InAppAlertBanner | null>(null);

  useEffect(() => {
    const syncNotifPrefs = () => setNotifPrefs(loadNotificationPrefs());
    const syncIqamaCfg = () => setIqamaConfig(loadIqamaConfigSafe());
    window.addEventListener('notification_prefs_updated', syncNotifPrefs);
    window.addEventListener('iqama_config_updated', syncIqamaCfg);
    return () => {
      window.removeEventListener('notification_prefs_updated', syncNotifPrefs);
      window.removeEventListener('iqama_config_updated', syncIqamaCfg);
    };
  }, []);

  // Native Android app: notification permission state, tap-to-open, status bar icon colour.
  // Web: pre-download the selected athan so it also plays offline.
  useEffect(() => {
    if (isNativeApp()) {
      void refreshNativePermission().then(() => window.dispatchEvent(new Event('notification_prefs_updated')));
      void initNativeNotificationListeners(() => setCurrentView('prayer'));
      // The window behind the status bar is always dark navy, so keep the bar icons light.
      void import('@capacitor/core')
        .then(({ SystemBars, SystemBarsStyle }) => SystemBars.setStyle({ style: SystemBarsStyle.Dark }))
        .catch(() => {});
    } else {
      const t = window.setTimeout(() => prefetchAthan(), 5000);
      return () => window.clearTimeout(t);
    }
  }, []);

  // Service Worker message listener (e.g., notification click / stop audio button)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'STOP_PRAYER_AUDIO') {
        stopAllPrayerAlertAudio();
        setActivePrayerAlert(null);
      } else if (event.data?.type === 'OPEN_PRAYER_VIEW') {
        setCurrentView('prayer');
      }
    };
    navigator.serviceWorker.addEventListener('message', handleSwMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleSwMessage);
  }, []);

  // Scheduled local Web Notifications check (exact timeout + fallback interval + visibility wake)
  useEffect(() => {
    if (!notifPrefs.enabled) return;

    const runCheck = () => {
      const currentNow = new Date();
      const currentTimes = calculatePrayerTimes(coords.lat, coords.lng, currentNow, calcMethod, {
        madhhab: prayerSettings.madhhab,
        dstMode: prayerSettings.dstMode,
        timezoneMode: prayerSettings.timezoneMode,
        manualTimezoneOffset: prayerSettings.manualTimezoneOffset,
        ianaTimezone: prayerSettings.ianaTimezone,
        manualOffsets: prayerSettings.manualOffsets,
      });

      void processDuePrayerNotifications({
        now: currentNow,
        prayerTimes: currentTimes,
        enabledPrayers: notifications,
        iqamaConfig,
        prefs: notifPrefs,
        onInAppAlert: (alert) => {
          setActivePrayerAlert(alert);
        },
      });
    };

    runCheck();

    // Schedule exact timeout for the next prayer/iqama event
    const checkDate = new Date();
    const todaySchedule = buildDailyNotificationSchedule(
      prayerTimes,
      notifications,
      iqamaConfig,
      notifPrefs,
      checkDate
    );
    const nextEvt = getNextScheduledEvent(todaySchedule, checkDate);
    let exactTimer: number | undefined;
    if (nextEvt && nextEvt.secondsUntil > 0 && nextEvt.secondsUntil < 86400) {
      exactTimer = window.setTimeout(runCheck, nextEvt.secondsUntil * 1000 + 250);
    }

    const intervalId = window.setInterval(runCheck, 10000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runCheck();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      if (exactTimer !== undefined) clearTimeout(exactTimer);
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [coords.lat, coords.lng, calcMethod, prayerSettings, notifications, iqamaConfig, notifPrefs, prayerTimes.fajr.timeStr]);

  // Synchronize Prayer Schedule & Preferences to IndexedDB + Background Service Worker
  useEffect(() => {
    const syncToSw = () => {
      void syncPrayerScheduleToServiceWorker({
        prayerSettings,
        enabledPrayers: notifications,
        iqamaConfig,
        notifPrefs,
      });
    };
    syncToSw();
    window.addEventListener('request_prayer_bg_sync', syncToSw);
    return () => window.removeEventListener('request_prayer_bg_sync', syncToSw);
  }, [prayerSettings, notifications, iqamaConfig, notifPrefs]);

  // Apply Dark Mode
  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else if (themeMode === 'light') {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    } else {
      // Auto: system preference
      const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isSystemDark) {
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
      } else {
        root.classList.remove('dark');
        root.setAttribute('data-theme', 'light');
      }
    }
  }, [themeMode]);

  const handleChangeTheme = (mode: 'auto' | 'light' | 'dark') => {
    setThemeMode(mode);
    try {
      localStorage.setItem('theme_mode', mode);
    } catch (e) {}
  };

  const handleToggleTheme = () => {
    const next = themeMode === 'dark' ? 'light' : 'dark';
    handleChangeTheme(next);
    triggerHaptic(15);
  };


  const handleRefreshLocation = async () => {
    const seq = ++gpsRequestSeqRef.current;
    setGpsStatus('جاري تحديد موقعك عبر GPS...');
    try {
      const { lat, lng } = await getDeviceCoords();
      // A manual city choice made while we were waiting cancels this GPS result.
      if (gpsRequestSeqRef.current !== seq) return;
      setPrayerSettings((prev) => {
        const next: PrayerSettings = {
          ...prev,
          locationMode: 'auto',
          lat,
          lng,
          locationName: 'موقعي الحالي (GPS)',
          timezoneMode: 'auto',
          ianaTimezone: undefined,
        };
        savePrayerSettings(next);
        return next;
      });
      setGpsStatus('تم تحديث الإحداثيات بنجاح ✓');
      triggerHaptic(20);
    } catch (e) {
      if (gpsRequestSeqRef.current !== seq) return;
      setGpsStatus(locationErrorMessage(e instanceof LocationError ? e.kind : 'unavailable'));
    }
  };

  const handleToggleNotification = (key: string) => {
    const next = { ...notifications, [key]: !notifications[key] };
    setNotifications(next);
    try {
      localStorage.setItem('prayer_notifications', JSON.stringify(next));
    } catch (e) {}
  };

  const handleSaveBookmark = (page: number, surahNumber: number, surahName: string, ayahNumber: number) => {
    const existingIdx = bookmarks.findIndex((b) => b.page === page);
    let next: Bookmark[];
    if (existingIdx >= 0) {
      next = bookmarks.filter((_, i) => i !== existingIdx);
    } else {
      const todayStr = new Date().toLocaleDateString('ar-EG', {
        day: 'numeric',
        month: 'short',
      });
      next = [
        {
          id: `${page}_${ayahNumber}_${Date.now()}`,
          page,
          surahNumber,
          surahName,
          ayahNumber,
          dateStr: todayStr,
        },
        ...bookmarks,
      ];
    }
    setBookmarks(next);
    try {
      localStorage.setItem('quran_bookmarks', JSON.stringify(next));
    } catch (e) {}
  };

  const handleRemoveBookmark = (id: string) => {
    const next = bookmarks.filter((b) => b.id !== id);
    setBookmarks(next);
    try {
      localStorage.setItem('quran_bookmarks', JSON.stringify(next));
    } catch (e) {}
  };

  const handleUpdateLastRead = (surahName: string, page: number, ayah: number) => {
    const item = { surahName, page, ayah };
    setLastRead(item);
    try {
      localStorage.setItem('last_read_position', JSON.stringify(item));
    } catch (e) {}
  };

  // Open Quran Reader at specific page
  const handleOpenMushaf = (page: number, surahNumber?: number, ayahNumber?: number) => {
    setMushafPage(page);
    setTargetSurahNum(surahNumber);
    setTargetAyahNum(ayahNumber);
    setMushafControlsVisible(true);
    setCurrentView('mushaf');
    triggerHaptic(15);
  };

  // Reciter Audio Player management (supports offline CacheStorage fallback)
  const ensureAudioElement = (): HTMLAudioElement => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.onended = () => {
        setIsPlayingRecitation(false);
        setHasActiveAudio(false);
        loadedAudioKeyRef.current = null;
      };
      audio.onerror = () => {
        setIsPlayingRecitation(false);
      };
      audioRef.current = audio;
    }
    return audioRef.current;
  };

  const stopRecitation = () => {
    audioRef.current?.pause();
    setIsPlayingRecitation(false);
    setHasActiveAudio(false);
    loadedAudioKeyRef.current = null;
    if (activeAudioBlobUrlRef.current) {
      URL.revokeObjectURL(activeAudioBlobUrlRef.current);
      activeAudioBlobUrlRef.current = null;
    }
  };

  const resumeRecitation = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio
      .play()
      .then(() => setIsPlayingRecitation(true))
      .catch(() => setIsPlayingRecitation(false));
  };

  const handleTogglePlayReciter = async (reciter: Reciter, surahNumber: number) => {
    const key = `${reciter.id}:${surahNumber}`;

    // Same surah already loaded: pause, or resume from the same position (never restart).
    if (loadedAudioKeyRef.current === key && audioRef.current) {
      if (isPlayingRecitation) {
        audioRef.current.pause();
        setIsPlayingRecitation(false);
      } else {
        setHasActiveAudio(true);
        resumeRecitation();
      }
      return;
    }

    setActiveReciter(reciter);
    setAudioSurahNumber(surahNumber);
    const remoteUrl = getSurahAudioUrl(reciter, surahNumber);
    let playSrc = remoteUrl;

    if (activeAudioBlobUrlRef.current) {
      URL.revokeObjectURL(activeAudioBlobUrlRef.current);
      activeAudioBlobUrlRef.current = null;
    }

    try {
      if ('caches' in window) {
        const cache = await caches.open('quran-offline-reciters');
        const cachedRes = await cache.match(remoteUrl);
        if (cachedRes) {
          const blob = await cachedRes.blob();
          const blobUrl = URL.createObjectURL(blob);
          activeAudioBlobUrlRef.current = blobUrl;
          playSrc = blobUrl;
        }
      }
    } catch {}

    const audio = ensureAudioElement();
    audio.src = playSrc;
    loadedAudioKeyRef.current = key;
    setHasActiveAudio(true);
    setIsPlayingRecitation(true);
    audio.play().catch(() => {
      setIsPlayingRecitation(false);
      setHasActiveAudio(false);
      loadedAudioKeyRef.current = null;
    });
  };

  const currentPlayingSurahName =
    SURAHS_LIST.find((s) => s.number === audioSurahNumber)?.name || 'الفاتحة';

  // Lock-screen / notification-shade controls for the recitation
  useEffect(() => {
    if (!hasActiveAudio || typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `سورة ${currentPlayingSurahName}`,
        artist: activeReciter.name,
        album: 'المصحف',
      });
      navigator.mediaSession.playbackState = isPlayingRecitation ? 'playing' : 'paused';
      navigator.mediaSession.setActionHandler('play', () => resumeRecitation());
      navigator.mediaSession.setActionHandler('pause', () => {
        audioRef.current?.pause();
        setIsPlayingRecitation(false);
      });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActiveAudio, isPlayingRecitation, audioSurahNumber, activeReciter]);

  return (
    <div className={`flex justify-center min-h-[100dvh] ${themeMode === 'dark' ? 'bg-[#060B18]' : 'bg-[#E5EBF3]'} text-[#0F172A] font-cairo transition-colors duration-300`}>
      {/* Mobile-first frame (max-w-[480px] centered, edge-to-edge on mobile) */}
      <div className="w-full max-w-[480px] min-h-[100dvh] h-[100dvh] flex flex-col bg-[#F4F6FA] dark:bg-[#0A1328] islamic-bg-pattern text-[#0F172A] dark:text-[#F8FAFC] shadow-2xl sm:border-x sm:border-[#D4AF37]/20 relative overflow-hidden transition-colors duration-300">
        <OfflineIndicator />

        {/* Active Local Prayer / Iqama Notification Banner */}
        {activePrayerAlert && (
          <div className="absolute top-3 left-3 right-3 z-50 bg-[#0D1A35] text-[#F8FAFC] border-2 border-[#2DD4BF] rounded-2xl p-3 shadow-2xl animate-in slide-in-from-top duration-300">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#2DD4BF]/20 text-[#2DD4BF] flex items-center justify-center shrink-0">
                  <BellRing className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <b className="text-xs font-extrabold text-[#E5C168] block">
                    {activePrayerAlert.title}
                  </b>
                  <p className="text-[11px] text-[#CBD5E1] mt-0.5 leading-snug">
                    {activePrayerAlert.body}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  stopAllPrayerAlertAudio();
                  setActivePrayerAlert(null);
                }}
                className="p-1 rounded-full hover:bg-white/10 text-[#CBD5E1] cursor-pointer shrink-0"
                aria-label="إغلاق التنبيه"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  stopAllPrayerAlertAudio();
                  setActivePrayerAlert(null);
                }}
                className="flex-1 py-1.5 px-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-400/30 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
              >
                <VolumeX className="w-3.5 h-3.5" />
                <span>إيقاف الصوت وإغلاق</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentView('prayer');
                  setActivePrayerAlert(null);
                }}
                className="py-1.5 px-3 rounded-xl bg-[#2DD4BF] text-[#071124] text-[11px] font-extrabold cursor-pointer"
              >
                المواقيت
              </button>
            </div>
          </div>
        )}

        {/* Main Views Container */}
        <div
          className={`flex-1 flex flex-col min-h-0 overflow-x-hidden ${
            currentView === 'mushaf' ? 'overflow-hidden' : 'overflow-y-auto'
          }`}
        >
          {currentView === 'home' && (
            <div className="flex flex-col flex-1 justify-between pb-3">
              <div>
                {/* Midnight Navy Hero Header with Glowing Circular Countdown */}
                <HeaderSky
                  nextPrayer={nextPrayer}
                  prayerTimes={prayerTimes}
                  locationName={locationName}
                  onOpenSettings={() => setActiveModal('settings')}
                  onOpenLocationSettings={() => setActiveModal('location')}
                  onSelectPrayerTab={() => setCurrentView('prayer')}
                  themeMode={themeMode}
                  onToggleTheme={handleToggleTheme}
                />

                {/* Fluid Prayer Times 5-Slots Row */}
                <HomePrayerCard
                  prayerTimes={prayerTimes}
                  nextIndex={nextPrayer.index}
                  onPrayerClick={() => setCurrentView('prayer')}
                />

                {/* Fluid Colorful 8-Section Grid */}
                <QuickGrid
                  onNavigate={(v) => setCurrentView(v)}
                  onOpenModal={(m) => setActiveModal(m)}
                />
              </div>

              {/* Ayah Of The Day Card */}
              <AyahOfTheDayCard onOpenMushafPage={handleOpenMushaf} />
            </div>
          )}

          {currentView === 'quran' && (
            <QuranHub
              onOpenMushaf={handleOpenMushaf}
              lastRead={lastRead}
              bookmarks={bookmarks}
              onRemoveBookmark={handleRemoveBookmark}
              activeReciter={activeReciter}
              isPlayingRecitation={isPlayingRecitation}
              onTogglePlayReciter={handleTogglePlayReciter}
            />
          )}

          {currentView === 'mushaf' && (
            <MushafReader
              initialPage={mushafPage}
              targetSurah={targetSurahNum}
              targetAyah={targetAyahNum}
              onBack={() => setCurrentView('quran')}
              onSaveBookmark={handleSaveBookmark}
              bookmarks={bookmarks}
              onUpdateLastRead={handleUpdateLastRead}
              currentTheme={themeMode}
              onToggleTheme={handleToggleTheme}
              activeReciter={activeReciter}
              isPlayingRecitation={isPlayingRecitation}
              audioSurahNumber={audioSurahNumber}
              onTogglePlayReciter={handleTogglePlayReciter}
              controlsVisible={mushafControlsVisible}
              onControlsVisibleChange={setMushafControlsVisible}
              onOverlayOpenChange={setMushafOverlayOpen}
              closeOverlaySignal={closeMushafOverlaySignal}
            />
          )}

          {currentView === 'prayer' && (
            <PrayerTimesScreen
              prayerTimes={prayerTimes}
              nextPrayer={nextPrayer}
              locationName={locationName}
              onRefreshLocation={handleRefreshLocation}
              calcMethod={calcMethod}
              onChangeCalcMethod={(m) => {
                handleUpdatePrayerSettings({ ...prayerSettings, calcMethod: m });
              }}
              notifications={notifications}
              onToggleNotification={handleToggleNotification}
              prayerSettings={prayerSettings}
              onUpdatePrayerSettings={handleUpdatePrayerSettings}
              onOpenLocationSettings={() => setActiveModal('location')}
            />
          )}

          {currentView === 'adhkar' && <AdhkarScreen />}

          {currentView === 'hadith' && <HadithScreen />}

          {currentView === 'tajweed' && (
            <TajweedScreen
              onBack={() => setCurrentView('home')}
              onOpenMushaf={handleOpenMushaf}
            />
          )}
        </div>

        {/* Floating Reciter Audio Player (Hidden during Mushaf view since MushafReader has integrated pill controls) */}
        {hasActiveAudio && currentView !== 'mushaf' && (
          <AudioPlayerBar
            reciter={activeReciter}
            surahName={currentPlayingSurahName}
            isPlaying={isPlayingRecitation}
            onTogglePlay={() => {
              if (isPlayingRecitation) {
                audioRef.current?.pause();
                setIsPlayingRecitation(false);
              } else {
                resumeRecitation();
              }
            }}
            onClose={stopRecitation}
          />
        )}

        {/* Bottom Navigation Bar (Auto-hides cleanly in Mushaf reading mode) */}
        <div
          className={
            currentView === 'mushaf'
              ? `absolute bottom-0 left-0 right-0 z-30 transition-all duration-300 ease-out ${
                  mushafControlsVisible
                    ? 'translate-y-0 opacity-100 pointer-events-auto'
                    : 'translate-y-full opacity-0 pointer-events-none'
                }`
              : 'shrink-0'
          }
        >
          <BottomNav
            currentView={currentView}
            onNavigate={(v) => {
              setCurrentView(v);
              triggerHaptic(10);
            }}
            onOpenMore={() => setActiveModal('more')}
          />
        </div>

        {/* Modals & Dialogs */}
        {activeModal === 'qibla' && (
          <QiblaModal
            lat={coords.lat}
            lng={coords.lng}
            locationName={locationName}
            onOpenLocationSettings={() => setActiveModal('location')}
            onNavigateView={(v) => {
              setActiveModal(null);
              setCurrentView(v);
            }}
            onOpenMore={() => setActiveModal('more')}
            onClose={() => setActiveModal(null)}
          />
        )}

        {activeModal === 'tracker' && (
          <PrayerTrackerModal onClose={() => setActiveModal(null)} />
        )}

        {activeModal === 'khatma' && (
          <KhatmaTrackerModal
            currentPage={mushafPage}
            onClose={() => setActiveModal(null)}
            onOpenPage={handleOpenMushaf}
          />
        )}

        {activeModal === 'settings' && (
          <SettingsModal
            onClose={() => setActiveModal(null)}
            themeMode={themeMode}
            onChangeThemeMode={handleChangeTheme}
            fontScale={fontScale}
            onChangeFontScale={setFontScale}
            prayerSettings={prayerSettings}
            onOpenLocationSettings={() => setActiveModal('location')}
            onOpenQibla={() => setActiveModal('qibla')}
          />
        )}

        {activeModal === 'location' && (
          <LocationPrayerSettingsModal
            settings={prayerSettings}
            onUpdateSettings={handleUpdatePrayerSettings}
            onRequestGpsLocation={handleRefreshLocation}
            gpsStatus={gpsStatus}
            onClose={() => setActiveModal(null)}
          />
        )}

        {activeModal === 'more' && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 bg-black/70 backdrop-blur-xs">
            <div className="w-full max-w-sm bg-white dark:bg-[#132242] text-[#0F172A] dark:text-[#F8FAFC] rounded-3xl border border-[#2DD4BF]/50 p-4 shadow-2xl relative animate-in slide-in-from-bottom duration-200">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-white/10 mb-3">
                <b className="text-sm font-bold text-[#0D9488] dark:text-[#E5C168]">
                  المزيد من الأقسام والخدمات
                </b>
                <button
                  onClick={() => setActiveModal(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                  aria-label="إغلاق"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs font-bold">
                <button
                  onClick={() => setActiveModal('qibla')}
                  className="p-3 bg-teal-50 dark:bg-[#1A2D55] text-teal-800 dark:text-[#2DD4BF] rounded-2xl text-center border border-teal-200/70 dark:border-[#2DD4BF]/25 transition cursor-pointer active:scale-95"
                >
                  🧭 بوصلة القبلة
                </button>
                <button
                  onClick={() => setActiveModal('tracker')}
                  className="p-3 bg-sky-50 dark:bg-[#1A2D55] text-sky-800 dark:text-sky-300 rounded-2xl text-center border border-sky-200/70 dark:border-sky-400/25 transition cursor-pointer active:scale-95"
                >
                  📋 متتبع الصلوات
                </button>
                <button
                  onClick={() => setActiveModal('khatma')}
                  className="p-3 bg-emerald-50 dark:bg-[#1A2D55] text-emerald-800 dark:text-emerald-300 rounded-2xl text-center border border-emerald-200/70 dark:border-emerald-400/25 transition cursor-pointer active:scale-95"
                >
                  📖 متابعة الختمة
                </button>
                <button
                  onClick={() => {
                    setCurrentView('tajweed');
                    setActiveModal(null);
                  }}
                  className="p-3 bg-violet-50 dark:bg-[#1A2D55] text-violet-800 dark:text-violet-300 rounded-2xl text-center border border-violet-200/70 dark:border-violet-400/25 transition cursor-pointer active:scale-95"
                >
                  ✨ أحكام التجويد
                </button>
                <button
                  onClick={() => {
                    setCurrentView('hadith');
                    setActiveModal(null);
                  }}
                  className="p-3 bg-amber-50 dark:bg-[#1A2D55] text-amber-800 dark:text-[#E5C168] rounded-2xl text-center border border-amber-200/70 dark:border-[#E5C168]/25 transition cursor-pointer active:scale-95"
                >
                  📜 الأحاديث النبوية
                </button>
                <button
                  onClick={() => setActiveModal('location')}
                  className="p-3 bg-rose-50 dark:bg-[#1A2D55] text-rose-800 dark:text-rose-300 rounded-2xl text-center border border-rose-200/70 dark:border-rose-400/25 transition cursor-pointer active:scale-95"
                >
                  🌍 المكان والتوقيت
                </button>
                <button
                  onClick={() => setActiveModal('settings')}
                  className="col-span-2 p-3 bg-slate-100 dark:bg-[#1F3562] text-[#0F172A] dark:text-[#E5C168] rounded-2xl text-center border border-slate-200 dark:border-[#E5C168]/25 transition cursor-pointer active:scale-95"
                >
                  ⚙️ إعدادات التطبيق
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
