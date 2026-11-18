// IndexedDB persistence for user-selected Iqama audio files from mobile device storage

const DB_NAME = 'quran_app_audio_db';
const DB_VERSION = 1;
const STORE_NAME = 'custom_audio';
const CUSTOM_IQAMA_KEY = 'iqama_custom';
const META_STORAGE_KEY = 'custom_iqama_meta';

export interface CustomIqamaMeta {
  fileName: string;
  mimeType: string;
  size: number;
  updatedAt: number;
}

interface StoredAudioRecord extends CustomIqamaMeta {
  id: string;
  blob: Blob;
}

function openAudioDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB is not supported'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

export function getCustomIqamaMeta(): CustomIqamaMeta | null {
  try {
    const raw = localStorage.getItem(META_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.fileName === 'string') {
      return parsed as CustomIqamaMeta;
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveCustomIqamaFile(file: File): Promise<CustomIqamaMeta> {
  const meta: CustomIqamaMeta = {
    fileName: file.name || 'صوت_إقامة_مخصص.mp3',
    mimeType: file.type || 'audio/mpeg',
    size: file.size || 0,
    updatedAt: Date.now(),
  };

  const db = await openAudioDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const record: StoredAudioRecord = {
      id: CUSTOM_IQAMA_KEY,
      blob: file,
      ...meta,
    };
    store.put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Failed to save custom audio'));
  });
  db.close();

  try {
    localStorage.setItem(META_STORAGE_KEY, JSON.stringify(meta));
    localStorage.setItem('selected_iqama_muadhin', 'custom_device');
    window.dispatchEvent(new Event('iqama_muadhin_updated'));
  } catch {}

  return meta;
}

export async function getCustomIqamaBlob(): Promise<Blob | null> {
  try {
    const db = await openAudioDB();
    const record = await new Promise<StoredAudioRecord | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(CUSTOM_IQAMA_KEY);
      req.onsuccess = () => resolve(req.result as StoredAudioRecord | undefined);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return record?.blob || null;
  } catch {
    return null;
  }
}

export async function clearCustomIqamaFile(): Promise<void> {
  try {
    const db = await openAudioDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(CUSTOM_IQAMA_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {}

  try {
    localStorage.removeItem(META_STORAGE_KEY);
    if (localStorage.getItem('selected_iqama_muadhin') === 'custom_device') {
      localStorage.setItem('selected_iqama_muadhin', 'makkah_official');
    }
    window.dispatchEvent(new Event('iqama_muadhin_updated'));
  } catch {}
}

export function formatAudioSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} ك.ب`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
}
