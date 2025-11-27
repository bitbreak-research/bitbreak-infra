import { FastifyInstance } from "fastify";
import fastifyRoutes from "./routes";
import fp from "fastify-plugin";
import fastifyWebsocket from "./worker";

export default fp((fastify: FastifyInstance, opts: {}, done: () => void) => {

  fastify.register(fastifyRoutes);

  fastify.register(fastifyWebsocket);

  done();
});