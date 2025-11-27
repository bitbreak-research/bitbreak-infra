import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import sendMetric from "@/api/send-metric";

export default fp(
  (fastify: FastifyInstance, opts: { prefix?: string }, done: () => void) => {
    fastify.register(
      async (fastify: FastifyInstance) => {
        // Metrics route
        // Expose POST /metrics (no /api prefix) as requested
        fastify.register(sendMetric);
      },
      { prefix: opts.prefix }
    );

    done();
  }
);
