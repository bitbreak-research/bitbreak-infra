# Backend Guidelines

Quick reference for building features in `packages/api`.

## Tech Stack

- **Hono** - Web framework
- **Cloudflare Workers** - Runtime platform
- **D1** - SQLite database (via Cloudflare)
- **Zod** - Schema validation
- **Vitest** - Testing framework

## Project Structure

```
src/
├── routes/        # Route modules (auth.ts, users.ts...)
├── middleware.ts  # Global middleware
├── index.ts       # Main app entry point
└── types/         # Type definitions
test/              # Unit tests
migrations/        # Database migrations
```

## Application Structure

### Route Organization

Use `app.route()` to build a larger application without creating "Ruby on Rails-like Controllers". If your application has `/authors` and `/books` endpoints, create separate route files:

```typescript
// routes/authors.ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => c.json('list authors'))
app.post('/', (c) => c.json('create an author', 201))
app.get('/:id', (c) => c.json(`get ${c.req.param('id')}`))

export default app
```

```typescript
// routes/books.ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => c.json('list books'))
app.post('/', (c) => c.json('create a book', 201))
app.get('/:id', (c) => c.json(`get ${c.req.param('id')}`))

export default app
```

Then, import them and mount on the paths `/authors` and `/books` with `app.route()`:

```typescript
// index.ts
import { Hono } from 'hono'
import middleware from './middleware'
import authors from './routes/authors'
import books from './routes/books'

type Bindings = {
  bb: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>()

// Apply global middleware
app.route('/', middleware)

// Mount route modules
app.route('/authors', authors)
app.route('/books', books)

export default app
```

### Don't Create "Controllers"

When possible, you should not create "Ruby on Rails-like Controllers". The issue is related to types - path parameters cannot be inferred in controllers without writing complex generics.

```typescript
// 🙁 A RoR-like Controller
const booksList = (c: Context) => {
  return c.json('list books')
}

app.get('/books', booksList)
```

```typescript
// 🙁 A RoR-like Controller - can't infer path params
const bookPermalink = (c: Context) => {
  const id = c.req.param('id') // Can't infer the path param
  return c.json(`get ${id}`)
}
```

Instead, write handlers directly after path definitions:

```typescript
// 😃 Can infer the path param
app.get('/books/:id', (c) => {
  const id = c.req.param('id') // Can infer the path param
  return c.json(`get ${id}`)
})
```

## Request Validation

**Always use Zod validator middleware** when creating new endpoints. This ensures type safety and automatic validation.

```typescript
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'

const createBookSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  year: z.number().int().min(1000).max(2100),
})

app.post('/books', zValidator('json', createBookSchema), async (c) => {
  const { title, author, year } = c.req.valid('json') // Fully typed!
  // ... create book logic
  return c.json({ id: 1, title, author, year }, 201)
})
```

For query parameters:

```typescript
const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
})

app.get('/books', zValidator('query', querySchema), async (c) => {
  const { page, limit } = c.req.valid('query')
  // ... fetch books with pagination
  return c.json({ books: [], page, limit })
})
```

## Database Access

Use D1 database via Cloudflare bindings. Access via `c.env.bb`:

```typescript
type Bindings = {
  bb: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>()

app.get('/users/:id', async (c) => {

  const id = c.req.param('id')
  const stmt = c.env.bb.prepare('SELECT * FROM users WHERE id = ?')
  const user = await stmt.bind(id).first()

  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }

  return c.json(user)
})
```

For transactions or multiple queries:

```typescript
app.post('/users', async (c) => {
  const { name, email } = await c.req.json()
  
  const stmt = c.env.bb.prepare('INSERT INTO users (name, email) VALUES (?, ?)')
  const result = await stmt.bind(name, email).run()
  
  return c.json({ id: result.meta.last_row_id, name, email }, 201)
})
```

## Error Handling

Return consistent error responses:

```typescript
app.get('/books/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const book = await getBookById(c.env.bb, id)
    
    if (!book) {
      return c.json({ error: 'Book not found' }, 404)
    }
    
    return c.json(book)
  } catch (error) {
    console.error('Error fetching book:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})
```

## Response Format

Use consistent response formats:

- **Success**: `c.json(data, status)` - status defaults to 200
- **Created**: `c.json(data, 201)`
- **Error**: `c.json({ error: 'message' }, status)`
- **No Content**: `c.body(null, 204)`

## Testing

Create unit tests in `packages/api/test`. Use Vitest with Cloudflare Workers test utilities:

```typescript
// test/routes/books.test.ts
import { env } from 'cloudflare:test'
import app from '../../src/index'
import { describe, it, expect, beforeAll } from 'vitest'

describe('Books API', () => {
  beforeAll(async () => {
    // Setup test data
    await env.bb.prepare('INSERT INTO books (title, author) VALUES (?, ?)')
      .bind('Test Book', 'Test Author')
      .run()
  })

  it('should list books', async () => {
    const res = await app.request('/books', {}, env)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })

  it('should get book by id', async () => {
    const res = await app.request('/books/1', {}, env)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('id')
  })
})
```

