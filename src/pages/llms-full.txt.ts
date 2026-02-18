import type { APIRoute } from "astro";

export const SITE = import.meta.env.SITE;

const getLlmFullTxt = () => `\
# Jonathan Delgado

> Personal portfolio and blog of Jonathan Delgado Zamorano, a Chilean software engineer specializing in backend development, infrastructure implementation, and cloud migrations.

Jonathan is a software developer with experience in fintech, working with TypeScript, React, Astro, Tailwind, Docker, Terraform, and Google Cloud. He practices TDD (Test-Driven Development), DDD (Domain-Driven Design), and SDD (Spec-Driven Development), integrates AI tools in his workflow, and mentors teammates. He has intermediate professional English proficiency.

## Specializations

- Backend development
- Infrastructure implementation and cloud migrations
- AI-assisted development workflows
- Mentoring and team communication

## Tech Stack

- **Languages & Runtimes**: TypeScript, Node.js
- **Frontend**: React, Astro, Tailwind CSS
- **Infrastructure**: Docker, Terraform, Google Cloud
- **Practices**: TDD (Test-Driven Development), DDD (Domain-Driven Design), SDD (Spec-Driven Development)

## Contact

- [LinkedIn](https://www.linkedin.com/in/jonadelgado): Reach out for professional inquiries or collaborations
- [GitHub](https://github.com/JonDotsoy): Open source projects and code
- [Email](mailto:hi@jon.soy): Direct contact at hi@jon.soy

## Site Pages

- [Homepage](${SITE}/): Portfolio in Spanish — includes hero section, about me, and social links
- [Homepage (English)](${SITE}/en/): Portfolio in English
- [Blog](${SITE}/blog): Articles about software development, infrastructure, and engineering practices

## Blog Articles

### Por qué usar Runbooks: Automatiza la documentación de escenarios reproducibles con IA

- **URL**: ${SITE}/blog/2026-02-01-por-que-usar-runbook
- **Date**: 2026-02-01
- **Lang**: es-CL
- **Description**: Learn to create runbooks and generate execution evidence with AI assistance to document and validate reproducible scenarios in your projects.

**Summary**: This article promotes runbooks as a natural part of any engineering workflow — for QA, Dev, DevOps, and data teams alike. A runbook is a document that allows reproducing an activity an indefinite number of times. It has three essential components:

1. **Requirements**: Document the environment setup needed before execution. Must be very detailed to ensure reproducibility.
2. **Detailed Steps**: Step-by-step instructions — connecting to a DB, calling an API, etc.
3. **Validation**: Describes what to observe and consider as a successful outcome.

**Runbooks vs Tests**:
- Unit tests: Test a specific piece of code in a controlled, isolated environment.
- Integration tests: More complex, may spin up databases, but still controlled and scoped.
- Runbooks: Go further — they test a specific part of the product in a specific environment (local, staging, production).

**AI Skills for Runbooks** (install via \`npx skills add https://github.com/jondotsoy/skills\`):
- \`runbook-generator\`: Creates structured runbooks from a natural language description.
- \`runbook-executor\`: Generates timestamped evidence documentation of runbook execution results.

**Key recommendation**: Complement skills with an \`AGENTS.md\` file in your project to configure global agent behavior (language, tone, project conventions).

## Open Source

- [Skills](https://github.com/jondotsoy/skills): Reusable AI agent skills including runbook-generator and runbook-executor, compatible with Claude Code, GitHub Copilot, and Kiro.
`;

export const GET: APIRoute = () => {
  return new Response(getLlmFullTxt(), {
    headers: {
      "Content-Type": "text/plain",
    },
  });
};
