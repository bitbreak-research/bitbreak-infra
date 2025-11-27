import Fastify from "fastify";
import fastifyConfig from "./plugins/config";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import { z } from "zod";
import dotenv from "dotenv";
import path from "path";
dotenv.config();

export const DEFAULT_DATABASE_URL = `file:${path.resolve("../../data/master.db")}`;

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = DEFAULT_DATABASE_URL;
}

import plugins from "./plugins";

const fastify = Fastify({
  trustProxy: true,
  logger: {
    name: "Master",
    level: "info",
    transport: {
      target: "pino-pretty",
      options: {
        translateTime: "HH:MM:ss Z",
        ignore: "pid,hostname",
      },
    },
  },
});


export const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default("0.0.0.0"),
});

// Config
fastify.register(fastifyConfig, { envSchema });

// All Plugins
fastify.register(plugins);

// Schema validator and serializer
fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);
fastify.withTypeProvider<ZodTypeProvider>();

const main = async () => {

  await fastify.ready();

  const port = fastify.config.PORT;
  const host = fastify.config.HOST;

  await fastify.listen({ port, host });

  fastify.log.info(`Server listening on port ${port} on host ${host} `);
  fastify.log.info(`Documentation running at http://localhost:${port}/docs`);

};

main();
