import type { APIRoute } from "astro";

const getRobotsTxt = (site: URL) => `\
User-agent: *
Allow: /

Sitemap: ${site.href}
`;

export const GET: APIRoute = ({ site }) => {
  return new Response(getRobotsTxt(new URL("sitemap-index.xml", site)), {
    headers: {
      "Content-Type": "text/plain",
    },
  });
};
