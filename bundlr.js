import Irys from "@irys/sdk";

/**
 * Class representing an Uploader.
 */
class Uploader {
  /**
   * Create an uploader.
   * @param {Object} client - The client object.
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
  async upload(buffer, contentType) {
    const tags = [{ name: "Content-Type", value: contentType }];

    const response = await this.client.upload(buffer, { tags });

    const cid = response.id;
    const uri = `${this.gateway}/${cid}`;

    return { uri, cid };
  }

  async fund(bytes) {
    const price = await this.client.getPrice(bytes);

    const response = await this.client.fund(price);

    console.log(response.message);

    return price;
  }
}

export function irys(gateway, url, key) {
  const irys = new Irys({
    url, // URL of the node you want to connect to
    token: "arweave", // Token used for payment
    key: JSON.parse(key),
  });

  return new Uploader(irys, gateway);
}
