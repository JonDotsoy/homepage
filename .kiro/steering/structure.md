---
inclusion: always
---

# Project Structure

## Directory Organization

```
/
├── public/              # Static assets (favicon, images)
├── src/
│   ├── components/      # Astro and React components
│   │   ├── layouts/     # Layout components
│   │   └── ui/          # shadcn/ui components
│   ├── data/            # JSON data files
│   ├── lib/             # Utility functions
│   ├── pages/           # File-based routing (Astro pages)
│   └── styles/          # Global CSS files
├── tests/               # Playwright test files
└── .astro/              # Generated Astro types and metadata
```

## Key Conventions

### Import Paths

- Use `@/*` alias for all src imports (e.g., `@/components/Hero.astro`)
- Never use relative imports like `../` when importing from src

### Component Organization

- **Astro components** (`.astro`): Page layouts and static components
- **React components** (`.tsx`): Interactive UI components, especially shadcn/ui
- **UI components**: Located in `src/components/ui/`, follow shadcn/ui patterns
- **Layouts**: Reusable page layouts in `src/components/layouts/`

### Styling

- Tailwind utility classes for all styling
- Use `cn()` utility from `@/lib/utils` for conditional classes
- Component variants managed with `class-variance-authority`
- Global styles in `src/styles/global.css`

### Data Management

- Static data stored as JSON in `src/data/`
- Import and use directly in Astro components

### Routing

- File-based routing via `src/pages/`
- Each `.astro` file in pages becomes a route
- `index.astro` maps to root path `/`

## Code Style

- Prettier for formatting (configured with Astro plugin)
- TypeScript strict mode enabled
- React 19 with JSX transform (no React import needed)
