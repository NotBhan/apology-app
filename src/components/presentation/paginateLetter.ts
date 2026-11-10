/**
 * Splits a personal note into readable pages.
 *
 * The letter card clips its content, so a long note was simply cut off. Pages
 * break on paragraph boundaries where possible and on word boundaries inside a
 * long paragraph, never mid-word. The caller shows one page at a time.
 */
export const LETTER_PAGE_CHARS = 240;

export function paginateLetter(text: string, maxChars: number = LETTER_PAGE_CHARS): string[] {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (!clean) return [""];

  const pages: string[] = [];
  let current = "";

  const flush = () => {
    if (current.trim()) pages.push(current.trim());
    current = "";
  };

  const add = (block: string) => {
    if (!current) {
      current = block;
      return;
    }
    if (`${current}\n\n${block}`.length <= maxChars) {
      current = `${current}\n\n${block}`;
      return;
    }
    flush();
    current = block;
  };

  for (const paragraph of clean.split(/\n{2,}/)) {
    if (paragraph.length <= maxChars) {
      add(paragraph);
      continue;
    }

    let chunk = "";
    for (const word of paragraph.split(/\s+/)) {
      if (!chunk) {
        chunk = word;
        continue;
      }
      if (`${chunk} ${word}`.length <= maxChars) {
        chunk = `${chunk} ${word}`;
      } else {
        add(chunk);
        chunk = word;
      }
    }
    if (chunk) add(chunk);
  }

  flush();
  return pages.length > 0 ? pages : [clean];
}
