import { describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import { SITUATIONS } from "@/content/situations";
import { ICONS, type IconName } from "@/components/ui/icons";
import {
  DECORATIVE_BY_THEME,
  DECORATIVE_SYMBOLS,
  FUNCTIONAL_SYMBOLS,
  SITUATION_SYMBOLS,
  findEmoji,
} from "./symbols";
import { THEME_LIST } from "@/themes/registry";
import { SITUATION_KEYS } from "@/types/apology";

const ROOT = path.join(process.cwd(), "src");

async function sourceFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return sourceFiles(full);
      return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
    }),
  );
  return files.flat();
}

describe("symbol registry", () => {
  it("gives every functional symbol a meaning and at least one context", () => {
    for (const symbol of FUNCTIONAL_SYMBOLS) {
      expect(symbol.id.length).toBeGreaterThan(1);
      expect(symbol.meaning.length).toBeGreaterThan(10);
      expect(symbol.contexts.length).toBeGreaterThan(0);
      expect(symbol.kind).toBe("functional");
    }
  });

  it("uses unique ids", () => {
    const ids = FUNCTIONAL_SYMBOLS.map((symbol) => symbol.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only references icons that exist in the icon set", () => {
    for (const symbol of FUNCTIONAL_SYMBOLS) {
      expect(ICONS, `missing icon for ${symbol.id}`).toHaveProperty(symbol.id);
    }
  });

  it("documents an accessible name for standalone controls", () => {
    const standalone = ["play", "pause", "volume-on", "volume-off", "chevron-left"];
    for (const id of standalone) {
      const symbol = FUNCTIONAL_SYMBOLS.find((entry) => entry.id === id);
      expect(symbol?.ariaLabel, `${id} needs an aria label`).toBeTruthy();
    }
  });
});

describe("situations", () => {
  it("covers every situation", () => {
    expect(Object.keys(SITUATION_SYMBOLS).sort()).toEqual([...SITUATION_KEYS].sort());
  });

  it("maps each situation to a distinct, existing icon", () => {
    const icons = new Set<string>();
    for (const [situation, mapping] of Object.entries(SITUATION_SYMBOLS)) {
      expect(ICONS, `${situation} -> ${mapping.icon}`).toHaveProperty(mapping.icon);
      expect(mapping.meaning.length).toBeGreaterThan(5);
      icons.add(mapping.icon);
    }
    // No two situations share a symbol: they are describing different events.
    expect(icons.size).toBe(Object.keys(SITUATION_SYMBOLS).length);
  });

  it("keeps the picker's symbols and the registry in agreement", () => {
    for (const option of SITUATIONS) {
      expect(option.icon).toBe(SITUATION_SYMBOLS[option.key].icon);
      expect(ICONS).toHaveProperty(option.icon);
    }
  });

  it("matches a hurtful word to a speech symbol and a fight to a rupture, not the reverse", () => {
    expect(SITUATION_SYMBOLS["said-hurtful"].icon).toBe("message-circle-off");
    expect(SITUATION_SYMBOLS.fight.icon).toBe("heart-crack");
    expect(SITUATION_SYMBOLS["forgot-special"].icon).toBe("calendar-off");
    expect(SITUATION_SYMBOLS["broke-promise"].icon).toBe("link-off");
  });
});

describe("theme decoration", () => {
  it("declares a decorative family for every theme", () => {
    for (const theme of THEME_LIST) {
      expect(DECORATIVE_BY_THEME[theme.id]).toBeDefined();
      expect(DECORATIVE_SYMBOLS[DECORATIVE_BY_THEME[theme.id]]).toBeTruthy();
    }
  });

  it("describes every ambient family", () => {
    for (const description of Object.values(DECORATIVE_SYMBOLS)) {
      expect(description.length).toBeGreaterThan(10);
    }
  });
});

describe("emoji audit", () => {
  it("contains no Unicode emoji anywhere in the source", async () => {
    const files = await sourceFiles(ROOT);
    const offenders: { file: string; emoji: string[] }[] = [];

    for (const file of files) {
      // The detector itself is allowed to name the ranges it forbids.
      if (file.endsWith(path.join("design", "symbols.ts"))) continue;
      const content = await fs.readFile(file, "utf8");
      const found = findEmoji(content);
      if (found.length > 0) offenders.push({ file, emoji: [...new Set(found)] });
    }

    expect(offenders, JSON.stringify(offenders, null, 2)).toEqual([]);
  });

  it("detects the emoji it claims to detect", () => {
    expect(findEmoji("I forgive you \u{1F970}")).toHaveLength(1);
    expect(findEmoji("a plain sentence, with punctuation - and an em dash —")).toHaveLength(0);
    expect(findEmoji("→ ← · ×")).toHaveLength(0);
  });

  it("keeps icon names typed so a typo cannot slip through", () => {
    const names: IconName[] = Object.keys(ICONS) as IconName[];
    expect(names).toContain("heart-crack");
    expect(names).not.toContain("heart-crackk" as IconName);
  });
});
