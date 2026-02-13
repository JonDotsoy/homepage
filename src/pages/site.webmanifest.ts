import type { APIRoute } from "astro";
import { getImage } from "astro:assets";
import BrandPng from "../assets/brand.png";

const BrandPng192w = await getImage({
  src: BrandPng,
  width: 192,
  height: 192,
  format: "png",
});

const BrandPng512w = await getImage({
  src: BrandPng,
  width: 512,
  height: 512,
  format: "png",
});

export const GET: APIRoute = async () => {
  return Response.json({
    name: "Jonathan Delgado Zamorano",
    short_name: "Jonathan",
    icons: [
      {
        src: BrandPng192w.src,
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: BrandPng512w.src,
        sizes: "512x512",
        type: "image/png",
      },
    ],
    theme_color: "#292524",
    background_color: "#f5f2ff",
    display: "standalone",
  });
};
