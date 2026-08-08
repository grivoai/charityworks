/**
 * What a file really is, read from its first bytes.
 *
 * The name says `.png` because someone typed it and the content type says
 * `image/png` because the browser inferred it from that name — neither is
 * evidence. These headers are, and reading them answers the format question and
 * the dimensions question at once.
 *
 * Written out rather than pulled from a package because it is a few dozen lines
 * of well-specified byte offsets against three formats that have not changed in
 * twenty years, and because a dependency that runs on uploaded bytes is a
 * dependency with an unusually direct path from a stranger's file to this
 * server. No decoding happens here — nothing allocates a bitmap, nothing walks
 * pixel data, and every read is bounds-checked.
 *
 * Dimensions are best-effort: a format whose header this does not understand
 * returns null width and height rather than being refused. They describe the
 * photograph, they do not gate it.
 */

export interface ImageProbe {
  format: "image/jpeg" | "image/png" | "image/webp";
  width: number | null;
  height: number | null;
}

function readU32BE(bytes: Buffer, at: number): number | null {
  return at + 4 <= bytes.length ? bytes.readUInt32BE(at) : null;
}

/** PNG: an 8-byte signature, then an IHDR chunk whose first two fields are the size. */
function png(bytes: Buffer): ImageProbe | null {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(signature)) return null;
  if (bytes.subarray(12, 16).toString("latin1") !== "IHDR") {
    return { format: "image/png", width: null, height: null };
  }
  return {
    format: "image/png",
    width: readU32BE(bytes, 16),
    height: readU32BE(bytes, 20),
  };
}

/**
 * JPEG: a chain of segments, each `FF <marker> <2-byte length>`.
 *
 * The size lives in whichever "start of frame" segment appears, and which one
 * that is depends on the encoding — C0 for baseline, C2 for progressive, and
 * several others. C4, C8 and CC share the range but are not frames, which is
 * the one thing an offset table would get wrong.
 */
function jpeg(bytes: Buffer): ImageProbe | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  let at = 2;
  while (at + 9 < bytes.length) {
    if (bytes[at] !== 0xff) {
      at += 1; // padding between segments is legal
      continue;
    }
    const marker = bytes[at + 1];

    // Standalone markers: no length field to skip over.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      at += 2;
      continue;
    }
    // Start of scan: the compressed data begins, and no header follows.
    if (marker === 0xda) break;

    const length = bytes.readUInt16BE(at + 2);
    if (length < 2) break;

    const isFrame =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;

    if (isFrame && at + 9 < bytes.length) {
      return {
        format: "image/jpeg",
        height: bytes.readUInt16BE(at + 5),
        width: bytes.readUInt16BE(at + 7),
      };
    }
    at += 2 + length;
  }

  return { format: "image/jpeg", width: null, height: null };
}

/** WebP: a RIFF container. Three sub-formats, each with the size somewhere else. */
function webp(bytes: Buffer): ImageProbe | null {
  if (bytes.length < 30) return null;
  if (bytes.subarray(0, 4).toString("latin1") !== "RIFF") return null;
  if (bytes.subarray(8, 12).toString("latin1") !== "WEBP") return null;

  const kind = bytes.subarray(12, 16).toString("latin1");
  const unknown: ImageProbe = { format: "image/webp", width: null, height: null };

  if (kind === "VP8 ") {
    // Lossy: a 3-byte start code, then 14-bit width and height.
    return {
      format: "image/webp",
      width: bytes.readUInt16LE(26) & 0x3fff,
      height: bytes.readUInt16LE(28) & 0x3fff,
    };
  }
  if (kind === "VP8L") {
    // Lossless: 14 bits each, packed across four bytes after the signature.
    const packed = bytes.readUInt32LE(21);
    return {
      format: "image/webp",
      width: (packed & 0x3fff) + 1,
      height: ((packed >> 14) & 0x3fff) + 1,
    };
  }
  if (kind === "VP8X") {
    // Extended: 24-bit canvas size, stored one less than the true value.
    const w = bytes[24] | (bytes[25] << 8) | (bytes[26] << 16);
    const h = bytes[27] | (bytes[28] << 8) | (bytes[29] << 16);
    return { format: "image/webp", width: w + 1, height: h + 1 };
  }
  return unknown;
}

/** The file's real format and size, or null if it is not an image we accept. */
export function probeImage(bytes: Buffer): ImageProbe | null {
  return png(bytes) ?? jpeg(bytes) ?? webp(bytes);
}
