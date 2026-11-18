// Web Audio API synthesizer for page turn rustle and gentle haptic feedback
import { getCustomIqamaBlob } from './customAudioDb';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Synthesizes a soft, organic paper flip sound effect
export function playPageFlipSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const bufferSize = ctx.sampleRate * 0.15; // 150ms
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Filtered pink/white noise simulating dry paper friction
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      const pink = (lastOut + 0.02 * white) / 1.02;
      lastOut = pink;
      // Fade in and out envelope
      const progress = i / bufferSize;
      const envelope = Math.sin(progress * Math.PI);
      data[i] = pink * envelope * 0.22;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Lowpass filter to muffle the harsh highs
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.15);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
  } catch (e) {
    // Audio context may be restricted before user gesture
  }
}

// Gentle Athan / Takbeer melody chime (Web Audio API fallback)
export function playAthanChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [293.66, 329.63, 392.00, 440.00]; // D4, E4, G4, A4 (Maqam Rast / Bayati feel)
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = ctx.currentTime + idx * 0.35;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.18, startTime + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.65);
    });
  } catch (e) {}
}


export interface AthanOption {
  id: string;
  name: string;
  location: string;
  url: string;
  isSynthetic?: boolean;
}

export const ATHAN_SOUNDS: AthanOption[] = [
  {
    id: 'makkah',
    name: 'أذان الحرم المكي الشريف',
    location: 'مكة المكرمة - الشيخ محمد خليل رمل',
    url: 'https://raw.githubusercontent.com/Kiwifu/adhan-mp3/main/Muhammad_Khaleel_Raml_-_Al_Haram_Al_Maki_(%D9%85%D8%AD%D9%85%D8%AF_%D8%AE%D9%84%D9%8A%D9%84_%D8%B1%D9%85%D9%84_-_%D8%A7%D9%84%D8%AD%D8%B1%D9%85_%D8%A7%D9%84%D9%85%D9%83%D9%8A).mp3',
  },
  {
    id: 'madinah',
    name: 'أذان المسجد النبوي الشريف',
    location: 'المدينة المنورة - الشيخ عبدالمجيد السريحي',
    url: 'https://raw.githubusercontent.com/Kiwifu/adhan-mp3/main/Abdul_Majid_Al_Surehi_1_(%D8%B9%D8%A8%D8%AF%D8%A7%D9%84%D9%85%D8%AC%D9%8A%D8%AF_%D8%A7%D9%84%D8%B3%D8%B1%D9%8A%D8%AD%D9%8A).mp3',
  },
  {
    id: 'egypt_ismail',
    name: 'أذان مصر - الشيخ مصطفى إسماعيل',
    location: 'مصر - قاهرة المعز',
    url: 'https://raw.githubusercontent.com/Kiwifu/adhan-mp3/main/Mustafa_Ismail_-_Egypt_(%D9%85%D8%B5%D8%B7%D9%81%D9%89_%D8%A5%D8%B3%D9%85%D8%A7%D8%B9%D9%8A%D9%84_-_%D9%85%D8%B5%D8%B1).mp3',
  },
  {
    id: 'egypt_minshawi',
    name: 'أذان مصر - الشيخ المنشاوي',
    location: 'مصر - الشيخ محمد صديق المنشاوي',
    url: 'https://raw.githubusercontent.com/Kiwifu/adhan-mp3/main/Mohamed_Siddiq_El-Minshawi_-_Egypt_1_(%D9%85%D8%AD%D9%85%D8%AF_%D8%B5%D8%AF%D9%8A%D9%82_%D8%A7%D9%84%D9%85%D9%86%D8%B4%D8%A7%D9%88%D9%8A_-_%D9%85%D8%B5%D8%B1).mp3',
  },
  {
    id: 'chime',
    name: 'نغمة أذان وتكبير هادئة (بدون إنترنت)',
    location: 'صوت إلكتروني مدمج أوفلاين',
    url: '',
    isSynthetic: true,
  },
];

let currentAthanAudio: HTMLAudioElement | null = null;
let currentAthanObjectUrl: string | null = null;
let athanPlayToken = 0;

const ATHAN_CACHE_NAME = 'athan-audio-v1';

function revokeAthanObjectUrl() {
  if (currentAthanObjectUrl) {
    try {
      URL.revokeObjectURL(currentAthanObjectUrl);
    } catch (e) {}
    currentAthanObjectUrl = null;
  }
}

