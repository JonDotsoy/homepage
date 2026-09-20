#!/usr/bin/env bash
# Renders cover.html into cover.png (1200x630) using Playwright's Chromium.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$DIR/../../../.." && pwd)"

cd "$REPO_ROOT"

node --input-type=module - "$DIR/cover.html" "$DIR/cover.png" <<'EOF'
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";

const [, , htmlPath, outPath] = process.argv;
const WIDTH = 1200;
const HEIGHT = 630;

// This sandbox ships a pre-installed Chromium outside Playwright's normal
// cache dir; use it when present, otherwise let Playwright resolve its own.
const sandboxChromium = "/opt/pw-browsers/chromium";
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ??
  (existsSync(sandboxChromium) ? sandboxChromium : undefined);

const browser = await chromium.launch({ executablePath });
try {
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  });
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  // Force the preview "stage" chrome away so the .cover element renders at
  // exactly 1200x630, independent of the clamp()/vw-based responsive sizing.
  await page.addStyleTag({
    content: `
      html, body { margin: 0; padding: 0; }
      .stage { max-width: none; width: ${WIDTH}px; padding: 0; gap: 0; }
      .cover { width: ${WIDTH}px; }
      .hint { display: none; }
    `,
  });

  const cover = page.locator(".cover");
  await cover.screenshot({ path: outPath });
} finally {
  await browser.close();
}

console.log(`Wrote ${outPath}`);
EOF
