/** Fix contractions split by the shell when apostrophes are unquoted (don t → don't). */
const CONTRACTION_FIXES: [RegExp, string][] = [
  [/\bdon t\b/gi, "don't"],
  [/\bwon t\b/gi, "won't"],
  [/\bcan t\b/gi, "can't"],
  [/\bisn t\b/gi, "isn't"],
  [/\baren t\b/gi, "aren't"],
  [/\bwasn t\b/gi, "wasn't"],
  [/\bweren t\b/gi, "weren't"],
  [/\bhasn t\b/gi, "hasn't"],
  [/\bhaven t\b/gi, "haven't"],
  [/\bhadn t\b/gi, "hadn't"],
  [/\bwouldn t\b/gi, "wouldn't"],
  [/\bshouldn t\b/gi, "shouldn't"],
  [/\bcouldn t\b/gi, "couldn't"],
  [/\bdoesn t\b/gi, "doesn't"],
  [/\bdidn t\b/gi, "didn't"],
  [/\bit s\b/gi, "it's"],
  [/\bthat s\b/gi, "that's"],
  [/\bwhat s\b/gi, "what's"],
  [/\bwho s\b/gi, "who's"],
  [/\bhere s\b/gi, "here's"],
  [/\bthere s\b/gi, "there's"],
  [/\bwhere s\b/gi, "where's"],
  [/\bwe re\b/gi, "we're"],
  [/\bthey re\b/gi, "they're"],
  [/\byou re\b/gi, "you're"],
  [/\bI m\b/g, "I'm"],
];

function fixContractions(text: string): string {
  let result = text;
  for (const [pattern, replacement] of CONTRACTION_FIXES) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/** Collapse runs of blank lines to a single paragraph break. */
function collapseExtraNewlines(text: string): string {
  return text.replace(/\n{2,}/g, "\n\n");
}

/** Strip accidental markdown/blockquote prefixes from pasted text. */
export function normalizeInput(text: string): string {
  const stripped = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/^quote>\s*/i, "").replace(/^>\s*/, ""))
    .join("\n");

  return fixContractions(collapseExtraNewlines(stripped).trim());
}
