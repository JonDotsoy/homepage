import type { APIRoute } from "astro";
import markdown from "@/components/pages/configs.es.md?raw";

export const GET: APIRoute = () => {
  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
};
