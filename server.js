import Fastify from "fastify";
import MultiPart from "@fastify/multipart";
import { Signer } from "@ucanto/principal/ed25519";

const fastify = Fastify({
  logger: true,
});

fastify.register(MultiPart);

fastify.get("/health", async function handler(request, reply) {
  reply.send({ status: "ok" });
});

// Declare a route
fastify.post("/uploads", async function handler(request, reply) {
  const parts = req.files();

  for await (const part of parts) {
  }

  reply.send();
});

// Run the server!
try {
  await fastify.listen({ port: 3000, host: "0.0.0.0" });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
