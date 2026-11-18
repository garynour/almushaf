// Device location helper: Capacitor Geolocation inside the Android app, browser API on the web.
import { isNativeApp } from './nativeNotifications';

export interface DeviceCoords {
  lat: number;
  lng: number;
}

export type LocationErrorKind = 'unsupported' | 'denied' | 'timeout' | 'unavailable';

export class LocationError extends Error {
  kind: LocationErrorKind;
  constructor(kind: LocationErrorKind) {
    super(kind);
    this.kind = kind;
  }
}

export function locationErrorMessage(kind: LocationErrorKind): string {
  switch (kind) {
    case 'denied':
      return 'تم رفض إذن الموقع — فعّله من إعدادات الهاتف أو اختر المدينة يدوياً';
    case 'timeout':
      return 'انتهت مهلة تحديد الموقع — تأكد من تشغيل GPS أو اختر المدينة يدوياً';
    case 'unsupported':
      return 'تحديد الموقع التلقائي غير مدعوم هنا — اختر المدينة يدوياً';
    default:
      return 'تعذر تحديد الموقع — يمكنك اختيار البلد والمدينة يدوياً';
  }
}

export async function getDeviceCoords(): Promise<DeviceCoords> {
  if (isNativeApp()) {
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      let perm = await Geolocation.checkPermissions();
      if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') {
        perm = await Geolocation.requestPermissions();
      }
      if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') {
        throw new LocationError('denied');
      }
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: false, // prayer times only need ~km accuracy: faster and uses less battery
        timeout: 15000,
        maximumAge: 10 * 60 * 1000,
      });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch (e) {
      if (e instanceof LocationError) throw e;
      const msg = String((e as any)?.message || e).toLowerCase();
      if (msg.includes('denied') || msg.includes('permission')) throw new LocationError('denied');
      if (msg.includes('timeout')) throw new LocationError('timeout');
      throw new LocationError('unavailable');
    }
  }

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    throw new LocationError('unsupported');
  }
  return new Promise<DeviceCoords>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) reject(new LocationError('denied'));
        else if (err.code === err.TIMEOUT) reject(new LocationError('timeout'));
        else reject(new LocationError('unavailable'));
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60 * 1000 }
    );
  });
}
