"use strict";

import { Signer } from "@ucanto/principal/ed25519";
import { CarReader } from "@ipld/car";
import { importDAG } from "@ucanto/core/delegation";
import * as Client from "@web3-storage/w3up-client";
import { StoreMemory } from "@web3-storage/access/stores/store-memory";
import { Blob } from "node:buffer";

/**
 * Class representing an Uploader.
 */
class Uploader {
  /**
   * Create an uploader.
   * @param {Object} client - The client object.
   * @param {string} gateway - The gateway URL.
   */
  constructor(client, gateway) {
    this.client = client;
    this.gateway = gateway;
  }

  /**
   * Upload a file.
   * @param {Buffer} buffer - The file data as a buffer.
   * @return {Object} The upload response containing the URI and CID.
   * @throws {Error} If an error occurs during upload.
   */
  async uploadFile(buffer) {
    const blob = new Blob([buffer]);

    const response = await this.client.uploadFile(blob);
    const cid = response.toString();
    const uri = `${this.gateway}/${cid}`;

    return { uri, cid };
  }
}

/**
 * Create a new uploader with a given key, proof, and gateway.
 * @param {string} key - The key for the uploader.
 * @param {string} proof - The proof for the uploader.
 * @param {string} gateway - The gateway for the uploader.
 * @return {Uploader} A new Uploader instance.
 */
export async function w3(key, proof, gateway) {
  const reader = await CarReader.fromBytes(Buffer.from(proof, "base64"));
  const principal = Signer.parse(key);

  const store = new StoreMemory();
  const client = await Client.create({ principal, store });

  const blocks = [];

  for await (const block of reader.blocks()) {
    blocks.push(block);
  }

  const dag = importDAG(blocks);

  const space = await client.addSpace(dag);

  await client.setCurrentSpace(space.did());

  return new Uploader(client, gateway);
}
