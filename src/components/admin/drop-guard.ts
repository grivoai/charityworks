"use client";

import { useEffect } from "react";

/**
 * Stops a photograph dropped BESIDE a drop zone from replacing the editor.
 *
 * A browser's default answer to a dropped file is to navigate to it: the tab
 * that held the form now shows the JPEG, and everything typed since the last
 * save is gone. Once a page offers a drop zone, that is exactly what will
 * happen — somebody aims for the zone, lets go an inch outside it, and loses
 * twenty minutes of work to a picture of a guitar.
 *
 * So while any drop zone is mounted, the window refuses drops everywhere
 * else. `dragover` has to be cancelled as well, because that is what the
 * browser reads as "a drop is allowed here": with it cancelled and the
 * effect set to `none`, the cursor says no and the `drop` never navigates.
 * A zone's own handlers stop the event before it reaches these, so the zone
 * still reads as the one place a drop means something.
 *
 * Ref-counted rather than installed per zone. The catalog editor draws one
 * upload control per lot, and ninety pairs of window listeners doing the same
 * thing is ninety times too many.
 */
let zones = 0;

function refuse(event: DragEvent) {
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "none";
}

export function useStrayDropGuard(): void {
  useEffect(() => {
    if (zones === 0) {
      window.addEventListener("dragover", refuse);
      window.addEventListener("drop", refuse);
    }
    zones += 1;

    return () => {
      zones -= 1;
      if (zones === 0) {
        window.removeEventListener("dragover", refuse);
        window.removeEventListener("drop", refuse);
      }
    };
  }, []);
}
