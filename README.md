# @metyatech/course-docs-platform

Shared, DRY building blocks for metyatech course documentation sites based on Next.js and Nextra.

## Overview

This library provides shared components, MDX plugins, and configuration helpers to maintain consistency across various course documentation sites.

## Requirements

- **Node.js**: `>=20.0`
- **Next.js**: `^15.x`
- **Nextra**: `^4.x`

## Installation

```bash
npm install @metyatech/course-docs-platform
```

## Usage

### Next.js Configuration

In your `next.config.js`:

```javascript
import { courseNext } from '@metyatech/course-docs-platform';

const nextConfig = {
  // ... your config
  webpack: (config) => {
    return courseNext.applyCourseAssetWebpack(config);
  },
};
```

### MDX Options

In your `mdx-components.tsx` or Nextra config:

```typescript
import { courseNext } from '@metyatech/course-docs-platform';

const mdxOptions = {
  ...courseNext.courseMdxOptions,
};
```

### Layouts (Next.js App Router)

```typescript
import { courseNextApp } from '@metyatech/course-docs-platform';

export default courseNextApp.createRootLayout({
  // options
});
```

## Development Commands

- `npm run build`: Build the project (TypeScript compilation + static asset copy).
- `npm run test`: Run the test suite.
- `npm run typecheck`: Run TypeScript type checking.
- `npm run lint`: Run ESLint and type check.
- `npm run format`: Format code using Prettier.

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on our development process.

## Security

Please see [SECURITY.md](SECURITY.md) for reporting vulnerabilities.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
