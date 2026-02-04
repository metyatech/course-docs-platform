# course-docs-platform

Shared, DRY building blocks for metyatech course documentation sites.

This repository is intended to be consumed by:

- `course-docs-site` (direct)
- `javascript-course-docs` and `programming-course-docs` (indirect via `course-docs-site`)

## What this provides

- Shared Next/Nextra config helpers (MDX remark plugins, webpack asset rules).
- Shared MDX components wiring for course sites.
- Course site features (e.g. submissions page components and API routes).

## Requirements

- Node.js: `>=20`
- Package manager: npm

## Development

```bash
npm install
npm run build
```
