const DB_NAME = 'chatpye-pending-upload';
const STORE = 'pending';
const KEY = 'hero';

type PendingRecord = {
  name: string;
  type: string;
  buffer: ArrayBuffer;
  savedAt: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Stash a video file before redirecting to sign-in (hero upload flow). */
export async function savePendingUpload(file: File): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const buffer = await file.arrayBuffer();
  const record: PendingRecord = {
    name: file.name,
    type: file.type || 'video/mp4',
    buffer,
    savedAt: Date.now(),
  };
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(record, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/** Take and remove a stashed upload (after sign-in). Expires after 30 minutes. */
export async function consumePendingUpload(): Promise<File | null> {
  if (typeof indexedDB === 'undefined') return null;
  const db = await openDb();
  const record = await new Promise<PendingRecord | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).get(KEY);
    req.onsuccess = () => resolve(req.result as PendingRecord | undefined);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => {
      if (req.result) {
        const clearTx = db.transaction(STORE, 'readwrite');
        clearTx.objectStore(STORE).delete(KEY);
      }
    };
  });
  db.close();

  if (!record?.buffer) return null;
  if (Date.now() - record.savedAt > 30 * 60 * 1000) return null;

  return new File([record.buffer], record.name, { type: record.type });
}

export function hasPendingUploadFlag(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem('chatpye_resume_upload') === '1';
  } catch {
    return false;
  }
}

export function setPendingUploadFlag(): void {
  try {
    sessionStorage.setItem('chatpye_resume_upload', '1');
  } catch {
    /* ignore */
  }
}

export function clearPendingUploadFlag(): void {
  try {
    sessionStorage.removeItem('chatpye_resume_upload');
  } catch {
    /* ignore */
  }
}
