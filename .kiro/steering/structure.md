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
│   ├── dictionaries/    # Language dictionaries (es.json, etc.)
│   ├── lib/             # Utility functions
│   ├── pages/           # File-based routing (Astro pages)
│   ├── sections/        # Key page sections and components
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
- **Sections**: Key page sections stored in `src/sections/` for major content blocks

### Styling

- **ALL styles MUST be written using Tailwind CSS utility classes**
- No inline styles or custom CSS classes outside of Tailwind
- Use `cn()` utility from `@/lib/utils` for conditional classes
- Component variants managed with `class-variance-authority`
- Global styles in `src/styles/global.css` (Tailwind directives only)

### Data Management

- Static data stored as JSON in `src/data/`
- Import and use directly in Astro components

### Internationalization

- Language dictionaries stored in `src/dictionaries/`
- Each language has its own JSON file (e.g., `es.json` for Spanish)
- All user-facing content should reference dictionary keys
- Dictionary files contain Spanish translations and text content

### Routing

- File-based routing via `src/pages/`
- Each `.astro` file in pages becomes a route
- `index.astro` maps to root path `/`

## Code Style

- Prettier for formatting (configured with Astro plugin)
- TypeScript strict mode enabled
- React 19 with JSX transform (no React import needed)
- **ALL code comments MUST be written in English**
  - This includes JSDoc comments (`/** */`)
  - HTML/Astro comments (`<!-- -->`)
  - Single-line comments (`//`)
- User-facing content and text should be in Spanish (via dictionaries)