/** Downloads an athan file once (when online) so it also plays offline later. */
export async function cacheAthanAudio(url: string): Promise<boolean> {
  if (!url || typeof window === 'undefined' || !('caches' in window)) return false;
  try {
    const cache = await caches.open(ATHAN_CACHE_NAME);
    if (await cache.match(url)) return true;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return false;
    await cache.put(url, res);
    return true;
  } catch (e) {
    return false;
  }
}

/** Pre-downloads the currently selected athan. Call it once at startup / when the user changes athan. */
export function prefetchAthan(soundId?: string): void {
  let id = soundId;
  if (!id) {
    try {
      id = localStorage.getItem('selected_athan') || 'makkah';
    } catch (e) {
      id = 'makkah';
    }
  }
  const selected = ATHAN_SOUNDS.find((a) => a.id === id);
  if (selected && selected.url && !selected.isSynthetic) {
    void cacheAthanAudio(selected.url);
  }
}

async function getCachedAthanObjectUrl(url: string): Promise<string | null> {
  try {
    if (typeof window === 'undefined' || !('caches' in window)) return null;
    const cache = await caches.open(ATHAN_CACHE_NAME);
    const hit = await cache.match(url);
    if (!hit) return null;
    const blob = await hit.blob();
    return URL.createObjectURL(blob);
  } catch (e) {
    return null;
  }
}

export function playAthanSound(
  soundId: string = 'makkah',
  onEnded?: () => void
): boolean {
  stopAthanSound();
  const token = ++athanPlayToken;

  const selected = ATHAN_SOUNDS.find((a) => a.id === soundId) || ATHAN_SOUNDS[0];

  if (selected.isSynthetic || !selected.url) {
    playAthanChime();
    setTimeout(() => onEnded?.(), 2500);
    return true;
  }

  // Both audio.play() rejection and the "error" event can fire for the same failure:
  // make sure the fallback chime is played only once.
  let fellBack = false;
  const fallbackToChime = () => {
    if (fellBack || token !== athanPlayToken) return;
    fellBack = true;
    currentAthanAudio = null;
    revokeAthanObjectUrl();
    playAthanChime();
    setTimeout(() => onEnded?.(), 2500);
  };

  void (async () => {
    // Prefer the offline copy; otherwise stream and cache it for next time.
    let src = selected.url;
    const cachedUrl = await getCachedAthanObjectUrl(selected.url);
    if (token !== athanPlayToken) {
      if (cachedUrl) URL.revokeObjectURL(cachedUrl);
      return;
    }
    if (cachedUrl) {
      revokeAthanObjectUrl();
      currentAthanObjectUrl = cachedUrl;
      src = cachedUrl;
    } else {
      void cacheAthanAudio(selected.url);
    }

    try {
      const audio = new Audio(src);
      currentAthanAudio = audio;
      audio.onended = () => {
        if (token !== athanPlayToken) return;
        currentAthanAudio = null;
        revokeAthanObjectUrl();
        onEnded?.();
      };
      audio.onerror = fallbackToChime;
      audio.play().catch(fallbackToChime);
    } catch (e) {
      fallbackToChime();
    }
  })();

  return true;
}

export function stopAthanSound() {
  athanPlayToken++;
  revokeAthanObjectUrl();
  if (currentAthanAudio) {
    try {
      currentAthanAudio.pause();
      currentAthanAudio.currentTime = 0;
    } catch (e) {}
    currentAthanAudio = null;
  }
}

export function isAthanPlaying(): boolean {
  return currentAthanAudio !== null && !currentAthanAudio.paused;
}

// Haptic vibration feedback
export function triggerHaptic(duration = 15) {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    const userActivation = (navigator as any).userActivation;
    if (userActivation && !userActivation.hasBeenActive) {
      return;
    }
    try {
      navigator.vibrate(duration);
    } catch (e) {}
  }
}

// Authentic Voice Iqama Playback with Certified Mu'adhins
export interface IqamaMuadhin {
  id: string;
  name: string;
  sub: string;
  url: string;
}

export const IQAMA_MUADHINS: IqamaMuadhin[] = [
  {
    id: 'makkah_official',
    name: 'إقامة الحرم المكي الشريف',
    sub: 'مؤذن الحرم المكي المعتمد',
    url: '/iqama_makkah.mp3',
  },
];

let currentIqamaAudio: HTMLAudioElement | null = null;
let currentIqamaMuadhinId: string | null = null;
let currentIqamaObjectUrl: string | null = null;
let iqamaPlayToken = 0;

function cleanupIqamaObjectUrl() {
  if (currentIqamaObjectUrl) {
    try {
      URL.revokeObjectURL(currentIqamaObjectUrl);
    } catch (e) {}
    currentIqamaObjectUrl = null;
  }
}

