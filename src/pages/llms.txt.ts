import type { APIRoute } from "astro";

export const SITE = import.meta.env.SITE;

const getLlmTxt = () => `\
# Jonathan Delgado

> Personal portfolio and blog of Jonathan Delgado Zamorano, a Chilean software engineer specializing in backend development, infrastructure implementation, and cloud migrations.

Jonathan is a software developer with experience in fintech, working with TypeScript, React, Astro, Tailwind, Docker, Terraform, and Google Cloud. He practices TDD (Test-Driven Development), DDD (Domain-Driven Design), and SDD (Spec-Driven Development), integrates AI tools in his workflow, and mentors teammates.

## Contact

- [LinkedIn](https://www.linkedin.com/in/jonadelgado): Reach out for professional inquiries or collaborations
- [GitHub](https://github.com/JonDotsoy): Open source projects and code
- [Email](mailto:hi@jon.soy): Direct contact at hi@jon.soy

## Blog

- [Blog](${SITE}/blog): Articles about software development, infrastructure, and engineering practices

## Optional

- [Homepage](${SITE}/): Full portfolio in Spanish
- [Homepage (English)](${SITE}/en/): Full portfolio in English
`;

export const GET: APIRoute = () => {
  return new Response(getLlmTxt(), {
    headers: {
      "Content-Type": "text/plain",
    },
  });
};
