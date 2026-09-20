import { createHighlighter, type Highlighter } from "shiki";
import donGrammar from "./grammars/don.tmLanguage.json";

// The grammar's "name" field ("DON") is what shiki registers as the
// language id — it's case-sensitive, so this must match exactly.
const DON_LANG_ID = donGrammar.name;

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter() {
  highlighterPromise ??= createHighlighter({
    themes: ["github-light"],
    langs: [
      donGrammar as unknown as Parameters<
        typeof createHighlighter
      >[0]["langs"][number],
    ],
  });
  return highlighterPromise;
}

export async function highlightDon(code: string) {
  const highlighter = await getHighlighter();
  return highlighter.codeToHtml(code, {
    lang: DON_LANG_ID,
    theme: "github-light",
  });
}
