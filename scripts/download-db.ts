import 'dotenv/config';
import { pinata } from "../lib/pinata";
import { writeFileSync } from "fs";
import { join } from "path";
import axios from 'axios';

async function downloadDatabase() {
  try {
    // Get all pins first
    const pins = await pinata.pinList({
      status: 'pinned'
    });

    console.log("Available pins:", pins.rows?.map(pin => ({
      hash: pin.ipfs_pin_hash,
      name: pin.metadata.name,
      keyvalues: pin.metadata.keyvalues
    })));

    if (!pins.rows || pins.rows.length === 0) {
      console.error("No files found on Pinata");
      process.exit(1);
    }

    // Get the latest version (first pin)
    const latestPin = pins.rows[0];
    console.log("Using latest pin:", latestPin.ipfs_pin_hash);

    // Download from Pinata gateway
    const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${latestPin.ipfs_pin_hash}`;
    const response = await axios.get(gatewayUrl, {
      responseType: 'arraybuffer',
      headers: {
        'Authorization': `Bearer ${process.env.PINATA_JWT}`
      }
    });

    // Save to snapshots directory
    const dbPath = join(process.cwd(), "app/database/snapshots/base.db");
    writeFileSync(dbPath, response.data);

    console.log("Database downloaded and saved to:", dbPath);

  } catch (error) {
    console.error("Error downloading database:", error);
    process.exit(1);
  }
}

downloadDatabase().catch(console.error); 