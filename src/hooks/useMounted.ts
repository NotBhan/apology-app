"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * `false` during server rendering and the first client paint, `true` after
 * hydration. Use it to defer anything whose value depends on locale or
 * timezone: the server formats dates in UTC, the browser in local time, and
 * rendering both in the same tree produces a hydration mismatch.
 *
 * Implemented with `useSyncExternalStore` rather than a mount effect so it
 * never triggers a cascading render.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
