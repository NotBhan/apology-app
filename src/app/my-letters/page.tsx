import type { Metadata } from "next";

/**
 * Canonical creator dashboard.
 *
 * The implementation lives in the legacy `/manage` route so old links keep
 * working; that page calls `requirePageCreator()` itself, so this re-export
 * cannot bypass the gate.
 *
 * `dynamic` and `metadata` are declared here rather than re-exported — Next
 * rejects a re-exported route segment config.
 */
export { default } from "../manage/page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Experiences",
  robots: { index: false, follow: false },
};
