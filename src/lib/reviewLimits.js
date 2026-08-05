// Minimum word counts for review quality — shared by the review workspace
// and the essay viewer's inline suggestion composer.
export const MIN_SUGGESTION_WORDS = 25;
export const MIN_FINAL_WORDS      = 150;

export function wordCount(text) {
  const t = (text ?? "").trim();
  return t ? t.split(/\s+/).length : 0;
}
