"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";

import type { ImageSlot } from "@/lib/admin/image-slots";
import { SMALL_IMAGE_WIDTH } from "@/lib/admin/image-rules";
import {
  cropToFile,
  loadImage,
  outputSize,
  type CropArea,
  type LoadedImage,
} from "@/lib/admin/image-crop";

/**
 * Fitting a photograph to the frame it will be shown in, before it uploads.
 *
 * Sits between choosing a file and sending it: the file arrives here, the
 * client drags and zooms it inside a frame of the slot's shape, and what
 * leaves is a new file the ordinary upload path takes from there. "Use as
 * is" leaves without cropping, so nothing about the old way in is lost —
 * this is a step that can be skipped, not a gate.
 *
 * A native <dialog> opened with showModal(), as the help panel is, for the
 * same parts: a backdrop, focus held inside, Escape to close. The gestures —
 * drag, pinch, wheel, arrow keys — are react-easy-crop's; the canvas work is
 * ours, in image-crop.ts.
 *
 * The shapes on offer are the slot's, then the common ones, then the
 * picture's own. The slot's is selected to begin with and says what it is
 * for, which is the one thing the form could not tell the client before:
 * that a lot's picture goes in a 4:3 card, a person's in a square.
 */

interface Shape {
  id: string;
  label: string;
  aspect: number;
  hint?: string;
}

const COMMON: Shape[] = [
  { id: "1:1", label: "Square", aspect: 1 },
  { id: "4:3", label: "4:3", aspect: 4 / 3 },
  { id: "3:2", label: "3:2", aspect: 3 / 2 },
  { id: "16:9", label: "16:9", aspect: 16 / 9 },
];

export function ImageCropper({
  file,
  name,
  slot,
  onDone,
  onCancel,
}: {
  file: Blob;
  /** The filename the result is named after. */
  name: string;
  slot: ImageSlot | null;
  /** The file to upload: the crop, or the original when the client skips. */
  onDone: (file: File | Blob, cropped: boolean) => void;
  onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [image, setImage] = useState<LoadedImage | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<CropArea | null>(null);
  const [shapeId, setShapeId] = useState<string>(slot ? "slot" : "original");
  const [busy, setBusy] = useState(false);

  /* Decode once, revoke on the way out. The object URL and the bitmap both
     hold the whole photograph in memory; a dialog closed and left them
     behind would keep a 10 MB decode alive for the rest of the session. */
  useEffect(() => {
    let live = true;
    let loaded: LoadedImage | null = null;
    loadImage(file)
      .then((result) => {
        if (!live) return result.revoke();
        loaded = result;
        setImage(result);
      })
      .catch(() => {
        if (live) setProblem("That photograph could not be opened for cropping.");
      });
    return () => {
      live = false;
      loaded?.revoke();
    };
  }, [file]);

  useEffect(() => {
    const el = dialog.current;
    if (el && !el.open) el.showModal();
  }, []);

  const shapes = useMemo<Shape[]>(() => {
    const own: Shape[] = image
      ? [{ id: "original", label: "As it is", aspect: image.width / image.height }]
      : [];
    const first: Shape[] = slot
      ? [{ id: "slot", label: slot.label, aspect: slot.aspect, hint: slot.hint }]
      : [];
    return [...first, ...COMMON, ...own];
  }, [image, slot]);

  const shape = shapes.find((s) => s.id === shapeId) ?? shapes[0];
  const size = area ? outputSize(area) : null;

  const finish = async () => {
    if (!image || !area) return;
    setBusy(true);
    try {
      onDone(await cropToFile(image, area, name), true);
    } catch (error) {
      setBusy(false);
      setProblem((error as Error).message);
    }
  };

  return (
    <dialog
      ref={dialog}
      className="admin-crop"
      aria-labelledby="admin-crop-title"
      onClose={onCancel}
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className="admin-crop-inner">
        <div className="admin-crop-head">
          <h2 id="admin-crop-title">Fit the photograph</h2>
          <p className="admin-help">
            Drag to move, pinch or scroll to zoom. Choose a shape, then Use
            this crop — or Use as is to upload the photograph unchanged.
          </p>
        </div>

        <div className="admin-crop-stage">
          {image && shape && (
            <Cropper
              image={image.url}
              crop={crop}
              zoom={zoom}
              aspect={shape.aspect}
              minZoom={1}
              maxZoom={4}
              showGrid
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setArea(pixels)}
            />
          )}
          {!image && !problem && <p className="admin-crop-wait">Opening the photograph…</p>}
          {problem && <p className="admin-crop-wait admin-f-error">{problem}</p>}
        </div>

        <div className="admin-crop-controls">
          <div className="admin-crop-shapes" role="radiogroup" aria-label="Shape">
            {shapes.map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={s.id === shape?.id}
                className={`admin-btn${s.id === shape?.id ? " is-selected" : ""}`}
                onClick={() => {
                  setShapeId(s.id);
                  setZoom(1);
                  setCrop({ x: 0, y: 0 });
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
          {shape?.hint && <p className="admin-help">{shape.hint}</p>}

          <label className="admin-crop-zoom">
            Zoom
            <input
              type="range"
              min={1}
              max={4}
              step={0.01}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
            />
          </label>

          {size && (
            <p className="admin-help">
              Comes out at {size.width}×{size.height}.
              {size.width < SMALL_IMAGE_WIDTH &&
                " That is under " + SMALL_IMAGE_WIDTH + "px wide, so it will look soft on a large screen — zoom out, or start from a bigger photograph."}
            </p>
          )}
        </div>

        <div className="admin-crop-actions">
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            disabled={!image || !area || busy}
            onClick={() => void finish()}
          >
            {busy ? "Preparing…" : "Use this crop"}
          </button>
          <button
            type="button"
            className="admin-btn"
            disabled={busy}
            onClick={() => onDone(file, false)}
          >
            Use as is
          </button>
          <button type="button" className="admin-btn admin-btn-quiet" disabled={busy} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </dialog>
  );
}