## Migrations

Create migrations in `packages/api/migrations`. Use Wrangler D1 migrations:

```bash
# Create a new migration
wrangler d1 migrations create bb create_users_table

# Apply migrations locally
pnpm run db:migrate-local

# Apply migrations in production
wrangler d1 migrations apply bb --remote
```

Migration files should be named with a timestamp prefix:

```sql
-- migrations/0001_create_users_table.sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);
```

## Environment & Bindings

Define types for Cloudflare bindings in `types/worker-configuration.d.ts`:

```typescript
// types/worker-configuration.d.ts
interface CloudflareBindings {
  bb: D1Database;
  // Add other bindings here
}
```

Generate types from Wrangler config:

```bash
pnpm run cf-typegen
```

Use bindings in your app:

```typescript
import type { CloudflareBindings } from '../types/worker-configuration'

const app = new Hono<{ Bindings: CloudflareBindings }>()
```

## Key Conventions

1. **Routes**: Use `app.route()` to mount route modules, not separate controllers
2. **Validation**: Always use Zod validators for request data
3. **Types**: Leverage TypeScript inference by writing handlers inline
4. **Errors**: Return consistent error format: `{ error: string }`
5. **Database**: Access D1 via `c.env.bb`
6. **Testing**: Write tests in `packages/api/test` using Vitest
7. **Migrations**: Store SQL migrations in `packages/api/migrations`

# Web Guidelines

Quick reference for building features in `packages/web`.

## Tech Stack

- **Astro** - Pages & static components (`.astro`)
- **SolidJS** - Interactive components (`.tsx`)
- **Tailwind 4** - Styling via inline classes
- **Nanostores** - State management

## Project Structure

```
src/
├── features/       # Feature modules (auth, scan, payment...)
│   └── {feature}/
│       ├── components/  # Feature-specific components
│       └── index.tsx    # Barrel export
├── components/
│   ├── ui/         # Reusable UI (Button, Input, Spinner...)
│   ├── layout/     # Header, Footer, backgrounds
│   └── pages/      # Full page components (used by routes)
├── lib/
│   ├── api/        # API client methods
│   ├── stores/     # Global state (nanostores)
│   └── utils/      # Helpers
├── pages/
│   ├── api/        # Proxy routes to backend
│   └── *.astro     # Route pages
├── i18n/           # Translations (locales/*.json)
└── styles/         # tailwind.css with @theme
```

## API Calls

**Never call backend directly.** Always use `/api/*` proxy routes.

```typescript
// lib/api/client.ts provides base methods
import { post, get } from '@/lib/api/client';

// Create feature-specific API methods in lib/api/{feature}.ts
export async function queryFree(address: string) {
  return post<FreeQueryResponse>('/api/query/free', { address });
}
```

Proxy routes live in `pages/api/` and forward to backend:

```typescript
// pages/api/auth/login.ts
export const POST: APIRoute = async ({ request, locals }) => {
  const apiUrl = runtime?.runtime?.env?.API_URL || import.meta.env.API_URL;
  const response = await fetch(`${apiUrl}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getIPForwardingHeaders(request) },
    body: JSON.stringify(await request.json())
  });
  return new Response(JSON.stringify(await response.json()), { status: response.status });
};
```

## State Management

Use Nanostores with `$` prefix naming:

```typescript
// lib/stores/auth.ts
import { atom } from 'nanostores';

export const $authState = atom<AuthState>({ isAuthenticated: false, isLoading: true });

export function setAuthState(isAuthenticated: boolean) {
  $authState.set({ isAuthenticated, isLoading: false });
}
```

Use in SolidJS with `@nanostores/solid`:

```typescript
import { useStore } from '@nanostores/solid';
import { $authState } from '@/lib/stores/auth';

const authState = useStore($authState);
```

## Component Patterns

### Astro Pages (Route → Page Component)

```astro
---
// pages/scan.astro
import ScanPage from '../components/pages/ScanPage.astro';
export const prerender = false; // SSR

const lang = Astro.locals.lang || getLangFromUrl(Astro.url);
---
<ScanPage lang={lang} />
```

### Page Components (Layout + Feature)

```astro
---
// components/pages/ScanPage.astro
import Layout from '../../layouts/Layout.astro';
import ScanForm from '../../features/scan/components/ScanForm';
---
<Layout title="Scan" lang={lang}>
  <div class="...">
    <ScanForm client:load currentLang={lang} />
  </div>
</Layout>
```

### SolidJS Components (Interactive)

```tsx
// features/scan/components/ScanForm.tsx
import { createSignal, Show } from 'solid-js';
import { queryFree } from '@/lib/api/query';

