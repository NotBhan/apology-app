import { cn } from "@/lib/cn";

/**
 * Loading placeholders. Static markup, no client hooks, so they can render
 * instantly while the dynamic page streams in.
 */

function Block({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-xl bg-[#eee6f7]", className)} />
  );
}

/** Used by the creator-facing routes, which share one shell. */
export function CreatorShellSkeleton({ label = "Loading" }: { label?: string }) {
  return (
    <div className="min-h-svh bg-[#faf6ff]" aria-busy="true" aria-label={label}>
      <div className="mx-auto w-full max-w-[600px] px-5 pt-6">
        <div className="mb-6 flex items-center justify-between">
          <Block className="h-3 w-24" />
          <Block className="h-3 w-12" />
        </div>
        <div className="mb-7 flex gap-1.5">
          {Array.from({ length: 7 }).map((_, index) => (
            <Block key={index} className="h-[3px] flex-1 rounded-full" />
          ))}
        </div>
        <Block className="h-3 w-20" />
        <Block className="mt-4 h-8 w-3/4 rounded-2xl" />
        <Block className="mt-3 h-4 w-full" />
        <Block className="mt-2 h-4 w-5/6" />
        <div className="mt-8 space-y-3">
          <Block className="h-14 w-full rounded-2xl" />
          <Block className="h-14 w-full rounded-2xl" />
          <Block className="h-14 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

/** Used by the recipient route while the letter is fetched and composed. */
export function LetterSkeleton() {
  return (
    <div
      className="flex min-h-svh items-center justify-center bg-[#f6efe9]"
      aria-busy="true"
      aria-label="Opening your letter"
    >
      <div className="w-full max-w-[320px] px-6 text-center">
        <div className="mx-auto h-28 w-28 animate-pulse rounded-full bg-[#e6d8ca]" />
        <Block className="mx-auto mt-8 h-4 w-2/3" />
        <Block className="mx-auto mt-3 h-3 w-1/2" />
        <p className="mt-8 text-[0.68rem] uppercase tracking-[0.24em] text-[#a394b4]">
          opening your letter
        </p>
      </div>
    </div>
  );
}

/** Used by the preview route, which shows a phone-shaped frame. */
export function PreviewSkeleton() {
  return (
    <div className="min-h-svh bg-[#efe9f7]" aria-busy="true" aria-label="Loading preview">
      <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-5 px-4 py-5 lg:flex-row lg:gap-8 lg:py-8">
        <div className="flex flex-1 justify-center">
          <div className="h-[74svh] max-h-[760px] min-h-[560px] w-full max-w-[392px] animate-pulse rounded-[36px] bg-white/70" />
        </div>
        <div className="w-full shrink-0 space-y-3 rounded-3xl border border-white bg-white/80 p-5 lg:w-[300px]">
          <Block className="h-3 w-20" />
          <Block className="h-6 w-2/3" />
          <Block className="h-3 w-1/2" />
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Block className="h-9 rounded-full" />
            <Block className="h-9 rounded-full" />
            <Block className="col-span-2 h-9 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
