# @bodhai/web

Next.js 15 App Router frontend for BodhAI, styled with Tailwind CSS and accessible shadcn/ui components.

## Key Principles & Architecture

- **Strict TypeScript**: `noImplicitAny`, zero `any`, strict null checks.
- **Strict i18n**: No hard-coded UI strings. All UI content is resolved through typed dictionary keys (`src/lib/i18n.ts`).
- **Accessibility**: Built to conform with WCAG 2.2 AA standards (accessible landmarks, focus rings, ARIA roles, contrast).
- **Testing**: Unit tests with Vitest and React Testing Library; E2E readiness with Playwright.

## Running Locally

```bash
# Start dev server on port 3000
pnpm --filter @bodhai/web dev

# Run unit tests
pnpm --filter @bodhai/web test

# Run type check
pnpm --filter @bodhai/web typecheck

# Build for production
pnpm --filter @bodhai/web build
```
