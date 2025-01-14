# Clinical Trial Diversity Scorecard Generator

A modern, type-safe web application for generating and analyzing diversity scorecards for clinical trials, built with Next.js 15, React 18, and TypeScript.

## Features

- **Real-time Scorecard Generation**: Instantly calculate diversity metrics for clinical trials
- **Vector Similarity Search**: Advanced embedding-based similarity search for scorecards
- **Browser-based Database**: Persistent storage with PGLite
- **Type-safe Implementation**: Built with TypeScript in strict mode
- **Modern UI Components**: Leveraging shadcn-ui and assistant-ui components
- **AI-Powered Analysis**: Integration with Hugging Face Transformers
- **Secure Data Handling**: Client-side database operations with PGLite

## Tech Stack

- **Framework**: Next.js 15 + React 18
- **Database**: PGLite (PostgreSQL in the browser)
- **ORM**: Drizzle ORM
- **Styling**: Tailwind CSS
- **UI Components**: 
  - shadcn-ui (base components)
  - assistant-ui (enhanced components)
- **Type Safety**: TypeScript in strict mode
- **Form Handling**: React Hook Form + Zod
- **AI/ML**: Hugging Face Transformers
- **Package Manager**: pnpm

## Project Structure

```
diversity-scorecard-next/
├── app/
│   ├── api/
│   │   ├── chat/
│   │   │   └── route.ts           # AI chat endpoint
│   │   ├── database/
│   │   │   ├── init/
│   │   │   └── status/
│   │   ├── embeddings/
│   │   │   └── route.ts           # Vector embeddings endpoint
│   │   ├── pdf/
│   │   │   └── route.ts           # PDF generation
│   │   └── report/
│   │       └── route.ts           # Report generation
│   ├── database/
│   │   ├── .client/
│   │   │   ├── db.ts             # PGLite initialization
│   │   │   ├── init.ts           # Database setup
│   │   │   ├── migrations.ts     # Migration runner
│   │   │   ├── reset.ts          # Database reset
│   │   │   └── seed.ts           # Seed data
│   │   ├── scripts/              # Database management scripts
│   │   └── snapshots/            # Database snapshots for IPFS
│   ├── hooks/
│   │   └── use-scorecard-service.ts
│   ├── providers/
│   │   ├── database-provider.tsx
│   │   ├── diversity-ai-provider.tsx
│   │   └── service-provider.tsx
│   └── layout.tsx
├── components/
│   ├── layout/
│   │   └── footer.tsx
│   ├── scorecard/
│   │   └── form.tsx
│   └── ui/                       # shadcn-ui components
├── docs/
│   ├── huggingface/
│   │   ├── BUILD_NEXT.md        # Next.js integration guide
│   │   ├── TRANSFORMERS.md      # Transformers usage
│   │   └── NOTES.md             # Implementation notes
│   └── pglite/
│       ├── AI.md                # AI integration guide
│       ├── API.md               # PGLite API reference
│       ├── DRIZZLE.md           # Drizzle ORM setup
│       ├── FILE_SYSTEMS.md      # File system handling
│       ├── NEXT_DB_SETUP.md     # Next.js database setup
│       ├── PINATA.md            # Pinata IPFS integration
│       └── WORKER.md            # Web worker setup
├── hooks/
│   ├── use-vector-ops.ts        # Vector similarity operations
│   └── use-similar-scorecards.ts
├── lib/
│   └── vector-utils.ts          # Vector manipulation utilities
└── types/
    ├── drizzle.ts              # Drizzle type definitions
    └── scorecard.ts            # Scorecard type definitions
```

## Architecture

The application follows a layered architecture with clear separation of concerns:

### Data Layer
- **PGLite Database**: Browser-based PostgreSQL database
  - See [NEXT_DB_SETUP.md](docs/pglite/NEXT_DB_SETUP.md) for setup details
  - See [DRIZZLE.md](docs/pglite/DRIZZLE.md) for ORM integration

### AI/ML Layer
- **Vector Operations**: Embedding-based similarity search
  - See [AI.md](docs/pglite/AI.md) for vector store implementation
  - See [TRANSFORMERS.md](docs/huggingface/TRANSFORMERS.md) for Hugging Face integration

### Distribution Layer
- **IPFS Integration**: Database distribution via Pinata
  - See [PINATA.md](docs/pglite/PINATA.md) for detailed setup
  - See [FILE_SYSTEMS.md](docs/pglite/FILE_SYSTEMS.md) for file handling

### Application Layer
- **Next.js App Router**: Server and client components
- **React Context Providers**: State management
- **Hooks**: Business logic abstraction
- **Components**: UI implementation with shadcn-ui

### Development
For detailed implementation notes and guides, refer to:
- [BUILD_NEXT.md](docs/huggingface/BUILD_NEXT.md): Next.js integration guide
- [API.md](docs/pglite/API.md): PGLite API reference
- [WORKER.md](docs/pglite/WORKER.md): Web worker implementation
- [NOTES.md](docs/pglite/NOTES.md): General implementation notes

## Getting Started

1. Install dependencies:
```bash
pnpm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
```

3. Initialize the database:
```bash
pnpm db:init
pnpm db:setup
```

4. Run the development server:
```bash
pnpm dev
```

## Pinata Integration

The application uses Pinata IPFS for database distribution.

### Environment Setup

Required environment variables for Pinata integration:

```bash
PINATA_API_KEY=your_api_key
PINATA_API_SECRET=your_api_secret
PINATA_JWT=your_jwt_token
```

## Database Management

The application uses PGLite for browser-based PostgreSQL functionality, with database files distributed through Pinata IPFS:

### Local Development

```bash
pnpm db:init          # Initialize the database
pnpm db:setup         # Set up database schema and extensions
pnpm db:seed          # Populate with sample data
pnpm db:reset         # Reset the database
```

### Database Distribution

The database is distributed to clients through Pinata IPFS. Here's how it works:

1. Create a new database snapshot:
```bash
pnpm db:create
```

2. Upload the snapshot to Pinata:
```bash
pnpm db:push
```
This will:
- Upload the database file to Pinata IPFS
- Update the `DATABASE_CID` in `app/database/constants.ts`
- Configure Pinata pin settings for optimal distribution

3. Client-side Database Loading:
- On first load, the application downloads the database file from Pinata IPFS
- The file is cached in IndexedDB for offline access
- PGLite initializes using the downloaded database file
- Subsequent visits use the cached version unless migrations are needed

### Database Migrations

Migrations are managed through Drizzle ORM:

```bash
pnpm db:client:migration:generate  # Generate new migrations
pnpm db:client:migration:push      # Apply migrations
pnpm db:client:studio             # Launch Drizzle Studio
```

## Development Guidelines

- Use TypeScript strict mode with no 'any' types
- Follow lowercase-with-dashes file naming convention
- Implement proper error handling with try/catch blocks
- Use path aliases (@/components, @/lib, etc.)
- Keep database operations in .client directory
- Follow PGLite best practices for browser context

## Error Handling

All database operations should be wrapped in proper error handling:

```typescript
try {
  await operation();
} catch (error) {
  console.error('Operation failed:', error instanceof Error ? error.message : error);
  throw error;
}
```

## License

MIT License - see LICENSE file for details

Last updated: 2025-01-14
