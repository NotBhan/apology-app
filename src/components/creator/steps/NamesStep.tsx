"use client";

import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";

interface NamesStepProps {
  recipientName: string;
  senderName: string;
  errors?: Record<string, string>;
  onChange: (patch: { recipientName?: string; senderName?: string }) => void;
  onNext: () => void;
}

export function NamesStep({ recipientName, senderName, errors = {}, onChange, onNext }: NamesStepProps) {
  const ready = recipientName.trim().length > 0 && senderName.trim().length > 0;

  return (
    <div className="space-y-7">
      <header className="space-y-2">
        <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[#a394b4]">step one</p>
        <h1
          className="text-[clamp(1.6rem,6vw,2rem)] leading-tight text-[#33203f]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Who is this for?
        </h1>
        <p className="text-[0.86rem] leading-relaxed text-[#7c6892]">
          Two names is all we need to start. Everything else you can change later.
        </p>
      </header>

      <div className="space-y-5">
        <Field
          label="Their first name"
          htmlFor="recipient"
          hint={errors.recipientName}
        >
          <TextInput
            id="recipient"
            value={recipientName}
            onChange={(event) => onChange({ recipientName: event.target.value })}
            placeholder="Ananya"
            autoComplete="off"
            maxLength={40}
            aria-invalid={Boolean(errors.recipientName)}
          />
        </Field>

        <Field label="Your first name" htmlFor="sender" hint={errors.senderName}>
          <TextInput
            id="sender"
            value={senderName}
            onChange={(event) => onChange({ senderName: event.target.value })}
            placeholder="Rohan"
            autoComplete="off"
            maxLength={40}
            aria-invalid={Boolean(errors.senderName)}
          />
        </Field>
      </div>

      <div className="rounded-2xl border border-[#ece2f6] bg-white/70 px-4 py-3">
        <p className="text-[0.75rem] leading-relaxed text-[#7c6892]">
          This stays private. Only the person with the link can open it, and it is never indexed
          by search engines.
        </p>
      </div>

      <Button size="lg" full onClick={onNext} disabled={!ready}>
        Continue
      </Button>
    </div>
  );
}
