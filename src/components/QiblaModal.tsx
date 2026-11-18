import React, { useState, useEffect, useRef } from 'react';
import {
  Compass,
  X,
  MapPin,
  SlidersHorizontal,
  RotateCcw,
  Navigation,
  Vibrate,
  CheckCircle2,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { toArabicDigits } from '../utils/prayerTimes';
import { triggerHaptic } from '../utils/audio';
import { ViewType } from '../types';
import { BottomNav } from './BottomNav';

type DialStyle = 'classic' | 'emerald' | 'kaaba' | 'modern';
type NeedleStyle = 'compass' | 'arrow' | 'kaaba';
type CompassMode = 'auto' | 'manual';

interface QiblaPreferences {
  dialStyle: DialStyle;
  needleStyle: NeedleStyle;
  mode: CompassMode;
  manualNorthDeg: number;
  calibrationOffset: number;
  vibrateOnAlign: boolean;
}

const DEFAULT_QIBLA_PREFS: QiblaPreferences = {
  dialStyle: 'classic',
  needleStyle: 'compass',
  mode: 'auto',
  manualNorthDeg: 0,
  calibrationOffset: 0,
  vibrateOnAlign: true,
};

function loadQiblaPrefs(): QiblaPreferences {
  try {
    const raw = localStorage.getItem('qibla_custom_prefs');
    return raw ? { ...DEFAULT_QIBLA_PREFS, ...JSON.parse(raw) } : DEFAULT_QIBLA_PREFS;
  } catch {
    return DEFAULT_QIBLA_PREFS;
  }
}

interface QiblaModalProps {
  onClose: () => void;
  lat?: number;
  lng?: number;
  locationName?: string;
  onOpenLocationSettings?: () => void;
  onNavigateView?: (view: ViewType) => void;
  onOpenMore?: () => void;
}

/**
 * Ornate Gold Islamic Arabesque Mandala Ornament SVG (matches Qibla mockup wings)
 */
const ArabesqueMandalaWing: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 220 220" className={className} aria-hidden="true">
    <defs>
      <radialGradient id="mandalaGoldStroke" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#FFE9A3" stopOpacity="0.95" />
        <stop offset="65%" stopColor="#D4A647" stopOpacity="0.78" />
        <stop offset="100%" stopColor="#8E6820" stopOpacity="0.25" />
      </radialGradient>
    </defs>
    <g fill="none" stroke="url(#mandalaGoldStroke)">
      <circle cx="110" cy="110" r="102" strokeWidth="1.2" strokeDasharray="3 3" />
      <circle cx="110" cy="110" r="90" strokeWidth="1.1" />
      <circle cx="110" cy="110" r="74" strokeWidth="0.9" strokeDasharray="4 2" />
      <circle cx="110" cy="110" r="56" strokeWidth="1" />
      {Array.from({ length: 16 }).map((_, i) => {
        const angle = (i * 360) / 16;
        return (
          <g key={i} transform={`rotate(${angle} 110 110)`}>
            <path
              d="M110 8 C122 26, 128 40, 110 56 C92 40, 98 26, 110 8 Z"
              strokeWidth="1"
              fill="rgba(229,193,104,0.06)"
            />
            <path
              d="M110 22 C116 34, 118 44, 110 56 C102 44, 104 34, 110 22 Z"
              strokeWidth="0.7"
            />
            <circle cx="110" cy="15" r="2" fill="#E5C168" fillOpacity="0.6" />
          </g>
        );
      })}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i * 360) / 8 + 22.5;
        return (
          <rect
            key={`sq-${i}`}
            x="48"
            y="48"
            width="124"
            height="124"
            rx="14"
            strokeWidth="0.7"
            strokeOpacity="0.4"
            transform={`rotate(${angle} 110 110)`}
          />
        );
      })}
    </g>
  </svg>
);

/**
 * Isometric 3D Kaaba Illustration SVG (black Kiswah + gold Hizam belt + golden door)
 */
