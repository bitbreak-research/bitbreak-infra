# Sistema de Autenticación

## Resumen

Sistema de autenticación para aplicación Hono.js desplegada como Cloudflare Worker con D1 como base de datos. Implementa un flujo de setup inicial cuando no existe ningún usuario, autenticación con JWT y refresh tokens.

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                        Cloudflare Worker                        │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │   Hono.js    │───►│  Middleware  │───►│     Routes       │  │
│  │   Router     │    │  Auth Check  │    │   Protegidas     │  │
│  └──────────────┘    └──────────────┘    └──────────────────┘  │
│         │                   │                                   │
│         │                   ▼                                   │
│         │           ┌──────────────┐                            │
│         │           │   D1 (bb)    │                            │
│         │           │  - users     │                            │
│         │           │  - sessions  │                            │
│         └──────────►│              │                            │
│                     └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

## Flujo de Autenticación

### 1. Detección de Estado Inicial

```
┌─────────┐     GET /api/auth/status     ┌─────────┐
│ Cliente │─────────────────────────────►│ Server  │
└─────────┘                              └────┬────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │ SELECT COUNT(*) │
                                    │ FROM users      │
                                    └────────┬────────┘
                                              │
                          ┌───────────────────┴───────────────────┐
                          │                                       │
                          ▼                                       ▼
                   count === 0                              count > 0
                          │                                       │
                          ▼                                       ▼
              { needsSetup: true }                    { needsSetup: false }
```

### 2. Setup Inicial (Primer Usuario)

Cuando `needsSetup: true`, el cliente debe mostrar formulario de registro.

```
  CLIENTE                                    SERVIDOR
    │                                           │
    │  POST /api/auth/setup                     │
    │  {                                        │
    │    "username": "admin",                   │
    │    "password": "securepass123",           │
    │    "confirmPassword": "securepass123"     │
    │  }                                        │
    │──────────────────────────────────────────►│
    │                                           │
    │                                           │  Validaciones:
    │                                           │  - No existen usuarios
    │                                           │  - password === confirmPassword
    │                                           │  - password.length >= 8
    │                                           │  - username.length >= 3
    │                                           │
    │                                           │  Hash password (Argon2id)
    │                                           │  INSERT INTO users
    │                                           │  Generar tokens
    │                                           │
    │  {                                        │
    │    "user": { "id", "username" },          │
    │    "accessToken": "eyJ...",               │
    │    "refreshToken": "eyJ...",              │
    │    "expiresIn": 900                       │
    │  }                                        │
    │◄──────────────────────────────────────────│
    │                                           │
```

### 3. Login (Usuarios Existentes)

```
  CLIENTE                                    SERVIDOR
    │                                           │
    │  POST /api/auth/login                     │
    │  {                                        │
    │    "username": "admin",                   │
    │    "password": "securepass123"            │
    │  }                                        │
    │──────────────────────────────────────────►│
    │                                           │
    │                                           │  SELECT * FROM users
    │                                           │  WHERE username = ?
    │                                           │
    │                                           │  Verificar password hash
    │                                           │
    │                         ┌─────────────────┴─────────────────┐
    │                         │                                   │
    │                   Credenciales                        Credenciales
    │                    Inválidas                           Válidas
    │                         │                                   │
    │                         ▼                                   ▼
    │                    401 Error                      Generar tokens
    │                         │                         INSERT session
    │                         │                                   │
    │◄────────────────────────┘                                   │
    │                                                             │
    │  {                                                          │
    │    "user": { "id", "username" },                            │
    │    "accessToken": "eyJ...",                                 │
    │    "refreshToken": "eyJ...",                                │
    │    "expiresIn": 900                                         │
    │  }                                                          │
    │◄────────────────────────────────────────────────────────────│
    │                                                             │
```

### 4. Refresh Token

```
  CLIENTE                                    SERVIDOR
    │                                           │
    │  POST /api/auth/refresh                   │
    │  {                                        │
    │    "refreshToken": "eyJ..."               │
    │  }                                        │
    │──────────────────────────────────────────►│
    │                                           │
    │                                           │  Verificar JWT signature
    │                                           │  Verificar tipo = "refresh"
    │                                           │  Verificar no expirado
    │                                           │  Verificar session activa en DB
    │                                           │
    │                         ┌─────────────────┴─────────────────┐
    │                         │                                   │
    │                      Inválido                            Válido
    │                         │                                   │
    │                         ▼                                   ▼
    │                    401 Error                     Generar nuevo accessToken
    │                         │                        (mismo refreshToken)
    │                         │                                   │
    │◄────────────────────────┘                                   │
    │                                                             │
    │  {                                                          │
    │    "accessToken": "eyJ...",                                 │
    │    "expiresIn": 900                                         │
    │  }                                                          │
    │◄────────────────────────────────────────────────────────────│
    │                                                             │
```

### 5. Logout

