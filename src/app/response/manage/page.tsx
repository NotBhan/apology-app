"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import { useMounted } from "@/hooks/useMounted";

interface StoredCapability {
  responseId?: string;
  manageToken: string;
  apologyId?: string;
  createdAt?: string;
}

export default function GeneralManagePage() {
  const mounted = useMounted();

  const capabilities = useMemo(() => {
    if (!mounted) return [];
    try {
      const raw = localStorage.getItem("koi_reply_capabilities");
      if (raw) {
        return Object.values(JSON.parse(raw)) as StoredCapability[];
      }
    } catch {
      // Ignore
    }
    return [];
  }, [mounted]);

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-[#faf6ff] px-4 py-16">
      <div className="w-full max-w-[500px]">
        <div className="mb-6 text-center">
          <Link
            href="/"
            className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[#a394b4] hover:text-[#7a4fb0]"
          >
            ← Koi Koi
          </Link>
          <h1 className="mt-2 text-[1.4rem] font-semibold text-[#33203f]">
            Your Saved Replies
          </h1>
          <p className="mt-1 text-xs text-[#8a7a9c]">
            Manage replies you sent from this browser
          </p>
        </div>

        {mounted ? (
          capabilities.length > 0 ? (
            <div className="space-y-3">
              {capabilities.map((cap, idx) => (
                <div
                  key={cap.manageToken || idx}
                  className="flex items-center justify-between rounded-2xl border border-[#ece2f6] bg-white p-4 shadow-sm"
                >
                  <div>
                    <p className="text-xs font-semibold text-[#33203f]">
                      Reply #{idx + 1}
                    </p>
                    <p className="mt-0.5 text-[0.68rem] text-[#8a7a9c]">
                      {cap.createdAt
                        ? `Created ${new Date(cap.createdAt).toLocaleDateString()}`
                        : "Active response"}
                    </p>
                  </div>
                  <Link
                    href={`/response/manage/${cap.manageToken}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#6d3fa8] px-4 py-1.5 text-xs font-semibold text-white transition active:scale-95"
                  >
                    <span>Manage</span>
                    <Icon name="arrow-right" size={13} />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-[#ece2f6] bg-white p-8 text-center shadow-md">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#f2eafc] text-[#6d3fa8]">
                <Icon name="message" size={18} />
              </div>
              <h2 className="mt-3 text-sm font-semibold text-[#33203f]">
                No replies found
              </h2>
              <p className="mt-1 text-xs text-[#8a7a9c] leading-relaxed">
                If you recently sent a reply, use the private management link provided when you created it.
              </p>
              <div className="mt-5">
                <Link
                  href="/"
                  className="inline-flex items-center rounded-full bg-[#6d3fa8] px-5 py-2 text-xs font-semibold text-white transition active:scale-95"
                >
                  Return Home
                </Link>
              </div>
            </div>
          )
        ) : null}
      </div>
    </main>
  );
}
