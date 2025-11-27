import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

const schema = {
  tags: ["Metrics"],
  summary: "Create a new metric",
  description: "Creates a new metric entry with engine performance data. Upserts the engine if it doesn't exist.",
  body: z.object({
    memory: z.number().min(0),
    cpu: z.number().min(0),
    rate: z.number().min(0),
  }),
  response: {
    200: z.object({
      success: z.boolean(),
    }),
    400: z.object({
      error: z.string(),
    }),
    500: z.object({
      error: z.string(),
    }),
  },
};

export default async (fastify: FastifyInstance) => {
  fastify.withTypeProvider<ZodTypeProvider>().post(
    "/metrics",
    {
      schema,
    },
    async (req, res) => {
      try {
        await fastify.sendWorkerMetrics({
          memory: req.body.memory,
          cpu: req.body.cpu,
          rate: req.body.rate,
        });

        return res.status(200).send({ success: true });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to send metrics";

        // If WebSocket is not connected or authenticated, treat it as a 400
        if (
          message.includes("not connected") ||
          message.includes("not authenticated")
        ) {
          return res.status(400).send({ error: message });
        }

        fastify.log.error({ err }, "Unexpected error sending metrics");
        return res.status(500).send({ error: message });
      }
    }
  );
};
