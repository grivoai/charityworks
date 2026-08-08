/**
 * Proves the assumptions both buckets are built on.
 *
 * This one is unusual among the checks: the other three read content and
 * compare shapes, but the upload path rests on claims about a system nobody
 * here controls. The browser PUTs bytes straight at Supabase Storage using a
 * URL this server signs, which is only safe if that URL really is one-shot and
 * really is bound to one path. Both are written down in `uploads.ts` as fact.
 * This is what makes them checked fact.
 *
 * Five things:
 *
 *   1. THE BUCKET STILL ENFORCES THE LIMITS. It is the only check that runs
 *      before bytes are stored, and it lives outside the repository — a click
 *      in the dashboard can undo it and nothing would say so.
 *   2. A SIGNED URL CANNOT BE REUSED, OR AIMED SOMEWHERE ELSE.
 *   3. A FILE THAT IS NOT A PDF IS REFUSED AND DELETED, whatever it is named.
 *      The name and the declared type are both attacker-chosen; the bytes are
 *      the only evidence.
 *   4. THE SAME FILE TWICE IS ONE ROW, and the duplicate object is removed.
 *   5. NOTHING IS ORPHANED. Every row has an object, every object has a row,
 *      and every link points at a file that exists — which is the difference
 *      between a link that 404s and one that works.
 *
 * Everything it creates, it deletes. Run it against the real database:
 *
 *   npm run check:uploads
 */

import { createHash } from "node:crypto";

import { getServiceClient } from "@/lib/supabase";
import { MAX_DOCUMENT_BYTES } from "@/lib/admin/document-rules";
import { MAX_IMAGE_BYTES } from "@/lib/admin/image-rules";
import { probeImage } from "@/lib/admin/image-probe";
import {
  DOCUMENT_BUCKET,
  IMAGE_BUCKET,
  UploadError,
  ingestDocument,
  ingestImage,
  signDocumentUpload,
  signImageUpload,
} from "@/lib/admin/uploads";

let failures = 0;

function fail(message: string): void {
  failures += 1;
  console.error(`  FAIL  ${message}`);
}

function ok(message: string): void {
  console.log(`  ok    ${message}`);
}

/** A real, tiny, valid PDF — enough to have a header and a trailer. */
function samplePdf(marker: string): Buffer {
  return Buffer.from(
    `%PDF-1.4\n% ${marker}\n` +
      "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n" +
      "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
      "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\n" +
      "trailer<</Root 1 0 R>>\n%%EOF\n"
  );
}

async function put(url: string, body: Buffer): Promise<Response> {
  return fetch(url, {
    method: "PUT",
    headers: { "content-type": "application/pdf" },
    body: new Uint8Array(body),
  });
}

/**
 * Does this object exist?
 *
 * Asked with `list`, which reads the object index, and NOT with `download`.
 * A download of a path that was read once and then deleted still succeeds for a
 * while — the storage API sits behind a cache, and a delete does not purge it.
 * The first version of this script used `download` and reported two files as
 * "left behind" that had in fact been deleted correctly.
 */
async function existsIn(bucket: string, path: string): Promise<boolean> {
  const at = path.lastIndexOf("/");
  const { data } = await getServiceClient()
    .storage.from(bucket)
    .list(path.slice(0, at), { search: path.slice(at + 1), limit: 1 });
  return (data ?? []).some((entry) => entry.name === path.slice(at + 1));
}

const exists = (path: string) => existsIn(DOCUMENT_BUCKET, path);

/** Every object in a bucket, as full paths. Storage has no recursive list. */
async function storedPaths(bucket: string): Promise<string[]> {
  const supabase = getServiceClient();
  const out: string[] = [];
  const roots = await supabase.storage.from(bucket).list("", { limit: 1000 });

  for (const entry of roots.data ?? []) {
    // A file at the root carries metadata; a folder does not.
    if (entry.metadata) {
      out.push(entry.name);
      continue;
    }
    const inside = await supabase.storage
      .from(bucket)
      .list(entry.name, { limit: 1000 });
    for (const file of inside.data ?? []) {
      if (file.metadata) out.push(`${entry.name}/${file.name}`);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Synthesised images                                                  */
/* ------------------------------------------------------------------ */

/**
 * Structurally real files, built here rather than committed as fixtures.
 *
 * The point of each is its header, which is the only part `probeImage` reads —
 * and building them in the open means the expected dimensions are visible next
 * to the assertion instead of being a property of a binary nobody can inspect.
 */
function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const head = Buffer.alloc(4);
  head.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([head, body, crc]);
}

function samplePng(width: number, height: number): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // truecolour with alpha
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function sampleJpeg(width: number, height: number): Buffer {
  const sof = Buffer.alloc(19);
  sof.writeUInt16BE(0xffc0, 0);
  sof.writeUInt16BE(17, 2); // segment length
  sof[4] = 8; // precision
  sof.writeUInt16BE(height, 5);
  sof.writeUInt16BE(width, 7);
  sof[9] = 3; // components
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    // An APP0 segment first, so the parser has to walk rather than assume.
    Buffer.from([0xff, 0xe0, 0x00, 0x10]),
    Buffer.from("JFIF\u0000\u0001\u0001\u0000\u0000\u0001\u0000\u0001\u0000\u0000", "latin1"),
    sof,
    Buffer.from([0xff, 0xd9]),
  ]);
}