export default function ScanForm(props: { currentLang?: string }) {
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal('');

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    const result = await queryFree(address());
    if (result.success) { /* handle */ }
    else { setError(result.error?.message); }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input ... />
      <Show when={error()}>
        <div role="alert">{error()}</div>
      </Show>
      <button disabled={loading()}>Submit</button>
    </form>
  );
}
```

### Feature Barrel Export

```typescript
// features/auth/index.tsx
export { default as LoginForm } from './components/LoginForm';
export { default as MagicLinkSent } from './components/MagicLinkSent';
```

## Styling

Inline Tailwind classes. Custom theme in `styles/tailwind.css`:

```css
@import "tailwindcss";

@theme {
  --font-title: "Geist", sans-serif;
  --text-title-2: 2.375rem;
  /* ... */
}
```

Use semantic font classes: `font-title`, `font-content`, `text-title-2`, etc.

Brand color: `#FF3115` (primary red).

## i18n

Translations in `i18n/locales/{lang}.json`. Use in components:

```astro
---
import { useTranslations } from '@/i18n/utils';
const t = useTranslations(lang);
---
<h1>{t('scan.page.title')}</h1>
```

In SolidJS, import JSON directly:

```typescript
import enTranslations from '@/i18n/locales/en.json';
const t = () => translations[lang()];
// Usage: {t()['auth.login.title']}
```

## Authentication

### Protected Routes

Routes are protected via middleware in `middleware/auth.ts`:

```typescript
// Protected routes that require authentication
const PROTECTED_ROUTES = ['/monitor', '/account', '/account/sessions', '/account/settings', '/generator'];

// Routes that also require subscription
const SUBSCRIPTION_ROUTES = ['/monitor'];
```

Middleware automatically handles language prefixes (`/es/account` → `/account`).

### Server-Side Auth Check (Protected Pages)

For protected pages, use `checkAuth()` helper:

```astro
---
// pages/account/index.astro
import { checkAuth } from '@/lib/utils/server-auth';
import { getLocalizedUrl } from '@/lib/utils/urls';

export const prerender = false;

const frontendUrl = import.meta.env.DEV ? 'http://localhost:4321' : Astro.url.origin;
const { isAuthenticated, user, subscriptionData } = await checkAuth(Astro.cookies, frontendUrl);

if (!isAuthenticated) {
  return Astro.redirect(getLocalizedUrl('/login', lang) + '?redirect=' + encodeURIComponent(Astro.url.pathname));
}
---
<AccountDashboard user={user} subscriptionData={subscriptionData} />
```

### Client-Side Auth State (Hybrid Approach)

For nav components that show login/logout, use hybrid SSR + client validation:

```tsx
// components/layout/AuthNav.tsx
interface AuthNavProps {
  currentLang: 'en' | 'es' | 'pt' | 'ko' | 'ja';
  hasSessionHint?: boolean; // SSR hint (cookie exists, NOT validated)
  isAuthenticated?: boolean; // For protected pages (already validated)
}

export default function AuthNav(props: AuthNavProps) {
  // Initialize with SSR hint, validate in background
  const [isAuthenticated, setIsAuthenticated] = createSignal(
    props.isAuthenticated ?? props.hasSessionHint ?? false
  );

  onMount(async () => {
    // Background validation (only if using hint)
    if (props.isAuthenticated === undefined) {
      const response = await fetch('/api/auth/check', { credentials: 'include' });
      setIsAuthenticated(response.ok);
      localStorage.setItem('auth_hint', String(response.ok)); // Cache for instant nav
    }
  });

  return (
    <Show when={isAuthenticated()} fallback={<a href="/login">Login</a>}>
      <a href="/account">Account</a>
      <button onClick={handleLogout}>Logout</button>
    </Show>
  );
}
```

### Passing Auth Hint from Astro

```astro
---
// In Layout or Header
const sessionCookie = Astro.cookies.get('session');
const hasSession = !!sessionCookie;
---
<AuthNav client:load currentLang={lang} hasSessionHint={hasSession} />
```

### Cookies

All auth cookies are `httpOnly` (server-only). Key cookies:
- `sessionId` - Session identifier (2h)
- `sessionToken` - JWT for API calls (2h)
- `refreshToken` - For token refresh (5 days)
- `userEmail` - Encrypted email (2h)

Use helpers from `lib/auth/cookies.ts`:

```typescript
import { getSessionTokenCookie, setSessionTokenCookie } from '@/lib/auth/cookies';
```

### Logout

```typescript
const handleLogout = async () => {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  localStorage.removeItem('auth_hint');
  window.location.href = '/';
};
```

## Key Conventions

1. **Paths**: Use `@/` aliases (`@/lib`, `@/features`, etc.)
2. **Hydration**: Use `client:load` for interactive components
3. **SSR**: Set `export const prerender = false` for dynamic pages
4. **Errors**: Sanitize with `sanitizeErrorMessage()` before display
5. **A11y**: Include `aria-*` attributes, use `announceToScreenReader()`
6. **Types**: Define interfaces for props and API responses
7. **Auth**: Use `checkAuth()` for SSR, `hasSessionHint` for public pages