const KaabaIllustration: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 80 76" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="kaabaLeft" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#262932" />
        <stop offset="100%" stopColor="#0D0F14" />
      </linearGradient>
      <linearGradient id="kaabaRight" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1A1D24" />
        <stop offset="100%" stopColor="#07080B" />
      </linearGradient>
      <linearGradient id="kaabaRoof" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3B3F4C" />
        <stop offset="100%" stopColor="#1B1E25" />
      </linearGradient>
      <linearGradient id="kaabaGold" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#C49736" />
        <stop offset="50%" stopColor="#FFE69D" />
        <stop offset="100%" stopColor="#B88728" />
      </linearGradient>
    </defs>

    {/* Subtle golden glow shadow base */}
    <ellipse cx="40" cy="67" rx="26" ry="5.5" fill="rgba(0,0,0,0.55)" />
    <ellipse cx="40" cy="66" rx="22" ry="4" fill="rgba(229,193,104,0.16)" />

    {/* Roof */}
    <polygon points="40,10 66,22 40,34 14,22" fill="url(#kaabaRoof)" stroke="#555A68" strokeWidth="0.6" />
    {/* Left Wall */}
    <polygon points="14,22 40,34 40,65 14,53" fill="url(#kaabaLeft)" stroke="#323642" strokeWidth="0.5" />
    {/* Right Wall */}
    <polygon points="40,34 66,22 66,53 40,65" fill="url(#kaabaRight)" stroke="#232730" strokeWidth="0.5" />

    {/* Gold Hizam Band (top decorative calligraphy belt) */}
    <polygon points="14,27 40,39 40,43.5 14,31.5" fill="url(#kaabaGold)" />
    <polygon points="40,39 66,27 66,31.5 40,43.5" fill="url(#kaabaGold)" opacity="0.92" />

    {/* Decorative micro gold ornaments on Hizam */}
    <line x1="17" y1="30.5" x2="37" y2="39.8" stroke="#6E4F12" strokeWidth="0.7" strokeDasharray="2 1.5" />
    <line x1="43" y1="39.8" x2="63" y2="30.5" stroke="#6E4F12" strokeWidth="0.7" strokeDasharray="2 1.5" />

    {/* Bab Al-Kaaba (Golden Door on Right Face) */}
    <polygon points="49,44 57,40.4 57,55.5 49,59.1" fill="url(#kaabaGold)" stroke="#705114" strokeWidth="0.6" />
    <polygon points="50.5,45.2 55.5,42.8 55.5,54.2 50.5,56.6" fill="#B58324" />
    <line x1="53" y1="44" x2="53" y2="55.4" stroke="#FFE9A3" strokeWidth="0.5" />

    {/* Subtle silver Maqam / Hatim accent at base */}
    <polygon points="14,52 40,64 66,52 66,53.5 40,65.5 14,53.5" fill="#D4AF37" fillOpacity="0.45" />
  </svg>
);

