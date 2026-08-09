"use client";

import { useState } from "react";

import { listImages, type LibraryImage } from "@/lib/admin/image-actions";

/**
 * Choosing a photograph already uploaded, rather than uploading it again.
 *
 * Upload alone left one thing awkward: using the same photograph on a second
 * lot meant still having the original file to hand. The checksum dedupe made
 * that harmless — the same bytes reuse the same row — but only if the file is
 * still on the machine, which after a few months it will not be.
 *
 * Loaded when the button is pressed, not when the form renders. There is one of
 * these per image field, and the catalog editor renders one per lot: fetching a
 * library nobody opened, ninety times, to populate a panel that is closed, is a
 * cost paid on every page load for a feature used occasionally.
 */
export function ImagePicker({
  onChosen,
}: {
  onChosen: (image: { src: string; width: number | null; height: number | null }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<LibraryImage[] | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (images !== null) return; // already loaded; reopening is free

    setLoading(true);
    try {
      setImages(await listImages());
    } catch {
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-image-picker">
      <button type="button" className="admin-btn" onClick={toggle}>
        {open ? "Close the library" : "Choose an uploaded photograph"}
      </button>

      {open && (
        <div className="admin-image-library">
          {loading && <p className="admin-help">Loading…</p>}

          {!loading && images !== null && images.length === 0 && (
            <p className="admin-help">
              Nothing uploaded yet. Photographs you upload here appear in this
              list, so you can reuse one without finding the file again. The
              pictures already on the site came with it and are set by their
              path in the box above.
            </p>
          )}

          {!loading && images !== null && images.length > 0 && (
            <>
              <p className="admin-help">
                Photographs uploaded through this admin. Choosing one changes
                the picture only — the description underneath is yours to write.
              </p>
              <ul className="admin-image-grid">
                {images.map((image) => (
                  <li key={image.id}>
                    <button
                      type="button"
                      title={`${image.filename} — uploaded ${image.uploadedLabel}`}
                      onClick={() => {
                        onChosen({
                          src: image.src,
                          width: image.width,
                          height: image.height,
                        });
                        setOpen(false);
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.src} alt="" loading="lazy" />
                      <span>{image.filename}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
