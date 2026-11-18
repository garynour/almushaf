import React, { useState, useEffect } from 'react';
import { Download, Check, Smartphone, Copy, CheckCheck, X } from 'lucide-react';
import { triggerHaptic } from '../utils/audio';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowGuideModal(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    triggerHaptic(15);
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
      return;
    }
    // Fallback interactive guide for Android Chrome menu / PWABuilder APK / iOS Safari
    setShowGuideModal(true);
  };

  const handleCopyCurrentUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopiedUrl(true);
      triggerHaptic(15);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {}
  };

  if (isInstalled) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-[#0D9488] dark:text-[#2DD4BF] font-bold bg-teal-50 dark:bg-[#14294A] p-2.5 rounded-xl border border-[#2DD4BF]/25">
        <Check className="w-4 h-4 text-[#0D9488] dark:text-[#2DD4BF]" />
        <span>التطبيق مثبت بالفعل كـ تطبيق أندرويد مستقل ويعمل أوفلاين.</span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className="w-full bg-gradient-to-l from-[#0D9488] to-[#2DD4BF] hover:opacity-95 text-[#081229] font-extrabold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-sm active:scale-98"
      >
        <Download className="w-4 h-4" />
        <span>
          {deferredPrompt
            ? 'تثبيت كتطبيق أندرويد الآن (بضغطة واحدة)'
            : 'تثبيت التطبيق على أندرويد / تحويل APK'}
        </span>
      </button>

      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
          onClick={() => setShowGuideModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#0D1831] border border-slate-200 dark:border-[#E5C168]/40 p-5 shadow-2xl text-right space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2 text-[#0D9488] dark:text-[#E5C168]">
                <Smartphone className="w-5 h-5" />
                <h3 className="text-sm font-extrabold">
                  {isIOS ? 'تثبيت التطبيق على iPhone / iPad' : 'تثبيت وتشغيل التطبيق على أندرويد'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                ١. اضغط على زر <b>المشاركة (Share)</b> في أسفل متصفح Safari.<br />
                ٢. مرر للأسفل واختر <b>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</b>.
              </p>
            ) : (
              <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-[#132242] border border-slate-200 dark:border-white/10">
                  <b className="text-[#0D9488] dark:text-[#2DD4BF] block mb-1">
                    ١. خطوات استخراج رابط عام + APK من الهاتف (بدون كمبيوتر):
                  </b>
                  <ol className="list-decimal list-inside space-y-1 text-[11px]">
                    <li>اضغط على زر <b>«تحميل الحزمة الجاهزة لـ Netlify / PWABuilder»</b> من الإعدادات وفك الضغط عنها.</li>
                    <li>افتح موقع <b>app.netlify.com/drop</b> وارفع المجلد المفكوك (لا يحتاج أي برمجة أو بناء).</li>
                    <li>سينتج لك رابط عام يبدأ بـ <b>https://...netlify.app</b> — افتحه في Chrome وثبّت التطبيق، أو ضعه في <b>pwabuilder.com</b> لتحميل ملف <b>APK</b> أو <b>AAB</b>.</li>
                  </ol>
                </div>

                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-[#132242] border border-slate-200 dark:border-white/10 space-y-2">
                  <b className="text-[#0D9488] dark:text-[#E5C168] block">
                    ٢. لماذا لا يعمل رابط AI Studio داخل PWABuilder؟
                  </b>
                  <p className="text-[11px]">
                    روابط المعاينة الخاصة بـ AI Studio محمية بحساب Google ولا تفتح لبوتات PWABuilder. استخدم الرابط العام بعد النشر على <b>Netlify Drop</b> أو <b>Vercel</b> أو ابْنِ الـ APK مباشرة عبر <b>GitHub Actions</b>.
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyCurrentUrl}
                    className="w-full py-2 px-3 rounded-xl bg-[#0A1328] text-[#E5C168] border border-[#E5C168]/40 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                  >
                    {copiedUrl ? (
                      <>
                        <CheckCheck className="w-4 h-4 text-[#2DD4BF]" />
                        <span>تم نسخ الرابط الحالي ✓</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>نسخ رابط الصفحة الحالية</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full rounded-xl bg-gradient-to-l from-[#0D9488] to-[#2DD4BF] text-[#081229] py-2.5 text-xs font-extrabold cursor-pointer"
            >
              حسناً، فهمت
            </button>
          </div>
        </div>
      )}
    </>
  );
};