export const QiblaModal: React.FC<QiblaModalProps> = ({
  onClose,
  lat = 30.158,
  lng = 31.339,
  locationName = 'مصر، المرج',
  onOpenLocationSettings,
  onNavigateView,
  onOpenMore,
}) => {
  const [prefs, setPrefs] = useState<QiblaPreferences>(() => loadQiblaPrefs());
  const [deviceHeading, setDeviceHeading] = useState(0);
  const [hasSensorSignal, setHasSensorSignal] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const wasAlignedRef = useRef(false);

  const updatePrefs = (patch: Partial<QiblaPreferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem('qibla_custom_prefs', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const KAABA_LAT = 21.4225;
  const KAABA_LNG = 39.8262;

  const qiblaAngle = React.useMemo(() => {
    const lat1 = (lat * Math.PI) / 180;
    const lat2 = (KAABA_LAT * Math.PI) / 180;
    const dLng = ((KAABA_LNG - lng) * Math.PI) / 180;
    const y = Math.sin(dLng);
    const x = Math.cos(lat1) * Math.tan(lat2) - Math.sin(lat1) * Math.cos(dLng);
    const qibla = (Math.atan2(y, x) * 180) / Math.PI;
    return (qibla + 360) % 360;
  }, [lat, lng]);

  const distanceKm = React.useMemo(() => {
    const R = 6371;
    const dLat = ((KAABA_LAT - lat) * Math.PI) / 180;
    const dLng = ((KAABA_LNG - lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat * Math.PI) / 180) *
        Math.cos((KAABA_LAT * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }, [lat, lng]);

  useEffect(() => {
    if (prefs.mode !== 'auto') return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.alpha !== null) {
        setHasSensorSignal(true);
        const heading = (e as any).webkitCompassHeading ?? 360 - e.alpha;
        setDeviceHeading(heading);
      }
    };

    if (typeof window !== 'undefined' && window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation);
    }
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [prefs.mode]);

  const effectiveHeading = prefs.mode === 'manual' ? prefs.manualNorthDeg : deviceHeading;
  const rawRotation = (qiblaAngle - effectiveHeading + prefs.calibrationOffset + 360) % 360;
  const angularDiff = Math.min(rawRotation, 360 - rawRotation);
  const isAligned = angularDiff <= 4;

  useEffect(() => {
    if (isAligned && !wasAlignedRef.current && prefs.vibrateOnAlign) {
      triggerHaptic(30);
    }
    wasAlignedRef.current = isAligned;
  }, [isAligned, prefs.vibrateOnAlign]);

  const requestIosSensorPermission = async () => {
    const DOE = window.DeviceOrientationEvent as any;
    if (DOE && typeof DOE.requestPermission === 'function') {
      try {
        const res = await DOE.requestPermission();
        if (res === 'granted') {
          setHasSensorSignal(true);
        }
      } catch {}
    }
  };

  const dialFaceStyles: Record<
    DialStyle,
    { bezel: string; face: string; tick: string; text: string }
  > = {
    classic: {
      bezel: '#E5C168',
      face: 'radial-gradient(circle at 50% 42%, #132245 0%, #09132B 75%, #060D1E 100%)',
      tick: '#E5C168',
      text: 'text-[#E5C168]',
    },
    emerald: {
      bezel: '#2DD4BF',
      face: 'radial-gradient(circle at 50% 42%, #103A46 0%, #091F2D 75%, #06131E 100%)',
      tick: '#5EEAD4',
      text: 'text-[#5EEAD4]',
    },
    kaaba: {
      bezel: '#D4AF37',
      face: 'radial-gradient(circle at 50% 42%, #241F16 0%, #12100B 75%, #080705 100%)',
      tick: '#F3D98B',
      text: 'text-[#F3D98B]',
    },
    modern: {
      bezel: '#60A5FA',
      face: 'radial-gradient(circle at 50% 42%, #172B56 0%, #0C1835 80%)',
      tick: '#93C5FD',
      text: 'text-sky-300',
    },
  };

  const activeDial = dialFaceStyles[prefs.dialStyle];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center bg-[#060B18] text-[#F8FAFC] font-cairo"
      dir="rtl"
    >
      {/* Mobile Shell Container (Matches Bottom-Center Mockup Screen 1:1) */}
      <div className="w-full max-w-[480px] h-[100dvh] flex flex-col bg-gradient-to-b from-[#071128] via-[#0A1836] to-[#060F24] relative overflow-hidden sm:border-x sm:border-[#E5C168]/20">
        {/* Subtle Islamic Geometric Star Watermark Background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 25px 25px, #E5C168 1px, transparent 0), radial-gradient(circle at 50px 50px, #E5C168 0.8px, transparent 0)',
            backgroundSize: '50px 50px',
          }}
        />

        {/* Top Header Bar (Matches Mockup: circular + / customize, centered "القبلة", circular back) */}
        <header className="relative z-20 flex items-center justify-between px-4 pt-3 pb-1 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 rounded-full bg-white/8 hover:bg-white/15 border border-white/12 flex items-center justify-center text-slate-200 cursor-pointer active:scale-95 transition"
            aria-label="رجوع"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="text-center">
            <h1 className="text-lg font-bold tracking-wide text-[#F8FAFC]">القبلة</h1>
            <button
              type="button"
              onClick={() => {
                if (onOpenLocationSettings) {
                  onClose();
                  onOpenLocationSettings();
                }
              }}
              className="inline-flex items-center gap-1 text-[11px] text-slate-300 hover:text-[#E5C168] transition cursor-pointer mt-0.5"
            >
              <MapPin className="w-3 h-3 text-[#E5C168]" />
              <span>{locationName}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowCustomize((v) => !v);
              triggerHaptic(12);
            }}
            className={`w-11 h-11 rounded-full border flex items-center justify-center cursor-pointer active:scale-95 transition ${
              showCustomize
                ? 'bg-[#E5C168] text-[#071124] border-[#E5C168] shadow-[0_0_16px_rgba(229,193,104,0.4)]'
                : 'bg-white/8 hover:bg-white/15 border-white/12 text-slate-200'
            }`}
            aria-label="تخصيص البوصلة"
            title="تخصيص القبلة"
          >
            {showCustomize ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          </button>
        </header>

        {/* Scrollable Main Compass Stage */}
        <div className="relative z-10 flex-1 overflow-y-auto px-4 flex flex-col items-center justify-evenly py-2">
          {/* Alignment Status Pill / Discrete Hint */}
          {isAligned ? (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#2DD4BF]/18 text-[#5EEAD4] text-xs font-extrabold border border-[#2DD4BF]/50 shadow-sm animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4" />
              <span>أنت متجه نحو القبلة المشرفة تماماً ✓</span>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-[11px] text-slate-300/85 tabular-nums">
              <span>
                زاوية القبلة:{' '}
                <strong className="text-[#E5C168]">{toArabicDigits(Math.round(qiblaAngle))}°</strong>
              </span>
              <span className="text-white/25">•</span>
              <span>
                المسافة:{' '}
                <strong className="text-[#2DD4BF]">{toArabicDigits(distanceKm)} كم</strong>
              </span>
            </div>
          )}

          {/* Hero Ornate Compass Stage with Layered Top-Right & Bottom-Left Arabesque Mandalas */}
          <div className="relative flex items-center justify-center w-full max-w-[330px] py-6">
            {/* Top-Right Ornate Mandala Wing */}
            <ArabesqueMandalaWing className="absolute -top-4 right-1 w-48 h-48 pointer-events-none opacity-95 drop-shadow-[0_0_16px_rgba(229,193,104,0.28)]" />

            {/* Bottom-Left Ornate Mandala Wing */}
            <ArabesqueMandalaWing className="absolute -bottom-4 left-1 w-48 h-48 pointer-events-none opacity-95 rotate-180 drop-shadow-[0_0_16px_rgba(229,193,104,0.28)]" />

            {/* Metallic Brushed-Gold Compass Dial */}
            <div
              className={`relative z-10 w-60 h-60 rounded-full p-[6px] shadow-[0_14px_45px_rgba(0,0,0,0.65),0_0_32px_rgba(229,193,104,0.22)] transition-all duration-300 ${
                isAligned ? 'ring-4 ring-[#2DD4BF]/60' : ''
              }`}
              style={{
                background:
                  prefs.dialStyle === 'classic' || prefs.dialStyle === 'kaaba'
                    ? 'linear-gradient(135deg, #F8E3A3 0%, #C79938 48%, #8F671B 100%)'
                    : `linear-gradient(135deg, ${activeDial.bezel} 0%, #0D1B38 100%)`,
              }}
            >
              {/* Inner Dark Navy Compass Face */}
              <div
                className="w-full h-full rounded-full relative flex items-center justify-center border border-black/60 shadow-inner"
                style={{ background: activeDial.face }}
              >
                {/* SVG Degree Ticks & Concentric Rings */}
                <svg viewBox="0 0 220 220" className="absolute inset-0 w-full h-full pointer-events-none">
                  <circle
                    cx="110"
                    cy="110"
                    r="102"
                    fill="none"
                    stroke={activeDial.tick}
                    strokeOpacity="0.3"
                    strokeWidth="1"
                  />
                  <circle
                    cx="110"
                    cy="110"
                    r="66"
                    fill="none"
                    stroke={activeDial.tick}
                    strokeOpacity="0.22"
                    strokeWidth="0.8"
                    strokeDasharray="2 3"
                  />
                  {Array.from({ length: 72 }).map((_, idx) => {
                    const deg = idx * 5;
                    const isMajor = deg % 30 === 0;
                    const isCardinal = deg % 90 === 0;
                    const r1 = isCardinal ? 89 : isMajor ? 92 : 96;
                    const r2 = 100;
                    const rad = (deg * Math.PI) / 180;
                    const x1 = 110 + r1 * Math.sin(rad);
                    const y1 = 110 - r1 * Math.cos(rad);
                    const x2 = 110 + r2 * Math.sin(rad);
                    const y2 = 110 - r2 * Math.cos(rad);
                    return (
                      <line
                        key={deg}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={activeDial.tick}
                        strokeOpacity={isCardinal ? 0.95 : isMajor ? 0.65 : 0.3}
                        strokeWidth={isCardinal ? 1.8 : isMajor ? 1.1 : 0.7}
                      />
                    );
                  })}
                </svg>

                {/* Cardinal Letters Ring (rotated opposite to heading) */}
                <div
                  className="absolute inset-0 transition-transform duration-200 pointer-events-none"
                  style={{
                    transform: `rotate(${-effectiveHeading + prefs.calibrationOffset}deg)`,
                  }}
                >
                  <span className="absolute top-6 left-1/2 -translate-x-1/2 text-[11px] font-extrabold text-[#F3D98B] tracking-widest">
                    N
                  </span>
                  <span className={`absolute bottom-6 left-1/2 -translate-x-1/2 text-[11px] font-bold ${activeDial.text} opacity-85`}>
                    S
                  </span>
                  <span className={`absolute right-6 top-1/2 -translate-y-1/2 text-[11px] font-bold ${activeDial.text} opacity-85`}>
                    E
                  </span>
                  <span className={`absolute left-6 top-1/2 -translate-y-1/2 text-[11px] font-bold ${activeDial.text} opacity-85`}>
                    W
                  </span>
                </div>

                {/* Top Device Alignment Aim Pip */}
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-3.5 rounded-b-full bg-[#2DD4BF] shadow-[0_0_8px_#2DD4BF]" />

                {/* Rotating Qibla Compass Star / Needle */}
                <div
                  className="absolute inset-0 flex items-center justify-center transition-transform duration-200"
                  style={{ transform: `rotate(${rawRotation}deg)` }}
                >
                  {prefs.needleStyle === 'compass' && (
                    <svg viewBox="0 0 160 160" className="w-40 h-40 drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)]">
                      {/* Faceted 4-Point Metallic Gold & Midnight Compass Rose (Exact Match to Mockup) */}
                      {/* North / Qibla Tip - Bright Gold Faceted */}
                      <polygon points="80,12 91,80 80,80" fill="#B58529" />
                      <polygon points="80,12 69,80 80,80" fill="#FFE69A" />

                      {/* South Tail - Faceted Slate Navy */}
                      <polygon points="80,148 90,80 80,80" fill="#2A3958" />
                      <polygon points="80,148 70,80 80,80" fill="#4B5E86" />

                      {/* East Wing */}
                      <polygon points="122,80 80,87 80,80" fill="#64748B" />
                      <polygon points="122,80 80,73 80,80" fill="#CBD5E1" />

                      {/* West Wing */}
                      <polygon points="38,80 80,87 80,80" fill="#475569" />
                      <polygon points="38,80 80,73 80,80" fill="#94A3B8" />

                      {/* Center Golden Cap */}
                      <circle cx="80" cy="80" r="8" fill="#E5C168" stroke="#0B1328" strokeWidth="2" />
                      <circle cx="80" cy="80" r="3" fill="#FFF7D6" />
                    </svg>
                  )}

                  {prefs.needleStyle === 'arrow' && (
                    <div className="relative h-36 flex flex-col items-center justify-between">
                      <div className="w-0 h-0 border-l-[11px] border-r-[11px] border-b-[62px] border-l-transparent border-r-transparent border-b-[#E5C168] drop-shadow" />
                      <div className="w-0 h-0 border-l-[9px] border-r-[9px] border-t-[48px] border-l-transparent border-r-transparent border-t-slate-500/50" />
                    </div>
                  )}

                  {prefs.needleStyle === 'kaaba' && (
                    <div className="w-1.5 h-32 bg-gradient-to-t from-slate-600/40 via-[#E5C168] to-[#2DD4BF] rounded-full relative flex justify-center">
                      <div className="absolute -top-3 w-8 h-8 rounded-full bg-[#091227] border-2 border-[#E5C168] flex items-center justify-center shadow-lg">
                        <KaabaIllustration className="w-5 h-5" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Isometric Kaaba Illustration + Label Below Dial (Matches Mockup Bottom-Center) */}
          <div className="flex flex-col items-center justify-center text-center">
            <KaabaIllustration className="w-14 h-14 drop-shadow-[0_6px_14px_rgba(229,193,104,0.22)]" />
            <span className="text-sm font-bold text-[#F3D98B] tracking-wide mt-0.5">
              مؤشر الكعبة المشرفة
            </span>
          </div>

          {/* iOS Sensor Permission Trigger when needed */}
          {prefs.mode === 'auto' &&
            !hasSensorSignal &&
            typeof window !== 'undefined' &&
            typeof (window.DeviceOrientationEvent as any)?.requestPermission === 'function' && (
              <button
                type="button"
                onClick={requestIosSensorPermission}
                className="px-4 py-2 rounded-xl bg-[#2DD4BF]/20 text-[#5EEAD4] border border-[#2DD4BF]/40 text-xs font-bold cursor-pointer"
              >
                تفعيل حساس البوصلة
              </button>
            )}

          {/* Manual Mode Slider when enabled */}
          {prefs.mode === 'manual' && (
            <div className="w-full p-3 rounded-2xl bg-[#101F40]/90 border border-[#E5C168]/30 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-200">توجيه الشمال يدوياً:</span>
                <span className="text-[#2DD4BF] tabular-nums" dir="ltr">
                  {toArabicDigits(prefs.manualNorthDeg)}°
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={359}
                value={prefs.manualNorthDeg}
                onChange={(e) => updatePrefs({ manualNorthDeg: Number(e.target.value) })}
                className="w-full accent-[#E5C168]"
              />
              <div className="flex justify-center gap-1.5 text-[11px] font-bold">
                {[0, 90, 180, 270].map((deg) => (
                  <button
                    key={deg}
                    type="button"
                    onClick={() => updatePrefs({ manualNorthDeg: deg })}
                    className="px-3 py-1 rounded-lg bg-[#081229] border border-white/10 text-slate-200 hover:border-[#E5C168] cursor-pointer"
                  >
                    {deg === 0 ? 'شمال' : deg === 90 ? 'شرق' : deg === 180 ? 'جنوب' : 'غرب'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Expandable Customization Drawer */}
          {showCustomize && (
            <div className="w-full p-3.5 rounded-2xl bg-[#0F1E3E]/95 border border-[#E5C168]/40 text-right space-y-3 text-xs shadow-2xl animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <b className="text-[#E5C168] flex items-center gap-1.5">
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>تخصيص بوصلة القبلة</span>
                </b>
                <button
                  type="button"
                  onClick={() => updatePrefs(DEFAULT_QIBLA_PREFS)}
                  className="text-[11px] font-bold text-slate-300 flex items-center gap-1 cursor-pointer hover:text-[#E5C168]"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>الافتراضي</span>
                </button>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-300 block mb-1.5">
                  طريقة تحديد الاتجاه:
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => updatePrefs({ mode: 'auto' })}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer ${
                      prefs.mode === 'auto'
                        ? 'bg-[#E5C168] text-[#071124]'
                        : 'bg-[#081229] text-slate-300 border border-white/10'
                    }`}
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>تلقائي (حساس)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updatePrefs({ mode: 'manual' })}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer ${
                      prefs.mode === 'manual'
                        ? 'bg-[#E5C168] text-[#071124]'
                        : 'bg-[#081229] text-slate-300 border border-white/10'
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>يدوي</span>
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-300 block mb-1.5">
                  شكل إطار البوصلة:
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      { id: 'classic', label: 'ليلي ذهبي' },
                      { id: 'emerald', label: 'فيروزي' },
                      { id: 'kaaba', label: 'مكي' },
                      { id: 'modern', label: 'سماوي' },
                    ] as { id: DialStyle; label: string }[]
                  ).map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => updatePrefs({ dialStyle: d.id })}
                      className={`py-1.5 rounded-xl text-[10.5px] font-bold cursor-pointer ${
                        prefs.dialStyle === d.id
                          ? 'bg-[#E5C168] text-[#071124]'
                          : 'bg-[#081229] text-slate-300 border border-white/10'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-300 block mb-1.5">
                  شكل مؤشر القبلة:
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: 'compass', label: 'نجمة ذهبية' },
                      { id: 'arrow', label: 'سهم ذهبي' },
                      { id: 'kaaba', label: 'الكعبة' },
                    ] as { id: NeedleStyle; label: string }[]
                  ).map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => updatePrefs({ needleStyle: n.id })}
                      className={`py-1.5 rounded-xl text-[10.5px] font-bold cursor-pointer ${
                        prefs.needleStyle === n.id
                          ? 'bg-[#E5C168] text-[#071124]'
                          : 'bg-[#081229] text-slate-300 border border-white/10'
                      }`}
                    >
                      {n.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                  <span className="text-slate-300">معايرة انحراف البوصلة:</span>
                  <span className="text-[#2DD4BF] tabular-nums" dir="ltr">
                    {prefs.calibrationOffset > 0
                      ? `+${toArabicDigits(prefs.calibrationOffset)}°`
                      : `${toArabicDigits(prefs.calibrationOffset)}°`}
                  </span>
                </div>
                <input
                  type="range"
                  min={-15}
                  max={15}
                  value={prefs.calibrationOffset}
                  onChange={(e) => updatePrefs({ calibrationOffset: Number(e.target.value) })}
                  className="w-full accent-[#E5C168]"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5 font-bold text-[11px] text-slate-200">
                  <Vibrate className="w-3.5 h-3.5 text-[#E5C168]" />
                  <span>اهتزاز خفيف عند محاذاة القبلة</span>
                </div>
                <button
                  type="button"
                  onClick={() => updatePrefs({ vibrateOnAlign: !prefs.vibrateOnAlign })}
                  className={`w-9 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition ${
                    prefs.vibrateOnAlign ? 'bg-[#E5C168] justify-end' : 'bg-slate-700 justify-start'
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full bg-[#071124] block" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Navigation Bar (Matches Bottom-Center Mockup Screen) */}
        {onNavigateView ? (
          <BottomNav
            currentView="home"
            onNavigate={(view) => {
              onNavigateView(view);
            }}
            onOpenMore={() => {
              onClose();
              onOpenMore?.();
            }}
          />
        ) : (
          <div className="p-3 relative z-10">
            <button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-[#F3D98B] to-[#C89F3D] text-[#071124] font-black text-xs py-3 rounded-2xl transition cursor-pointer active:scale-98 shadow-lg"
            >
              العودة للرئيسية
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
