# YouTube Channel Automater

An AI-powered tool to automate YouTube channel content creation.

## Features

- Create YouTube channels with AI-generated names, descriptions, and visuals
- Connect to YouTube accounts via OAuth
- Analyze competitor channels for content ideas
- Generate video ideas based on competitor analysis
- Create videos with AI-generated:
  - Scripts
  - Images
  - Voiceovers
  - Background music recommendations
- Track video creation progress
- Modern, responsive UI with dark mode support

## Tech Stack

- Next.js 14+ (App Router)
- TypeScript
- MongoDB with Prisma ORM
- NextAuth.js for authentication
- ShadCN UI + Tailwind CSS
- OpenAI API for AI features
- AWS S3 for media storage
- YouTube Data API

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Copy `.env.example` to `.env` and fill in the required environment variables:
   ```bash
   cp .env.example .env
   ```
4. Set up your database:
   ```bash
   pnpm prisma generate
   pnpm prisma db push
   ```
5. Run the development server:
   ```bash
   pnpm dev
   ```

## Environment Variables

- `DATABASE_URL`: MongoDB connection string
- `OPENAI_API_KEY`: OpenAI API key for AI features
- `AWS_*`: AWS credentials for S3 storage
- `YOUTUBE_*`: YouTube OAuth credentials
- `NEXTAUTH_*`: NextAuth.js configuration

## Project Structure

- `/app`: Next.js app router pages and API routes
- `/components`: React components
  - `/ui`: ShadCN UI components
- `/types`: TypeScript type definitions
- `/lib`: Utility functions and configurations
- `/prisma`: Database schema and client

## Development

- Run tests:
  ```bash
  pnpm test
  ```
- Run E2E tests:
  ```bash
  pnpm test:e2e
  ```
- Format code:
  ```bash
  pnpm format
  ```
- Lint code:
  ```bash
  pnpm lint
  ```

## Contributing

1. Fork the repository
2. Create a new branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use this project for any purpose.
