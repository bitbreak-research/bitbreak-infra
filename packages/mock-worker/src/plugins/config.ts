import { z } from "zod";
import fp from "fastify-plugin";
import { envSchema } from "@/server";

export default fp((fastify, options: { envSchema: z.ZodSchema }, done) => {
  try {
    const config = options.envSchema.parse(process.env);
    fastify.decorate("config", config);
  } catch (error) {
    console.error("Environment validation failed:", error);
    process.exit(1);
  }

  done();
});

declare module "fastify" {
  interface FastifyInstance {
    config: z.infer<typeof envSchema>;
  }
}