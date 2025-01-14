## Notes From Bookshelf Example

## `next.config.mjs`

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
	experimental: {
		serverComponentsExternalPackages: ["@electric-sql/pglite"],
	},
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "**",
			},
			{
				protocol: "http",
				hostname: "**",
			},
		],
	},
};

export default nextConfig;
```

## DB Setup `lib/db.ts`

```ts
import { pinata } from "./pinata";
import { PGlite } from "@electric-sql/pglite";
import { pgTable, serial, text } from "drizzle-orm/pg-core";

export const bookshelf = pgTable("bookshelf", {
	id: serial("id").primaryKey(),
	title: text("title").notNull(),
	author: text("author"),
	image_url: text("image_url"),
});

export async function restoreSnapshot(
	groupId: string,
): Promise<PGlite | undefined> {
	try {
		const files = await pinata.files.list().group(groupId).order("DESC");
		const dbFile = await pinata.gateways.get(files.files[0].cid);
		const file = dbFile.data as Blob;
		const client: PGlite = new PGlite({ loadDataDir: file });
		return client;
	} catch (error) {
		console.log(error);
		return;
	}
}

export async function createDb(name: string): Promise<string | unknown> {
	const db = new PGlite();
	try {
		const group = await pinata.groups.create({
			name: name,
			isPublic: true,
		});

		await db.exec(`
		    CREATE TABLE IF NOT EXISTS bookshelf (
		      id SERIAL PRIMARY KEY,
		      title TEXT,
		      author TEXT,
					image_url TEXT
		    );
		  `);

		const file = (await db.dumpDataDir("auto")) as File;
		const upload = await pinata.upload
			.file(file)
			.group(group.id)
			.addMetadata({ name: name });
		console.log(upload);
		return group.id;
	} catch (error) {
		console.log(error);
		return error;
	}
}
```

## Pinata Setup `lib/pinata.ts`

```ts
import { PinataSDK } from "pinata";

export const pinata = new PinataSDK({
	pinataJwt: process.env.PINATA_JWT,
	pinataGateway: process.env.GATEWAY_URL,
});
```

## Setting up the Shelf `app/api/shelf/route.ts`

```ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createDb } from "@/lib/db";

