[v1.0\
\
75%](/roadmap)

[Benchmarks](/benchmarks)
[Extension](https://driz.link/extension)
[Studio](/drizzle-studio/overview)
[Studio Package](https://github.com/drizzle-team/drizzle-studio-npm)
[Drizzle Run](https://drizzle.run)

Our goodies!

 [![](<Base64-Image-Removed>) ![EdgeDB](<Base64-Image-Removed>)](https://driz.link/edgedb)

 [![](<Base64-Image-Removed>) ![Upstash](<Base64-Image-Removed>)](https://driz.link/upstash)

 [![](<Base64-Image-Removed>) ![Turso](<Base64-Image-Removed>)\
\
🚀 Drizzle is giving you 10% off Turso Scaler and Pro for 1 Year 🚀](https://driz.link/turso)
 [![](<Base64-Image-Removed>) ![Payload](<Base64-Image-Removed>)](https://driz.link/payload)

 [![](<Base64-Image-Removed>) ![Xata](<Base64-Image-Removed>)](https://driz.link/xataio)
[![](<Base64-Image-Removed>) ![Neon](<Base64-Image-Removed>)](https://driz.link/neon)

 [![](<Base64-Image-Removed>) ![Nuxt](<Base64-Image-Removed>)](https://hub.nuxt.com/?utm_source=drizzle-docs)
[![](<Base64-Image-Removed>) ![Hydra](<Base64-Image-Removed>)](https://driz.link/hydraso)

 [![](<Base64-Image-Removed>) ![Deco.cx](<Base64-Image-Removed>)](https://driz.link/decocx)
[![](<Base64-Image-Removed>) ![Tembo](<Base64-Image-Removed>)](https://driz.link/tembo)

 [![](<Base64-Image-Removed>) ![SQLite Cloud](<Base64-Image-Removed>)](https://driz.link/sqlitecloud)
[![](<Base64-Image-Removed>) ![SingleStore](<Base64-Image-Removed>)](https://driz.link/singlestore)

 [![](<Base64-Image-Removed>) ![Mooncake](<Base64-Image-Removed>)](https://driz.link/mooncake)
[![](<Base64-Image-Removed>) ![Sponsor](<Base64-Image-Removed>)](https://driz.link/sponsor)

Product by Drizzle Team

[One Dollar Stats $1 per mo web analytics\
\
christmas  \
deal](https://driz.link/onedollarstats)

Drizzle <> PGlite
=================

This guide assumes familiarity with:

*   Database [connection basics](/docs/connect-overview)
     with Drizzle
*   ElectricSQL - [website](https://electric-sql.com/)
    
*   PgLite driver - [docs](https://pglite.dev/)
     & [GitHub](https://github.com/electric-sql/pglite)
    

According to the **[official repo](https://github.com/electric-sql/pglite)
**, PGlite is a WASM Postgres build packaged into a TypeScript client library that enables you to run Postgres in the browser, Node.js and Bun, with no need to install any other dependencies. It is only 2.6mb gzipped.

It can be used as an ephemeral in-memory database, or with persistence either to the file system (Node/Bun) or indexedDB (Browser).

Unlike previous “Postgres in the browser” projects, PGlite does not use a Linux virtual machine - it is simply Postgres in WASM.

#### Step 1 - Install packages[](#step-1---install-packages)

npm

yarn

pnpm

bun

    npm i drizzle-orm @electric-sql/pglite
    npm i -D drizzle-kit

    yarn add drizzle-orm @electric-sql/pglite
    yarn add -D drizzle-kit

    pnpm add drizzle-orm @electric-sql/pglite
    pnpm add -D drizzle-kit

    bun add drizzle-orm @electric-sql/pglite
    bun add -D drizzle-kit

#### Step 2 - Initialize the driver and make a query[](#step-2---initialize-the-driver-and-make-a-query)

In-Memory

In directory

With extra config options

    import { drizzle } from 'drizzle-orm/pglite';
    
    const db = drizzle();
    
    await db.select().from(...);

    import { drizzle } from 'drizzle-orm/pglite';
    
    const db = drizzle('path-to-dir');
    
    await db.select().from(...);

    import { drizzle } from 'drizzle-orm/pglite';
    
    // connection is a native PGLite configuration
    const db = drizzle({ connection: { dataDir: 'path-to-dir' }});
    
    await db.select().from(...);

If you need to provide your existing driver:

    import { PGlite } from '@electric-sql/pglite';
    import { drizzle } from 'drizzle-orm/pglite';
    
    // In-memory Postgres
    const client = new PGlite();
    const db = drizzle({ client });
    
    await db.select().from(users);

#### What’s next?[](#whats-next)

**Manage schema**

[Drizzle Schema](/docs/sql-schema-declaration)
 [PostgreSQL data types](/docs/column-types/pg)
 [Indexes and Constraints](/docs/indexes-constraints)
 [Database Views](/docs/views)
 [Database Schemas](/docs/schemas)
 [Sequences](/docs/sequences)
 [Extensions](/docs/extensions/pg)

**Query data**

[Relational Queries](/docs/rqb)
 [Select](/docs/select)
 [Insert](/docs/insert)
 [Update](/docs/update)
 [Delete](/docs/delete)
 [Filters](/docs/operators)
 [Joins](/docs/joins)
 [sql\`\` operator](/docs/sql)