```
  CLIENTE                                    SERVIDOR
    │                                           │
    │  POST /api/auth/logout                    │
    │  Authorization: Bearer <accessToken>      │
    │  {                                        │
    │    "refreshToken": "eyJ..."               │
    │  }                                        │
    │──────────────────────────────────────────►│
    │                                           │
    │                                           │  DELETE FROM sessions
    │                                           │  WHERE id = ?
    │                                           │
    │  { "success": true }                      │
    │◄──────────────────────────────────────────│
    │                                           │
```

## Especificaciones de Tokens

### Access Token

| Propiedad | Valor |
|-----------|-------|
| Algoritmo | HS256 |
| Duración | 15 minutos (900 segundos) |
| Tipo | `access` |

**Payload:**
```json
{
  "sub": "user_abc123",
  "username": "admin",
  "type": "access",
  "iat": 1708300000,
  "exp": 1708300900
}
```

### Refresh Token

| Propiedad | Valor |
|-----------|-------|
| Algoritmo | HS256 |
| Duración | 7 días |
| Tipo | `refresh` |

**Payload:**
```json
{
  "sub": "user_abc123",
  "sessionId": "sess_xyz789",
  "type": "refresh",
  "iat": 1708300000,
  "exp": 1708904800
}
```

## Middleware de Autenticación

El middleware intercepta todas las rutas excepto las públicas:

### Rutas Públicas (sin autenticación)

- `GET /api/auth/status`
- `POST /api/auth/setup`
- `POST /api/auth/login`
- `POST /api/auth/refresh`

### Flujo del Middleware

```
Request entrante
      │
      ▼
┌─────────────────┐
│ ¿Ruta pública?  │───── Sí ────► next()
└────────┬────────┘
         │ No
         ▼
┌─────────────────┐
│ ¿Header Auth?   │───── No ────► 401 Unauthorized
└────────┬────────┘
         │ Sí
         ▼
┌─────────────────┐
│ ¿Bearer token?  │───── No ────► 401 Invalid format
└────────┬────────┘
         │ Sí
         ▼
┌─────────────────┐
│ Verificar JWT   │───── Error ──► 401 Invalid token
└────────┬────────┘
         │ OK
         ▼
┌─────────────────┐
│ ¿type=access?   │───── No ────► 401 Invalid token type
└────────┬────────┘
         │ Sí
         ▼
┌─────────────────┐
│ ¿Expirado?      │───── Sí ────► 401 Token expired
└────────┬────────┘
         │ No
         ▼
   c.set('user', payload)
   next()
```

## Esquema de Base de Datos

### Tabla: users

```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_users_username ON users(username);
```

### Tabla: sessions

```sql
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    refresh_token_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    last_used_at TEXT DEFAULT (datetime('now')),
    user_agent TEXT,
    ip_address TEXT,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

## Seguridad

### Hash de Passwords

Se utiliza el algoritmo **Argon2id** (recomendado por OWASP) a través de Web Crypto API disponible en Cloudflare Workers.

**Alternativa para Workers:** Si Argon2id no está disponible, usar PBKDF2 con:
- Algoritmo: SHA-256
- Iteraciones: 600,000 (OWASP 2023)
- Salt: 16 bytes random

```typescript
// Ejemplo de hash con PBKDF2
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 600000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  
  // Formato: $pbkdf2-sha256$iterations$salt$hash
  return `$pbkdf2-sha256$600000$${base64(salt)}$${base64(hash)}`;
}
```

### JWT Secret

El secret para firmar JWTs debe ser:
- Al menos 256 bits de entropía (32 bytes)
- Almacenado como variable de entorno (`JWT_SECRET`)
- Nunca hardcodeado en el código

```toml
# wrangler.toml
[vars]
# NO HACER ESTO - solo ejemplo
# JWT_SECRET = "..."

