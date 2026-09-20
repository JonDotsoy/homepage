import { createHighlighter, type Highlighter } from "shiki";
import donGrammar from "./grammars/don.tmLanguage.json";

// The grammar's "name" field ("DON") is what shiki registers as the
// language id — it's case-sensitive, so this must match exactly.
const DON_LANG_ID = donGrammar.name;
const THEME = "github-light";

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter() {
  highlighterPromise ??= createHighlighter({
    themes: [THEME],
    langs: [
      donGrammar as unknown as Parameters<
        typeof createHighlighter
      >[0]["langs"][number],
      "json",
      "javascript",
    ],
  });
  return highlighterPromise;
}

async function highlight(code: string, lang: string) {
  const highlighter = await getHighlighter();
  return highlighter.codeToHtml(code, { lang, theme: THEME });
}

export const highlightDon = (code: string) => highlight(code, DON_LANG_ID);
export const highlightJson = (code: string) => highlight(code, "json");
export const highlightJs = (code: string) => highlight(code, "javascript");
