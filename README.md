# HUB Upload API

This is the Upload API for HUB. It allows users to upload files to the server using the Bundlr service.

## Setup

To setup the server, follow these steps:

1. Install the dependencies by running `npm install`
2. Set the environment variables `IRYS_GATEWAY`, `IRYS_URL`, `SOLANA_RPC_URL`, and `SOLANA_KEYPAIR`. Note that `IRYS_GATEWAY` should be an Arweave compatible gateway for retrieving assets over HTTP.
3. Start the server by running `npm start`

## Routes

The available routes are:

- POST /uploads: Upload a file or JSON. This route accepts either a file as multipart/form-data or a JSON object and returns the URI and CID of the uploaded file.

## Swagger Documentation

The Swagger documentation for the API is available at /documentation.

## Error Handling

If there is a validation error in the request, the server will respond with a 400 status code and the validation error.

## File Upload

The server uses the `fastify-multipart` plugin to handle file uploads. The server is configured to accept a maximum of 1 file field and 0 non-file fields.
