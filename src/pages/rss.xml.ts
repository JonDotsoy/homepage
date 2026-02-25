import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import data from "@/data/general.json";

class XMLNode {
  constructor(
    public type: string,
    public props: null | Record<string, any>,
    public children: (XMLNode | string)[],
  ) {}

  toString(): string {
    const tagSafe = this.type.replace(/[^a-zA-Z0-9]/g, "");
    const propsString = this.props
      ? Object.entries(this.props)
          .map(([keyIn, valueIn]) => {
            const key = keyIn.replace(/[^a-zA-Z0-9]/g, "");
            const value = String(valueIn).replace(/"/g, "&quot;");
            return `${key}="${value}"`;
          })
          .join(" ")
      : null;
    const childrenString = this.children
      .map((child) =>
        typeof child === "string"
          ? child
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
          : child.toString(),
      )
      .join("");
    return `<${tagSafe}${propsString ? ` ${propsString}` : ""}>${childrenString}</${tagSafe}>`;
  }
}

const x = (
  type: string,
  props?: null | Record<string, any>,
  ...children: (XMLNode | string)[]
) => new XMLNode(type, props ?? null, children);

export const GET: APIRoute = async (Astro) => {
  const allBlogPosts = await getCollection("blog");
  const sortedPosts = allBlogPosts.sort(
    (a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime(),
  );

  return new Response(
    x(
      "rss",
      { version: "2.0" },
      x(
        "channel",
        null,
        x("title", null, data.seo.title),
        x("link", null, new URL(`/`, Astro.site).toString()),
        x("description", null, data.seo.description),
        ...sortedPosts.map((post) =>
          x(
            "item",
            null,
            x("title", null, post.data.title),
            x("link", null, new URL(`/blog/${post.id}`, Astro.site).toString()),
            x("description", null, post.data.description),
            x("pubDate", null, new Date(post.data.date).toUTCString()),
          ),
        ),
      ),
    ).toString(),
    {
      headers: {
        "Content-Type": "application/xml",
      },
    },
  );
};
