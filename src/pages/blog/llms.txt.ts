import { getCollection, getEntry, render } from "astro:content";
import type { APIRoute } from "astro";

export const GET: APIRoute = async (Astro) => {
  const blogEntries = await getCollection("blog");

  return new Response(
    [
      `# jon.soy Blog Articles\n\n`,
      `## Articles\n\n`,
      ...blogEntries.map((entry) => {
        return `- [${entry.data.title}](${new URL(`/blog/${entry.id}`, Astro.site || Astro.url.origin).href}): ${entry.data.description}\n`;
      }),
      `\n\n`,
    ].join(""),
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    },
  );
};
