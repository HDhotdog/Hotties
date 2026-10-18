import {AppError} from '../i18n/language-pack';
/**
 * Converts a `data:<mime>;base64,<data>` URL into a Blob without relying on `fetch()`,
 * so it behaves identically in the browser/webview and under Jest/jsdom.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const {bytes, mime} = dataUrlToBytes(dataUrl);
  return new Blob([bytes as BlobPart], {type: mime});
}

/**
 * A fast, synchronous (non-cryptographic) digest for attachment bytes.
 *
 * RxDB's schema migration runner reports a collection's migration as "DONE"
 * as soon as its replication-based write queue drains, *not* once every
 * per-document write is guaranteed durable. An `await`-ing migration
 * strategy (e.g. computing a digest via the async `crypto.subtle`-backed
 * `database.hashFunction`) reliably wins that race, so `migratePromise()`
 * resolves before the attachment is actually persisted (reproduced in
 * `database.spec.ts`). Keeping the migration strategy fully synchronous
 * avoids the race. RxDB only uses this digest to identify attachment
 * content for local storage/conflict bookkeeping (it isn't cryptographically
 * verified on read), and any later edit via `RxDocument.putAttachment()`
 * recomputes a proper digest anyway.
 */
export function syncHash(bytes: Uint8Array): string {
  let hash = 0;
  for (let i = 0; i < bytes.length; i++) {
    hash = (hash * 31 + bytes[i]) | 0;
  }
  return (hash >>> 0).toString(16);
}

/**
 * Center-crops an image data URL to a square and downsizes it to at most
 * `maxSize` pixels per side (never upscales), so uploaded photos don't bloat
 * storage with far more resolution than a thumbnail needs.
 */
export function cropImageToSquare(dataUrl: string, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      const targetSize = Math.min(maxSize, side);

      const canvas = document.createElement('canvas');
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new AppError('ui.canvas2dContextUnavailable', "Canvas 2D context unavailable"));
        return;
      }
      ctx.drawImage(img, sx, sy, side, side, 0, 0, targetSize, targetSize);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => reject(new AppError('ui.failedToLoadImageForCropping', "Failed to load image for cropping"));
    img.src = dataUrl;
  });
}

export function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; mime: string } {
  const match = /^data:(.*?);base64,(.*)$/.exec(dataUrl);
  const mime = match?.[1] || 'application/octet-stream';
  const base64 = match ? match[2] : dataUrl;

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return {bytes, mime};
}
