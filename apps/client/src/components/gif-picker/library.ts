import { getGifProvider } from '@sharkord/shared';

type TSavedGif =
  | { id: string; title: string; src: string; file?: undefined }
  | { id: string; title: string; file: File; still: Blob };

const MAX_GIF_SIZE = 8 * 1024 * 1024;
const MAX_LIBRARY_BYTES = 32 * 1024 * 1024;
const MAX_ENTRIES = 100;
const STORE = 'libraries';

const openLibrary = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('mopscord-gif-library', 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const readLibrary = async (userId: number) => {
  const db = await openLibrary();

  try {
    return await new Promise<TSavedGif[]>((resolve, reject) => {
      const request = db.transaction(STORE).objectStore(STORE).get(userId);
      request.onsuccess = () => resolve(request.result ?? []);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
};

const updateLibrary = async (
  userId: number,
  change: (entries: TSavedGif[]) => TSavedGif[]
) => {
  const db = await openLibrary();

  try {
    return await new Promise<TSavedGif[]>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const request = store.get(userId);
      let next: TSavedGif[];
      request.onsuccess = () => {
        try {
          next = change(request.result ?? []);
          const bytes = next.reduce(
            (total, entry) =>
              total + (entry.file ? entry.file.size + entry.still.size : 0),
            0
          );
          if (next.length > MAX_ENTRIES || bytes > MAX_LIBRARY_BYTES) {
            throw new Error('GIF library is full');
          }
          store.put(next, userId);
        } catch (error) {
          reject(error);
          tx.abort();
        }
      };
      tx.oncomplete = () => resolve(next);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
};

const saveBuiltInGif = (userId: number, src: string, title: string) =>
  updateLibrary(userId, (entries) => {
    if (
      getGifProvider(src) !== 'library' ||
      entries.some((entry) => entry.id === src)
    )
      return entries;

    return [{ id: src, src, title }, ...entries];
  });

const removeSavedGif = (userId: number, id: string) =>
  updateLibrary(userId, (entries) =>
    entries.filter((entry) => entry.id !== id)
  );

const importLocalGif = async (
  userId: number,
  file: File,
  id: string = crypto.randomUUID()
) => {
  if (file.size > MAX_GIF_SIZE)
    throw new Error('GIF exceeds import size limit');
  const header = await file.slice(0, 10).arrayBuffer();
  const signature = new TextDecoder().decode(header.slice(0, 6));
  if (
    header.byteLength < 10 ||
    (signature !== 'GIF87a' && signature !== 'GIF89a')
  )
    throw new Error('Invalid GIF');
  const dimensions = new DataView(header);
  const width = dimensions.getUint16(6, true);
  const height = dimensions.getUint16(8, true);
  if (!width || !height || width * height > 16_000_000)
    throw new Error('Invalid GIF dimensions');

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 240 / Math.max(bitmap.width, bitmap.height));
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  context?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const still = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('GIF preview unavailable'));
    }, 'image/png');
  });
  const name = file.name.slice(0, 160);
  const gif = new File([file], name, {
    type: 'image/gif',
    lastModified: file.lastModified
  });
  const title = name.replace(/\.gif$/i, '') || name;
  const entry = { id, title, file: gif, still };

  return updateLibrary(userId, (entries) => [
    entry,
    ...entries.filter((item) => item.id !== id)
  ]);
};

export {
  importLocalGif,
  MAX_GIF_SIZE,
  readLibrary,
  removeSavedGif,
  saveBuiltInGif,
  type TSavedGif
};