# Usar secrets de Cloudflare
# wrangler secret put JWT_SECRET
```

### Rate Limiting

| Endpoint | Límite |
|----------|--------|
| `POST /api/auth/login` | 5 intentos / minuto por IP |
| `POST /api/auth/refresh` | 30 requests / minuto por IP |
| `POST /api/auth/setup` | 1 request / minuto por IP |

### Validaciones

**Username:**
- Longitud: 3-50 caracteres
- Caracteres permitidos: `a-z`, `0-9`, `_`, `-`
- Case-insensitive (almacenar en lowercase)

**Password:**
- Longitud mínima: 8 caracteres
- Longitud máxima: 128 caracteres
- Sin restricciones de caracteres especiales (NIST 800-63B)

## Códigos de Error

| Código | Nombre | Descripción |
|--------|--------|-------------|
| `AUTH_001` | `SETUP_REQUIRED` | No hay usuarios, se requiere setup |
| `AUTH_002` | `SETUP_DISABLED` | Ya existe un usuario, setup deshabilitado |
| `AUTH_003` | `INVALID_CREDENTIALS` | Username o password incorrectos |
| `AUTH_004` | `TOKEN_EXPIRED` | El token ha expirado |
| `AUTH_005` | `TOKEN_INVALID` | Token malformado o firma inválida |
| `AUTH_006` | `TOKEN_TYPE_INVALID` | Tipo de token incorrecto para la operación |
| `AUTH_007` | `SESSION_REVOKED` | La sesión ha sido revocada |
| `AUTH_008` | `PASSWORD_MISMATCH` | Las contraseñas no coinciden |
| `AUTH_009` | `PASSWORD_TOO_SHORT` | Password menor a 8 caracteres |
| `AUTH_010` | `USERNAME_INVALID` | Username no cumple requisitos |
| `AUTH_011` | `RATE_LIMITED` | Demasiados intentos |

**Formato de respuesta de error:**

```json
{
  "error": {
    "code": "AUTH_003",
    "message": "Invalid credentials"
  }
}
```

## API Reference

### GET /api/auth/status

Verifica el estado de la aplicación.

**Response 200:**
```json
{
  "needsSetup": true,
  "version": "1.0.0"
}
```

### POST /api/auth/setup

Crea el primer usuario (solo funciona si no hay usuarios).

**Request:**
```json
{
  "username": "admin",
  "password": "securepass123",
  "confirmPassword": "securepass123"
}
```

**Response 201:**
```json
{
  "user": {
    "id": "user_abc123",
    "username": "admin"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 900
}
```

**Response 400 (ya existe usuario):**
```json
{
  "error": {
    "code": "AUTH_002",
    "message": "Setup is disabled, a user already exists"
  }
}
```

### POST /api/auth/login

Autentica un usuario existente.

**Request:**
```json
{
  "username": "admin",
  "password": "securepass123"
}
```

**Response 200:**
```json
{
  "user": {
    "id": "user_abc123",
    "username": "admin"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 900
}
```

**Response 401:**
```json
{
  "error": {
    "code": "AUTH_003",
    "message": "Invalid credentials"
  }
}
```

### POST /api/auth/refresh

Obtiene un nuevo access token usando el refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response 200:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 900
}
```

### POST /api/auth/logout

Invalida la sesión actual.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response 200:**
```json
{
  "success": true
}
```

### GET /api/auth/me

Obtiene información del usuario autenticado.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response 200:**
```json
{
  "user": {
    "id": "user_abc123",
    "username": "admin",
    "createdAt": "2024-02-19T10:00:00Z"
  }
}
```

## Configuración de Variables de Entorno

```toml
# wrangler.toml
[vars]
ACCESS_TOKEN_EXPIRY = "900"      # 15 minutos en segundos
REFRESH_TOKEN_EXPIRY = "604800"  # 7 días en segundos
```

```bash
# Secrets (via wrangler)
wrangler secret put JWT_SECRET
# Ingresar un string de al menos 32 caracteres random
```

## Migración SQL

```sql
-- migrations/0001_auth_tables.sql

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Tabla de sesiones
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    refresh_token_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    last_used_at TEXT DEFAULT (datetime('now')),
    user_agent TEXT,
    ip_address TEXT,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
```

Ejecutar con:
```bash
wrangler d1 migrations apply bb --local  # desarrollo
wrangler d1 migrations apply bb          # producción
```

## Diagrama de Estados de Sesión

```
                    ┌─────────┐
                    │  LOGIN  │
                    └────┬────┘
                         │
                         ▼
┌─────────┐         ┌─────────┐
│ EXPIRED │◄────────│ ACTIVE  │
└─────────┘  tiempo └────┬────┘
                         │
              ┌──────────┼──────────┐
              │          │          │
              ▼          ▼          ▼
         ┌─────────┐ ┌─────────┐ ┌─────────┐
         │ LOGOUT  │ │ REFRESH │ │ REVOKED │
         └─────────┘ └────┬────┘ └─────────┘
                          │
                          ▼
                     ┌─────────┐
                     │ ACTIVE  │
                     └─────────┘
```

## Quick Reference

```
┌────────────────────────────────────────────────────────────────┐
│                    FLUJO DE AUTENTICACIÓN                      │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  1. GET /api/auth/status                                       │
│     └─► { needsSetup: true/false }                             │
│                                                                │
│  2. Si needsSetup === true:                                    │
│     POST /api/auth/setup { username, password, confirmPassword }│
│                                                                │
│  3. Si needsSetup === false:                                   │
│     POST /api/auth/login { username, password }                │
│                                                                │
│  4. Usar accessToken en header:                                │
│     Authorization: Bearer <accessToken>                        │
│                                                                │
│  5. Cuando accessToken expire:                                 │
│     POST /api/auth/refresh { refreshToken }                    │
│                                                                │
│  6. Para cerrar sesión:                                        │
│     POST /api/auth/logout { refreshToken }                     │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│  Access Token:  15 min  │  Refresh Token:  7 días              │
└────────────────────────────────────────────────────────────────┘
```
