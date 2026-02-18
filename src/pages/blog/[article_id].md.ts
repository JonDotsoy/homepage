import { getCollection, getEntry, render } from "astro:content";
import { getImage } from "astro:assets";
import BlogLayout from "../../components/layouts/BlogLayout.astro";
import BlogCounter from "@/components/blog-counter.astro";
import { User, Eye, Calendar, Bot } from "lucide-react";
import { Temporal } from "temporal-polyfill";
import { ChatBlock } from "@/components/chet-block";
import type { APIRoute } from "astro";

export async function getStaticPaths() {
  const blogEntries = await getCollection("blog");
  return blogEntries.map((entry: any) => ({
    params: { article_id: entry.id },
  }));
}

export const GET: APIRoute = async (Astro) => {

  const { article_id } = Astro.params;
  const entry = await getEntry("blog", article_id!);

  if (!entry) {
    return new Response(null, { status: 404 });
  }

  const { Content } = await render(entry);
  const { title, description, author, tags, cover, lang = "es" } = entry.data;
  const date = Temporal.PlainDate.from(entry.data.date);

  const articleUrl = new URL(
    `/blog/${article_id}`,
    Astro.site || Astro.url.origin,
  ).href;
  const publishedDate = date.toJSON();

  let coverImageUrl = "";
  if (cover) {
    const optimizedCover = await getImage({
      src: cover,
      width: 1200,
      height: 630,
      format: "webp",
    });
    coverImageUrl = new URL(optimizedCover.src, Astro.site || Astro.url.origin)
      .href;
  }

  return new Response([
    `> ## Document metadata\n`,
    `> - **Description**: ${description}\n`,
    `> - **Author**: [${author.github}](https://github.com/${author.github})\n`,
    `> - **Tags**: ${tags?.join(", ")??''}\n`,
    `> - **Published Date**: ${publishedDate}\n`,
    `> - **Language**: ${lang}\n`,
    `> - **Cover Image**: ${coverImageUrl}\n`,
    `\n`,
    `# ${title}\n\n`,
    entry.body,
  ].join(''), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" }
  });
}