# course-docs-platform

> [!IMPORTANT]
> このリポジトリはアーカイブされています。開発は
> [`metyatech/course-docs-site`](https://github.com/metyatech/course-docs-site) の
> [`packages/platform`](https://github.com/metyatech/course-docs-site/tree/main/packages/platform) へ移行しました。

- 新しいリポジトリ: https://github.com/metyatech/course-docs-site
- Platform package: https://github.com/metyatech/course-docs-site/tree/main/packages/platform
- Issue / Pull Request: https://github.com/metyatech/course-docs-site/issues
- 移行日: 2026-07-14

このリポジトリは履歴を参照するための読み取り専用アーカイブです。新しいissueやpull requestは作成せず、packageの利用方法と今後の開発は新しいmonorepoを参照してください。

Reusable platform package for metyatech course documentation sites.

## Purpose

`course-docs-platform` holds the shared runtime and authoring building blocks that are reused across course sites.
Use this repository when a change should apply to multiple course sites instead of a single content repository.

Primary consumers:

- `course-docs-site` (direct)
- Course content repositories such as `javascript-course-docs` and `programming-course-docs` (indirect via `course-docs-site`)

## What this provides

- Shared Next/Nextra integration helpers, including MDX remark plugins and webpack asset rules
- Shared MDX and runtime features, such as exercise rendering, code preview wiring, submissions UI, and admin routes
- Shared MDX syntax checks and tutorial component linting for Course Docs Site authoring

## Requirements

- Node.js `>=20`
- npm

## Development

Install dependencies:

```bash
npm install
```

Run the full verification suite:

```bash
npm run verify
```

Useful commands:

- `npm run build`
- `npm run test`
- `npm run lint`
- `npm run typecheck`

## Documentation

- [docs/admonition-authoring.md](./docs/admonition-authoring.md)
- [LICENSE](./LICENSE)
- [SECURITY.md](./SECURITY.md)
- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [CHANGELOG.md](./CHANGELOG.md)
