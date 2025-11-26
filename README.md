# BB Infrastructure Monorepo

This is a pnpm monorepo containing multiple packages.

## Structure

- `packages/web` - Web package
- `packages/api` - API package

## Getting Started

Install dependencies:
```bash
pnpm install
```

Run all packages in development mode:
```bash
pnpm dev
```

Build all packages:
```bash
pnpm build
```

## Working with Packages

Run commands for a specific package:
```bash
pnpm --filter @bb/web dev
pnpm --filter @bb/api dev
```

Install a dependency to a specific package:
```bash
pnpm --filter @bb/web add <package-name>
pnpm --filter @bb/api add <package-name>
```

Install a dev dependency to a specific package:
```bash
pnpm --filter @bb/web add -D <package-name>
pnpm --filter @bb/api add -D <package-name>
```

