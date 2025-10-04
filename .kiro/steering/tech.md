---
inclusion: always
---

# Tech Stack

## Framework & Build System

- **Astro 5.x** - Static site generator with islands architecture
- **Bun** - Package manager and runtime (preferred over npm/yarn)
- **Vite** - Build tool (integrated via Astro)

## UI & Styling

- **React 19** - Component library for interactive elements
- **Tailwind CSS 4.x** - Utility-first CSS framework with Vite plugin
- **shadcn/ui** - Component system (default style, stone base color)
- **Radix UI** - Headless UI primitives
- **Lucide React** - Icon library

## Utilities

- **class-variance-authority** - Component variant management
- **clsx + tailwind-merge** - Conditional className handling via `cn()` utility
- **Prettier** - Code formatting with Astro plugin

## Testing

- **Playwright** - End-to-end testing

## Common Commands

```bash
# Development
bun dev              # Start dev server at localhost:4321

# Build & Deploy
bun build            # Build production site to ./dist/
bun preview          # Preview production build locally

# Code Quality
bun run lint         # Check formatting with Prettier
bun run fmt          # Format code with Prettier

# Astro CLI
bun astro ...        # Run Astro CLI commands
bun astro check      # Type check Astro files
```

## TypeScript Configuration

- Extends `astro/tsconfigs/strict`
- Path alias: `@/*` maps to `./src/*`
- JSX: React JSX transform
