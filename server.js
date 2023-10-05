import Fastify from "fastify";
import fastifyMultiPart from "@fastify/multipart";
import fastifySwagger from "@fastify/swagger";
import fastifyEnv from "@fastify/env";
import fastifySwaggerUi from "@fastify/swagger-ui";

import { w3 } from "./web3.js";
import createError from "@fastify/error";

const UploadError = createError(
  "UPLOAD_ERROR",
  "The upload was not successful"
);

// Initialize Fastify with logging enabled
const fastify = Fastify({
  logger: true,
});

// Register environment variables
await fastify.register(fastifyEnv, {
  dotenv: true,
  schema: {
    type: "object",
    required: ["WEB3_UP_PROOF", "WEB3_UP_KEY", "WEB3_UP_GATEWAY"],
    properties: {
      WEB3_UP_PROOF: {
        type: "string",
      },
      WEB3_UP_KEY: {
        type: "string",
      },
      WEB3_UP_GATEWAY: {
        type: "string",
      },
      PORT: {
        type: "number",
        default: 3000,
      },
    },
  },
});

// Register multipart plugin with limits
await fastify.register(fastifyMultiPart, {
  limits: {
    fields: 0, // Max number of non-file fields
    files: 1, // Max number of file fields
  },
});

await fastify.register(fastifySwagger, {
  exposeRoute: true,
  swagger: {
    info: {
      title: "HUB Upload API",
      description: "Upload API for HUB",
      version: "0.1.0",
    },
    externalDocs: {
      url: "https://docs.holaplex.com",
      description: "HUB documentation",
    },
    host: "localhost:3000",
    schemes: ["http"],
    consumes: ["application/json"],
    produces: ["application/json"],
    tags: [],
    securityDefinitions: {
      apiKey: {
        type: "apiKey",
        name: "Authorization",
        in: "header",
      },
    },
  },
});

await fastify.register(fastifySwaggerUi, {
  routePrefix: "/documentation",
  initOAuth: {},
  uiConfig: {
    docExpansion: "full",
    deepLinking: false,
  },
  uiHooks: {
    onRequest: function (request, reply, next) {
      next();
    },
    preHandler: function (request, reply, next) {
      next();
    },
  },
  staticCSP: true,
  transformStaticCSP: (header) => header,
});

// Initialize uploader with environment variables
const uploader = await w3(
  fastify.config.WEB3_UP_KEY,
  fastify.config.WEB3_UP_PROOF,
  fastify.config.WEB3_UP_GATEWAY
);

// Health check endpoint
fastify.get("/health", async function handler(request, reply) {
  reply.send({ status: "ok" });
});

// Upload endpoint
fastify.post(
  "/uploads",
  {
    schema: {
      description: "Upload a file",
      tags: ["file"],
      consumes: ["multipart/form-data"],
      response: {
        200: {
          description: "File uploaded successfully",
          type: "object",
          properties: {
            uri: { type: "string" },
            cid: { type: "string" },
          },
        },
      },
    },
  },
  async function handler(request, reply) {
    if (request.validationError) {
      reply.status(400).send(request.validationError);
      return;
    }

    try {
      // Get file from request and convert to buffer
      const data = await request.file();
      const buffer = await data.toBuffer();
      // Upload file and get results
      const results = await uploader.uploadFile(buffer);

      // Send results as response
      reply.send(results);
    } catch {
      // Send upload error as response if any error occurs
      reply.send(new UploadError());
    }
  }
);

// Start the server
try {
  await fastify.ready();
  fastify.swagger();
  await fastify.listen({ port: fastify.config.PORT, host: "0.0.0.0" });
} catch (err) {
  // Log error and exit process if server fails to start
  fastify.log.error(err);
  process.exit(1);
}
