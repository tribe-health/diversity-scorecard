# Clinical Trial Diversity Scorecard Generator

A modern, type-safe web application for generating and analyzing diversity scorecards for clinical trials, built with Next.js 14 and Supabase.

## Features

- **Real-time Scorecard Generation**: Instantly calculate diversity metrics for clinical trials
- **Live Data Updates**: Real-time data synchronization using Supabase
- **Type-safe Implementation**: Built with TypeScript and GraphQL for robust reliability
- **Modern UI Components**: Leveraging shadcn-ui and V0 components for a polished interface
- **AI-Powered Analysis**: Integration with V0 AI SDK for intelligent insights
- **PDF Export**: Download beautifully formatted reports
- **Database-Backed**: Persistent storage with Supabase PostgreSQL

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **UI Components**: shadcn-ui + V0 Components
- **Type Safety**: TypeScript + GraphQL
- **Form Handling**: React Hook Form + Zod
- **AI Integration**: V0 AI SDK
- **Package Manager**: pnpm

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── scorecard/
│   │       └── route.ts
│   ├── database/
│   │   └── .client/
│   │       └── migrations/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/
│   └── scorecard/
├── graphql/
│   └── repositories/
├── hooks/
│   ├── use-age-demographics.ts
│   ├── use-ethnicity-demographics.ts
│   └── use-scorecard-db.ts
├── lib/
│   ├── utils.ts
│   ├── scoring.ts
│   └── report/
├── store/
│   └── scorecard-store.ts
├── types/
│   └── supabase.ts
└── styles/
    └── globals.css
```

## Getting Started

1. Clone the repository
2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

1. Run the development server:
```bash
pnpm dev
```

## Docker Deployment

Build and run the application using Docker:

```bash
docker build -t diversity-scorecard-next .
docker run -p 3000:3000 diversity-scorecard-next
```

## Database Migrations

Migrations are managed through pglite:



## Development Guidelines

- Use feature-based CLEAN architecture
- Implement type-safe database queries using generated Supabase types
- Follow Next.js 15 App Router best practices
- Use Zustand for global state managemen
- Ensure proper error boundaries and loading states
- Follow TypeScript strict mode guidelines


## Testing

Run the test suite:

```bash
pnpm test
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