function sampleWebp(width: number, height: number): Buffer {
  const body = Buffer.alloc(22);
  body.write("WEBP", 0, "latin1");
  body.write("VP8X", 4, "latin1");
  body.writeUInt32LE(10, 8); // chunk size
  body[12] = 0x10; // flags
  const w = width - 1;
  const h = height - 1;
  body[16] = w & 0xff;
  body[17] = (w >> 8) & 0xff;
  body[18] = (w >> 16) & 0xff;
  body[19] = h & 0xff;
  body[20] = (h >> 8) & 0xff;
  body[21] = (h >> 16) & 0xff;
  const head = Buffer.alloc(8);
  head.write("RIFF", 0, "latin1");
  head.writeUInt32LE(body.length, 4);
  return Buffer.concat([head, body]);
}

async function main(): Promise<void> {
  console.log("Checking the document links\n");

  const supabase = getServiceClient();
  const created: string[] = []; // upload ids
  const objects: string[] = []; // storage paths

  /* ---------------------------------------------------------------- */
  /* 1. The bucket's own limits                                        */
  /* ---------------------------------------------------------------- */
  const bucket = await supabase.storage.getBucket(DOCUMENT_BUCKET);
  if (bucket.error || !bucket.data) {
    fail(`the "${DOCUMENT_BUCKET}" bucket could not be read: ${bucket.error?.message}`);
  } else {
    if (bucket.data.file_size_limit !== MAX_DOCUMENT_BYTES) {
      fail(
        `the bucket allows ${bucket.data.file_size_limit ?? "any size"} but ` +
          `MAX_DOCUMENT_BYTES is ${MAX_DOCUMENT_BYTES}. The bucket is the only ` +
          `limit that runs before the bytes are stored — re-apply ` +
          `supabase/migrations/0002_document_storage.sql`
      );
    } else {
      ok(`the bucket refuses anything over ${MAX_DOCUMENT_BYTES / (1024 * 1024)} MB`);
    }

    const types = bucket.data.allowed_mime_types ?? null;
    if (!types || types.length !== 1 || types[0] !== "application/pdf") {
      fail(
        `the bucket accepts ${types ? types.join(", ") : "any type"}. It is public, ` +
          `so anything storable there is servable from a supabase.co URL`
      );
    } else {
      ok("the bucket accepts PDFs only");
    }
  }

  try {
    /* -------------------------------------------------------------- */
    /* 2. A signed URL is one-shot and path-bound                      */
    /* -------------------------------------------------------------- */
    const signed = await signDocumentUpload("check.pdf");
    objects.push(signed.path);

    const first = await put(signed.signedUrl, samplePdf("first"));
    if (!first.ok) {
      fail(`a signed URL did not accept its own upload (${first.status})`);
    }

    const second = await put(signed.signedUrl, samplePdf("second"));
    if (second.ok) {
      fail(
        "a signed upload URL worked twice — handing one to the browser would be " +
          "a standing write grant on that path"
      );
    } else {
      ok("a signed URL works exactly once");
    }

    const elsewhere = signed.signedUrl.replace(/[^/?]+\.pdf/, "elsewhere.pdf");
    const wrongPath = await put(elsewhere, samplePdf("elsewhere"));
    if (wrongPath.ok) {
      objects.push(elsewhere.split("?")[0].split(`/${DOCUMENT_BUCKET}/`)[1]);
      fail("a signed URL uploaded to a path it was not signed for");
    } else {
      ok("a signed URL cannot be aimed at another path");
    }

    /* -------------------------------------------------------------- */
    /* 3. The bytes decide, not the name                               */
    /* -------------------------------------------------------------- */
    const liar = await signDocumentUpload("invoice.pdf");
    const liarUpload = await put(
      liar.signedUrl,
      Buffer.from("<html><script>alert(1)</script></html>")
    );
    if (!liarUpload.ok) {
      // The bucket refused it on the declared type. Also fine — but say which
      // gate caught it, because they fail independently.
      ok("a non-PDF was refused by the bucket before it was stored");
    } else {
      let refused = false;
      try {
        const result = await ingestDocument({
          path: liar.path,
          filename: "invoice.pdf",
          adminId: null,
        });
        created.push(result.uploadId);
        objects.push(liar.path);
      } catch (error) {
        refused = error instanceof UploadError;
      }
      if (!refused) {
        fail("an HTML file named .pdf was accepted into a public bucket");
      } else {
        if (await exists(liar.path)) {
          objects.push(liar.path);
          fail("a refused file was left behind in the bucket");
        } else {
          ok("a file that is not a PDF is refused and deleted");
        }
      }
    }

    /* -------------------------------------------------------------- */
    /* 4. The same file twice is one row                               */
    /* -------------------------------------------------------------- */
    const bytes = samplePdf(`dedupe-${createHash("sha1").update("cw").digest("hex")}`);

    const one = await signDocumentUpload("newsletter.pdf");
    await put(one.signedUrl, bytes);
    const firstIngest = await ingestDocument({
      path: one.path,
      filename: "newsletter.pdf",
      adminId: null,
    });
    created.push(firstIngest.uploadId);
    objects.push(one.path);

    if (firstIngest.deduped) {
      // Not a failure on its own: the same bytes may be there from a real
      // upload. Say so rather than asserting against the client's data.
      console.log("  note  those bytes were already in the library");
    }

    const two = await signDocumentUpload("newsletter-copy.pdf");
    await put(two.signedUrl, bytes);
    const secondIngest = await ingestDocument({
      path: two.path,
      filename: "newsletter-copy.pdf",
      adminId: null,
    });

    if (!secondIngest.deduped || secondIngest.uploadId !== firstIngest.uploadId) {
      created.push(secondIngest.uploadId);
      objects.push(two.path);
      fail("the same file uploaded twice produced two rows");
    } else {
      if (await exists(two.path)) {
        objects.push(two.path);
        fail("the duplicate upload was left in the bucket");
      } else {
        ok("the same file twice is one row, and the second copy is removed");
      }
    }
  } catch (error) {
    fail(`the round trip did not complete: ${(error as Error).message}`);
  } finally {
    if (created.length > 0) {
      await supabase.from("uploads").delete().in("id", created);
    }
    if (objects.length > 0) {
      await supabase.storage.from(DOCUMENT_BUCKET).remove(objects);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Photographs                                                       */
  /* ---------------------------------------------------------------- */

  const imageBucket = await supabase.storage.getBucket(IMAGE_BUCKET);
  if (imageBucket.error || !imageBucket.data) {
    fail(`the "${IMAGE_BUCKET}" bucket could not be read: ${imageBucket.error?.message}`);
  } else {
    if (imageBucket.data.file_size_limit !== MAX_IMAGE_BYTES) {
      fail(
        `the images bucket allows ${imageBucket.data.file_size_limit ?? "any size"} ` +
          `but MAX_IMAGE_BYTES is ${MAX_IMAGE_BYTES} — re-apply ` +
          `supabase/migrations/0003_image_storage.sql`
      );
    } else {
      ok(`the images bucket refuses anything over ${MAX_IMAGE_BYTES / (1024 * 1024)} MB`);
    }

    const types = [...(imageBucket.data.allowed_mime_types ?? [])].sort();
    const wanted = ["image/jpeg", "image/png", "image/webp"];
    if (types.join(",") !== wanted.join(",")) {
      fail(
        `the images bucket accepts ${types.length ? types.join(", ") : "any type"}. ` +
          `It is public and served from a supabase.co origin, so an SVG there ` +
          `would be a scriptable document on that domain`
      );
    } else {
      ok("the images bucket accepts JPG, PNG and WebP only — no SVG");
    }
  }

  /* The header parsers are hand-written, so every format is read back. A wrong
     answer here is silent: the row simply records a size nobody checks. */
  for (const [label, bytes, expected] of [
    ["PNG", samplePng(800, 600), { format: "image/png", width: 800, height: 600 }],
    ["JPEG", sampleJpeg(1024, 768), { format: "image/jpeg", width: 1024, height: 768 }],
    ["WebP", sampleWebp(1200, 900), { format: "image/webp", width: 1200, height: 900 }],
  ] as const) {
    const probe = probeImage(bytes as Buffer);
    const got = probe
      ? `${probe.format} ${probe.width}x${probe.height}`
      : "not recognised";
    const want = `${expected.format} ${expected.width}x${expected.height}`;
    if (got !== want) {
      fail(`a ${label} header was read as ${got}, expected ${want}`);
    } else {
      ok(`a ${label} header gives its real format and size (${want})`);
    }
  }

  if (probeImage(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>"))) {
    fail("an SVG was recognised as an image this accepts");
  } else {
    ok("an SVG is not recognised as an image");
  }

  /* And the round trip: a real upload, and one that lies about its format. */
  const images: string[] = [];
  const imageRows: string[] = [];
  try {
    const good = await signImageUpload("photo.png");
    const put1 = await fetch(good.signedUrl, {
      method: "PUT",
      headers: { "content-type": "image/png" },
      body: new Uint8Array(samplePng(1400, 933)),
    });
    if (!put1.ok) {
      fail(`an image upload was refused by the bucket (${put1.status})`);
    } else {
      const added = await ingestImage({
        path: good.path,
        filename: "photo.png",
        adminId: null,
      });
      imageRows.push(added.uploadId);
      images.push(good.path);
      if (added.width !== 1400 || added.height !== 933) {
        fail(`the stored size was ${added.width}x${added.height}, expected 1400x933`);
      } else if (!added.src.includes("/storage/v1/object/public/images/")) {
        fail(`the returned src is not a public image URL: ${added.src}`);
      } else {
        ok("a photograph is stored with the size read from its own header");
      }
    }

    /* A JPEG named .png. The bucket cannot catch this — the declared type
       matches the name, and the name is the thing that is wrong. */
    const liar = await signImageUpload("screenshot.png");
    const put2 = await fetch(liar.signedUrl, {
      method: "PUT",
      headers: { "content-type": "image/png" },
      body: new Uint8Array(sampleJpeg(100, 100)),
    });
    if (put2.ok) {
      let refused = false;
      try {
        const wrong = await ingestImage({
          path: liar.path,
          filename: "screenshot.png",
          adminId: null,
        });
        imageRows.push(wrong.uploadId);
        images.push(liar.path);
      } catch (error) {
        refused = error instanceof UploadError;
      }
      if (!refused) {
        fail("a JPEG named .png was accepted");
      } else if (await existsIn(IMAGE_BUCKET, liar.path)) {
        images.push(liar.path);
        fail("a refused photograph was left behind in the bucket");
      } else {
        ok("a file whose header disagrees with its name is refused and deleted");
      }
    }
  } catch (error) {
    fail(`the photograph round trip did not complete: ${(error as Error).message}`);
  } finally {
    if (imageRows.length > 0) {
      await supabase.from("uploads").delete().in("id", imageRows);
    }
    if (images.length > 0) {
      await supabase.storage.from(IMAGE_BUCKET).remove(images);
    }
  }

  /* ---------------------------------------------------------------- */
  /* 5. Nothing orphaned                                               */
  /* ---------------------------------------------------------------- */
  /**
   * Both buckets, the same two questions.
   *
   * A row with no object is a link or an image that 404s. An object with no row
   * is invisible in the admin, so it is never cleaned up and never appears — it
   * just occupies a public bucket. Neither says anything at the time it happens.
   */
  for (const bucket of [DOCUMENT_BUCKET, IMAGE_BUCKET]) {
    const rows = await supabase
      .from("uploads")
      .select("id, path, filename")
      .eq("bucket", bucket)
      .returns<{ id: string; path: string; filename: string }[]>();

    if (rows.error) {
      fail(`the ${bucket} library could not be read: ${rows.error.message}`);
      continue;
    }

    const known = new Map((rows.data ?? []).map((row) => [row.path, row]));
    const stored = new Set(await storedPaths(bucket));

    for (const [path, row] of known) {
      if (!stored.has(path)) {
        fail(`"${row.filename}" is in the ${bucket} library but its file is gone (${path})`);
      }
    }
    for (const path of stored) {
      if (!known.has(path)) fail(`"${path}" is in the ${bucket} bucket with no row`);
    }

    ok(`${bucket}: ${known.size} file(s) in the library, ${stored.size} object(s) stored`);
  }

  const links = await supabase
    .from("document_links")
    .select("slug, title, uploads(path)")
    .returns<{ slug: string; title: string; uploads: { path: string } | null }[]>();

  if (links.error) {
    fail(`the links could not be read: ${links.error.message}`);
  } else {
    for (const link of links.data ?? []) {
      if (!link.uploads) fail(`/d/${link.slug} points at a file that is not there`);
    }
    ok(`${links.data?.length ?? 0} link(s), all resolving`);
  }

  if (failures > 0) {
    console.error(`\n  ${failures} check(s) failed\n`);
    process.exitCode = 1;
    return;
  }
  console.log("\n  All checks passed\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
