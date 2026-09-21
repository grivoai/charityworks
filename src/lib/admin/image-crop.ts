"use client";

import { IMAGE_TYPES, imageExtension } from "@/lib/admin/image-rules";

/**
 * Cutting a photograph down in the browser, before it is uploaded.
 *
 * The crop happens here and nowhere else. The server's upload path — sign a
 * URL, PUT the bytes, probe and record them — does not change, and does not
 * know a crop happened: what it receives is a JPG, PNG or WebP like any other,
 * and every check it makes still applies. That is what keeps this small: a
 * crop is a new file, and the site already knows what to do with a file.
 *
 * Two things are settled here rather than left to the browser:
 *
 *   ORIENTATION. A phone photograph is often stored sideways with an EXIF
 *   flag saying which way is up. `<img>` honours the flag; a canvas drawn
 *   from the raw bytes does not, and the result would be the picture on its
 *   side with the crop in the wrong place. `createImageBitmap` with
 *   `imageOrientation: "from-image"` gives the bytes the way the screen showed
 *   them, so the crop the client drew is the crop they get.
 *
 *   SIZE. The result is capped at MAX_EDGE on its longer side. Nothing on the
 *   site shows a picture wider than about 1400 CSS pixels, so 2400 leaves room
 *   for a 2× screen and nothing more; and a 12 MB photograph straight off a
 *   camera comes out under a megabyte, which is also what makes the 10 MB
 *   limit stop mattering.
 */

/** The longest side a result may have, in pixels. */
export const MAX_EDGE = 2400;

/** A rectangle in the photograph's own pixels — what the cropper reports. */
export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LoadedImage {
  /** For an <img> or the cropper to show. Revoke it when done. */
  url: string;
  width: number;
  height: number;
  /** The decoded, correctly oriented pixels, for drawing. */
  bitmap: ImageBitmap;
  /** What the bytes were, for choosing the output format. */
  type: string;
  revoke: () => void;
}

/**
 * Decodes a photograph the way the screen will show it.
 *
 * Older Safari ignores the `imageOrientation` option rather than refusing it,
 * so a sideways photograph there is drawn as stored. The crop is still a
 * crop of the picture the cropper displayed — `<img>` and the bitmap agree
 * whenever the option is honoured, and disagree only by the EXIF rotation
 * when it is not. Not corrected further: the rotation would have to be read
 * from the EXIF bytes by hand, and the browsers that need it are few.
 */
export async function loadImage(blob: Blob): Promise<LoadedImage> {
  const bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
  const url = URL.createObjectURL(blob);
  return {
    url,
    width: bitmap.width,
    height: bitmap.height,
    bitmap,
    type: blob.type,
    revoke: () => {
      URL.revokeObjectURL(url);
      bitmap.close();
    },
  };
}

/**
 * The size a crop will come out at, after the cap. Shown live in the dialog
 * so "1200×900" is a fact the client reads rather than a surprise they get.
 */
export function outputSize(area: CropArea): { width: number; height: number } {
  const scale = Math.min(1, MAX_EDGE / Math.max(area.width, area.height));
  return {
    width: Math.max(1, Math.round(area.width * scale)),
    height: Math.max(1, Math.round(area.height * scale)),
  };
}

/**
 * The format the result is written in, from the format it came in.
 *
 * PNG stays PNG: it is the one of the three that can carry transparency,
 * and a logo on a clear background turned into a JPEG gets a black one.
 * JPEG and WebP each stay themselves. Anything else — which the upload
 * rules refuse anyway — becomes a JPEG.
 */
function outputType(sourceType: string): "image/jpeg" | "image/png" | "image/webp" {
  if (sourceType === "image/png") return "image/png";
  if (sourceType === "image/webp") return "image/webp";
  return "image/jpeg";
}

/** The filename the result is uploaded under: the original's, marked as a crop. */
export function croppedName(original: string, type: string): string {
  const ext = imageExtension(original) ?? ".jpg";
  const stem = original.slice(0, original.length - ext.length) || "photograph";
  const outExt =
    (Object.entries(IMAGE_TYPES).find(([, mime]) => mime === type)?.[0] as string | undefined) ??
    ext;
  return `${stem} (cropped)${outExt}`;
}

/**
 * Draws the chosen area to a canvas and hands back a file.
 *
 * `toBlob` may hand back a different type than asked for — a browser that
 * cannot encode WebP gives PNG — so the file's declared type is the blob's,
 * and the name follows it. Nothing here trusts the request over the result.
 */
export async function cropToFile(
  image: LoadedImage,
  area: CropArea,
  originalName: string
): Promise<File> {
  const { width, height } = outputSize(area);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser could not prepare the photograph.");

  // Bounds-clamped: the cropper can report a fraction of a pixel outside the
  // picture at the edges, and drawImage with a negative source origin
  // stretches rather than clips.
  const sx = Math.max(0, Math.min(area.x, image.width));
  const sy = Math.max(0, Math.min(area.y, image.height));
  const sw = Math.max(1, Math.min(area.width, image.width - sx));
  const sh = Math.max(1, Math.min(area.height, image.height - sy));

  context.imageSmoothingQuality = "high";
  context.drawImage(image.bitmap, sx, sy, sw, sh, 0, 0, width, height);

  const wanted = outputType(image.type);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, wanted, wanted === "image/png" ? undefined : 0.9)
  );
  if (!blob) throw new Error("This browser could not save the cropped photograph.");

  const type = blob.type || wanted;
  return new File([blob], croppedName(originalName, type), { type });
}
