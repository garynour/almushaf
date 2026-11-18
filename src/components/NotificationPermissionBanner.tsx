import React, { useState, useEffect, useCallback } from 'react';
import { Bell, BellRing, CheckCircle2, AlertTriangle, Volume2, Send, ShieldCheck } from 'lucide-react';
import {
  NotificationPermissionStatus,
  NotificationServicePrefs,
  BackgroundSyncCapabilities,
  getNotificationPermission,
  requestNotificationPermission,
  loadNotificationPrefs,
  saveNotificationPrefs,
  sendTestPrayerNotification,
  getBackgroundNotificationCapabilities,
  registerBackgroundPrayerSync,
} from '../utils/notificationService';
import { openExactAlarmSettings } from '../utils/nativeNotifications';
import { triggerHaptic } from '../utils/audio';

interface NotificationPermissionBannerProps {
  nextPrayerName?: string;
  nextPrayerTime?: string;
  compact?: boolean;
}

export const NotificationPermissionBanner: React.FC<NotificationPermissionBannerProps> = ({
  nextPrayerName = 'الظهر',
  nextPrayerTime,
  compact = false,
}) => {
  const [permission, setPermission] = useState<NotificationPermissionStatus>(() =>
    getNotificationPermission()
  );
  const [prefs, setPrefs] = useState<NotificationServicePrefs>(() => loadNotificationPrefs());
  const [bgCaps, setBgCaps] = useState<BackgroundSyncCapabilities | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null);
  const [sendingTest, setSendingTest] = useState(false);

  const refreshCaps = useCallback(async () => {
    setPermission(getNotificationPermission());
    setPrefs(loadNotificationPrefs());
    const caps = await getBackgroundNotificationCapabilities();
    setBgCaps(caps);
  }, []);

  useEffect(() => {
    void refreshCaps();
    const sync = () => {
      void refreshCaps();
    };
    window.addEventListener('notification_prefs_updated', sync);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener('notification_prefs_updated', sync);
      window.removeEventListener('focus', sync);
    };
  }, [refreshCaps]);

  const showTempFeedback = (text: string, ok: boolean) => {
    setFeedback({ text, ok });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleRequestPermission = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
    triggerHaptic(20);
    if (res === 'granted') {
      await registerBackgroundPrayerSync();
      window.dispatchEvent(new Event('request_prayer_bg_sync'));
      await refreshCaps();
      showTempFeedback('تم تفعيل إذن الإشعارات وجدولة الخلفية بنجاح ✓', true);
    } else if (res === 'denied') {
      showTempFeedback(
        'تم رفض الإذن — فعّله من: إعدادات الهاتف ← التطبيقات ← المصحف ← الإشعارات',
        false
      );
    } else if (res === 'unsupported') {
      showTempFeedback('الإشعارات غير مدعومة على هذا الجهاز أو المتصفح', false);
    } else {
      showTempFeedback('لم يتم منح الإذن بعد — اضغط مرة أخرى ووافق في النافذة', false);
    }
  };

  const handleTogglePref = (key: keyof NotificationServicePrefs) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    saveNotificationPrefs(next);
    window.dispatchEvent(new Event('request_prayer_bg_sync'));
    triggerHaptic(15);
  };

  const handleTestNotification = async () => {
    setSendingTest(true);
    try {
      const res = await sendTestPrayerNotification(nextPrayerName, nextPrayerTime);
      setPermission(res.permission);
      if (res.ok) {
        await registerBackgroundPrayerSync();
        window.dispatchEvent(new Event('request_prayer_bg_sync'));
        await refreshCaps();
        showTempFeedback('تم إرسال الإشعار التجريبي وتحديث جدولة الخلفية ✓', true);
      } else if (res.permission === 'denied') {
        showTempFeedback('الإشعارات محظورة من المتصفح — اسمح بالإشعارات من القفل بجانب الرابط', false);
      } else if (res.permission === 'unsupported') {
        showTempFeedback('المتصفح الحالي لا يدعم Web Notification API', false);
      } else {
        showTempFeedback('يرجى السماح بالإشعارات لإرسال التنبيه', false);
      }
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div
      className={`bg-white dark:bg-[#132242] border border-slate-200 dark:border-white/10 rounded-[22px] shadow-sm ${
        compact ? 'p-3' : 'p-3.5'
      } space-y-2.5`}
    >
      {/* Header + Permission Status */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/70 dark:border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <BellRing className="w-4 h-4 text-[#0D9488] dark:text-[#2DD4BF] shrink-0" />
          <div className="min-w-0">
            <b className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] block truncate">
              إشعارات الصلاة المحلية والعمل في الخلفية
            </b>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
              جدولة أوقات الصلاة للعمل حتى أثناء إغلاق التطبيق
            </span>
          </div>
        </div>

        <span
          className={`text-[10px] font-bold flex items-center gap-1 shrink-0 ${
            permission === 'granted'
              ? 'text-teal-700 dark:text-[#2DD4BF]'
              : permission === 'denied'
              ? 'text-rose-600 dark:text-rose-300'
              : 'text-amber-600 dark:text-[#E5C168]'
          }`}
        >
          {permission === 'granted' ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>مسموح</span>
            </>
          ) : permission === 'denied' ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>محظور</span>
            </>
          ) : permission === 'unsupported' ? (
            <span>غير مدعوم</span>
          ) : (
            <span>بانتظار الإذن</span>
          )}
        </span>
      </div>

      {/* Android 12+: exact alarms must be allowed by the user */}
      {permission === 'granted' && bgCaps?.isNative && bgCaps.exactAlarm === 'denied' && (
        <div className="flex flex-wrap items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-[#2A1F0A] border border-amber-400/40 text-[10px]">
          <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-bold">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>لتصلك التنبيهات في وقتها بالضبط، اسمح للتطبيق بـ «المنبّهات والتذكيرات»</span>
          </div>
          <button
            type="button"
            onClick={() => {
              void openExactAlarmSettings();
            }}
            className="text-[10px] font-extrabold text-amber-700 dark:text-[#E5C168] hover:underline cursor-pointer"
          >
            فتح الإعدادات
          </button>
        </div>
      )}

      {/* Background Capabilities Status Pill Row */}
      {permission === 'granted' && bgCaps && (
        <div className="flex flex-wrap items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl bg-teal-50/70 dark:bg-[#0D1831] border border-[#2DD4BF]/25 text-[10px]">
          <div className="flex items-center gap-1.5 text-teal-800 dark:text-[#5EEAD4] font-bold">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>
              {bgCaps.isNative
                ? 'تنبيهات الصلاة مجدولة عبر نظام أندرويد ✓'
                : bgCaps.periodicSyncRegistered
                ? 'مزامنة الخلفية مفعّلة (قد يتأخر التنبيه والتطبيق مغلق)'
                : 'التنبيه يعمل والتطبيق مفتوح — للتنبيه والتطبيق مغلق استخدم تطبيق الأندرويد'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              void registerBackgroundPrayerSync();
              window.dispatchEvent(new Event('request_prayer_bg_sync'));
              void refreshCaps();
              showTempFeedback('تم تحديث جدولة مواقيت الصلاة في الخلفية ✓', true);
              triggerHaptic(15);
            }}
            className="text-[10px] font-extrabold text-[#0D9488] dark:text-[#E5C168] hover:underline cursor-pointer"
          >
            تحديث الجدولة
          </button>
        </div>
      )}

      {feedback && (
        <div
          className={`p-2 rounded-xl text-[11px] font-bold text-center border ${
            feedback.ok
              ? 'bg-teal-50 dark:bg-[#2DD4BF]/15 text-teal-800 dark:text-[#5EEAD4] border-[#2DD4BF]/40'
              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border-amber-400/40'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Action Buttons Row */}
      <div className="flex flex-wrap gap-1.5">
        {permission === 'default' && (
          <button
            type="button"
            onClick={handleRequestPermission}
            className="flex-1 min-w-[140px] py-2 px-3 rounded-xl bg-gradient-to-r from-[#2DD4BF] to-[#0D9488] text-[#051B1E] font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-98 shadow-xs"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>تفعيل إشعارات الخلفية</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleTestNotification}
          disabled={sendingTest || permission === 'unsupported'}
          className="flex-1 min-w-[140px] py-2 px-3 rounded-xl bg-slate-100 dark:bg-[#0D1831] hover:bg-slate-200 dark:hover:bg-[#192D56] text-[#0F172A] dark:text-[#E5C168] border border-slate-200 dark:border-[#E5C168]/30 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-98 disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5 text-[#E5C168]" />
          <span>{sendingTest ? 'جاري الإرسال...' : 'تجربة إشعار الآن'}</span>
        </button>
      </div>

      {permission === 'denied' && (
        <div className="p-2 rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-300/40 text-[10px] text-rose-800 dark:text-rose-200 leading-relaxed">
          تم حظر الإشعارات في المتصفح. لتفعيلها: اضغط على أيقونة الإعدادات بجانب رابط الموقع أو إعدادات التطبيق على أندرويد واختر{' '}
          <b>الإشعارات ⬅️ سماح (Allow)</b>.
        </div>
      )}

      {/* Honest Android Background Execution Tip */}
      <div className="p-2 rounded-xl bg-amber-50/70 dark:bg-[#0D1831] border border-amber-300/35 dark:border-[#E5C168]/25 text-[10px] text-slate-700 dark:text-slate-300 leading-relaxed">
        <b className="text-amber-800 dark:text-[#E5C168]">ملاحظة لأجهزة أندرويد عند إغلاق التطبيق:</b> لضمان عدم إيقاف النظام لإشعارات الصلاة أثناء إغلاق البرنامج، افتح{' '}
        <b>إعدادات الهاتف ⬅️ التطبيقات ⬅️ البطارية</b> واختر <b>«غير مقيد / Unrestricted»</b>.
      </div>

      {/* Toggles */}
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-[#0D1831]">
          <div>
            <b className="font-bold block text-xs">تشغيل خدمة تنبيهات الصلاة</b>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              إرسال إشعار محلي تلقائي للصلوات المفعّل جرسها
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleTogglePref('enabled')}
            aria-label="تشغيل خدمة تنبيهات الصلاة"
            className={`w-10 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition shrink-0 ${
              prefs.enabled
                ? 'bg-[#0D9488] dark:bg-[#2DD4BF] justify-end'
                : 'bg-gray-300 dark:bg-gray-700 justify-start'
            }`}
          >
            <span className="w-3.5 h-3.5 rounded-full bg-white shadow-xs block" />
          </button>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-[#0D1831]">
          <div className="flex items-center gap-1.5 min-w-0">
            <Volume2 className="w-3.5 h-3.5 text-[#0D9488] dark:text-[#2DD4BF] shrink-0" />
            <div>
              <b className="font-bold block text-xs">تشغيل صوت الأذان والإقامة مع الإشعار</b>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                تشغيل صوت المؤذن المختار تلقائياً فور دخول الوقت
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleTogglePref('playAudioOnAlert')}
            aria-label="تشغيل صوت الأذان والإقامة مع الإشعار"
            className={`w-10 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition shrink-0 ${
              prefs.playAudioOnAlert
                ? 'bg-[#0D9488] dark:bg-[#2DD4BF] justify-end'
                : 'bg-gray-300 dark:bg-gray-700 justify-start'
            }`}
          >
            <span className="w-3.5 h-3.5 rounded-full bg-white shadow-xs block" />
          </button>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-[#0D1831]">
          <div>
            <b className="font-bold block text-xs">إشعارات الإقامة والتنبيه المسبق</b>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              إرسال إشعار قبل الإقامة بـ ٣ دقائق وعند وقت الإقامة
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleTogglePref('notifyIqama')}
            aria-label="إشعارات الإقامة والتنبيه المسبق"
            className={`w-10 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition shrink-0 ${
              prefs.notifyIqama
                ? 'bg-[#0D9488] dark:bg-[#2DD4BF] justify-end'
                : 'bg-gray-300 dark:bg-gray-700 justify-start'
            }`}
          >
            <span className="w-3.5 h-3.5 rounded-full bg-white shadow-xs block" />
          </button>
        </div>
      </div>
    </div>
  );
};
