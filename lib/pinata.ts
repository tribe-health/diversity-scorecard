import PinataSDK from "@pinata/sdk";

if (!process.env.PINATA_API_KEY || !process.env.PINATA_API_SECRET) {
  throw new Error('Missing Pinata API credentials. Please set PINATA_API_KEY and PINATA_API_SECRET environment variables.');
}

export const pinata = new PinataSDK(
  process.env.PINATA_API_KEY,
  process.env.PINATA_API_SECRET
); 