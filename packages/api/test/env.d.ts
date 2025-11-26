declare module "cloudflare:test" {
  interface ProvidedEnv extends Env {
    bb: D1Database;
    JWT_SECRET: string;
  }
}