export async function POST(request: NextRequest) {
	const data = await request.json();
	try {
		const groupId = await createDb(data.name);
		return NextResponse.json({ id: groupId }, { status: 200 });
	} catch (error) {
		console.log(error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}
```

## Creating a Book `app/api/book/route.ts`

```ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { pinata } from "@/lib/pinata";
import { drizzle } from "drizzle-orm/pglite";
import { restoreSnapshot, bookshelf } from "@/lib/db";

export async function POST(request: NextRequest) {
	const data = await request.json();
	try {
		const client = await restoreSnapshot(data.groupId);
		if (client) {
			const db = drizzle(client);
			await db.insert(bookshelf).values({
				title: data.title,
				author: data.author,
				image_url: data.image_url,
			});
			const newFile = (await client.dumpDataDir("auto")) as File;
			const upload = await pinata.upload.file(newFile).group(data.groupId);
			console.log(upload);

			return NextResponse.json({ id: upload.group_id }, { status: 200 });
		}
	} catch (error) {
		console.log(error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}
```

## Explanation

- `next.config.mjs`: This file configures the Next.js application to use the `@electric-sql/pglite` package. It also sets up image remote patterns for the Pinata gateway.
- `lib/db.ts`: This file defines the database schema and functions for creating and restoring snapshots.
- `lib/pinata.ts`: This file sets up the Pinata SDK with the necessary credentials.
- `app/api/shelf/route.ts`: This file handles the creation of a new database group on Pinata and returns the group ID.
- `app/api/book/route.ts`: This file handles the creation of a new book in the database, updates the database snapshot, and returns the group ID.

## Implementation for Diversity Scorecard

### Package.json Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    // ... existing scripts ...
    "db:create": "tsx scripts/create-base-db.ts",
    "db:upload": "tsx scripts/upload-db-to-pinata.ts",
    "db:download": "tsx scripts/download-db.ts",
    "postinstall": "npm run db:download"
  }
}
```

### Initial Database Setup Script (`scripts/create-base-db.ts`)

```typescript
import { PGlite } from "@electric-sql/pglite";
import { writeFileSync } from "fs";
import { join } from "path";

async function createBaseDatabase() {
  const db = new PGlite();
  
  // Create all necessary tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS organizations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS scorecards (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER REFERENCES organizations(id),
      year INTEGER NOT NULL,
      quarter INTEGER NOT NULL,
      status TEXT DEFAULT 'draft',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS metrics (
      id SERIAL PRIMARY KEY,
      scorecard_id INTEGER REFERENCES scorecards(id),
      category TEXT NOT NULL,
      metric_key TEXT NOT NULL,
      value JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Add indexes
    CREATE INDEX idx_scorecards_org ON scorecards(organization_id);
    CREATE INDEX idx_metrics_scorecard ON metrics(scorecard_id);
    CREATE INDEX idx_metrics_category ON metrics(category);
  `);

  // Dump database to file
  const file = await db.dumpDataDir("auto");
  writeFileSync(join(process.cwd(), "tmp", "base.db"), file);
  
  console.log("Base database created and saved to tmp/base.db");
}

createBaseDatabase().catch(console.error);
```

### Upload Script (`scripts/upload-db-to-pinata.ts`)

```typescript
import { pinata } from "../lib/pinata";
import { readFileSync } from "fs";
import { join } from "path";

async function uploadDatabase() {
  try {
    // Create a new group or use existing one
    const groupName = `diversity-scorecard-${process.env.NODE_ENV}`;
    let groupId = process.env.PINATA_GROUP_ID;

    if (!groupId) {
      const group = await pinata.groups.create({
        name: groupName,
        isPublic: false
      });
      groupId = group.id;
      console.log(`Created new Pinata group: ${groupId}`);
    }

    // Read the database file
    const dbFile = readFileSync(join(process.cwd(), "tmp", "base.db"));
    
    // Upload to Pinata
    const upload = await pinata.upload
      .file(new File([dbFile], "base.db"))
      .group(groupId)
      .addMetadata({ 
        version: process.env.npm_package_version,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      });

    console.log(`Uploaded database to Pinata: ${upload.IpfsHash}`);
    
    // Save the CID to .env.local if it doesn't exist
    console.log(`Add this to your .env.local if not present:`);
    console.log(`PINATA_DB_CID=${upload.IpfsHash}`);
    console.log(`PINATA_GROUP_ID=${groupId}`);
  } catch (error) {
    console.error("Failed to upload database:", error);
  }
}

uploadDatabase();
```

### Download Script (`scripts/download-db.ts`)

```typescript
import { pinata } from "../lib/pinata";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

async function downloadDatabase() {
  try {
    const dbPath = join(process.cwd(), ".diversity-scorecard");
    const dbFile = join(dbPath, "local.db");

    // Skip if database already exists
    if (existsSync(dbFile)) {
      console.log("Database already exists, skipping download");
      return;
    }

    // Create directory if it doesn't exist
    if (!existsSync(dbPath)) {
      mkdirSync(dbPath, { recursive: true });
    }

    // Get latest database file from Pinata
    const groupId = process.env.PINATA_GROUP_ID;
    if (!groupId) {
      throw new Error("PINATA_GROUP_ID not set in environment");
    }

    const files = await pinata.files.list()
      .group(groupId)
      .order("DESC");

    const dbDownload = await pinata.gateways.get(files.files[0].cid);
    writeFileSync(dbFile, dbDownload.data);

    console.log("Database downloaded and installed successfully");
  } catch (error) {
    console.error("Failed to download database:", error);
    process.exit(1);
  }
}

downloadDatabase();
```

### Database Service (`lib/db.ts`)

```typescript
import { PGlite } from "@electric-sql/pglite";
import { join } from "path";

let dbInstance: PGlite | null = null;

export async function getDatabase(): Promise<PGlite> {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = join(process.cwd(), ".diversity-scorecard", "local.db");
  dbInstance = new PGlite({ loadDataDir: dbPath });
  
  return dbInstance;
}
```

### Setup Instructions

1. First, ensure you have the required environment variables:
   ```
   PINATA_JWT=your_jwt_token
   GATEWAY_URL=your_gateway_url
   NODE_ENV=development|staging|production
   ```

2. Create and upload the initial database:
   ```bash
   npm run db:create
   npm run db:upload
   ```

3. Copy the output `PINATA_DB_CID` and `PINATA_GROUP_ID` to your `.env.local` file.

4. The database will automatically download during `npm install` due to the `postinstall` script.

### How It Works

1. **Initial Setup**:
   - The base database is created with all tables and indexes
   - It's uploaded to Pinata in a private group
   - The CID and group ID are saved for future reference

2. **Installation**:
   - When `npm install` runs, the `postinstall` script triggers
   - The script checks if a local database exists
   - If not, it downloads the latest version from Pinata
   - The database is saved to `.diversity-scorecard/local.db`

3. **Runtime**:
   - The app uses the local database file
   - All changes are persisted locally
   - The database is initialized only once
   - Subsequent app starts use the existing database

4. **Updates**:
   - Create a new database version with `db:create`
   - Upload it to Pinata with `db:upload`
   - Users get the new version on next clean install

### Notes

- Add `.diversity-scorecard` to your `.gitignore`
- Consider adding database migration scripts for updates
- The database is downloaded only once and persists between app restarts
- Updates require a clean install or manual trigger of `db:download`
- Consider implementing a version check system for automatic updates

