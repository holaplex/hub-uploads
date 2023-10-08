import Fastify from "fastify";
import fastifyMultiPart from "@fastify/multipart";
import fastifySwagger from "@fastify/swagger";
import fastifyEnv from "@fastify/env";
import fastifySwaggerUi from "@fastify/swagger-ui";
import fastifyHttpProxy from "@fastify/http-proxy";
import createError from "@fastify/error";
import { irys } from "./bundlr.js";

import Metrics from "./metrics.js";
const { FileUploadTime } = Metrics.initialize();

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
    required: ["SOLANA_KEYPAIR", "SOLANA_RPC_URL", "IRYS_URL", "IRYS_GATEWAY"],
    properties: {
      SOLANA_PPC_URL: {
        type: "string",
      },
      SOLANA_KEYPAIR: {
        type: "string",
      },
      IRYS_URL: {
        type: "string",
      },
      IRYS_GATEWAY: {
        type: "string",
      },
      PORT: {
        type: "number",
        default: 3000,
      },
    },
  },
});

// add proxy to the prometheus metrics endpoint
await fastify.register(fastifyHttpProxy, {
  upstream: "http://localhost:9464/metrics",
  prefix: "/metrics",
});

// Register multipart plugin with limits
await fastify.register(fastifyMultiPart, {
  limits: {
    fields: 0, // Max number of non-file fields
    files: 1, // Max number of file fields
    fileSize: 1024 * 1024 * 250, // Max file size in bytes
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
const uploader = irys(
  fastify.config.IRYS_GATEWAY,
  fastify.config.IRYS_URL,
  fastify.config.SOLANA_RPC_URL,
  fastify.config.SOLANA_KEYPAIR
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
      description: "Upload a file or JSON",
      tags: ["file"],
      consumes: ["multipart/form-data", "application/json"],
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
    let upload_status = "FAILED";
    const start = Date.now();
    try {
      // Check if request is multipart
      if (request.isMultipart()) {
        // Get file from request and convert to buffer
        const data = await request.file();
        const buffer = await data.toBuffer();
        const contentType = data.mimetype;

        const results = await uploader.upload(buffer, contentType);

        reply.send(results);
      } else {
        const buffer = Buffer.from(JSON.stringify(request.body));

        const results = await uploader.upload(buffer, "application/json");

        reply.send(results);
      }
      upload_status = "COMPLETED";
    } catch (err) {
      fastify.log.error(err);
      // Send upload error as response if any error occurs
      reply.send(new UploadError());
    } finally {
      FileUploadTime.record(Date.now() - start, { upload_status });
    }
  }
);

fastify.post("/fund/:bytes", {}, async function handler(request, reply) {
  const { bytes } = request.params;

  try {
    const price = await uploader.fund(bytes);

    reply.send({ price });
  } catch (err) {
    fastify.log.error(err);
    // Send upload error as response if any error occurs
    reply.send(new UploadError());
  }
});

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
