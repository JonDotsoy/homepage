// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";

import cloudflare from "@astrojs/cloudflare";

import sitemap from "@astrojs/sitemap";

// Cloudflare Workers Builds injects WORKERS_CI_BRANCH during CI builds and
// deploys non-production branches to a preview URL shaped like
// <branch>-<worker-name>.<workers-dev-subdomain>.workers.dev (see
// https://developers.cloudflare.com/workers/ci-cd/builds/configuration/ and
// https://developers.cloudflare.com/workers/configuration/previews/).
// Resolving `site` to that preview URL keeps absolute links (og:image,
// canonical, sitemap, ...) pointing at the deployment that's actually
// serving the page instead of always pointing at production.
const PRODUCTION_BRANCH = "develop";
const WORKER_NAME = "homepage"; // must match wrangler.jsonc's "name"
const WORKERS_DEV_SUBDOMAIN =
  process.env.CF_WORKERS_DEV_SUBDOMAIN ?? "jonad-correo";

function resolveSite() {
  if (process.env.SITE_URL) return process.env.SITE_URL;

  const branch = process.env.WORKERS_CI_BRANCH;
  if (branch && branch !== PRODUCTION_BRANCH) {
    const alias = branch.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
    return `https://${alias}-${WORKER_NAME}.${WORKERS_DEV_SUBDOMAIN}.workers.dev`;
  }

  return "https://jon.soy";
}

// https://astro.build/config
export default defineConfig({
  site: resolveSite(),
  integrations: [react(), mdx(), sitemap()],

  vite: {
    plugins: [tailwindcss()],
  },

  adapter: cloudflare(),
});
