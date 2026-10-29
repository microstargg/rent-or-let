"use client";

/**
 * Keeps inspection photos that haven't uploaded yet (IndexedDB) and unsaved edits
 * (localStorage) on the device, so closing the tab or losing signal doesn't lose them.
 * Every call is best-effort: private mode or blocked storage just means no backup.
 */

const DB_NAME = "inspection-offline";
const STORE = "photos";

export interface StoredPhoto {
  id: string;
  inspectionId: string;
  target: Record<string, unknown>;
  blob: Blob;
  name: string;
  createdAt: number;
}

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const store = req.result.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("inspectionId", "inspectionId");
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export function savePendingPhoto(photo: StoredPhoto) {
  return withStore("readwrite", (s) => s.put(photo));
}

export function deletePendingPhoto(id: string) {
  return withStore("readwrite", (s) => s.delete(id));
}

export async function listPendingPhotos(inspectionId: string): Promise<StoredPhoto[]> {
  const rows = await withStore<StoredPhoto[]>("readonly", (s) =>
    s.index("inspectionId").getAll(inspectionId)
  );
  return (rows ?? []).sort((a, b) => a.createdAt - b.createdAt);
}

const draftKey = (inspectionId: string) => `inspection-draft:${inspectionId}`;

export function saveDraft(inspectionId: string, draft: unknown) {
  try {
    localStorage.setItem(draftKey(inspectionId), JSON.stringify({ at: Date.now(), draft }));
  } catch {
    // storage full or blocked
  }
}

export function loadDraft<T>(inspectionId: string): { at: number; draft: T } | null {
  try {
    const raw = localStorage.getItem(draftKey(inspectionId));
    return raw ? (JSON.parse(raw) as { at: number; draft: T }) : null;
  } catch {
    return null;
  }
}

export function clearDraft(inspectionId: string) {
  try {
    localStorage.removeItem(draftKey(inspectionId));
  } catch {
    // ignore
  }
}

const MAX_EDGE = 1600;

/**
 * Re-encode a photo as a JPEG no larger than 1600px on its longest side.
 * Phone photos drop from ~4MB to ~300KB, which uploads far better on weak signal
 * and lets the PDF embed them. Falls back to the original if the browser can't decode it.
 */
export async function compressPhoto(file: Blob): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.82));
    return blob && blob.size > 0 ? blob : file;
  } catch {
    return file;
  }
}
