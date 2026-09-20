#!/usr/bin/env bash
# Renders cover.html into cover.png (1200x630) using Playwright's Chromium,
# then optimizes it with sharp so the file stays under 2MB.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$DIR/../../../.." && pwd)"

cd "$REPO_ROOT"

node --input-type=module - "$DIR/cover.html" "$DIR/cover.png" "$DIR/cover.info.json" <<'EOF'
import { chromium } from "playwright";
import sharp from "sharp";
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import { writeFile, stat } from "node:fs/promises";

const [, , htmlPath, outPath, infoPath] = process.argv;
const WIDTH = 1200;
const HEIGHT = 630;
const MAX_BYTES = 2 * 1024 * 1024;

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
  const raw = await cover.screenshot();

  // Compress the PNG and keep it under MAX_BYTES, trying progressively
  // more aggressive palette reduction if the default encode is too heavy.
  const attempts = [
    { compressionLevel: 9 },
    { compressionLevel: 9, palette: true, colors: 256 },
    { compressionLevel: 9, palette: true, colors: 128, dither: 0.8 },
  ];

  let optimized;
  for (const options of attempts) {
    optimized = await sharp(raw).png(options).toBuffer();
    if (optimized.length <= MAX_BYTES) break;
  }

  if (optimized.length > MAX_BYTES) {
    throw new Error(
      `cover.png is ${(optimized.length / 1024 / 1024).toFixed(2)}MB after optimization, ` +
        `over the ${MAX_BYTES / 1024 / 1024}MB limit`,
    );
  }

  await writeFile(outPath, optimized);

  const metadata = await sharp(optimized).metadata();
  const { size: bytes } = await stat(outPath);
  const info = {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    size: {
      bytes,
      kilobytes: Number((bytes / 1024).toFixed(2)),
      megabytes: Number((bytes / 1024 / 1024).toFixed(3)),
      gigabytes: Number((bytes / 1024 / 1024 / 1024).toFixed(6)),
    },
  };
  await writeFile(infoPath, `${JSON.stringify(info, null, 2)}\n`);

  console.log(`Wrote ${outPath} (${(bytes / 1024).toFixed(1)} KB)`);
  console.log(`Wrote ${infoPath}`);
} finally {
  await browser.close();
}
EOF
