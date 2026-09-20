import type { APIRoute } from "astro";
import markdown from "@/components/pages/donly.md?raw";

export const GET: APIRoute = () => {
  return new Response(markdown, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};
