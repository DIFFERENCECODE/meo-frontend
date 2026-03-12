# Meo Frontend

**Meo** is a metabolic health AI assistant that provides personalized insights, data visualization, and recommendations for users monitoring their metabolic health.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 📚 Documentation

For new team members and developers, we've created comprehensive documentation:

- **[CODEBASE_OVERVIEW.md](./CODEBASE_OVERVIEW.md)** - Complete guide to the project structure, technology stack, and implementation details
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Detailed architecture diagrams and data flow explanations  
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Quick reference for common tasks and operations

### Documentation Overview

| Document | Purpose | Best For |
|----------|---------|----------|
| CODEBASE_OVERVIEW.md | Comprehensive introduction to the codebase | New team members, understanding the full system |
| ARCHITECTURE.md | Visual diagrams and technical architecture | Understanding data flow and system design |
| QUICK_REFERENCE.md | Quick lookup for common tasks | Daily development work |

## 🚀 Getting Started

First, run the development server In Terminal:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## 🏗️ Technology Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS v4
- **Charts**: ECharts 6
- **Animations**: Framer Motion 12
- **UI Icons**: Lucide React

For a complete technology breakdown, see [CODEBASE_OVERVIEW.md](./CODEBASE_OVERVIEW.md#technology-stack).

## 📖 Learn More

### Project Documentation
- [Codebase Overview](./CODEBASE_OVERVIEW.md) - Understand the full architecture
- [Architecture Diagrams](./ARCHITECTURE.md) - Visual system design
- [Quick Reference](./QUICK_REFERENCE.md) - Common tasks and patterns

### Next.js Resources
- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial
- [Next.js GitHub repository](https://github.com/vercel/next.js) - feedback and contributions welcome

## 🚀 Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## 🤝 Contributing

When contributing to this project:

1. Review the [CODEBASE_OVERVIEW.md](./CODEBASE_OVERVIEW.md) to understand the architecture
2. Check [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) for development patterns
3. Follow the existing code style and TypeScript conventions
4. Run `npm run lint` before committing
5. Test your changes with `npm run build`

## 📝 Project Structure

```
src/
├── app/              # Next.js App Router
│   ├── api/         # API routes (backend proxy)
│   ├── lib/         # Utilities and types
│   └── page.tsx     # Main page
└── components/      # React components
    └── Chatbot.tsx  # Main chat interface
```

For detailed structure, see [CODEBASE_OVERVIEW.md](./CODEBASE_OVERVIEW.md#project-structure).