export function stopIqamaSound() {
  iqamaPlayToken++;
  if (currentIqamaAudio) {
    try {
      currentIqamaAudio.pause();
      currentIqamaAudio.currentTime = 0;
    } catch (e) {}
    currentIqamaAudio = null;
  }
  cleanupIqamaObjectUrl();
  currentIqamaMuadhinId = null;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }
}

export function isIqamaPlaying(muadhinId?: string): boolean {
  if (!currentIqamaAudio || currentIqamaAudio.paused) return false;
  if (muadhinId) return currentIqamaMuadhinId === muadhinId;
  return true;
}

export function getCurrentPlayingIqamaId(): string | null {
  return currentIqamaAudio && !currentIqamaAudio.paused ? currentIqamaMuadhinId : null;
}

function startAudioUrlPlayback(
  url: string,
  id: string,
  token: number,
  onEnded?: () => void,
  onErrorFallback?: () => void
) {
  if (token !== iqamaPlayToken) return;
  try {
    const audio = new Audio(url);
    currentIqamaAudio = audio;
    currentIqamaMuadhinId = id;

    audio.onended = () => {
      if (token === iqamaPlayToken) {
        currentIqamaAudio = null;
        currentIqamaMuadhinId = null;
        cleanupIqamaObjectUrl();
      }
      onEnded?.();
    };

    audio.onerror = () => {
      if (token !== iqamaPlayToken) return;
      currentIqamaAudio = null;
      currentIqamaMuadhinId = null;
      cleanupIqamaObjectUrl();
      if (onErrorFallback) {
        onErrorFallback();
      } else {
        playAthanChime();
        onEnded?.();
      }
    };

    const promise = audio.play();
    if (promise !== undefined) {
      promise.catch(() => {
        if (token !== iqamaPlayToken) return;
        currentIqamaAudio = null;
        currentIqamaMuadhinId = null;
        cleanupIqamaObjectUrl();
        if (onErrorFallback) {
          onErrorFallback();
        } else {
          playAthanChime();
          onEnded?.();
        }
      });
    }
  } catch (e) {
    currentIqamaAudio = null;
    currentIqamaMuadhinId = null;
    cleanupIqamaObjectUrl();
    if (onErrorFallback) {
      onErrorFallback();
    } else {
      playAthanChime();
      onEnded?.();
    }
  }
}

export function playIqamaAlertSound(muadhinId?: string, onEnded?: () => void) {
  stopIqamaSound();
  stopAthanSound();

  const token = ++iqamaPlayToken;

  let targetId = muadhinId;
  if (!targetId && typeof window !== 'undefined') {
    try {
      targetId = localStorage.getItem('selected_iqama_muadhin') || 'makkah_official';
    } catch (e) {}
  }

  if (targetId === 'custom_device') {
    currentIqamaMuadhinId = 'custom_device';
    getCustomIqamaBlob()
      .then((blob) => {
        if (token !== iqamaPlayToken) return;
        if (blob) {
          cleanupIqamaObjectUrl();
          const objUrl = URL.createObjectURL(blob);
          currentIqamaObjectUrl = objUrl;
          startAudioUrlPlayback(objUrl, 'custom_device', token, onEnded, () => {
            // Fallback to built-in Makkah Iqama if custom file fails to decode
            startAudioUrlPlayback(IQAMA_MUADHINS[0].url, 'makkah_official', token, onEnded);
          });
        } else {
          startAudioUrlPlayback(IQAMA_MUADHINS[0].url, 'makkah_official', token, onEnded);
        }
      })
      .catch(() => {
        if (token !== iqamaPlayToken) return;
        startAudioUrlPlayback(IQAMA_MUADHINS[0].url, 'makkah_official', token, onEnded);
      });
    return;
  }

  const selected = IQAMA_MUADHINS.find((m) => m.id === targetId) || IQAMA_MUADHINS[0];
  startAudioUrlPlayback(selected.url, selected.id, token, onEnded);
}




/**
 * Browsers block audio until the user touches the page once. Call this once at startup:
 * the first touch creates/resumes the AudioContext so the fallback chime and later
 * programmatic playback (athan at prayer time) are allowed.
 */
export function installAudioUnlock(): void {
  if (typeof window === 'undefined') return;
  const unlock = () => {
    try {
      getAudioContext();
    } catch (e) {}
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock, { once: false });
  window.addEventListener('keydown', unlock, { once: false });
}
