import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blogCollection = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/blog" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      author: z.object({
        name: z.string(),
        email: z.string().optional(),
        website: z.string().optional(),
        github: z.string().optional(),
      }),
      date: z.string().date(),
      tags: z.array(z.string()).optional(),
      cover: image().optional(),
      lang: z.string().optional(),
    }),
});

export const collections = {
  blog: blogCollection,
};
