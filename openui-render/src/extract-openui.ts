function createOpenUIRegex(): RegExp {
  return /\x60{3}(?:[a-zA-Z0-9_.-]+:)?(?:openui-lang|openui)[^\S\r\n]*\r?\n([\s\S]*?)(?:\x60{3}|$)/gi;
}

/**
 * Extract the newest OpenUI Lang fenced block from an assistant response or source text.
 * The end-of-string alternative deliberately accepts an unfinished fence, allowing
 * the Renderer to progressively parse the model's stream.
 */
export function extractOpenUILang(text: string): string {
  if (!text) return "";
  const regex = createOpenUIRegex();
  const matches = [...text.matchAll(regex)];
  const last = matches.at(-1)?.[1]?.replace(/[\s\r\n]+$/, "") ?? "";
  if (last) return last;

  // If the text itself doesn't have markdown code fences but is directly OpenUI code
  const trimmed = text.trim();
  if (/^(?:[a-zA-Z0-9_]+\s*=\s*|root\s*=\s*Lesson\()/m.test(trimmed) && !trimmed.startsWith("```")) {
    return trimmed;
  }
  return "";
}

/** Check if text contains an OpenUI block */
export function hasOpenUIBlock(text: string): boolean {
  if (!text) return false;
  const regex = createOpenUIRegex();
  return regex.test(text);
}
